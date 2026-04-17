import { FastifyRequest, FastifyReply } from 'fastify';
import { sanitizeInput, removeScriptTags } from '@utils/formatting/validation.util';
import { isSuspiciousInput } from '@utils/security/security.util';
import { logger } from '@utils/common/logger.util';
import { prisma } from '@config/database.config';

/**
 * Sanitization middleware - XSS Prevention
 * Sanitizes all user input before processing
 */
export const sanitizeInputMiddleware = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        let hasSuspiciousContent = false;
        const originalInputs: Record<string, any> = {};

        // Sanitize request body
        if (request.body && typeof request.body === 'object') {
            originalInputs.body = JSON.stringify(request.body);
            request.body = sanitizeObject(request.body, (field, original, sanitized) => {
                if (original !== sanitized) {
                    hasSuspiciousContent = true;
                    logger.warn(
                        {
                            field,
                            original: original.substring(0, 100),
                            sanitized: sanitized.substring(0, 100),
                            path: request.url,
                            userId: request.user?.userId,
                        },
                        'Suspicious input detected and sanitized'
                    );
                }
            });
        }

        // Sanitize query parameters
        if (request.query && typeof request.query === 'object') {
            originalInputs.query = JSON.stringify(request.query);
            request.query = sanitizeObject(request.query, (field, original, sanitized) => {
                if (original !== sanitized) {
                    hasSuspiciousContent = true;
                    logger.warn(
                        {
                            field,
                            original: original.substring(0, 100),
                            sanitized: sanitized.substring(0, 100),
                            path: request.url,
                            userId: request.user?.userId,
                        },
                        'Suspicious query parameter detected and sanitized'
                    );
                }
            });
        }

        // Sanitize URL parameters
        if (request.params && typeof request.params === 'object') {
            originalInputs.params = JSON.stringify(request.params);
            request.params = sanitizeObject(request.params, (field, original, sanitized) => {
                if (original !== sanitized) {
                    hasSuspiciousContent = true;
                    logger.warn(
                        {
                            field,
                            original: original.substring(0, 100),
                            sanitized: sanitized.substring(0, 100),
                            path: request.url,
                            userId: request.user?.userId,
                        },
                        'Suspicious URL parameter detected and sanitized'
                    );
                }
            });
        }

        // Additional security checks for suspicious patterns
        let detectionReason: string[] = [];
        const checkSuspiciousPatterns = (obj: any, path: string = ''): void => {
            if (typeof obj === 'string') {
                // Skip security checks for UUIDs and safe paths
                if (isUUID(obj) || isSafePath(obj)) {
                    return;
                }

                const check = isSuspiciousInput(obj);
                if (check.suspicious) {
                    hasSuspiciousContent = true;
                    detectionReason = [...new Set([...detectionReason, ...check.reasons])];
                    logger.warn(
                        {
                            path: `${path}`,
                            input: obj.substring(0, 100),
                            reasons: check.reasons,
                            url: request.url,
                            userId: request.user?.userId,
                        },
                        'Suspicious security pattern detected'
                    );
                }
            } else if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    checkSuspiciousPatterns(item, `${path}[${index}]`);
                });
            } else if (obj && typeof obj === 'object') {
                Object.entries(obj).forEach(([key, value]) => {
                    if (!shouldSkipSanitization(key)) {
                        checkSuspiciousPatterns(value, path ? `${path}.${key}` : key);
                    }
                });
            }
        };

        if (request.body) checkSuspiciousPatterns(request.body, 'body');
        if (request.query) checkSuspiciousPatterns(request.query, 'query');
        if (request.params) checkSuspiciousPatterns(request.params, 'params');

        // SECURITY (CRITICAL-04): Block requests with high-severity threats
        if (hasSuspiciousContent) {
            const highSeverityThreats = [
                'SQL_INJECTION',
                'COMMAND_INJECTION',
                'FILE_INCLUSION',
                'XXE',
            ];
            const hasHighSeverity = detectionReason.some((r) =>
                highSeverityThreats.includes(r)
            );

            // Log security event (for both authenticated and unauthenticated users)
            const auditData: any = {
                action: 'SUSPICIOUS_INPUT_DETECTED',
                entity: 'security',
                changes: {
                    original: originalInputs,
                    path: request.url,
                    method: request.method,
                    detections: detectionReason,
                    blocked: hasHighSeverity,
                },
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                metadata: {
                    severity: hasHighSeverity ? 'critical' : 'warning',
                    category: detectionReason[0] || 'SECURITY_THREAT',
                    all_categories: detectionReason,
                },
            };

            // Set userId if authenticated, use system placeholder otherwise
            if (request.user?.userId) {
                auditData.userId = request.user.userId;
            }

            // Log to audit asynchronously
            (async () => {
                try {
                    // Only create audit log if we have a userId (required FK)
                    if (auditData.userId) {
                        await prisma.auditLog.create({ data: auditData });
                    } else {
                        // Log unauthenticated attacks to structured logger
                        logger.warn(
                            {
                                ip: request.ip,
                                url: request.url,
                                method: request.method,
                                detections: detectionReason,
                                blocked: hasHighSeverity,
                            },
                            'Unauthenticated suspicious input detected'
                        );
                    }
                } catch (error) {
                    logger.error({ error }, 'Failed to log security event');
                }
            })();

            // BLOCK high-severity threats immediately
            if (hasHighSeverity) {
                logger.warn(
                    {
                        ip: request.ip,
                        url: request.url,
                        method: request.method,
                        detections: detectionReason,
                    },
                    'Request BLOCKED by security policy'
                );
                return reply.code(403).send({
                    success: false,
                    error: {
                        message: 'Request blocked by security policy',
                        code: 'SECURITY_BLOCK',
                    },
                });
            }
        }

        // Set Content Security Policy headers
        reply.header(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
        );
        reply.header('X-XSS-Protection', '1; mode=block');
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('X-Frame-Options', 'DENY');
    } catch (error: any) {
        logger.error({ error }, 'Error in sanitization middleware');
        // Don't block request on middleware errors, just log
    }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(
    obj: any,
    onSanitized?: (field: string, original: string, sanitized: string) => void
): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        const original = obj;
        let sanitized = removeScriptTags(obj);
        sanitized = sanitizeInput(sanitized);

        if (onSanitized && original !== sanitized) {
            onSanitized('', original, sanitized);
        }

        return sanitized;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item, onSanitized));
    }

    if (typeof obj === 'object') {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            // Don't sanitize certain fields that need to remain as-is
            if (shouldSkipSanitization(key)) {
                sanitized[key] = value;
            } else {
                sanitized[key] = sanitizeObject(value, (field, original, sanitized) => {
                    if (onSanitized) {
                        onSanitized(`${key}.${field}`, original, sanitized);
                    }
                });
            }
        }
        return sanitized;
    }

    return obj;
}

/**
 * Fields that should not be sanitized (e.g., IDs, dates, numbers)
 */
function shouldSkipSanitization(field: string): boolean {
    const skipFields = [
        'id',
        'email', // Email format should be validated, not sanitized
        'phone', // Phone format should be validated, not sanitized
        'amount',
        'principal',
        'interestRate',
        'termMonths',
        'page',
        'limit',
        'status',
        'type',
        'method',
        'date',
        'createdAt',
        'updatedAt',
        'paymentDate',
        'disbursementDate',
        'maturityDate',
        'customerId',
        'loanId',
        'branchId',
        'userId',
        'productConfigId',
        'productId',
        'fiscalYear',
        'quarter',
        '*', // Fastify catch-all parameter
    ];

    return skipFields.includes(field.toLowerCase());
}

/**
 * Check if a string is a UUID
 */
function isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Check if a string is a safe path (no directory traversal)
 */
function isSafePath(str: string): boolean {
    // Allow normal URL paths with slashes, but not directory traversal
    return !str.includes('..') && !str.includes('\\');
}

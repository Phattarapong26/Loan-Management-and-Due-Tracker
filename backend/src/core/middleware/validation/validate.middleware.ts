import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';
import { ResponseUtil } from '@utils/formatting/response.util';
import { trackValidationFailure } from '@core/middleware/security/brute-force-protection.middleware';
import { ThreatDetectorService } from '@modules/monitoring/services/threat-detector.service';
import { SecurityMonitorService } from '@modules/monitoring/services/security-monitor.service';

const threatDetector = new ThreatDetectorService();
const securityMonitor = new SecurityMonitorService();

/**
 * Validate request body against Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Check for threats BEFORE validation
            const body = request.body as any;
            const ipAddress = request.ip;
            const userAgent = request.headers['user-agent'];
            
            // Scan all input fields for threats
            const inputValues = Object.values(body || {}).filter(v => typeof v === 'string');
            for (const input of inputValues) {
                const detectionResult = threatDetector.detectThreats(input as string);
                
                // Log each detected threat
                for (const threat of detectionResult.threats) {
                    await securityMonitor.logSecurityEvent({
                        ipAddress,
                        userAgent,
                        endpoint: request.url,
                        method: request.method,
                        threat: {
                            type: threat.type,
                            severity: threat.severity,
                            description: threat.description,
                            payload: input as string,
                            blocked: false
                        },
                        metadata: {
                            field: Object.keys(body || {}).find(k => body[k] === input),
                            detectedPatterns: threat.description
                        }
                    });
                }
            }
            
            // Proceed with validation
            request.body = schema.parse(request.body);
        } catch (error: any) {
            console.error('[Validation] Body validation failed:', error.errors);
            console.error('[Validation] Request body:', request.body);
            return ResponseUtil.validationError(reply, error.errors);
        }
    };
};

/**
 * Validate request body with security tracking (for sensitive endpoints like login)
 */
export const validateBodyWithTracking = (schema: ZodSchema) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Check for threats BEFORE validation
            const body = request.body as any;
            const ipAddress = request.ip;
            const userAgent = request.headers['user-agent'];
            
            // Scan all input fields for threats
            const inputValues = Object.values(body || {}).filter(v => typeof v === 'string');
            let hasCriticalThreat = false;
            
            for (const input of inputValues) {
                const detectionResult = threatDetector.detectThreats(input as string);
                
                // Log each detected threat
                for (const threat of detectionResult.threats) {
                    await securityMonitor.logSecurityEvent({
                        ipAddress,
                        userAgent,
                        endpoint: request.url,
                        method: request.method,
                        threat: {
                            type: threat.type,
                            severity: threat.severity,
                            description: threat.description,
                            payload: input as string,
                            blocked: false
                        },
                        metadata: {
                            field: Object.keys(body || {}).find(k => body[k] === input),
                            detectedPatterns: threat.description
                        }
                    });
                    
                    // Check if this is a CRITICAL threat (intentional attack)
                    if (threat.severity === 'CRITICAL') {
                        hasCriticalThreat = true;
                    }
                }
            }
            
            // Auto-block IP if CRITICAL threat detected
            if (hasCriticalThreat) {
                await securityMonitor.autoBlockIP(
                    ipAddress,
                    'Critical security threat detected - Intentional attack attempt',
                    60 // Block for 1 hour
                );
                
                return reply.code(403).send({
                    success: false,
                    error: {
                        message: 'Access denied. Your IP has been blocked due to malicious activity.',
                        code: 'IP_BLOCKED_MALICIOUS'
                    }
                });
            }
            
            // Proceed with validation
            request.body = schema.parse(request.body);
        } catch (error: any) {
            console.error('[Validation] Body validation failed:', error.errors);
            console.error('[Validation] Request body:', request.body);
            
            // Track validation failure for security monitoring
            const ipAddress = request.ip;
            const userAgent = request.headers['user-agent'];
            await trackValidationFailure(ipAddress, request.url, userAgent);
            
            return ResponseUtil.validationError(reply, error.errors);
        }
    };
};

/**
 * Validate request query against Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            request.query = schema.parse(request.query);
        } catch (error: any) {
            return ResponseUtil.validationError(reply, error.errors);
        }
    };
};

/**
 * Validate request params against Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            request.params = schema.parse(request.params);
        } catch (error: any) {
            return ResponseUtil.validationError(reply, error.errors);
        }
    };
};

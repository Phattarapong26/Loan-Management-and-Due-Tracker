import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

/**
 * Audit middleware - logs all requests for compliance
 */
export const auditLog = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const startTime = Date.now();

    // Log request
    logger.info(
        {
            method: request.method,
            url: request.url,
            userId: request.user?.userId,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
        },
        'Request received'
    );

    // Hook into response to log completion
    // Hook into response to log completion
    reply.raw.on('finish', () => {
        const duration = Date.now() - startTime;

        // Log sensitive operations to database
        if (
            request.method !== 'GET' &&
            shouldAudit(request.url)
        ) {
            // Execute async in background to not block main loop
            (async () => {
                try {
                    // Create audit log with userId stored in metadata
                    // This avoids FK constraint issues while maintaining audit trail
                    await prisma.auditLog.create({
                        data: {
                            userId: request.user?.userId || null, // Nullable to handle deleted users
                            action: `${request.method} ${request.url}`,
                            entity: extractEntity(request.url),
                            entityId: extractEntityId(request.url),
                            changes: request.body as any,
                            ipAddress: request.ip,
                            userAgent: request.headers['user-agent'],
                            metadata: {
                                statusCode: reply.statusCode,
                                duration,
                                requestUserId: request.user?.userId,
                                requestEmail: request.user?.email,
                                requestRole: request.user?.role,
                            },
                        },
                    });
                } catch (err) {
                    logger.error({ error: err }, 'Failed to create audit log');
                }
            })();
        }

        logger.info(
            {
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                duration,
            },
            'Request completed'
        );
    });
};

/**
 * Determine if URL should be audited
 */
function shouldAudit(url: string): boolean {
    const auditPaths = [
        '/api/auth',
        '/api/transactions',
        '/api/users',
        '/api/customers',
        '/api/loans',
        '/api/payments',
    ];
    return auditPaths.some((path) => url.startsWith(path));
}

/**
 * Extract entity from URL
 */
function extractEntity(url: string): string {
    const match = url.match(/\/api\/([^\/]+)/);
    return match ? (match[1] ?? 'unknown') : 'unknown';
}

/**
 * Extract entity ID from URL
 */
function extractEntityId(url: string): string | undefined {
    const match = url.match(/\/api\/[^\/]+\/([^\/\?]+)/);
    return match ? (match[1] ?? 'unknown') : undefined;
}

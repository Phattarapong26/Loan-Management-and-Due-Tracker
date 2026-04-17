import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Correlation ID Middleware
 * 
 * Adds correlation ID to track requests across services and logs
 * - Uses existing X-Correlation-ID header if present
 * - Generates new UUID if not present
 * - Adds to request object and response headers
 * - Includes in all logs for request tracing
 */
export async function correlationIdMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
) {
    // Get correlation ID from header or generate new one
    const correlationId = 
        request.headers['x-correlation-id'] as string ||
        request.headers['x-request-id'] as string ||
        randomUUID();

    // Add to request object for use in handlers
    (request as any).correlationId = correlationId;

    // Add to response headers
    reply.header('X-Correlation-ID', correlationId);
    reply.header('X-Request-ID', request.id);

    // Add to logger context for all subsequent logs
    request.log = request.log.child({
        correlationId,
        requestId: request.id,
    });
}

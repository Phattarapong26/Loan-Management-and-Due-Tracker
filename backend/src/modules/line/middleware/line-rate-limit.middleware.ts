import { FastifyRequest, FastifyReply } from 'fastify';
import redis from '@config/redis.config';
import { logger } from '@utils/common/logger.util';

/**
 * LINE Webhook Rate Limiting Middleware
 * 
 * This middleware implements rate limiting for LINE webhook endpoints to prevent abuse.
 * Uses Redis for distributed rate limiting with a sliding window algorithm.
 * 
 * Rate Limit: 100 requests per minute per LINE user ID
 * 
 * Security Features:
 * - Tracks requests per LINE user ID using Redis
 * - Returns 429 Too Many Requests when limit exceeded
 * - Logs rate limit violations for monitoring
 * - Uses sliding window algorithm for accurate rate limiting
 * - Supports distributed systems via Redis
 * 
 * Requirements: 2, 5, 19
 */

interface LineWebhookBody {
    events: Array<{
        source: {
            userId: string;
            type: string;
        };
        type: string;
    }>;
}

const RATE_LIMIT_MAX = 100; // Maximum requests per window
const RATE_LIMIT_WINDOW = 60; // Time window in seconds (1 minute)

/**
 * Rate limiting middleware for LINE webhook endpoint
 * Limits requests to 100 per minute per LINE user ID
 */
export const lineRateLimit = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const body = request.body as LineWebhookBody;

        // Extract LINE user IDs from all events in the webhook
        const userIds = new Set<string>();
        if (body?.events && Array.isArray(body.events)) {
            for (const event of body.events) {
                if (event.source?.userId) {
                    userIds.add(event.source.userId);
                }
            }
        }

        // If no user IDs found, allow the request (might be a system event)
        if (userIds.size === 0) {
            return;
        }

        // Check rate limit for each unique user ID in the webhook
        for (const userId of userIds) {
            const isAllowed = await checkRateLimit(userId);
            
            if (!isAllowed) {
                // Log rate limit violation
                logger.warn({
                    lineUserId: userId,
                    timestamp: new Date().toISOString(),
                    ip: request.ip,
                    userAgent: request.headers['user-agent'],
                    alert: 'RATE_LIMIT_VIOLATION: User exceeded 100 requests per minute'
                }, 'LINE webhook rate limit exceeded');

                return reply.status(429).send({
                    success: false,
                    error: 'Rate limit exceeded. Please try again later.',
                    code: 'RATE_LIMIT_EXCEEDED'
                });
            }
        }

        // All users are within rate limit - allow the request to proceed
    } catch (error) {
        // Log error but don't block the request on rate limit check failure
        logger.error({
            error,
            timestamp: new Date().toISOString(),
            ip: request.ip
        }, 'Error during LINE webhook rate limit check');
        
        // Allow request to proceed if rate limiting fails (fail open)
        // This prevents rate limiting issues from blocking legitimate traffic
    }
};

/**
 * Check if a LINE user has exceeded the rate limit
 * Uses sliding window algorithm with Redis
 * 
 * @param lineUserId - LINE user ID to check
 * @returns true if request is allowed, false if rate limit exceeded
 */
async function checkRateLimit(lineUserId: string): Promise<boolean> {
    const key = `ratelimit:line:${lineUserId}`;
    const now = Date.now();
    const windowStart = now - (RATE_LIMIT_WINDOW * 1000);

    try {
        // Use Redis pipeline for atomic operations
        const pipeline = redis.pipeline();

        // Remove old entries outside the current window
        pipeline.zremrangebyscore(key, 0, windowStart);

        // Count requests in current window
        pipeline.zcard(key);

        // Add current request with timestamp as score
        pipeline.zadd(key, now, `${now}-${Math.random()}`);

        // Set expiry on the key (cleanup)
        pipeline.expire(key, RATE_LIMIT_WINDOW * 2);

        // Execute pipeline
        const results = await pipeline.exec();

        if (!results) {
            logger.error('Redis pipeline returned null results');
            return true; // Fail open
        }

        // Get count from zcard result (index 1 in pipeline results)
        const countResult = results[1];
        if (!countResult || countResult[0]) {
            logger.error({ error: countResult?.[0] }, 'Error getting rate limit count from Redis');
            return true; // Fail open
        }

        const count = countResult[1] as number;

        // Check if count exceeds limit
        // Note: count is before adding current request, so we check against limit - 1
        return count < RATE_LIMIT_MAX;

    } catch (error) {
        logger.error({
            error,
            lineUserId,
            key
        }, 'Redis error during rate limit check');
        // Fail open - allow request if Redis is unavailable
        return true;
    }
}

/**
 * Get current rate limit status for a LINE user
 * Useful for monitoring and debugging
 * 
 * @param lineUserId - LINE user ID to check
 * @returns Object with current count and limit info
 */
export async function getRateLimitStatus(lineUserId: string): Promise<{
    count: number;
    limit: number;
    remaining: number;
    resetAt: Date;
}> {
    const key = `ratelimit:line:${lineUserId}`;
    const now = Date.now();
    const windowStart = now - (RATE_LIMIT_WINDOW * 1000);

    try {
        // Remove old entries and count current
        await redis.zremrangebyscore(key, 0, windowStart);
        const count = await redis.zcard(key);

        const remaining = Math.max(0, RATE_LIMIT_MAX - count);
        const resetAt = new Date(now + (RATE_LIMIT_WINDOW * 1000));

        return {
            count,
            limit: RATE_LIMIT_MAX,
            remaining,
            resetAt
        };
    } catch (error) {
        logger.error({ error, lineUserId }, 'Error getting rate limit status');
        return {
            count: 0,
            limit: RATE_LIMIT_MAX,
            remaining: RATE_LIMIT_MAX,
            resetAt: new Date(now + (RATE_LIMIT_WINDOW * 1000))
        };
    }
}

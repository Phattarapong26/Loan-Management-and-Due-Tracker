/**
 * Redis-Based Rate Limiter Utility
 * Provides distributed rate limiting for production environments
 * Works correctly across multiple servers and load balancers
 */

import redis from '@config/redis.config';
import { logger } from '@utils/common/logger.util';

/**
 * ตรวจสอบว่าเป็น load test request ที่ถูกต้องหรือไม่
 * ต้องผ่านเงื่อนไขทั้งหมด:
 * 1. ต้องเป็น development environment
 * 2. ต้องมา localhost เท่านั้น
 * 3. ต้องมี secret token ที่ถูกต้อง
 */
function isValidLoadTestRequest(request: any, ipAddress: string): boolean {
  // ❌ ห้ามใช้ใน production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // ✅ ต้องมา localhost เท่านั้น
  const isLocalhost = ipAddress === '127.0.0.1' || 
                     ipAddress === '::1' || 
                     ipAddress === 'localhost';
  
  if (!isLocalhost) {
    return false;
  }

  // ✅ ต้องมี secret token ที่ถูกต้อง
  const loadTestSecret = process.env.LOAD_TEST_SECRET;
  if (!loadTestSecret) {
    return false; // ถ้าไม่มี secret ใน env ก็ไม่อนุญาต
  }

  const providedToken = request.headers['x-load-test-token'];
  if (providedToken !== loadTestSecret) {
    return false;
  }

  return true;
}

export interface RateLimiterConfig {
  requestsPerMinute: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class RateLimiter {
  private config: Required<RateLimiterConfig>;
  private queue: Array<{
    apiCall: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private processing = false;

  constructor(config: RateLimiterConfig) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  /**
   * Check if request is allowed using Redis-based rate limiting
   * This works correctly in distributed environments
   */
  async checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`;
    const window = 60; // 1 minute window

    try {
      // Use Redis INCR for atomic counter
      const count = await redis.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await redis.expire(key, window);
      }

      const allowed = count <= this.config.requestsPerMinute;
      const remaining = Math.max(0, this.config.requestsPerMinute - count);
      const ttl = await redis.ttl(key);
      const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + window * 1000;

      if (!allowed) {
        logger.warn({
          identifier,
          count,
          limit: this.config.requestsPerMinute,
        }, 'Rate limit exceeded');
      }

      return { allowed, remaining, resetAt };
    } catch (error) {
      logger.error({ error, identifier }, 'Rate limit check failed');
      // Fail open - allow request if Redis is down
      return { allowed: true, remaining: this.config.requestsPerMinute, resetAt: Date.now() + 60000 };
    }
  }

  /**
   * Add request to queue with rate limiting
   */
  async processWithDelay<T>(apiCall: () => Promise<T>, identifier?: string): Promise<T> {
    // If identifier provided, check rate limit first
    if (identifier) {
      const { allowed, remaining, resetAt } = await this.checkRateLimit(identifier);

      if (!allowed) {
        const waitTime = Math.max(0, resetAt - Date.now());
        const error = new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
        (error as any).statusCode = 429;
        (error as any).remaining = remaining;
        (error as any).resetAt = resetAt;
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ apiCall, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queue with rate limiting
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { apiCall, resolve, reject } = this.queue.shift()!;

      try {
        const result = await this.executeWithRetry(apiCall);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Add small delay between requests
      await this.sleep(200);
    }

    this.processing = false;
  }

  /**
   * Execute API call with exponential backoff retry
   */
  private async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      // Check if it's a quota error
      if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
        if (attempt <= this.config.retryAttempts) {
          // Parse retry delay from error message
          const retryMatch = error.message.match(/Please retry in (\d+\.?\d*)s/);
          const retryDelay = retryMatch
            ? parseFloat(retryMatch[1]) * 1000
            : this.config.retryDelay * Math.pow(2, attempt - 1);

          logger.warn(
            { attempt, maxAttempts: this.config.retryAttempts, retryDelay },
            'Rate limit exceeded, retrying'
          );

          await this.sleep(retryDelay);
          return this.executeWithRetry(apiCall, attempt + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Get current usage stats for an identifier
   */
  async getUsageStats(identifier: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
    resetAt: number;
  }> {
    const key = `ratelimit:${identifier}`;

    try {
      const count = parseInt((await redis.get(key)) || '0', 10);
      const ttl = await redis.ttl(key);
      const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + 60000;

      return {
        used: count,
        limit: this.config.requestsPerMinute,
        remaining: Math.max(0, this.config.requestsPerMinute - count),
        resetAt,
      };
    } catch (error) {
      logger.error({ error, identifier }, 'Failed to get usage stats');
      return {
        used: 0,
        limit: this.config.requestsPerMinute,
        remaining: this.config.requestsPerMinute,
        resetAt: Date.now() + 60000,
      };
    }
  }

  /**
   * Reset rate limit for an identifier (for testing/admin purposes)
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;
    await redis.del(key);
    logger.info({ identifier }, 'Rate limit reset');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate limit middleware for Fastify
 */
export const rateLimitMiddleware = (options: {
  maxRequests: number;
  windowMs: number;
  identifierGenerator?: (request: any) => string;
}) => {
  const rateLimiter = new RateLimiter({
    requestsPerMinute: options.maxRequests,
  });

  return async (request: any, reply: any) => {
    // 🔒 SECURITY: Only allow load test bypass in development + localhost + with secret
    const ipAddress = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const isLoadTest = isValidLoadTestRequest(request, ipAddress);
    
    if (isLoadTest) {
      console.log('[Rate Limiter] Authorized load test request - skipping rate limit');
      return; // Skip rate limit check for authorized load tests only
    }
    
    const identifier = options.identifierGenerator
      ? options.identifierGenerator(request)
      : ipAddress;

    try {
      const { allowed, remaining, resetAt } = await rateLimiter.checkRateLimit(identifier);

      if (!allowed) {
        const waitTime = Math.max(0, resetAt - Date.now());
        reply.header('X-RateLimit-Limit', options.maxRequests);
        reply.header('X-RateLimit-Remaining', remaining);
        reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
        reply.header('Retry-After', Math.ceil(waitTime / 1000));

        return reply.status(429).send({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`,
          retryAfter: Math.ceil(waitTime / 1000),
        });
      }

      reply.header('X-RateLimit-Limit', options.maxRequests);
      reply.header('X-RateLimit-Remaining', remaining);
      reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
    } catch (error) {
      logger.error({ error }, 'Rate limit middleware error');
      // Fail open - allow request if rate limiting fails
    }
  };
};

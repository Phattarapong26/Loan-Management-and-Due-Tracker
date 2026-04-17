/**
 * Smart Redis Cache Service
 * 
 * กลยุทธ์การ Cache แบบ Real-time Friendly:
 * 1. Cache เฉพาะข้อมูลที่เปลี่ยนไม่บ่อย (Loan Products, System Config)
 * 2. Short TTL สำหรับข้อมูล real-time (Dashboard stats)
 * 3. Auto-invalidate เมื่อมีการอัพเดท
 * 4. Cache-Aside Pattern
 * 5. ✅ Circuit Breaker สำหรับ Redis failures
 */

import { redis } from '@config/redis.config';
import { logger } from '@utils/common/logger.util';
import { circuitBreakers } from '@utils/cache/circuit-breaker.util';

export interface CacheOptions {
    ttl?: number; // seconds
    tags?: string[]; // for bulk invalidation
}

export class CacheService {
    private readonly prefix = 'cache:';

    /**
     * Get cached data (with circuit breaker)
     */
    async get<T>(key: string): Promise<T | null> {
        // Use circuit breaker to protect against Redis failures
        const result = await circuitBreakers.redis.execute(async () => {
            const cached = await redis.get(this.prefix + key);
            if (!cached) return null;

            const data = JSON.parse(cached);
            logger.debug({ key }, '✅ Cache HIT');
            return data as T;
        });

        return result;
    }

    /**
     * Set cache data (with circuit breaker)
     */
    async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
        // Use circuit breaker - if Redis is down, fail silently
        await circuitBreakers.redis.execute(async () => {
            const { ttl = 300, tags = [] } = options; // default 5 minutes
            const fullKey = this.prefix + key;

            // Store data
            await redis.setex(fullKey, ttl, JSON.stringify(value));

            // Store tags for bulk invalidation
            if (tags.length > 0) {
                for (const tag of tags) {
                    await redis.sadd(`${this.prefix}tag:${tag}`, fullKey);
                    await redis.expire(`${this.prefix}tag:${tag}`, ttl + 60); // tag expires after data
                }
            }

            logger.debug({ key, ttl, tags }, '✅ Cache SET');
            return true; // Return something for circuit breaker
        });
    }

    /**
     * Delete specific cache key (with circuit breaker)
     */
    async delete(key: string): Promise<void> {
        await circuitBreakers.redis.execute(async () => {
            await redis.del(this.prefix + key);
            logger.debug({ key }, '✅ Cache DELETED');
            return true;
        });
    }

    /**
     * Delete all cache keys with a tag (with circuit breaker)
     * ใช้เมื่อมีการอัพเดทข้อมูล เช่น loan:* เมื่อมี loan ใหม่
     */
    async deleteByTag(tag: string): Promise<void> {
        await circuitBreakers.redis.execute(async () => {
            const tagKey = `${this.prefix}tag:${tag}`;
            const keys = await redis.smembers(tagKey);

            if (keys.length > 0) {
                await redis.del(...keys);
                await redis.del(tagKey);
                logger.info({ tag, count: keys.length }, '✅ Cache invalidated by tag');
            }
            return true;
        });
    }

    /**
     * Delete cache keys matching pattern (with circuit breaker)
     */
    async deleteByPattern(pattern: string): Promise<void> {
        await circuitBreakers.redis.execute(async () => {
            const keys = await redis.keys(this.prefix + pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
                logger.info({ pattern, count: keys.length }, '✅ Cache invalidated by pattern');
            }
            return true;
        });
    }

    /**
     * Wrap a function with cache
     * Auto cache result and return cached value if exists
     */
    async wrap<T>(
        key: string,
        fn: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        // Try to get from cache
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Execute function
        const result = await fn();

        // Cache result
        await this.set(key, result, options);

        return result;
    }

    /**
     * Clear all cache (use with caution!)
     */
    async clear(): Promise<void> {
        try {
            const keys = await redis.keys(`${this.prefix}*`);
            if (keys.length > 0) {
                await redis.del(...keys);
                logger.warn({ count: keys.length }, '⚠️  All cache cleared');
            }
        } catch (error) {
            logger.error({ error }, '❌ Cache CLEAR error');
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        totalKeys: number;
        memoryUsed: string;
        hitRate?: number;
    }> {
        try {
            const keys = await redis.keys(`${this.prefix}*`);
            const info = await redis.info('memory');
            const memoryMatch = info.match(/used_memory_human:(.+)/);
            const memoryUsed = memoryMatch?.[1]?.trim() || 'unknown'; // Use optional chaining

            return {
                totalKeys: keys.length,
                memoryUsed,
            };
        } catch (error) {
            logger.error({ error }, '❌ Cache STATS error');
            return {
                totalKeys: 0,
                memoryUsed: 'unknown',
            };
        }
    }
}

// Export singleton instance
export const cacheService = new CacheService();

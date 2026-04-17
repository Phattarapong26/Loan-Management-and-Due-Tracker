/**
 * Cache Decorator
 * 
 * ใช้ @Cacheable() decorator เพื่อ cache method result อัตโนมัติ
 * 
 * Example:
 * ```typescript
 * @Cacheable('loan-products:all', CACHE_STRATEGIES.LOAN_PRODUCTS)
 * async getLoanProducts() {
 *   return await prisma.loanProduct.findMany();
 * }
 * ```
 */

import { cacheService, CacheOptions } from '@core/services/cache.service';
import { logger } from '@utils/common/logger.util';

/**
 * Cacheable Method Decorator
 * 
 * @param keyOrFn - Cache key หรือ function ที่ return cache key
 * @param options - Cache options (ttl, tags)
 */
export function Cacheable(
    keyOrFn: string | ((...args: any[]) => string),
    options: CacheOptions = {}
) {
    return function (
        _target: any, // Prefix with underscore to indicate intentionally unused
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Generate cache key
            const cacheKey = typeof keyOrFn === 'function' 
                ? keyOrFn(...args) 
                : keyOrFn;

            try {
                // Try to get from cache
                const cached = await cacheService.get(cacheKey);
                if (cached !== null) {
                    logger.debug({ 
                        method: propertyKey, 
                        key: cacheKey 
                    }, '✅ Cache HIT');
                    return cached;
                }

                // Execute original method
                logger.debug({ 
                    method: propertyKey, 
                    key: cacheKey 
                }, '❌ Cache MISS - executing method');
                
                const result = await originalMethod.apply(this, args);

                // Cache result
                await cacheService.set(cacheKey, result, options);

                return result;
            } catch (error) {
                logger.error({ 
                    error, 
                    method: propertyKey, 
                    key: cacheKey 
                }, '❌ Cache decorator error - executing method without cache');
                
                // Fallback: execute without cache
                return await originalMethod.apply(this, args);
            }
        };

        return descriptor;
    };
}

/**
 * CacheInvalidate Decorator
 * 
 * ใช้เพื่อ invalidate cache อัตโนมัติหลังจาก method ทำงานเสร็จ
 * 
 * Example:
 * ```typescript
 * @CacheInvalidate(['loans', 'dashboard'])
 * async createLoan(data: CreateLoanDto) {
 *   return await prisma.loan.create({ data });
 * }
 * ```
 */
export function CacheInvalidate(tags: string[]) {
    return function (
        _target: any, // Prefix with underscore to indicate intentionally unused
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            try {
                // Execute original method
                const result = await originalMethod.apply(this, args);

                // Invalidate cache by tags
                for (const tag of tags) {
                    await cacheService.deleteByTag(tag);
                }

                logger.debug({ 
                    method: propertyKey, 
                    tags 
                }, '✅ Cache invalidated');

                return result;
            } catch (error) {
                // Don't invalidate cache if method failed
                throw error;
            }
        };

        return descriptor;
    };
}

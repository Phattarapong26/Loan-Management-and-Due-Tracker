/**
 * Cache Utility
 * Provides Redis-based caching for API responses
 */

import redis from '@config/redis.config';
import { logger } from '@utils/common/logger.util';

export class CacheUtil {
  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) return null;
      
      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(key: string, data: any, ttlSeconds: number = 60): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
    }
  }

  /**
   * Delete cached data
   */
  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error({ error, pattern }, 'Cache delete pattern error');
    }
  }

  /**
   * Generate cache key for customer list
   */
  static customerListKey(params: {
    branchId?: string;
    officerId?: string;
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }): string {
    const parts = [
      'customers',
      params.branchId || 'all',
      params.officerId || 'all',
      params.page,
      params.limit,
      params.status || 'all',
      params.search || 'none'
    ];
    return parts.join(':');
  }

  /**
   * Generate cache key for loan list
   */
  static loanListKey(params: {
    branchId?: string;
    customerId?: string;
    page: number;
    limit: number;
    status?: string;
  }): string {
    const parts = [
      'loans',
      params.branchId || 'all',
      params.customerId || 'all',
      params.page,
      params.limit,
      params.status || 'all'
    ];
    return parts.join(':');
  }

  /**
   * Invalidate customer-related caches
   */
  static async invalidateCustomerCaches(customerId?: string): Promise<void> {
    if (customerId) {
      await this.delPattern(`customers:*`);
      await this.delPattern(`customer:${customerId}:*`);
    } else {
      await this.delPattern(`customers:*`);
    }
  }

  /**
   * Invalidate loan-related caches
   */
  static async invalidateLoanCaches(loanId?: string, customerId?: string): Promise<void> {
    await this.delPattern(`loans:*`);
    if (loanId) {
      await this.delPattern(`loan:${loanId}:*`);
    }
    if (customerId) {
      await this.delPattern(`customer:${customerId}:loans:*`);
    }
  }
}

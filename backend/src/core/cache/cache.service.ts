/**
 * Cache Service
 * 
 * Generic caching service with Redis backend
 * Provides get, set, delete, and invalidation methods
 */

import { getRedisClient, isRedisAvailable } from './redis.config';

export class CacheService {
  private prefix: string;
  private defaultTTL: number;

  constructor(prefix: string = 'cache', defaultTTL: number = 300) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL; // 5 minutes default
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return null;
      }

      const redis = getRedisClient();
      const value = await redis.get(this.getKey(key));
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return false;
      }

      const redis = getRedisClient();
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await redis.setex(this.getKey(key), expiry, serialized);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return false;
      }

      const redis = getRedisClient();
      await redis.del(this.getKey(key));
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return 0;
      }

      const redis = getRedisClient();
      const keys = await redis.keys(this.getKey(pattern));
      
      if (keys.length === 0) {
        return 0;
      }

      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return false;
      }

      const redis = getRedisClient();
      const result = await redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetchFn();

    // Store in cache (fire and forget)
    this.set(key, value, ttl).catch(err => {
      console.error('Failed to cache value:', err);
    });

    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    await this.deletePattern(pattern);
  }

  /**
   * Clear all cache with this prefix
   */
  async clear(): Promise<void> {
    await this.deletePattern('*');
  }
}

// Pre-configured cache instances
export const budgetCache = new CacheService('budget', 300); // 5 minutes
export const userCache = new CacheService('user', 600); // 10 minutes
export const branchCache = new CacheService('branch', 1800); // 30 minutes
export const productCache = new CacheService('product', 600); // 10 minutes
export const disbursementCache = new CacheService('disbursement', 180); // 3 minutes


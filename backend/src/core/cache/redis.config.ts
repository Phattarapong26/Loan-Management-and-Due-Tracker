/**
 * Redis Configuration
 * 
 * Centralized Redis client configuration for caching
 */

import Redis from 'ioredis';

// Redis client instance
let redisClient: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });

    redisClient.on('close', () => {
      console.log('⚠️  Redis connection closed');
    });
  }

  return redisClient;
}

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<void> {
  // Skip if Redis is not configured (localhost without REDIS_URL)
  if (!process.env.REDIS_URL && process.env.REDIS_HOST === 'localhost') {
    console.log('ℹ️  Redis not configured - skipping connection');
    return;
  }

  const client = getRedisClient();
  
  if (client.status === 'ready') {
    console.log('✅ Redis already connected');
    return;
  }

  try {
    await client.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('⚠️  Failed to connect to Redis (non-fatal):', error);
    // Don't throw - Redis is optional
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis disconnected');
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis not available:', error);
    return false;
  }
}


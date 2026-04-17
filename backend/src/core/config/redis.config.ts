import Redis from 'ioredis';
import { env } from './env.config';
import { logger } from '@utils/common/logger.util';

// Support REDIS_URL (Railway) or REDIS_HOST/PORT (manual)
const shouldConnectRedis = !!(process.env.REDIS_URL || env.REDIS_HOST !== 'localhost');

const redisOptions = {
    maxRetriesPerRequest: null as null, // Required for BullMQ
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    lazyConnect: true,
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
};

export const redis = shouldConnectRedis
    ? process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, redisOptions)
        : new Redis({ host: env.REDIS_HOST, port: env.REDIS_PORT, password: env.REDIS_PASSWORD, ...redisOptions })
    : null as any;

if (shouldConnectRedis && redis) {
    redis.on('connect', () => {
        logger.info('✅ Redis connected');
    });

    redis.on('error', (error) => {
        logger.error({ error }, '❌ Redis connection error');
    });

    redis.on('close', () => {
        logger.warn('⚠️  Redis connection closed');
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
        await redis.quit();
    });
} else {
    logger.info('ℹ️  Redis not configured - running without cache');
}

export default redis;

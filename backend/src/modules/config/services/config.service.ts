import { Redis } from 'ioredis';
import { logger } from '@utils/common/logger.util';

/**
 * Config Service - Stores dynamic configuration like frontend URL
 */
export class ConfigService {
    private redis: Redis;
    private readonly FRONTEND_URL_KEY = 'config:frontend_url';
    private static instance: ConfigService;

    constructor(redis?: Redis) {
        this.redis = redis || new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
        });
    }

    static getInstance(redis?: Redis): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService(redis);
        }
        return ConfigService.instance;
    }

    /**
     * Get the current frontend URL
     * Returns the dynamically registered URL or falls back to env.FRONTEND_URL
     */
    async getFrontendUrl(defaultUrl: string): Promise<string> {
        try {
            const dynamicUrl = await this.redis.get(this.FRONTEND_URL_KEY);
            if (dynamicUrl) {
                logger.debug({ url: dynamicUrl }, 'Using dynamic frontend URL');
                return dynamicUrl;
            }
        } catch (error) {
            logger.warn({ error }, 'Failed to get dynamic frontend URL, using default');
        }
        return defaultUrl;
    }

    /**
     * Register the current frontend URL
     */
    async setFrontendUrl(url: string): Promise<void> {
        try {
            await this.redis.set(this.FRONTEND_URL_KEY, url);
            logger.info({ url }, 'Frontend URL registered successfully');
        } catch (error) {
            logger.error({ error, url }, 'Failed to register frontend URL');
            throw error;
        }
    }

    /**
     * Clear the registered frontend URL
     */
    async clearFrontendUrl(): Promise<void> {
        try {
            await this.redis.del(this.FRONTEND_URL_KEY);
            logger.info('Frontend URL cleared');
        } catch (error) {
            logger.error({ error }, 'Failed to clear frontend URL');
        }
    }
}

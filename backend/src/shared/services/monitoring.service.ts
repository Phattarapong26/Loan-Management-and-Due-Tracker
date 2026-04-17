/**
 * Monitoring Service
 * 
 * Purpose: System health monitoring and alerting
 * Features:
 * - System health checks
 * - Critical and warning alerts
 * - Performance tracking
 * - Delivery success rate monitoring
 * 
 * Requirements: Requirement 18 - Error Handling & Logging
 */

import { logger } from '@utils/common/logger.util';
import { prisma } from '@config/database.config';
import { redis } from '@config/redis.config';
import axios from 'axios';
import { env } from '@config/env.config';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

interface SystemHealth {
    status: 'healthy' | 'degraded' | 'down';
    database: boolean;
    redis: boolean;
    lineAPI: boolean;
    timestamp: Date;
}

interface PerformanceMetrics {
    lineAPIResponseTime: number;
    notificationDeliveryRate: number;
    webhookProcessingTime: number;
    databaseQueryTime: number;
    errorRate: number;
}

export class MonitoringService {
    private accessToken: string;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
    }

    /**
     * Task 9.2.2: Check system health
     */
    async checkSystemHealth(): Promise<SystemHealth> {
        const health: SystemHealth = {
            status: 'healthy',
            database: false,
            redis: false,
            lineAPI: false,
            timestamp: new Date(),
        };

        // Check database
        try {
            await prisma.$queryRaw`SELECT 1`;
            health.database = true;
        } catch (error) {
            logger.error({ error }, 'Database health check failed');
            health.status = 'down';
        }

        // Check Redis
        try {
            await redis.ping();
            health.redis = true;
        } catch (error) {
            logger.error({ error }, 'Redis health check failed');
            health.status = 'degraded';
        }

        // Check LINE API
        try {
            await axios.get(`${LINE_MESSAGING_API}/bot/info`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
                timeout: 5000,
            });
            health.lineAPI = true;
        } catch (error) {
            logger.error({ error }, 'LINE API health check failed');
            health.status = 'degraded';
        }

        // Log health status
        logger.info({ health }, 'System health check completed');

        // Task 9.2.3: Send critical alerts
        if (health.status === 'down') {
            await this.sendCriticalAlert('Database is down');
        }

        // Task 9.2.4: Send warning alerts
        if (health.status === 'degraded') {
            const issues: string[] = [];
            if (!health.redis) issues.push('Redis');
            if (!health.lineAPI) issues.push('LINE API');
            await this.sendWarningAlert(`System degraded: ${issues.join(', ')} unavailable`);
        }

        return health;
    }

    /**
     * Task 9.2.3: Send critical alerts to admin users
     */
    private async sendCriticalAlert(message: string): Promise<void> {
        try {
            const admins = await prisma.user.findMany({
                where: {
                    role: 'ADMIN',
                    lineUserId: { not: null },
                    lineActive: true,
                },
                select: {
                    lineUserId: true,
                },
            });

            for (const admin of admins) {
                if (!admin.lineUserId) continue;

                try {
                    await axios.post(
                        `${LINE_MESSAGING_API}/message/push`,
                        {
                            to: admin.lineUserId,
                            messages: [
                                {
                                    type: 'text',
                                    text: `🚨 CRITICAL ALERT\n\n${message}\n\nTime: ${new Date().toLocaleString('th-TH')}`,
                                },
                            ],
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                } catch (error) {
                    logger.error({ error, adminLineUserId: admin.lineUserId }, 'Failed to send critical alert');
                }
            }

            logger.error({ message }, 'Critical alert sent to admins');
        } catch (error) {
            logger.error({ error, message }, 'Failed to send critical alerts');
        }
    }

    /**
     * Task 9.2.4: Send warning alerts for degraded performance
     */
    private async sendWarningAlert(message: string): Promise<void> {
        try {
            const admins = await prisma.user.findMany({
                where: {
                    role: 'ADMIN',
                    lineUserId: { not: null },
                    lineActive: true,
                },
                select: {
                    lineUserId: true,
                },
            });

            for (const admin of admins) {
                if (!admin.lineUserId) continue;

                try {
                    await axios.post(
                        `${LINE_MESSAGING_API}/message/push`,
                        {
                            to: admin.lineUserId,
                            messages: [
                                {
                                    type: 'text',
                                    text: `⚠️ WARNING\n\n${message}\n\nTime: ${new Date().toLocaleString('th-TH')}`,
                                },
                            ],
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                } catch (error) {
                    logger.error({ error, adminLineUserId: admin.lineUserId }, 'Failed to send warning alert');
                }
            }

            logger.warn({ message }, 'Warning alert sent to admins');
        } catch (error) {
            logger.error({ error, message }, 'Failed to send warning alerts');
        }
    }

    /**
     * Task 9.2.5: Track LINE API response times (using Redis)
     */
    async trackLineAPIResponseTime(responseTime: number): Promise<void> {
        try {
            await redis.lpush('metrics:line_api_response_time:latest', responseTime.toString());
            await redis.ltrim('metrics:line_api_response_time:latest', 0, 99); // Keep last 100
        } catch (error) {
            logger.error({ error }, 'Failed to track LINE API response time');
        }
    }

    /**
     * Task 9.2.6: Track notification delivery success rate (using Redis)
     */
    async trackNotificationDelivery(success: boolean): Promise<void> {
        try {
            if (success) {
                await redis.incr('metrics:notifications:success:today');
                await redis.expire('metrics:notifications:success:today', 86400); // 24 hours
            }
            await redis.incr('metrics:notifications:total:today');
            await redis.expire('metrics:notifications:total:today', 86400);
        } catch (error) {
            logger.error({ error }, 'Failed to track notification delivery');
        }
    }

    /**
     * Task 9.2.7: Track webhook processing time (using Redis)
     */
    async trackWebhookProcessingTime(processingTime: number): Promise<void> {
        try {
            await redis.lpush('metrics:webhook_processing_time:latest', processingTime.toString());
            await redis.ltrim('metrics:webhook_processing_time:latest', 0, 99);
        } catch (error) {
            logger.error({ error }, 'Failed to track webhook processing time');
        }
    }

    /**
     * Task 9.2.8: Track database query performance (using Redis)
     */
    async trackDatabaseQueryTime(queryTime: number): Promise<void> {
        try {
            await redis.lpush('metrics:database_query_time:latest', queryTime.toString());
            await redis.ltrim('metrics:database_query_time:latest', 0, 99);
        } catch (error) {
            logger.error({ error }, 'Failed to track database query time');
        }
    }

    /**
     * Track error rate (using Redis)
     */
    async trackError(): Promise<void> {
        try {
            await redis.incr('metrics:errors:count:today');
            await redis.expire('metrics:errors:count:today', 86400);
            
            await redis.incr('metrics:requests:count:today');
            await redis.expire('metrics:requests:count:today', 86400);
        } catch (error) {
            logger.error({ error }, 'Failed to track error');
        }
    }

    /**
     * Track successful request (using Redis)
     */
    async trackRequest(): Promise<void> {
        try {
            await redis.incr('metrics:requests:count:today');
            await redis.expire('metrics:requests:count:today', 86400);
        } catch (error) {
            logger.error({ error }, 'Failed to track request');
        }
    }

    /**
     * Task 9.2.9: Get monitoring dashboard data (from Redis)
     */
    async getMonitoringDashboard(): Promise<{
        health: SystemHealth;
        metrics: PerformanceMetrics;
    }> {
        const health = await this.checkSystemHealth();
        const metrics = await this.getMetrics();

        return { health, metrics };
    }

    /**
     * Get metrics from Redis
     */
    private async getMetrics(): Promise<PerformanceMetrics> {
        try {
            // LINE API Response Time (average of last 100)
            const lineApiTimes = await redis.lrange('metrics:line_api_response_time:latest', 0, -1);
            const lineApiAvg = lineApiTimes.length > 0 
                ? lineApiTimes.reduce((a, b) => a + parseFloat(b), 0) / lineApiTimes.length 
                : 0;
            
            // Database Query Time
            const dbTimes = await redis.lrange('metrics:database_query_time:latest', 0, -1);
            const dbAvg = dbTimes.length > 0 
                ? dbTimes.reduce((a, b) => a + parseFloat(b), 0) / dbTimes.length 
                : 0;
            
            // Webhook Processing Time
            const webhookTimes = await redis.lrange('metrics:webhook_processing_time:latest', 0, -1);
            const webhookAvg = webhookTimes.length > 0 
                ? webhookTimes.reduce((a, b) => a + parseFloat(b), 0) / webhookTimes.length 
                : 0;
            
            // Error Rate
            const errors = parseInt(await redis.get('metrics:errors:count:today') || '0');
            const requests = parseInt(await redis.get('metrics:requests:count:today') || '0');
            const errorRate = requests > 0 ? (errors / requests) * 100 : 0;
            
            // Delivery Rate
            const successNotifications = parseInt(await redis.get('metrics:notifications:success:today') || '0');
            const totalNotifications = parseInt(await redis.get('metrics:notifications:total:today') || '0');
            const deliveryRate = totalNotifications > 0 ? (successNotifications / totalNotifications) * 100 : 0;
            
            return {
                lineAPIResponseTime: Math.round(lineApiAvg),
                databaseQueryTime: Math.round(dbAvg),
                webhookProcessingTime: Math.round(webhookAvg),
                errorRate: parseFloat(errorRate.toFixed(2)),
                notificationDeliveryRate: parseFloat(deliveryRate.toFixed(2)),
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get metrics from Redis');
            return {
                lineAPIResponseTime: 0,
                databaseQueryTime: 0,
                webhookProcessingTime: 0,
                errorRate: 0,
                notificationDeliveryRate: 0,
            };
        }
    }

    /**
     * Reset metrics (for testing)
     */
    async resetMetrics(): Promise<void> {
        try {
            const keys = await redis.keys('metrics:*');
            if (keys.length > 0) {
                await redis.del(...keys);
            }
            logger.info('Metrics reset');
        } catch (error) {
            logger.error({ error }, 'Failed to reset metrics');
        }
    }
}

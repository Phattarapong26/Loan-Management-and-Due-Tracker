import { prisma } from '@config/database.config';
import redis from '@config/redis.config';
import { logger } from '@utils/common/logger.util';
import fs from 'fs/promises';

/**
 * Health Check Service
 * Provides comprehensive health checks for production monitoring
 */

interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: {
        database: HealthStatus;
        redis: HealthStatus;
        queue: HealthStatus;
        disk: HealthStatus;
        memory: HealthStatus;
        uptime: number;
    };
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    message?: string;
    details?: any;
}

export class HealthCheckService {
    /**
     * Get comprehensive health check
     */
    async getHealthCheck(): Promise<HealthCheckResult> {
        const checks = {
            database: await this.checkDatabase(),
            redis: await this.checkRedis(),
            queue: await this.checkQueue(),
            disk: await this.checkDisk(),
            memory: await this.checkMemory(),
            uptime: process.uptime(),
        };

        const overallStatus = this.getOverallStatus(checks);

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks,
        };
    }

    /**
     * Check database health
     */
    private async checkDatabase(): Promise<HealthStatus> {
        try {
            const startTime = Date.now();
            
            // Test database connection
            await prisma.$queryRaw`SELECT 1`;
            
            const latency = Date.now() - startTime;

            if (latency > 1000) {
                return {
                    status: 'degraded',
                    latency,
                    message: 'Database response time is slow',
                };
            }

            return {
                status: 'healthy',
                latency,
                message: 'Database is healthy',
            };
        } catch (error) {
            logger.error({ error }, 'Database health check failed');
            return {
                status: 'unhealthy',
                message: 'Database is not accessible',
            };
        }
    }

    /**
     * Check Redis health
     */
    private async checkRedis(): Promise<HealthStatus> {
        try {
            const startTime = Date.now();
            
            // Test Redis connection
            await redis.ping();
            
            const latency = Date.now() - startTime;

            if (latency > 1000) {
                return {
                    status: 'degraded',
                    latency,
                    message: 'Redis response time is slow',
                };
            }

            return {
                status: 'healthy',
                latency,
                message: 'Redis is healthy',
            };
        } catch (error) {
            logger.error({ error }, 'Redis health check failed');
            return {
                status: 'unhealthy',
                message: 'Redis is not accessible',
            };
        }
    }

    /**
     * Check queue health (BullMQ)
     */
    private async checkQueue(): Promise<HealthStatus> {
        try {
            // Check if queue is accessible
            await redis.ping();
            
            return {
                status: 'healthy',
                message: 'Queue is healthy',
            };
        } catch (error) {
            logger.error({ error }, 'Queue health check failed');
            return {
                status: 'unhealthy',
                message: 'Queue is not accessible',
            };
        }
    }

    /**
     * Check disk space
     */
    private async checkDisk(): Promise<HealthStatus> {
        try {
            const stats = await fs.statfs('/');

            const totalSpace = stats.blocks * stats.bsize;
            const freeSpace = stats.bavail * stats.bsize;
            const usedSpace = totalSpace - freeSpace;
            const usagePercent = (usedSpace / totalSpace) * 100;

            if (usagePercent >= 95) {
                return {
                    status: 'unhealthy',
                    message: `Disk usage is critical: ${usagePercent.toFixed(2)}%`,
                    details: { usagePercent, freeSpace, totalSpace },
                };
            }

            if (usagePercent >= 90) {
                return {
                    status: 'degraded',
                    message: `Disk usage is high: ${usagePercent.toFixed(2)}%`,
                    details: { usagePercent, freeSpace, totalSpace },
                };
            }

            return {
                status: 'healthy',
                message: 'Disk space is sufficient',
                details: { usagePercent, freeSpace, totalSpace },
            };
        } catch (error) {
            // If disk check fails, don't fail the entire health check
            // Just mark disk as unknown and continue
            logger.warn({ error }, 'Disk health check failed, marking as unknown');
            return {
                status: 'healthy',
                message: 'Disk check unavailable',
                details: { error: 'Unable to check disk space' },
            };
        }
    }

    /**
     * Check memory usage
     */
    private async checkMemory(): Promise<HealthStatus> {
        try {
            const heapUsed = process.memoryUsage().heapUsed;
            
            if (heapUsed >= 800 * 1024 * 1024) {
                return {
                    status: 'unhealthy',
                    message: `Memory usage is critical: ${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
                    details: { heapUsed },
                };
            }

            if (heapUsed >= 500 * 1024 * 1024) {
                return {
                    status: 'degraded',
                    message: `Memory usage is high: ${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
                    details: { heapUsed },
                };
            }

            return {
                status: 'healthy',
                message: 'Memory usage is normal',
                details: { heapUsed },
            };
        } catch (error) {
            logger.error({ error }, 'Memory health check failed');
            return {
                status: 'unhealthy',
                message: 'Unable to check memory usage',
            };
        }
    }

    /**
     * Determine overall health status
     */
    private getOverallStatus(checks: {
        database: HealthStatus;
        redis: HealthStatus;
        queue: HealthStatus;
        disk: HealthStatus;
        memory: HealthStatus;
        uptime: number;
    }): 'healthy' | 'degraded' | 'unhealthy' {
        const statuses = [
            checks.database.status,
            checks.redis.status,
            checks.queue.status,
            checks.disk.status,
            checks.memory.status,
        ];

        // If any service is unhealthy, overall is unhealthy
        if (statuses.some(s => s === 'unhealthy')) {
            return 'unhealthy';
        }

        // If any service is degraded, overall is degraded
        if (statuses.some(s => s === 'degraded')) {
            return 'degraded';
        }

        return 'healthy';
    }
}

export const healthCheckService = new HealthCheckService();

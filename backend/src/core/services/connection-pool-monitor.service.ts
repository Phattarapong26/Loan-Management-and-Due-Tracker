/**
 * Connection Pool Monitor Service
 * 
 * Monitors database connection pool usage and provides metrics
 */

import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import { register, Gauge } from 'prom-client';
// Counter imported but commented out for future use
// import { Counter } from 'prom-client';

/**
 * Connection Pool Metrics
 */
export class ConnectionPoolMonitor {
    private activeConnectionsGauge: Gauge<string>;
    private idleConnectionsGauge: Gauge<string>;
    private waitingRequestsGauge: Gauge<string>;
    // Commented out unused counters - can be enabled if needed in future
    // private totalConnectionsCounter: Counter<string>;
    // private poolTimeoutsCounter: Counter<string>;
    private monitoringInterval?: NodeJS.Timeout;

    constructor() {
        // Create Prometheus metrics
        this.activeConnectionsGauge = new Gauge({
            name: 'db_pool_active_connections',
            help: 'Number of active database connections',
            registers: [register],
        });

        this.idleConnectionsGauge = new Gauge({
            name: 'db_pool_idle_connections',
            help: 'Number of idle database connections',
            registers: [register],
        });

        this.waitingRequestsGauge = new Gauge({
            name: 'db_pool_waiting_requests',
            help: 'Number of requests waiting for a connection',
            registers: [register],
        });

        // Commented out unused counters - can be enabled if needed in future
        // this.totalConnectionsCounter = new Counter({
        //     name: 'db_pool_total_connections',
        //     help: 'Total number of database connections created',
        //     registers: [register],
        // });

        // this.poolTimeoutsCounter = new Counter({
        //     name: 'db_pool_timeouts',
        //     help: 'Number of connection pool timeouts',
        //     registers: [register],
        // });

        logger.info('Connection Pool Monitor initialized');
    }

    /**
     * Start monitoring
     */
    startMonitoring(intervalMs: number = 5000): void {
        if (this.monitoringInterval) {
            logger.warn('Connection pool monitoring already started');
            return;
        }

        this.monitoringInterval = setInterval(async () => {
            await this.updateMetrics();
        }, intervalMs);

        logger.info({ intervalMs }, 'Connection pool monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
            logger.info('Connection pool monitoring stopped');
        }
    }

    /**
     * Update metrics
     */
    private async updateMetrics(): Promise<void> {
        try {
            // Get Prisma metrics (requires Prisma 4.5+ with metrics preview feature)
            // @ts-ignore - $metrics is available when metrics preview feature is enabled
            const metrics = await prisma.$metrics?.json();
            
            if (!metrics) {
                // Metrics not available, skip update
                return;
            }

            // Parse metrics
            const activeConnections = this.findMetric(metrics, 'prisma_client_queries_active');
            const totalConnections = this.findMetric(metrics, 'prisma_pool_connections_open');
            const waitingRequests = this.findMetric(metrics, 'prisma_client_queries_wait');

            // Calculate idle connections (total - active)
            const idleConnections = Math.max(0, totalConnections - activeConnections);

            // Update Prometheus metrics
            this.activeConnectionsGauge.set(activeConnections);
            this.idleConnectionsGauge.set(idleConnections);
            this.waitingRequestsGauge.set(waitingRequests);

            // Log if pool is getting full
            const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '10');
            const utilizationPercent = (activeConnections / poolSize) * 100;

            if (utilizationPercent > 80) {
                logger.warn(
                    {
                        active: activeConnections,
                        idle: idleConnections,
                        waiting: waitingRequests,
                        poolSize,
                        utilization: `${utilizationPercent.toFixed(1)}%`,
                    },
                    '⚠️  Database connection pool utilization high'
                );
            }

            // Log if requests are waiting
            if (waitingRequests > 0) {
                logger.warn(
                    {
                        waiting: waitingRequests,
                        active: activeConnections,
                        poolSize,
                    },
                    '⚠️  Requests waiting for database connections'
                );
            }
        } catch (error) {
            logger.error({ error }, 'Failed to update connection pool metrics');
        }
    }

    /**
     * Find metric value by key
     */
    private findMetric(metrics: any, key: string): number {
        const counter = metrics.counters?.find((c: any) => c.key === key);
        return counter?.value || 0;
    }

    /**
     * Get current pool statistics
     */
    async getStats(): Promise<{
        active: number;
        idle: number;
        waiting: number;
        total: number;
        poolSize: number;
        utilization: string;
    }> {
        try {
            // @ts-ignore - $metrics is available when metrics preview feature is enabled
            const metrics = await prisma.$metrics?.json();
            
            if (!metrics) {
                // Return default values if metrics not available
                return {
                    active: 0,
                    idle: 0,
                    waiting: 0,
                    total: 0,
                    poolSize: 500,
                    utilization: '0%',
                };
            }

            const active = this.findMetric(metrics, 'prisma_client_queries_active');
            const total = this.findMetric(metrics, 'prisma_pool_connections_open');
            const waiting = this.findMetric(metrics, 'prisma_client_queries_wait');
            const idle = Math.max(0, total - active);
            const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '10');
            const utilization = `${((active / poolSize) * 100).toFixed(1)}%`;

            return {
                active,
                idle,
                waiting,
                total,
                poolSize,
                utilization,
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get connection pool stats');
            return {
                active: 0,
                idle: 0,
                waiting: 0,
                total: 0,
                poolSize: 0,
                utilization: '0%',
            };
        }
    }

    /**
     * Check if pool is healthy
     */
    async isHealthy(): Promise<boolean> {
        try {
            const stats = await this.getStats();

            // Pool is unhealthy if:
            // 1. Utilization > 90%
            // 2. Requests are waiting
            // 3. No idle connections

            const utilizationPercent = parseFloat(stats.utilization);

            if (utilizationPercent > 90) {
                logger.warn({ stats }, 'Connection pool utilization critical');
                return false;
            }

            if (stats.waiting > 0) {
                logger.warn({ stats }, 'Requests waiting for connections');
                return false;
            }

            return true;
        } catch (error) {
            logger.error({ error }, 'Failed to check connection pool health');
            return false;
        }
    }
}

// Export singleton instance
export const connectionPoolMonitor = new ConnectionPoolMonitor();

/**
 * Example usage:
 * 
 * // Start monitoring
 * connectionPoolMonitor.startMonitoring(5000); // Every 5 seconds
 * 
 * // Get statistics
 * const stats = await connectionPoolMonitor.getStats();
 * console.log('Pool stats:', stats);
 * 
 * // Check health
 * const healthy = await connectionPoolMonitor.isHealthy();
 * if (!healthy) {
 *     console.warn('Connection pool is unhealthy!');
 * }
 * 
 * // Stop monitoring
 * connectionPoolMonitor.stopMonitoring();
 */

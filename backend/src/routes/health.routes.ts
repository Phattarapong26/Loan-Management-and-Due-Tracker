import { FastifyInstance } from 'fastify';
import { healthCheckService } from '@core/services/health-check.service';

/**
 * Health Check Routes
 * Provides comprehensive health check endpoints for production monitoring
 */

export async function healthCheckRoutes(fastify: FastifyInstance) {
    /**
     * GET /health
     * Comprehensive health check endpoint
     * Returns status of all system components
     */
    fastify.get('/health', async (_, reply) => {
        try {
            const health = await healthCheckService.getHealthCheck();

            // Always return 200 with health status in the body
            // Never return 503 as it causes the entire endpoint to fail
            reply.code(200);
            return health;
        } catch (error) {
            // Log the error but still return 200 with degraded status
            console.error('Health check error:', error);
            reply.code(200);
            return {
                status: 'degraded',
                timestamp: new Date().toISOString(),
                error: 'Health check partially failed',
                checks: {
                    database: { status: 'unknown', message: 'Check failed' },
                    redis: { status: 'unknown', message: 'Check failed' },
                    queue: { status: 'unknown', message: 'Check failed' },
                    disk: { status: 'unknown', message: 'Check failed' },
                    memory: { status: 'unknown', message: 'Check failed' },
                    uptime: process.uptime(),
                },
            };
        }
    });

    /**
     * GET /health/ready
     * Readiness check - checks if the service is ready to accept traffic
     */
    fastify.get('/health/ready', async (_, reply) => {
        try {
            const health = await healthCheckService.getHealthCheck();
            
            // Service is ready if database and redis are healthy
            const isReady = health.checks.database.status === 'healthy' && 
                           health.checks.redis.status === 'healthy';
            
            reply.code(isReady ? 200 : 503);
            return {
                status: isReady ? 'ready' : 'not ready',
                timestamp: health.timestamp,
            };
        } catch (error) {
            reply.code(503);
            return {
                status: 'not ready',
                timestamp: new Date().toISOString(),
            };
        }
    });

    /**
     * GET /health/live
     * Liveness check - checks if the service is alive
     */
    fastify.get('/health/live', async (_, reply) => {
        reply.code(200);
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });
}

/**
 * Metrics Routes
 * 
 * Provides Prometheus-compatible metrics endpoint for monitoring
 */

import { FastifyInstance } from 'fastify';
import { getMetrics } from '@utils/monitoring/metrics.util';

export async function metricsRoutes(fastify: FastifyInstance) {
    /**
     * GET /metrics
     * Prometheus metrics endpoint
     * 
     * Returns metrics in Prometheus text format
     * Should be scraped by Prometheus server
     */
    fastify.get('/metrics', async (_, reply) => {
        try {
            const metrics = await getMetrics();
            
            reply.header('Content-Type', 'text/plain; version=0.0.4');
            return metrics;
        } catch (error) {
            reply.code(500);
            return {
                error: 'Failed to generate metrics',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
}

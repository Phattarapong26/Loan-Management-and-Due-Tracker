/**
 * Prometheus Metrics Utility
 * 
 * Provides metrics collection for production monitoring
 * Usage: Import and use counters/histograms in services
 */

import { Counter, Histogram, register } from 'prom-client';

/**
 * Payment Processing Metrics
 */
export const paymentMetrics = {
    /**
     * Total number of payment attempts
     * Labels: status (success/failure), payment_type (EARLY/ON_TIME/LATE)
     */
    total: new Counter({
        name: 'payments_total',
        help: 'Total number of payment processing attempts',
        labelNames: ['status', 'payment_type'],
    }),

    /**
     * Payment processing duration in seconds
     * Buckets optimized for payment operations (100ms to 10s)
     */
    duration: new Histogram({
        name: 'payment_duration_seconds',
        help: 'Payment processing duration in seconds',
        labelNames: ['payment_type'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),

    /**
     * Optimistic lock conflicts
     */
    conflicts: new Counter({
        name: 'payment_optimistic_lock_conflicts_total',
        help: 'Number of optimistic lock conflicts during payment processing',
        labelNames: ['retry_attempt'],
    }),

    /**
     * Idempotent payment requests (duplicates detected)
     */
    idempotent: new Counter({
        name: 'payment_idempotent_requests_total',
        help: 'Number of idempotent payment requests (duplicates)',
    }),

    /**
     * Transaction timeout warnings
     */
    slowTransactions: new Counter({
        name: 'payment_slow_transactions_total',
        help: 'Number of slow payment transactions (>3s)',
        labelNames: ['duration_bucket'],
    }),
};

/**
 * Database Metrics
 */
export const databaseMetrics = {
    /**
     * Database query duration
     */
    queryDuration: new Histogram({
        name: 'database_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['operation'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),

    /**
     * Database connection pool
     */
    poolSize: new Counter({
        name: 'database_pool_connections_total',
        help: 'Total database pool connections',
        labelNames: ['state'],
    }),
};

/**
 * Get metrics endpoint data (for /metrics route)
 */
export async function getMetrics(): Promise<string> {
    return register.metrics();
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics(): void {
    register.clear();
}

/**
 * Circuit Breaker Middleware for Fastify
 * Protects endpoints from cascading failures
 */

import { FastifyReply } from 'fastify';
import { dbCircuitBreaker, paymentCircuitBreaker } from '../utils/common/circuit-breaker.util';

export const circuitBreakerMiddleware = (breakerType: 'db' | 'payment') => {
    return async (_request: unknown, reply: FastifyReply) => {
        const breaker = breakerType === 'db' ? dbCircuitBreaker : paymentCircuitBreaker;

        if (breaker.getState() === 'OPEN') {
            return reply.status(503).send({
                error: 'Service Unavailable',
                message: 'Circuit breaker is open. Please try again later.',
            });
        }

        // Continue to next middleware
        return reply;
    };
};

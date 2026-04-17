import { logger } from '@utils/common/logger.util';

/**
 * Circuit Breaker Utility
 * 
 * Prevents cascading failures when cache (Redis) is down
 * 
 * States:
 * - CLOSED: Normal operation, all requests go through
 * - OPEN: Circuit is open, all requests fail fast
 * - HALF_OPEN: Testing if service recovered
 */

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
    failureThreshold?: number; // Number of failures before opening circuit
    successThreshold?: number; // Number of successes to close circuit from half-open
    timeout?: number; // Time in ms before attempting to close circuit
    name?: string; // Circuit breaker name for logging
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    name: 'default',
};

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private nextAttempt: number = Date.now();
    private options: Required<CircuitBreakerOptions>;

    constructor(options: CircuitBreakerOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Execute function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T | null> {
        // Check if circuit is open
        if (this.state === CircuitState.OPEN) {
            // Check if timeout has passed
            if (Date.now() < this.nextAttempt) {
                logger.debug(
                    {
                        name: this.options.name,
                        state: this.state,
                        nextAttempt: new Date(this.nextAttempt).toISOString(),
                    },
                    'Circuit breaker is OPEN - failing fast'
                );
                return null; // Fail fast
            }

            // Timeout passed, try half-open
            this.state = CircuitState.HALF_OPEN;
            this.successCount = 0;
            logger.info(
                { name: this.options.name },
                'Circuit breaker entering HALF_OPEN state'
            );
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error: any) {
            this.onFailure(error);
            return null;
        }
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        this.failureCount = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;

            if (this.successCount >= this.options.successThreshold) {
                this.state = CircuitState.CLOSED;
                logger.info(
                    { name: this.options.name },
                    'Circuit breaker CLOSED - service recovered'
                );
            }
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(error: Error): void {
        this.failureCount++;
        this.successCount = 0;

        logger.warn(
            {
                name: this.options.name,
                failureCount: this.failureCount,
                threshold: this.options.failureThreshold,
                error: error.message,
            },
            'Circuit breaker failure recorded'
        );

        if (
            this.failureCount >= this.options.failureThreshold ||
            this.state === CircuitState.HALF_OPEN
        ) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.options.timeout;

            logger.error(
                {
                    name: this.options.name,
                    failureCount: this.failureCount,
                    nextAttempt: new Date(this.nextAttempt).toISOString(),
                },
                'Circuit breaker OPENED - service unavailable'
            );
        }
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt) : null,
        };
    }

    /**
     * Reset circuit breaker
     */
    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
        logger.info({ name: this.options.name }, 'Circuit breaker manually reset');
    }
}

/**
 * Global circuit breakers for common services
 */
export const circuitBreakers = {
    redis: new CircuitBreaker({ name: 'redis', failureThreshold: 5, timeout: 60000 }),
    database: new CircuitBreaker({ name: 'database', failureThreshold: 3, timeout: 30000 }),
};

/**
 * Example usage:
 * 
 * // Basic usage
 * const breaker = new CircuitBreaker({ name: 'my-service' });
 * const result = await breaker.execute(async () => {
 *     return await someOperation();
 * });
 * 
 * if (result === null) {
 *     // Circuit is open or operation failed
 *     // Use fallback or return cached data
 * }
 * 
 * // With global circuit breaker
 * const data = await circuitBreakers.redis.execute(async () => {
 *     return await redis.get('key');
 * });
 * 
 * if (data === null) {
 *     // Redis is down, fetch from database
 *     return await database.query(...);
 * }
 */

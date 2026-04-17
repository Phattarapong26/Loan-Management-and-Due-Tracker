/**
 * Simple Circuit Breaker Implementation
 * Prevents cascading failures when downstream services fail
 */

export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private threshold: number = 5,
        private timeout: number = 60000
    ) {}

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check circuit state
        if (this.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failures = 0;
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
        }
    }

    private onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
        }
    }

    getState() {
        return this.state;
    }

    reset() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
}

// Singleton instance for database operations
export const dbCircuitBreaker = new CircuitBreaker(5, 60000);

// Singleton instance for payment operations
export const paymentCircuitBreaker = new CircuitBreaker(3, 30000);

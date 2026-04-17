import { logger } from './logger.util';

/**
 * Retry Utility
 * 
 * Provides retry mechanism for operations that may fail due to:
 * - Race conditions
 * - Temporary network issues
 * - Database deadlocks
 * - Optimistic locking conflicts
 */

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
    onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 100, // ms
    maxDelay: 5000, // ms
    backoffMultiplier: 2,
    retryableErrors: [
        'P2034', // Prisma: Transaction conflict
        'P2002', // Prisma: Unique constraint violation
        'P2025', // Prisma: Record not found (optimistic locking)
        '40001', // PostgreSQL: Serialization failure
        '40P01', // PostgreSQL: Deadlock detected
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
    ],
    onRetry: () => {},
};

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error;
    let delay = opts.initialDelay;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if error is retryable
            const isRetryable = opts.retryableErrors.some(code =>
                error.code === code ||
                error.message?.includes(code) ||
                error.name?.includes(code)
            );

            // If not retryable or last attempt, throw immediately
            if (!isRetryable || attempt === opts.maxRetries) {
                throw error;
            }

            // Log retry attempt
            logger.warn(
                {
                    attempt: attempt + 1,
                    maxRetries: opts.maxRetries,
                    error: error.message,
                    code: error.code,
                    delay,
                },
                'Retrying operation after error'
            );

            // Call onRetry callback
            opts.onRetry(attempt + 1, error);

            // Wait before retry with exponential backoff
            await sleep(delay);

            // Increase delay for next retry
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError!;
}

/**
 * Execute function with retry logic and jitter
 * Jitter helps prevent thundering herd problem
 */
export async function withRetryAndJitter<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error;
    let delay = opts.initialDelay;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if error is retryable
            const isRetryable = opts.retryableErrors.some(code =>
                error.code === code ||
                error.message?.includes(code) ||
                error.name?.includes(code)
            );

            // If not retryable or last attempt, throw immediately
            if (!isRetryable || attempt === opts.maxRetries) {
                throw error;
            }

            // Add jitter (random delay between 0 and delay)
            const jitter = Math.random() * delay;
            const totalDelay = delay + jitter;

            // Log retry attempt
            logger.warn(
                {
                    attempt: attempt + 1,
                    maxRetries: opts.maxRetries,
                    error: error.message,
                    code: error.code,
                    delay: totalDelay,
                },
                'Retrying operation with jitter after error'
            );

            // Call onRetry callback
            opts.onRetry(attempt + 1, error);

            // Wait before retry
            await sleep(totalDelay);

            // Increase delay for next retry
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError!;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any, retryableErrors?: string[]): boolean {
    const errors = retryableErrors || DEFAULT_OPTIONS.retryableErrors;
    return errors.some(code =>
        error.code === code ||
        error.message?.includes(code) ||
        error.name?.includes(code)
    );
}

/**
 * Retry decorator for class methods
 */
export function Retry(options: RetryOptions = {}) {
    return function (
        _target: any, // Prefix with underscore to indicate intentionally unused
        _propertyKey: string, // Prefix with underscore to indicate intentionally unused
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return withRetry(
                () => originalMethod.apply(this, args),
                options
            );
        };

        return descriptor;
    };
}

/**
 * Example usage:
 * 
 * // Basic retry
 * const result = await withRetry(async () => {
 *     return await someOperation();
 * });
 * 
 * // With custom options
 * const result = await withRetry(async () => {
 *     return await someOperation();
 * }, {
 *     maxRetries: 5,
 *     initialDelay: 200,
 *     onRetry: (attempt, error) => {
 *         console.log(`Retry attempt ${attempt}: ${error.message}`);
 *     }
 * });
 * 
 * // With jitter
 * const result = await withRetryAndJitter(async () => {
 *     return await someOperation();
 * });
 * 
 * // As decorator
 * class MyService {
 *     @Retry({ maxRetries: 3 })
 *     async myMethod() {
 *         // This method will automatically retry on failure
 *     }
 * }
 */

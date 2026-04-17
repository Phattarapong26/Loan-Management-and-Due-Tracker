/**
 * Application Constants
 * 
 * Centralized configuration values for the application
 * Extracted from magic numbers to improve maintainability
 */

/**
 * Optimistic Locking & Retry Configuration
 */
export const OPTIMISTIC_LOCKING = {
    /**
     * Base delay for exponential backoff (milliseconds)
     * Formula: Math.pow(2, attempt) * RETRY_BASE_DELAY_MS
     * Example: attempt 1 = 200ms, attempt 2 = 400ms, attempt 3 = 800ms
     */
    RETRY_BASE_DELAY_MS: 100,

    /**
     * Maximum number of retry attempts for optimistic lock conflicts
     */
    MAX_RETRY_ATTEMPTS: 3,

    /**
     * Transaction timeout warning threshold (milliseconds)
     * Log warning if transaction takes longer than this
     */
    SLOW_TRANSACTION_THRESHOLD_MS: 3000,
} as const;

/**
 * Database Transaction Configuration
 */
export const TRANSACTION_CONFIG = {
    /**
     * Maximum time to wait for transaction to start (milliseconds)
     * If database is busy, wait up to this time before failing
     * Increased for production load
     */
    MAX_WAIT_MS: 30000, // 30 seconds

    /**
     * Maximum time for transaction to complete (milliseconds)
     * Transaction will be rolled back if it exceeds this time
     * Increased for production load
     */
    TIMEOUT_MS: 60000, // 60 seconds
} as const;

/**
 * Payment Processing Configuration
 */
export const PAYMENT_CONFIG = {
    /**
     * Maximum number of retry attempts for payment processing
     */
    MAX_RETRY_ATTEMPTS: 3,

    /**
     * Batch processing timeout per payment (milliseconds)
     */
    BATCH_TIMEOUT_MS: 30000,
} as const;

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
    /**
     * Session cleanup interval (milliseconds)
     */
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes

    /**
     * Session expiry time (milliseconds)
     */
    EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT = {
    /**
     * Maximum requests per time window
     */
    MAX_REQUESTS: 100,

    /**
     * Time window for rate limiting (milliseconds)
     */
    WINDOW_MS: 60 * 1000, // 1 minute
} as const;

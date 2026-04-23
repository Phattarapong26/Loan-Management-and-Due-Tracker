import { config } from 'dotenv';
import { z } from 'zod';

config();

/**
 * Parse expiry string to milliseconds
 * Examples: "1h" -> 3600000, "7d" -> 604800000, "15m" -> 900000
 */
export function parseExpiryToMs(expiry: string | undefined): number {
    if (!expiry) {
        console.warn('[ENV] No expiry provided, defaulting to 1 hour');
        return 3600000;
    }

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) {
        console.warn(`[ENV] Invalid expiry format: ${expiry}, defaulting to 1 hour`);
        return 3600000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 3600000;
    }
}

const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    HOST: z.string().default('0.0.0.0'),

    // Database
    DATABASE_URL: z.string(),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379'),
    REDIS_PASSWORD: z.string().optional(),

    // JWT
    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default('1h'),
    JWT_REFRESH_SECRET: z.string(),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Encryption
    ENCRYPTION_KEY: z.string().min(32),
    ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),

    // Rate Limiting
    RATE_LIMIT_MAX: z.string().default('100'),
    RATE_LIMIT_TIME_WINDOW: z.string().default('60000'),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:3001'),

    // Frontend URL (for LINE registration links)
    FRONTEND_URL: z.string().default('http://localhost:8080'),

    // Backend URL (for serving public files like PDFs)
    BACKEND_URL: z.string().default('http://localhost:3000'),


    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // Queue
    QUEUE_CONCURRENCY: z.string().default('5'),

    // Session
    SESSION_SECRET: z.string(),
    SESSION_EXPIRES_IN: z.string().default('7d'), // Session expiry (sliding window)
    MAX_SESSIONS_PER_USER: z.string().default('5'), // Max concurrent sessions

    // LINE Integration (Optional - configure in Railway Variables for production)
    LINE_CHANNEL_ACCESS_TOKEN: z.string().optional().default(''),
    LINE_CHANNEL_SECRET: z.string().optional().default(''),
    LINE_OA_ID: z.string().optional().default('@default').refine(
        (val) => !val || val.startsWith('@'),
        { message: 'LINE_OA_ID must start with @' }
    ),

    // Payment Webhook (optional, defaults to LINE_CHANNEL_SECRET if not provided)
    PAYMENT_WEBHOOK_SECRET: z.string().optional(),

    // SMTP Email (nodemailer)
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.string().default('587'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // Load Test Secret (development only - DO NOT use in production)
    LOAD_TEST_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}

export const env = {
    ...parsed.data,
    PORT: parseInt(parsed.data.PORT, 10),
    REDIS_PORT: parseInt(parsed.data.REDIS_PORT, 10),
    RATE_LIMIT_MAX: parseInt(parsed.data.RATE_LIMIT_MAX, 10),
    RATE_LIMIT_TIME_WINDOW: parseInt(parsed.data.RATE_LIMIT_TIME_WINDOW, 10),
    QUEUE_CONCURRENCY: parseInt(parsed.data.QUEUE_CONCURRENCY, 10),
    MAX_SESSIONS_PER_USER: parseInt(parsed.data.MAX_SESSIONS_PER_USER, 10),
    SMTP_PORT: parseInt(parsed.data.SMTP_PORT, 10),
    isDevelopment: parsed.data.NODE_ENV === 'development',
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
};

export type Env = typeof env;

/**
 * Ensure a URL has a protocol prefix (https:// for production, http:// for localhost)
 * Fixes cases where env vars are set without protocol (e.g. "example.up.railway.app")
 */
export function ensureHttps(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // localhost/127.0.0.1 use http, everything else uses https
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
        return `http://${url}`;
    }
    return `https://${url}`;
}

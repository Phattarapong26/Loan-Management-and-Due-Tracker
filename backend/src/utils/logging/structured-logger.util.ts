import { FastifyRequest } from 'fastify';

/**
 * Structured Logger Utility
 * 
 * Provides consistent logging methods with proper log levels
 * Replaces console.log/error with structured logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    userId?: string;
    correlationId?: string;
    requestId?: string;
    [key: string]: any;
}

export class StructuredLogger {
    private context: LogContext;

    constructor(context: LogContext = {}) {
        this.context = context;
    }

    /**
     * Create logger from Fastify request
     */
    static fromRequest(request: FastifyRequest): StructuredLogger {
        const user = (request.user as any);
        return new StructuredLogger({
            userId: user?.userId,
            correlationId: (request as any).correlationId,
            requestId: request.id,
        });
    }

    /**
     * Debug level - only in development
     */
    debug(message: string, data?: any) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, data);
        }
    }

    /**
     * Info level - general information
     */
    info(message: string, data?: any) {
        this.log('info', message, data);
    }

    /**
     * Warning level - potential issues
     */
    warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    /**
     * Error level - errors that need attention
     */
    error(message: string, error?: Error | any, data?: any) {
        const errorData = error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            ...data,
        } : { error, ...data };

        this.log('error', message, errorData);
    }

    /**
     * Internal log method
     */
    private log(level: LogLevel, message: string, data?: any) {
        const logEntry = {
            level,
            timestamp: new Date().toISOString(),
            message,
            ...this.context,
            ...data,
        };

        // In production, use JSON format for log aggregation
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(logEntry));
        } else {
            // In development, use readable format
            const prefix = this.getPrefix(level);
            const contextStr = Object.keys(this.context).length > 0 
                ? ` [${Object.entries(this.context).map(([k, v]) => `${k}=${v}`).join(', ')}]`
                : '';
            
            console.log(`${prefix}${contextStr} ${message}`, data || '');
        }
    }

    private getPrefix(level: LogLevel): string {
        const prefixes = {
            debug: '🔍 [DEBUG]',
            info: 'ℹ️  [INFO]',
            warn: '⚠️  [WARN]',
            error: '❌ [ERROR]',
        };
        return prefixes[level];
    }
}

/**
 * Global logger instance
 */
export const logger = new StructuredLogger();

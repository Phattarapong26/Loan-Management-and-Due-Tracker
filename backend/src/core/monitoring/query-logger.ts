/**
 * Query Logger
 * 
 * Logs slow queries and provides performance metrics
 */

import { Prisma } from '@prisma/client';

interface QueryLog {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

class QueryLogger {
  private slowQueryThreshold: number = 1000; // 1 second
  private queryLogs: QueryLog[] = [];
  private maxLogs: number = 100;

  /**
   * Log a query
   */
  log(query: string, duration: number, params?: any) {
    const log: QueryLog = {
      query,
      duration,
      timestamp: new Date(),
      params,
    };

    // Add to logs
    this.queryLogs.push(log);

    // Keep only last N logs
    if (this.queryLogs.length > this.maxLogs) {
      this.queryLogs.shift();
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected (${duration}ms):`, {
        query: query.substring(0, 200),
        duration,
        params,
      });
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold?: number): QueryLog[] {
    const limit = threshold || this.slowQueryThreshold;
    return this.queryLogs.filter(log => log.duration > limit);
  }

  /**
   * Get query statistics
   */
  getStats() {
    if (this.queryLogs.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        fastestQuery: 0,
        slowestQuery: 0,
      };
    }

    const durations = this.queryLogs.map(log => log.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      totalQueries: this.queryLogs.length,
      averageDuration: Math.round(total / this.queryLogs.length),
      slowQueries: this.getSlowQueries().length,
      fastestQuery: Math.min(...durations),
      slowestQuery: Math.max(...durations),
    };
  }

  /**
   * Clear logs
   */
  clear() {
    this.queryLogs = [];
  }

  /**
   * Set slow query threshold
   */
  setThreshold(ms: number) {
    this.slowQueryThreshold = ms;
  }
}

export const queryLogger = new QueryLogger();

/**
 * Prisma middleware for query logging
 */
export function createQueryLoggerMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    // Log query
    queryLogger.log(
      `${params.model}.${params.action}`,
      duration,
      params.args
    );

    return result;
  };
}


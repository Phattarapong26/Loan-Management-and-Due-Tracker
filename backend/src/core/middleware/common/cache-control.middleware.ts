/**
 * Cache Control Middleware
 * 
 * Add appropriate Cache-Control headers for browser caching
 * Works together with Redis cache for optimal performance
 * 
 * Strategy:
 * - Static data: Cache in browser (5-30 min)
 * - Real-time data: No browser cache (always fresh)
 * - Semi-static: Short browser cache (1-2 min)
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export interface CacheControlOptions {
    maxAge?: number; // seconds
    sMaxAge?: number; // seconds (for CDN/proxy)
    mustRevalidate?: boolean;
    noCache?: boolean;
    noStore?: boolean;
    private?: boolean;
}

/**
 * Cache Control Middleware Factory
 */
export function cacheControl(options: CacheControlOptions) {
    return async (_request: FastifyRequest, reply: FastifyReply) => {
        const directives: string[] = [];

        if (options.noStore) {
            // No caching at all (for sensitive data)
            directives.push('no-store');
        } else if (options.noCache) {
            // Must revalidate every time
            directives.push('no-cache');
        } else {
            // Cache with max-age
            if (options.private) {
                directives.push('private');
            } else {
                directives.push('public');
            }

            if (options.maxAge !== undefined) {
                directives.push(`max-age=${options.maxAge}`);
            }

            if (options.sMaxAge !== undefined) {
                directives.push(`s-maxage=${options.sMaxAge}`);
            }

            if (options.mustRevalidate) {
                directives.push('must-revalidate');
            }
        }

        reply.header('Cache-Control', directives.join(', '));
    };
}

/**
 * Predefined cache strategies
 */
export const CACHE_CONTROL = {
    /**
     * No cache - for real-time data
     * Use for: Payments, Disbursements, Notifications
     */
    NO_CACHE: cacheControl({
        noStore: true,
    }),

    /**
     * Short cache - for semi-real-time data
     * Use for: Dashboard stats, Loan lists
     */
    SHORT: cacheControl({
        maxAge: 120, // 2 minutes
        mustRevalidate: true,
        private: true,
    }),

    /**
     * Medium cache - for semi-static data
     * Use for: Customer lists, Loan details
     */
    MEDIUM: cacheControl({
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        private: true,
    }),

    /**
     * Long cache - for static data
     * Use for: Loan products, System config, Branches
     */
    LONG: cacheControl({
        maxAge: 1800, // 30 minutes
        sMaxAge: 3600, // 1 hour for CDN
        mustRevalidate: true,
    }),

    /**
     * Very long cache - for rarely changing data
     * Use for: Interest rate tiers, System settings
     */
    VERY_LONG: cacheControl({
        maxAge: 3600, // 1 hour
        sMaxAge: 7200, // 2 hours for CDN
        mustRevalidate: true,
    }),
} as const;

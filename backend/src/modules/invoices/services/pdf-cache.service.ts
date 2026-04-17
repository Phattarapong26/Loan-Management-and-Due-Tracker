/**
 * PDF Cache Service
 * 
 * Cache generated PDFs to avoid regenerating identical documents
 */

import { logger } from '@utils/common/logger.util';
import { createHash } from 'crypto';

interface CacheEntry {
    buffer: Buffer;
    timestamp: number;
    hits: number;
}

export class PDFCacheService {
    private static cache = new Map<string, CacheEntry>();
    private static readonly MAX_CACHE_SIZE = 100; // Maximum number of cached PDFs
    private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    /**
     * Generate cache key from PDF data
     */
    static generateCacheKey(data: any): string {
        const hash = createHash('md5');
        hash.update(JSON.stringify(data));
        return hash.digest('hex');
    }

    /**
     * Get cached PDF if exists and not expired
     */
    static getCachedPDF(cacheKey: string): Buffer | null {
        const entry = this.cache.get(cacheKey);
        
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > this.CACHE_TTL) {
            this.cache.delete(cacheKey);
            logger.info({ cacheKey }, 'PDF cache entry expired and removed');
            return null;
        }

        // Update hit count
        entry.hits++;
        logger.info({ cacheKey, hits: entry.hits }, 'PDF cache hit');
        
        return entry.buffer;
    }

    /**
     * Cache PDF buffer
     */
    static cachePDF(cacheKey: string, buffer: Buffer): void {
        // Clean up old entries if cache is full
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.cleanupOldEntries();
        }

        this.cache.set(cacheKey, {
            buffer,
            timestamp: Date.now(),
            hits: 0,
        });

        logger.info({ cacheKey, cacheSize: this.cache.size }, 'PDF cached successfully');
    }

    /**
     * Clean up old or least used entries
     */
    private static cleanupOldEntries(): void {
        const entries = Array.from(this.cache.entries());
        
        // Sort by timestamp (oldest first) and hits (least used first)
        entries.sort((a, b) => {
            const ageA = Date.now() - a[1].timestamp;
            const ageB = Date.now() - b[1].timestamp;
            
            // If age difference is significant, prioritize by age
            if (Math.abs(ageA - ageB) > 5 * 60 * 1000) { // 5 minutes
                return ageB - ageA;
            }
            
            // Otherwise prioritize by hits
            return a[1].hits - b[1].hits;
        });

        // Remove oldest/least used entries (remove 20% of cache)
        const removeCount = Math.floor(this.MAX_CACHE_SIZE * 0.2);
        for (let i = 0; i < removeCount && entries.length > 0; i++) {
            const [key] = entries.shift()!;
            this.cache.delete(key);
        }

        logger.info({ removedCount: removeCount, newSize: this.cache.size }, 'PDF cache cleanup completed');
    }

    /**
     * Clear all cache
     */
    static clearCache(): void {
        this.cache.clear();
        logger.info('PDF cache cleared');
    }

    /**
     * Get cache statistics
     */
    static getCacheStats(): { size: number; totalHits: number; entries: Array<{ key: string; hits: number; age: number }> } {
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            hits: entry.hits,
            age: Date.now() - entry.timestamp,
        }));

        const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);

        return {
            size: this.cache.size,
            totalHits,
            entries,
        };
    }
}
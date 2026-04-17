import { logger } from '../common/logger.util';

export class SQLSecurityUtil {
    /**
     * Validate UUID format (RFC 4122)
     */
    static validateUUID(uuid: string): boolean {
        if (!uuid || typeof uuid !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Validate LINE User ID format
     */
    static validateLineUserId(lineUserId: string): boolean {
        if (!lineUserId || typeof lineUserId !== 'string') return false;
        return lineUserId.length > 0 &&
               lineUserId.length <= 50 &&
               /^[a-zA-Z0-9_-]+$/.test(lineUserId);
    }

    /**
     * Sanitize and validate input for SQL queries
     */
    static sanitizeForSQL(input: string, maxLength: number = 255): string | null {
        if (!input || typeof input !== 'string') return null;
        
        // Remove dangerous characters
        const sanitized = input
            .replace(/['"`;\\]/g, '') // Remove quotes, semicolons, backslashes
            .replace(/--/g, '') // Remove SQL comments
            .replace(/\/\*|\*\//g, '') // Remove block comments
            .replace(/\x00/g, '') // Remove null bytes
            .trim();
        
        if (sanitized.length === 0 || sanitized.length > maxLength) {
            return null;
        }
        
        return sanitized;
    }

    /**
     * Log raw SQL query execution for monitoring
     */
    static logRawQuery(query: string, params: any[], userId?: string): void {
        logger.info({
            message: 'Raw SQL Query Executed',
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            paramCount: params.length,
            userId,
            timestamp: new Date().toISOString(),
            source: 'raw-sql-execution'
        });
    }

    /**
     * Detect suspicious SQL patterns
     */
    static detectSuspiciousPatterns(input: string): { suspicious: boolean; patterns: string[] } {
        if (!input || typeof input !== 'string') {
            return { suspicious: false, patterns: [] };
        }

        const suspiciousPatterns = [
            /union\s+select/i,
            /drop\s+table/i,
            /delete\s+from/i,
            /insert\s+into/i,
            /update\s+.*set/i,
            /exec\s*\(/i,
            /script\s*>/i,
            /javascript:/i,
            /vbscript:/i,
            /onload\s*=/i,
            /onerror\s*=/i,
            /--/,
            /\/\*.*\*\//,
            /;\s*drop/i,
            /;\s*delete/i,
            /;\s*insert/i,
            /;\s*update/i,
            /'\s*or\s*'1'\s*=\s*'1/i,
            /'\s*or\s*1\s*=\s*1/i,
            /admin'\s*--/i,
            /'\s*union/i,
            /waitfor\s+delay/i,
            /sleep\s*\(/i,
            /benchmark\s*\(/i
        ];

        const foundPatterns: string[] = [];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(input)) {
                foundPatterns.push(pattern.source);
            }
        }

        return {
            suspicious: foundPatterns.length > 0,
            patterns: foundPatterns
        };
    }

    /**
     * Validate and sanitize user ID with comprehensive checks
     */
    static validateAndSanitizeUserId(userId: string): string | null {
        if (!userId || typeof userId !== 'string') return null;
        
        // Check for suspicious patterns first
        const suspiciousCheck = this.detectSuspiciousPatterns(userId);
        if (suspiciousCheck.suspicious) {
            logger.warn({
                message: 'Suspicious pattern detected in user ID',
                userId: userId.substring(0, 20),
                patterns: suspiciousCheck.patterns
            });
            return null;
        }

        // Validate UUID format
        if (!this.validateUUID(userId)) {
            return null;
        }

        return userId;
    }

    /**
     * Validate and sanitize LINE user ID with comprehensive checks
     */
    static validateAndSanitizeLineUserId(lineUserId: string): string | null {
        if (!lineUserId || typeof lineUserId !== 'string') return null;
        
        // Check for suspicious patterns first
        const suspiciousCheck = this.detectSuspiciousPatterns(lineUserId);
        if (suspiciousCheck.suspicious) {
            logger.warn({
                message: 'Suspicious pattern detected in LINE user ID',
                lineUserId: lineUserId.substring(0, 20),
                patterns: suspiciousCheck.patterns
            });
            return null;
        }

        // Validate LINE user ID format
        if (!this.validateLineUserId(lineUserId)) {
            return null;
        }

        return lineUserId;
    }
}
/**
 * Security utilities for additional protection
 */

/**
 * Check for SQL injection patterns in input
 */
export function detectSQLInjection(input: string): boolean {
    if (typeof input !== 'string') {
        return false;
    }

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|TRUNCATE|GRANT|REVOKE)\b)/i,
        /(--)/,
        /(\bOR\b.*\b(TRUE|1=1|1=0)\b)/i,
        /(\bAND\b.*\b(TRUE|1=1|1=0)\b)/i,
        /\/\*.*?\*\//, // SQL Comments
        /SLEEP\((\s*)?\d+(\s*)?\)/i, // Time-based injection
        /BENCHMARK\(.*\)/i,
        /PG_SLEEP\(.*\)/i,
    ];

    return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for XSS patterns in input
 */
export function detectXSS(input: string): boolean {
    if (typeof input !== 'string') {
        return false;
    }

    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/i,
        /javascript:/i,
        /on\w+\s*=\s*["'][^"']*["']/i,
        /on\w+\s*=\s*[^\s>]+/i,
        /<img[^>]+src[^>]*=.*javascript:/i,
        /<body[^>]*onload/i,
        /<svg[^>]*onload/i,
        /expression\(.*\)/i, // Old IE XSS
        /url\(["']?javascript:.*\)/i,
    ];

    return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for command injection patterns
 */
export function detectCommandInjection(input: string): boolean {
    if (typeof input !== 'string') {
        return false;
    }

    const commandPatterns = [
        /[|`$]/,
        /\b(cat|ls|pwd|whoami|uname|ps|kill|rm|mv|cp|chmod|chown|sudo|su|base64|curl|wget)\b/i,
        /\b(nc|netcat|ncat|bash|sh|zsh|python|perl|ruby|node|php|gcc|vbox|docker)\b/i,
    ];

    return commandPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for File Inclusion (LFI/RFI) patterns
 */
export function detectFileInclusion(input: string): boolean {
    if (typeof input !== 'string') {
        return false;
    }

    const inclusionPatterns = [
        /\.\.\//,  // Directory traversal
        /\/etc\/passwd/i,
        /\/etc\/shadow/i,
        /\/etc\/group/i,
        /C:\\Windows\\System32/i,
        /boot\.ini/i,
        /win\.ini/i,
        /https?:\/\//i, // Potential RFI
        /php:\/\/filter/i, // PHP Wrappers
        /php:\/\/input/i,
    ];

    return inclusionPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for SSRF patterns
 */
export function detectSSRF(input: string): boolean {
    if (typeof input !== 'string') {
        return false;
    }

    const ssrfPatterns = [
        /169\.254\.169\.254/, // AWS/GCP Metadata
        /metadata\.google\.internal/i,
        /localhost/i,
        /127\.0\.0\.1/,
        /0\.0\.0\.0/,
        /\[::\]/,
    ];

    return ssrfPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for XXE patterns
 */
export function detectXXE(input: string): boolean {
    if (typeof input !== 'string') {
        return false;
    }

    const xxePatterns = [
        /<!ENTITY/i,
        /<!DOCTYPE/i,
        /SYSTEM\s+["']file:/i,
        /SYSTEM\s+["']http:/i,
    ];

    return xxePatterns.some((pattern) => pattern.test(input));
}

/**
 * Rate limit key generator based on IP and user
 */
export function generateRateLimitKey(
    identifier: string,
    type: 'ip' | 'user' = 'ip'
): string {
    return `ratelimit:${type}:${identifier}`;
}

/**
 * Check if input contains suspicious patterns
 */
export function isSuspiciousInput(input: string): {
    suspicious: boolean;
    reasons: string[];
} {
    const reasons: string[] = [];

    if (detectSQLInjection(input)) {
        reasons.push('SQL_INJECTION');
    }

    if (detectXSS(input)) {
        reasons.push('XSS');
    }

    if (detectCommandInjection(input)) {
        reasons.push('COMMAND_INJECTION');
    }

    if (detectFileInclusion(input)) {
        reasons.push('FILE_INCLUSION');
    }

    if (detectSSRF(input)) {
        reasons.push('SSRF');
    }

    if (detectXXE(input)) {
        reasons.push('XXE');
    }

    return {
        suspicious: reasons.length > 0,
        reasons,
    };
}

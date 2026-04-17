/**
 * LINE-specific input sanitization utilities
 * Handles sanitization of user messages from LINE with Thai language support
 */

import { logger } from '@utils/common/logger.util';
import { isSuspiciousInput } from '@utils/security/security.util';

/**
 * Sanitize LINE user message text
 * - Removes dangerous characters and patterns
 * - Preserves Thai language characters and emojis
 * - Prevents SQL injection, XSS, and command injection
 * 
 * @param text - Raw text from LINE user message
 * @param userId - LINE user ID for logging
 * @returns Sanitized text safe for processing
 */
export function sanitizeLineMessage(text: string, userId?: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Store original for logging
    const original = text;

    // Step 1: Remove null bytes and control characters (except newlines and tabs)
    let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Step 2: Remove dangerous SQL injection patterns
    // But preserve Thai characters and common punctuation
    sanitized = sanitized
        // Remove SQL comments
        .replace(/--[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove dangerous SQL keywords when used suspiciously
        .replace(/;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\s+/gi, ' ')
        .replace(/\bUNION\s+SELECT\b/gi, ' ')
        .replace(/\bINTO\s+OUTFILE\b/gi, ' ')
        .replace(/\bLOAD_FILE\b/gi, ' ');

    // Step 3: Remove XSS patterns while preserving Thai text
    sanitized = sanitized
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove dangerous HTML tags
        .replace(/<(object|embed|applet|meta|link|style)\b[^>]*>/gi, '');

    // Step 4: Remove command injection patterns
    sanitized = sanitized
        // Remove shell metacharacters when used suspiciously
        .replace(/[;&|`$]\s*(cat|ls|pwd|rm|mv|cp|chmod|wget|curl|python|perl|ruby|node|bash|sh)\b/gi, ' ')
        // Remove all backticks (used for command substitution)
        .replace(/`/g, '');

    // Step 5: Limit length to prevent DoS
    const MAX_MESSAGE_LENGTH = 5000;
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
        sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
        logger.warn(
            {
                userId,
                originalLength: text.length,
                truncatedLength: MAX_MESSAGE_LENGTH,
            },
            'LINE message truncated due to excessive length'
        );
    }

    // Step 6: Trim whitespace
    sanitized = sanitized.trim();

    // Step 7: Check for suspicious patterns and log
    if (sanitized !== original) {
        const suspiciousCheck = isSuspiciousInput(original);
        
        logger.warn(
            {
                userId,
                original: original.substring(0, 200),
                sanitized: sanitized.substring(0, 200),
                suspicious: suspiciousCheck.suspicious,
                reasons: suspiciousCheck.reasons,
                category: 'LINE_MESSAGE_SANITIZATION',
            },
            'LINE user message sanitized - potentially dangerous content detected'
        );
    }

    return sanitized;
}

/**
 * Sanitize LINE postback data
 * Postback data should be simple key-value pairs
 * 
 * @param data - Postback data string
 * @param userId - LINE user ID for logging
 * @returns Sanitized postback data
 */
export function sanitizeLinePostbackData(data: string, userId?: string): string {
    if (!data || typeof data !== 'string') {
        return '';
    }

    const original = data;

    // Postback data should only contain alphanumeric, =, &, -, _
    let sanitized = data.replace(/[^a-zA-Z0-9=&\-_]/g, '');

    // Limit length
    const MAX_POSTBACK_LENGTH = 300;
    if (sanitized.length > MAX_POSTBACK_LENGTH) {
        sanitized = sanitized.substring(0, MAX_POSTBACK_LENGTH);
    }

    if (sanitized !== original) {
        logger.warn(
            {
                userId,
                original: original.substring(0, 100),
                sanitized: sanitized.substring(0, 100),
                category: 'LINE_POSTBACK_SANITIZATION',
            },
            'LINE postback data sanitized'
        );
    }

    return sanitized;
}

/**
 * Validate and sanitize LINE user ID
 * LINE user IDs should be alphanumeric strings
 * 
 * @param userId - LINE user ID
 * @returns Sanitized user ID or null if invalid
 */
export function sanitizeLineUserId(userId: string): string | null {
    if (!userId || typeof userId !== 'string') {
        return null;
    }

    // LINE user IDs are typically 33 characters, alphanumeric
    const sanitized = userId.replace(/[^a-zA-Z0-9]/g, '');

    if (sanitized.length < 10 || sanitized.length > 50) {
        logger.warn(
            {
                userId: sanitized.substring(0, 10) + '...',
                length: sanitized.length,
                category: 'LINE_USERID_VALIDATION',
            },
            'Invalid LINE user ID length'
        );
        return null;
    }

    return sanitized;
}

/**
 * Check if LINE message contains dangerous content
 * Returns true if message should be blocked entirely
 * 
 * @param text - Message text
 * @returns true if message is dangerous and should be blocked
 */
export function isDangerousLineMessage(text: string): boolean {
    if (!text || typeof text !== 'string') {
        return false;
    }

    // Check for extremely dangerous patterns that should block the message
    const dangerousPatterns = [
        // SQL injection attempts
        /;\s*DROP\s+TABLE/gi,
        /;\s*DELETE\s+FROM/gi,
        /UNION\s+ALL\s+SELECT/gi,
        
        // XSS attempts
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /javascript:\s*eval\(/gi,
        /onerror\s*=\s*["'].*["']/gi,
        
        // Command injection
        /;\s*rm\s+-rf/gi,
        /\|\s*bash/gi,
        /`.*`/g,
        
        // Path traversal
        /\.\.\//g,
        /\.\.\\+/g,
    ];

    return dangerousPatterns.some(pattern => pattern.test(text));
}

/**
 * Sanitize Thai text specifically
 * Ensures Thai characters are preserved while removing dangerous content
 * 
 * @param text - Text that may contain Thai characters
 * @returns Sanitized text with Thai characters preserved
 */
export function sanitizeThaiText(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Thai Unicode ranges:
    // - Thai: \u0E00-\u0E7F
    // - Thai Extended: \u0E80-\u0EFF
    // Also preserve:
    // - Basic Latin: a-zA-Z0-9
    // - Common punctuation: space, comma, period, etc.
    // - Emojis: \u{1F300}-\u{1F9FF} (requires unicode flag)
    
    // Remove control characters but keep Thai, Latin, numbers, common punctuation, and emojis
    const sanitized = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim();

    return sanitized;
}

/**
 * Log sanitization event for security monitoring
 * 
 * @param userId - LINE user ID
 * @param messageType - Type of message (text, postback, etc.)
 * @param original - Original content
 * @param sanitized - Sanitized content
 * @param blocked - Whether message was blocked
 */
export function logLineSanitizationEvent(
    userId: string,
    messageType: 'text' | 'postback' | 'userId',
    original: string,
    sanitized: string,
    blocked: boolean = false
): void {
    const suspiciousCheck = isSuspiciousInput(original);
    
    logger.warn(
        {
            userId: userId.substring(0, 10) + '...',
            messageType,
            originalLength: original.length,
            sanitizedLength: sanitized.length,
            blocked,
            suspicious: suspiciousCheck.suspicious,
            reasons: suspiciousCheck.reasons,
            originalPreview: original.substring(0, 100),
            sanitizedPreview: sanitized.substring(0, 100),
            timestamp: new Date().toISOString(),
            category: 'LINE_SECURITY',
            severity: blocked ? 'high' : 'medium',
        },
        blocked 
            ? 'Dangerous LINE message blocked'
            : 'LINE message sanitized'
    );
}

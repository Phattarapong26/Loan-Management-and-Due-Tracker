/**
 * Log Sanitizer Utility
 * 
 * Masks sensitive data before logging to prevent data leaks
 */

import { logger } from './logger.util';

/**
 * Sensitive field patterns
 */
const SENSITIVE_FIELDS = [
    // Personal Information
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'taxId',
    'thaiId',
    'nationalId',
    'idCard',
    'ssn',
    'passport',
    
    // Financial Information
    'creditCard',
    'cardNumber',
    'cvv',
    'cvc',
    'accountNumber',
    'bankAccount',
    'iban',
    'swift',
    
    // Authentication
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'privateKey',
    'jwt',
    'sessionId',
    'cookie',
    
    // Contact Information
    'email',
    'phone',
    'phoneNumber',
    'mobile',
    'address',
    'zipCode',
    'postalCode',
];

/**
 * Patterns for sensitive data in strings
 */
const SENSITIVE_PATTERNS = [
    // Credit card numbers (13-19 digits)
    { pattern: /\b\d{13,19}\b/g, replacement: '****-****-****-****' },
    
    // Thai ID (13 digits)
    { pattern: /\b\d{13}\b/g, replacement: '*-****-*****-**-*' },
    
    // Email addresses
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***@***.***' },
    
    // Phone numbers (Thai format)
    { pattern: /\b0\d{1,2}-?\d{3}-?\d{4}\b/g, replacement: '0**-***-****' },
    
    // JWT tokens
    { pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, replacement: 'eyJ***' },
];

/**
 * Mask value
 */
function maskValue(value: any): string {
    if (typeof value === 'string') {
        if (value.length <= 4) {
            return '***';
        }
        // Show first and last character
        return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
    }
    return '***masked***';
}

/**
 * Check if field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return SENSITIVE_FIELDS.some(sensitive => 
        lowerField.includes(sensitive.toLowerCase())
    );
}

/**
 * Sanitize string value
 */
function sanitizeString(value: string): string {
    let sanitized = value;
    
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
    }
    
    return sanitized;
}

/**
 * Sanitize object recursively
 */
export function sanitizeForLog(data: any, depth: number = 0): any {
    // Prevent infinite recursion
    if (depth > 10) {
        return '[Max depth reached]';
    }

    // Handle null/undefined
    if (data === null || data === undefined) {
        return data;
    }

    // Handle primitives
    if (typeof data !== 'object') {
        if (typeof data === 'string') {
            return sanitizeString(data);
        }
        return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => sanitizeForLog(item, depth + 1));
    }

    // Handle objects
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
        // Check if field is sensitive
        if (isSensitiveField(key)) {
            sanitized[key] = maskValue(value);
        } else if (typeof value === 'object' && value !== null) {
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeForLog(value, depth + 1);
        } else if (typeof value === 'string') {
            // Sanitize string values
            sanitized[key] = sanitizeString(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Safe logger wrapper that automatically sanitizes data
 */
export const safeLogger = {
    info: (data: any, message?: string) => {
        logger.info(sanitizeForLog(data), message);
    },
    
    warn: (data: any, message?: string) => {
        logger.warn(sanitizeForLog(data), message);
    },
    
    error: (data: any, message?: string) => {
        logger.error(sanitizeForLog(data), message);
    },
    
    debug: (data: any, message?: string) => {
        logger.debug(sanitizeForLog(data), message);
    },
};

/**
 * Sanitize request body for logging
 */
export function sanitizeRequestBody(body: any): any {
    return sanitizeForLog(body);
}

/**
 * Sanitize query parameters for logging
 */
export function sanitizeQueryParams(query: any): any {
    return sanitizeForLog(query);
}

/**
 * Sanitize headers for logging
 */
export function sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
        'authorization',
        'cookie',
        'x-api-key',
        'x-auth-token',
    ];
    
    for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
            sanitized[header] = '***masked***';
        }
    }
    
    return sanitized;
}

/**
 * Example usage:
 * 
 * // Sanitize before logging
 * const userData = {
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     password: 'secret123',
 *     taxId: '1234567890123',
 *     phone: '081-234-5678'
 * };
 * 
 * logger.info(sanitizeForLog(userData), 'User data');
 * // Output: { name: 'John Doe', email: '***@***.***', password: '***masked***', taxId: '*-****-*****-**-*', phone: '0**-***-****' }
 * 
 * // Use safe logger
 * safeLogger.info(userData, 'User data');
 * 
 * // Sanitize request
 * const sanitizedBody = sanitizeRequestBody(request.body);
 * logger.info({ body: sanitizedBody }, 'Request received');
 */

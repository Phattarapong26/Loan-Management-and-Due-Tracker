/**
 * Validation utilities for Thai business rules
 * No hardcoded values - all configurable
 */

/**
 * Validate Thai ID (13 digits with checksum)
 * Algorithm: https://en.wikipedia.org/wiki/Thai_identity_card
 */
export function validateThaiId(thaiId: string): { valid: boolean; error?: string } {
    // Remove spaces and dashes
    const cleaned = thaiId.replace(/[\s-]/g, '');

    // Check length
    if (cleaned.length !== 13) {
        return { valid: false, error: 'Thai ID must be exactly 13 digits' };
    }

    // Check if all digits
    if (!/^\d+$/.test(cleaned)) {
        return { valid: false, error: 'Thai ID must contain only digits' };
    }

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i]!, 10) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;

    // Verify last digit
    if (parseInt(cleaned[12]!, 10) !== checkDigit) {
        return { valid: false, error: 'Thai ID checksum is invalid' };
    }

    return { valid: true };
}

/**
 * Validate Tax ID (13 digits)
 */
export function validateTaxId(taxId: string): { valid: boolean; error?: string } {
    const cleaned = taxId.replace(/[\s-]/g, '');

    if (cleaned.length !== 13) {
        return { valid: false, error: 'Tax ID must be exactly 13 digits' };
    }

    if (!/^\d+$/.test(cleaned)) {
        return { valid: false, error: 'Tax ID must contain only digits' };
    }

    return { valid: true };
}

/**
 * Validate Thai phone number (10 digits, starts with 0)
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
    const cleaned = phone.replace(/[\s-]/g, '');

    if (cleaned.length !== 10) {
        return { valid: false, error: 'Phone number must be exactly 10 digits' };
    }

    if (!/^0\d{9}$/.test(cleaned)) {
        return { valid: false, error: 'Phone number must start with 0 and be 10 digits' };
    }

    return { valid: true };
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }

    // HTML escape
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Remove dangerous script tags and attributes
 */
export function removeScriptTags(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }

    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    if (email.length > 255) {
        return { valid: false, error: 'Email is too long' };
    }

    return { valid: true };
}

/**
 * Validate amount (positive decimal)
 */
export function validateAmount(amount: number | string): { valid: boolean; error?: string } {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(num)) {
        return { valid: false, error: 'Amount must be a valid number' };
    }

    if (num <= 0) {
        return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (num > 999999999999.99) {
        return { valid: false, error: 'Amount exceeds maximum limit' };
    }

    return { valid: true };
}

/**
 * Validate positive integer
 */
export function validatePositiveInteger(value: number | string): { valid: boolean; error?: string } {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;

    if (isNaN(num)) {
        return { valid: false, error: 'Value must be a valid integer' };
    }

    if (num <= 0) {
        return { valid: false, error: 'Value must be greater than 0' };
    }

    if (!Number.isInteger(num)) {
        return { valid: false, error: 'Value must be an integer' };
    }

    return { valid: true };
}

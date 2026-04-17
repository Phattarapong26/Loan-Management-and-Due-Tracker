/**
 * URL Validator Utility
 * Prevents open redirect vulnerabilities
 */

import { env } from '@config/env.config';

/**
 * Validate if URL is safe for redirect
 * Only allows redirects to whitelisted domains
 */
export function isValidRedirectUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        
        // Build whitelist of allowed hosts
        const allowedHosts: string[] = [];
        
        // Add localhost
        allowedHosts.push('localhost', '127.0.0.1', '::1');
        
        // Add configured URLs
        if (env.FRONTEND_URL) {
            try {
                allowedHosts.push(new URL(env.FRONTEND_URL).hostname);
            } catch {
                // Invalid URL in config
            }
        }
        
        if (env.BACKEND_URL) {
            try {
                allowedHosts.push(new URL(env.BACKEND_URL).hostname);
            } catch {
                // Invalid URL in config
            }
        }
        
        // Check if hostname is in whitelist
        const isAllowed = allowedHosts.includes(parsed.hostname);
        
        // Also check protocol (only allow http/https)
        const isValidProtocol = ['http:', 'https:'].includes(parsed.protocol);
        
        return isAllowed && isValidProtocol;
    } catch {
        // Invalid URL format
        return false;
    }
}

/**
 * Sanitize URL for safe usage
 * Returns null if URL is not safe
 */
export function sanitizeRedirectUrl(url: string): string | null {
    if (!isValidRedirectUrl(url)) {
        return null;
    }
    return url;
}

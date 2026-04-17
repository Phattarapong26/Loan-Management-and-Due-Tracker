import { env } from './env.config';
import { logger } from '@utils/common/logger.util';
import axios from 'axios';

/**
 * LINE Credentials Validator
 * 
 * Validates LINE credentials at startup to ensure they are properly formatted
 * and optionally tests connectivity to LINE API.
 * 
 * Requirements: 2, 5, 19
 */

const LINE_API_BASE = 'https://api.line.me/v2/bot';

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validates the format of LINE_CHANNEL_ACCESS_TOKEN
 * LINE Channel Access Tokens are typically long alphanumeric strings
 */
function validateAccessTokenFormat(token: string): ValidationResult {
    const errors: string[] = [];

    // Check if token is present and not empty (already done by zod, but double-check)
    if (!token || token.trim().length === 0) {
        errors.push('LINE_CHANNEL_ACCESS_TOKEN is empty');
        return { valid: false, errors };
    }

    // LINE access tokens are typically long strings (usually 100+ characters)
    if (token.length < 50) {
        errors.push('LINE_CHANNEL_ACCESS_TOKEN appears to be too short (expected 50+ characters)');
    }

    // Check for placeholder values
    const placeholders = [
        'your_access_token',
        'your_channel_access_token',
        'test_access_token',
        'placeholder',
        'changeme',
        'xxx',
    ];

    if (placeholders.some(placeholder => token.toLowerCase().includes(placeholder))) {
        errors.push('LINE_CHANNEL_ACCESS_TOKEN appears to be a placeholder value');
    }

    // LINE tokens should not contain spaces
    if (token.includes(' ')) {
        errors.push('LINE_CHANNEL_ACCESS_TOKEN contains spaces (invalid format)');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validates the format of LINE_CHANNEL_SECRET
 * LINE Channel Secrets are typically 32-character hexadecimal strings
 */
function validateChannelSecretFormat(secret: string): ValidationResult {
    const errors: string[] = [];

    // Check if secret is present and not empty
    if (!secret || secret.trim().length === 0) {
        errors.push('LINE_CHANNEL_SECRET is empty');
        return { valid: false, errors };
    }

    // LINE channel secrets are typically 32 characters
    if (secret.length < 20) {
        errors.push('LINE_CHANNEL_SECRET appears to be too short (expected 20+ characters)');
    }

    // Check for placeholder values
    const placeholders = [
        'your_channel_secret',
        'your_secret',
        'test_channel_secret',
        'placeholder',
        'changeme',
        'xxx',
    ];

    if (placeholders.some(placeholder => secret.toLowerCase().includes(placeholder))) {
        errors.push('LINE_CHANNEL_SECRET appears to be a placeholder value');
    }

    // LINE secrets should not contain spaces
    if (secret.includes(' ')) {
        errors.push('LINE_CHANNEL_SECRET contains spaces (invalid format)');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Tests connectivity to LINE API by making a simple API call
 * This is optional and only runs if testConnectivity is true
 */
async function testLineAPIConnectivity(accessToken: string): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
        // Try to get bot info - this is a simple API call that verifies the token works
        const response = await axios.get(`${LINE_API_BASE}/info`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            timeout: 5000, // 5 second timeout
        });

        if (response.status === 200) {
            logger.info('✅ LINE API connectivity test successful');
            logger.info(`Bot info: ${JSON.stringify(response.data)}`);
            return { valid: true, errors: [] };
        } else {
            errors.push(`LINE API returned unexpected status: ${response.status}`);
        }
    } catch (error: any) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const status = error.response.status;
            const message = error.response.data?.message || error.message;

            if (status === 401) {
                errors.push('LINE_CHANNEL_ACCESS_TOKEN is invalid (401 Unauthorized)');
            } else if (status === 403) {
                errors.push('LINE_CHANNEL_ACCESS_TOKEN does not have required permissions (403 Forbidden)');
            } else {
                errors.push(`LINE API error (${status}): ${message}`);
            }
        } else if (error.request) {
            // The request was made but no response was received
            errors.push('Cannot reach LINE API (network error)');
        } else {
            // Something happened in setting up the request
            errors.push(`LINE API connectivity test failed: ${error.message}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validates LINE credentials at startup
 * 
 * @param options.testConnectivity - If true, tests actual connectivity to LINE API (default: false)
 * @param options.failOnConnectivityError - If true, fails startup if connectivity test fails (default: false)
 * @throws Error if validation fails and credentials are invalid
 */
export async function validateLineCredentials(options: {
    testConnectivity?: boolean;
    failOnConnectivityError?: boolean;
} = {}): Promise<void> {
    const { testConnectivity = false, failOnConnectivityError = false } = options;

    logger.info('🔍 Validating LINE credentials...');

    const allErrors: string[] = [];

    // Validate access token format
    const accessTokenResult = validateAccessTokenFormat(env.LINE_CHANNEL_ACCESS_TOKEN);
    if (!accessTokenResult.valid) {
        allErrors.push(...accessTokenResult.errors);
    }

    // Validate channel secret format
    const channelSecretResult = validateChannelSecretFormat(env.LINE_CHANNEL_SECRET);
    if (!channelSecretResult.valid) {
        allErrors.push(...channelSecretResult.errors);
    }

    // If format validation failed, log errors and throw
    if (allErrors.length > 0) {
        logger.error('❌ LINE credentials validation failed:');
        allErrors.forEach(error => logger.error(`   - ${error}`));
        logger.error('');
        logger.error('Please check your .env file and ensure LINE credentials are properly configured.');
        logger.error('Get your credentials from: https://developers.line.biz/console/');
        throw new Error('Invalid LINE credentials - server startup aborted');
    }

    logger.info('✅ LINE credentials format validation passed');

    // Optional: Test connectivity to LINE API
    if (testConnectivity) {
        logger.info('🔍 Testing LINE API connectivity...');
        const connectivityResult = await testLineAPIConnectivity(env.LINE_CHANNEL_ACCESS_TOKEN);

        if (!connectivityResult.valid) {
            logger.warn('⚠️  LINE API connectivity test failed:');
            connectivityResult.errors.forEach(error => logger.warn(`   - ${error}`));

            if (failOnConnectivityError) {
                throw new Error('LINE API connectivity test failed - server startup aborted');
            } else {
                logger.warn('⚠️  Continuing startup despite connectivity issues (set failOnConnectivityError=true to prevent this)');
            }
        }
    }

    logger.info('✅ LINE credentials validation complete');
}

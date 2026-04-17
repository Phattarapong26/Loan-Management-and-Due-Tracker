/**
 * Error Handling Service
 * 
 * Purpose: Comprehensive error handling and structured logging
 * Features:
 * - LINE API error handling with retry logic
 * - Database error handling with user-friendly messages
 * - Rate limit handling with exponential backoff
 * - Input validation with clear feedback
 * - Conversation state cleanup on errors
 * 
 * Requirements: Requirement 18 - Error Handling & Logging
 */

import { logger } from '@utils/common/logger.util';
import { prisma } from '@config/database.config';
import axios, { AxiosError } from 'axios';

interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
};

export class ErrorHandlingService {
    /**
     * Task 9.1.2: Handle LINE API errors with retry logic
     */
    static async handleLineAPIError<T>(
        operation: () => Promise<T>,
        context: string,
        config: Partial<RetryConfig> = {}
    ): Promise<T | null> {
        const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                const axiosError = error as AxiosError;

                // Log the error
                logger.error({
                    context,
                    attempt,
                    maxRetries: retryConfig.maxRetries,
                    error: axiosError.response?.data || axiosError.message,
                    status: axiosError.response?.status,
                }, 'LINE API error');

                // Don't retry on certain errors
                if (axiosError.response?.status === 400) {
                    // Bad request - don't retry
                    logger.error({ context, error: axiosError.response.data }, 'Bad request to LINE API');
                    return null;
                }

                if (axiosError.response?.status === 403) {
                    // Forbidden - user blocked bot
                    logger.warn({ context }, 'User blocked the bot');
                    return null;
                }

                if (axiosError.response?.status === 404) {
                    // Not found - don't retry
                    logger.error({ context }, 'LINE API resource not found');
                    return null;
                }

                // Calculate delay with exponential backoff
                if (attempt < retryConfig.maxRetries) {
                    const delay = Math.min(
                        retryConfig.initialDelayMs * Math.pow(2, attempt - 1),
                        retryConfig.maxDelayMs
                    );

                    logger.info({ context, attempt, delay }, 'Retrying LINE API call');
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed
        logger.error({
            context,
            maxRetries: retryConfig.maxRetries,
            error: lastError?.message,
        }, 'LINE API operation failed after all retries');

        return null;
    }

    /**
     * Task 9.1.3: Handle database errors with user-friendly messages
     */
    static handleDatabaseError(error: any, context: string): string {
        logger.error({ context, error: error.message, code: error.code }, 'Database error');

        // Prisma error codes
        if (error.code === 'P2002') {
            return 'ข้อมูลนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง';
        }

        if (error.code === 'P2025') {
            return 'ไม่พบข้อมูลที่ต้องการ';
        }

        if (error.code === 'P2003') {
            return 'ข้อมูลที่เกี่ยวข้องไม่ถูกต้อง';
        }

        if (error.code === 'P2014') {
            return 'ข้อมูลมีความสัมพันธ์กับข้อมูลอื่น ไม่สามารถลบได้';
        }

        // Connection errors
        if (error.code === 'P1001' || error.code === 'P1002') {
            return 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
        }

        // Generic error
        return 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง';
    }

    /**
     * Task 9.1.4: Handle rate limit with exponential backoff
     */
    static async handleRateLimit(
        operation: () => Promise<any>,
        context: string
    ): Promise<any> {
        const maxRetries = 5;
        let delay = 1000; // Start with 1 second

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                const axiosError = error as AxiosError;

                if (axiosError.response?.status === 429) {
                    // Rate limited
                    const retryAfter = axiosError.response.headers['retry-after'];
                    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;

                    logger.warn({
                        context,
                        attempt,
                        waitTime,
                    }, 'Rate limited, waiting before retry');

                    if (attempt < maxRetries) {
                        await this.sleep(waitTime);
                        delay *= 2; // Exponential backoff
                    }
                } else {
                    throw error;
                }
            }
        }

        throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
    }

    /**
     * Task 9.1.5: Validate input with clear feedback
     */
    static validateInput(
        input: string,
        type: 'phone' | 'email' | 'amount' | 'date' | 'text'
    ): { valid: boolean; message?: string } {
        switch (type) {
            case 'phone':
                if (!/^0[0-9]{9}$/.test(input)) {
                    return {
                        valid: false,
                        message: 'เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก เช่น 0812345678',
                    };
                }
                break;

            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
                    return {
                        valid: false,
                        message: 'อีเมลไม่ถูกต้อง กรุณากรอกอีเมลที่ถูกต้อง เช่น example@email.com',
                    };
                }
                break;

            case 'amount':
                const amount = parseFloat(input);
                if (isNaN(amount) || amount <= 0) {
                    return {
                        valid: false,
                        message: 'จำนวนเงินไม่ถูกต้อง กรุณากรอกตัวเลขที่มากกว่า 0',
                    };
                }
                break;

            case 'date':
                const date = new Date(input);
                if (isNaN(date.getTime())) {
                    return {
                        valid: false,
                        message: 'วันที่ไม่ถูกต้อง กรุณากรอกวันที่ในรูปแบบ DD/MM/YYYY',
                    };
                }
                break;

            case 'text':
                if (!input || input.trim().length === 0) {
                    return {
                        valid: false,
                        message: 'กรุณากรอกข้อความ',
                    };
                }
                if (input.length > 1000) {
                    return {
                        valid: false,
                        message: 'ข้อความยาวเกินไป (สูงสุด 1000 ตัวอักษร)',
                    };
                }
                break;
        }

        return { valid: true };
    }

    /**
     * Task 9.1.6: Clean up conversation state on errors
     */
    static async cleanupConversationState(lineUserId: string): Promise<void> {
        try {
            await prisma.conversationState.deleteMany({
                where: { lineUserId },
            });

            logger.info({ lineUserId }, 'Conversation state cleaned up');
        } catch (error) {
            logger.error({ lineUserId, error }, 'Failed to cleanup conversation state');
        }
    }

    /**
     * Task 9.1.7: Log webhook processing errors
     */
    static logWebhookError(
        eventType: string,
        lineUserId: string,
        error: any,
        payload?: any
    ): void {
        logger.error({
            eventType,
            lineUserId,
            error: error.message,
            stack: error.stack,
            payload,
        }, 'Webhook processing error');
    }

    /**
     * Format error for user display
     */
    static formatErrorForUser(error: any): string {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (status === 403) {
                return 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบว่าคุณได้เพิ่มบัญชีนี้เป็นเพื่อนแล้ว';
            }
            if (status === 429) {
                return 'มีการใช้งานมากเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
            }
            if (status && status >= 500) {
                return 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้งในภายหลัง';
            }
        }

        return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    }

    /**
     * Sleep utility
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

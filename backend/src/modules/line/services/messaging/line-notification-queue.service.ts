/**
 * LINE Notification Queue Service
 * 
 * Purpose: Queue LINE notifications to prevent rate limiting
 * - Handles high volume of notifications
 * - Prevents LINE API rate limit (500 messages/hour)
 * - Retry failed messages
 * - Priority queue support
 */

import { logger } from '@utils/common/logger.util';
import { LineService } from '@line/services/core/line.service';

const lineService = new LineService();

interface QueuedNotification {
    id: string;
    lineUserId: string;
    message: any;
    priority: 'high' | 'normal' | 'low';
    retryCount: number;
    maxRetries: number;
    createdAt: Date;
}

export class LineNotificationQueueService {
    private queue: QueuedNotification[] = [];
    private processing = false;
    private readonly RATE_LIMIT_PER_SECOND = 5; // 5 messages per second (safe limit)
    private readonly MAX_RETRIES = 3;
    private lastProcessTime = 0;

    /**
     * Add notification to queue
     */
    async enqueue(
        lineUserId: string,
        message: any,
        priority: 'high' | 'normal' | 'low' = 'normal'
    ): Promise<void> {
        const notification: QueuedNotification = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            lineUserId,
            message,
            priority,
            retryCount: 0,
            maxRetries: this.MAX_RETRIES,
            createdAt: new Date(),
        };

        // Insert based on priority
        if (priority === 'high') {
            this.queue.unshift(notification);
        } else {
            this.queue.push(notification);
        }

        logger.info({
            notificationId: notification.id,
            lineUserId,
            priority,
            queueSize: this.queue.length,
        }, 'Notification added to queue');

        // Start processing if not already running
        if (!this.processing) {
            this.startProcessing();
        }
    }

    /**
     * Start processing queue
     */
    private async startProcessing(): Promise<void> {
        if (this.processing) return;

        this.processing = true;
        logger.info('Started processing LINE notification queue');

        while (this.queue.length > 0) {
            const notification = this.queue.shift();
            if (!notification) break;

            try {
                // Rate limiting: wait if needed
                await this.waitForRateLimit();

                // Send notification - wrap message in array as LINE API expects messages array
                await lineService.pushMessage(notification.lineUserId, [notification.message]);

                logger.info({
                    notificationId: notification.id,
                    lineUserId: notification.lineUserId,
                }, 'Notification sent successfully');

                this.lastProcessTime = Date.now();
            } catch (error) {
                logger.error({
                    notificationId: notification.id,
                    lineUserId: notification.lineUserId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    retryCount: notification.retryCount,
                }, 'Failed to send notification');

                // Retry logic
                if (notification.retryCount < notification.maxRetries) {
                    notification.retryCount++;
                    // Add back to queue with lower priority
                    this.queue.push(notification);
                    logger.info({
                        notificationId: notification.id,
                        retryCount: notification.retryCount,
                    }, 'Notification added back to queue for retry');
                } else {
                    logger.error({
                        notificationId: notification.id,
                        lineUserId: notification.lineUserId,
                    }, 'Notification failed after max retries');
                }
            }
        }

        this.processing = false;
        logger.info('Finished processing LINE notification queue');
    }

    /**
     * Wait for rate limit
     */
    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastProcess = now - this.lastProcessTime;
        const minInterval = 1000 / this.RATE_LIMIT_PER_SECOND; // milliseconds between messages

        if (timeSinceLastProcess < minInterval) {
            const waitTime = minInterval - timeSinceLastProcess;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    /**
     * Get queue status
     */
    getStatus(): {
        queueSize: number;
        processing: boolean;
        rateLimit: number;
    } {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            rateLimit: this.RATE_LIMIT_PER_SECOND,
        };
    }

    /**
     * Clear queue (for testing/emergency)
     */
    clearQueue(): void {
        this.queue = [];
        logger.warn('LINE notification queue cleared');
    }
}

export const lineNotificationQueue = new LineNotificationQueueService();

/**
 * Async Audit Log Service
 * 
 * Uses BullMQ queue to process audit logs asynchronously
 * This prevents audit logging from blocking requests
 */

import { Queue, Worker, Job } from 'bullmq';
import { redis } from '@config/redis.config';
import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

interface AuditLogData {
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    metadata?: any;
    timestamp: Date;
}

/**
 * Audit Log Queue
 */
export class AsyncAuditLogService {
    private queue: Queue<AuditLogData, any, string>;
    private worker: Worker<AuditLogData>;

    constructor() {
        // Create queue with type assertion to handle ioredis version mismatch
        this.queue = new Queue<AuditLogData>('audit-logs', {
            connection: redis as any, // Type assertion for ioredis compatibility
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: {
                    count: 1000, // Keep last 1000 completed jobs
                    age: 24 * 3600, // Remove after 24 hours
                },
                removeOnFail: {
                    count: 5000, // Keep last 5000 failed jobs for debugging
                },
            },
        });

        // Create worker
        this.worker = new Worker<AuditLogData>(
            'audit-logs',
            async (job: Job<AuditLogData>) => {
                await this.processAuditLog(job.data);
            },
            {
                connection: redis as any, // Type assertion for ioredis compatibility
                concurrency: 10, // Process 10 logs concurrently
            }
        );

        // Worker event handlers
        this.worker.on('completed', (job) => {
            logger.debug({ jobId: job.id }, 'Audit log processed');
        });

        this.worker.on('failed', (job, err) => {
            logger.error(
                { jobId: job?.id, error: err.message },
                'Failed to process audit log'
            );
        });

        logger.info('Async Audit Log Service initialized');
    }

    /**
     * Add audit log to queue (fire and forget)
     */
    async log(data: Omit<AuditLogData, 'timestamp'>): Promise<void> {
        try {
            await this.queue.add('audit-log', {
                ...data,
                timestamp: new Date(),
            });
        } catch (error) {
            // Log error but don't throw - audit logging should never break the app
            logger.error({ error, data }, 'Failed to queue audit log');
        }
    }

    /**
     * Process audit log (save to database)
     */
    private async processAuditLog(data: AuditLogData): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    entity: data.entity || 'UNKNOWN', // Provide default value
                    entityId: data.entityId,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    metadata: data.metadata,
                    createdAt: data.timestamp,
                },
            });
        } catch (error) {
            logger.error({ error, data }, 'Failed to save audit log to database');
            throw error; // Throw to trigger retry
        }
    }

    /**
     * Get queue statistics
     */
    async getStats() {
        const [waiting, active, completed, failed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            total: waiting + active + completed + failed,
        };
    }

    /**
     * Pause queue processing
     */
    async pause(): Promise<void> {
        await this.queue.pause();
        logger.warn('Audit log queue paused');
    }

    /**
     * Resume queue processing
     */
    async resume(): Promise<void> {
        await this.queue.resume();
        logger.info('Audit log queue resumed');
    }

    /**
     * Close queue and worker
     */
    async close(): Promise<void> {
        await this.worker.close();
        await this.queue.close();
        logger.info('Async Audit Log Service closed');
    }
}

// Export singleton instance
export const asyncAuditLog = new AsyncAuditLogService();

/**
 * Example usage:
 * 
 * // In middleware or controller
 * await asyncAuditLog.log({
 *     userId: request.user?.userId,
 *     action: 'LOGIN',
 *     entity: 'auth',
 *     ipAddress: request.ip,
 *     userAgent: request.headers['user-agent'],
 *     metadata: { email: request.body.email }
 * });
 * 
 * // Get statistics
 * const stats = await asyncAuditLog.getStats();
 * console.log('Audit log queue:', stats);
 */

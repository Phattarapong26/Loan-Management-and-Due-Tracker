import { Queue, Worker, Job } from 'bullmq';
import { redis } from '@config/redis.config';
import { env } from '@config/env.config';
import { logger } from './logger.util';

export interface QueueJob<T = any> {
    name: string;
    data: T;
    opts?: {
        delay?: number;
        attempts?: number;
        backoff?: number;
    };
}

/**
 * Queue utility for background job processing
 */
export class QueueUtil {
    private static queues = new Map<string, Queue>();
    private static workers = new Map<string, Worker>();

    /**
     * Create or get existing queue
     */
    static getQueue(name: string): Queue {
        if (!this.queues.has(name)) {
            const queue = new Queue(name, {
                connection: redis as any, // Type assertion for ioredis compatibility
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: {
                        count: 100,
                        age: 3600,
                    },
                    removeOnFail: {
                        count: 500,
                    },
                },
            });

            this.queues.set(name, queue);
            logger.info({ queue: name }, 'Queue created');
        }

        return this.queues.get(name)!;
    }

    /**
     * Add job to queue
     */
    static async addJob<T>(queueName: string, job: QueueJob<T>): Promise<Job> {
        const queue = this.getQueue(queueName);
        return queue.add(job.name, job.data, job.opts);
    }

    /**
     * Create worker for queue
     */
    static createWorker<T = any, R = any>(
        queueName: string,
        processor: (job: Job<T>) => Promise<R>
    ): Worker {
        if (this.workers.has(queueName)) {
            logger.warn({ queue: queueName }, 'Worker already exists');
            return this.workers.get(queueName)!;
        }

        const worker = new Worker(queueName, processor, {
            connection: redis as any, // Type assertion for ioredis compatibility
            concurrency: env.QUEUE_CONCURRENCY,
        });

        worker.on('completed', (job) => {
            logger.info({ jobId: job.id, queue: queueName }, 'Job completed');
        });

        worker.on('failed', (job, err) => {
            logger.error(
                { jobId: job?.id, queue: queueName, error: err.message },
                'Job failed'
            );
        });

        this.workers.set(queueName, worker);
        logger.info({ queue: queueName }, 'Worker created');

        return worker;
    }

    /**
     * Wait for job completion
     * Polls job status until completed or failed
     */
    static async waitForJob(jobId: string, timeout: number = 30000): Promise<{
        completed: boolean;
        failed: boolean;
        data?: any;
        error?: string;
    }> {
        // Find job in any queue
        let job: Job | null = null;
        let foundQueue: Queue | null = null;
        
        for (const queue of this.queues.values()) {
            const foundJob = await queue.getJob(jobId);
            if (foundJob) {
                job = foundJob;
                foundQueue = queue;
                break;
            }
        }

        if (!job || !foundQueue) {
            throw new Error('Job not found');
        }

        return new Promise((resolve) => {
            const startTime = Date.now();
            const timeoutId = setTimeout(() => {
                resolve({
                    completed: false,
                    failed: true,
                    error: 'Job timeout',
                });
            }, timeout);

            // Poll job status
            const checkInterval = setInterval(async () => {
                try {
                    const state = await job!.getState();
                    
                    if (state === 'completed') {
                        clearInterval(checkInterval);
                        clearTimeout(timeoutId);
                        
                        // Get job result
                        const updatedJob = await foundQueue!.getJob(jobId);
                        const result = updatedJob?.returnvalue || null;
                        
                        resolve({
                            completed: true,
                            failed: false,
                            data: result,
                        });
                    } else if (state === 'failed') {
                        clearInterval(checkInterval);
                        clearTimeout(timeoutId);
                        
                        // Get failure reason
                        const updatedJob = await foundQueue!.getJob(jobId);
                        const error = updatedJob?.failedReason || 'Job failed';
                        
                        resolve({
                            completed: false,
                            failed: true,
                            error: typeof error === 'string' ? error : 'Job failed',
                        });
                    }
                    // If still active, continue polling
                    
                    // Check timeout manually as well
                    if (Date.now() - startTime > timeout) {
                        clearInterval(checkInterval);
                        clearTimeout(timeoutId);
                        resolve({
                            completed: false,
                            failed: true,
                            error: 'Job timeout',
                        });
                    }
                } catch (error: any) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve({
                        completed: false,
                        failed: true,
                        error: error.message || 'Error checking job status',
                    });
                }
            }, 500); // Check every 500ms
        });
    }

    /**
     * Close all queues and workers
     */
    static async closeAll(): Promise<void> {
        const closePromises: Promise<void>[] = [];

        for (const worker of this.workers.values()) {
            closePromises.push(worker.close());
        }

        for (const queue of this.queues.values()) {
            closePromises.push(queue.close());
        }

        await Promise.all(closePromises);
        logger.info('All queues and workers closed');
    }
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await QueueUtil.closeAll();
});

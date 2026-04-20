import { Job } from 'bullmq';
import { QueueUtil } from '@utils/common/queue.util';
import { NotificationRepository } from '../repositories/notification.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { logger } from '@utils/common/logger.util';

/**
 * Notification Worker - Processes notification queue jobs
 * Handles in-app notification creation from calendar events, task assignments, etc.
 */
class NotificationWorker {
    private notificationRepository: NotificationRepository;
    private userRepository: UserRepository;

    constructor() {
        this.notificationRepository = new NotificationRepository();
        this.userRepository = new UserRepository();
        this.initialize();
    }

    private initialize() {
        QueueUtil.createWorker('notification', async (job: Job) => {
            const { userId, type, title, message, link, metadata, priority } = job.data;

            logger.info({ jobId: job.id, jobName: job.name, userId, type }, 'Processing notification job');

            // Validate user exists
            const user = await this.userRepository.findById(userId);
            if (!user) {
                logger.warn({ jobId: job.id, userId }, 'Notification job skipped: user not found');
                return { skipped: true, reason: 'user not found' };
            }

            // Map job type to valid NotificationType enum
            const typeMap: Record<string, string> = {
                'TASK_ASSIGNED': 'TASK_ASSIGNED',
                'CALENDAR_EVENT': 'CALENDAR_EVENT',
                'PAYMENT_DUE': 'PAYMENT_DUE',
                'PAYMENT_OVERDUE': 'PAYMENT_OVERDUE',
                'LOAN_APPROVED': 'LOAN_APPROVED',
                'LOAN_REJECTED': 'LOAN_REJECTED',
                'EXPENSE_APPROVED': 'EXPENSE_APPROVED',
                'EXPENSE_REJECTED': 'EXPENSE_REJECTED',
                'SYSTEM_ALERT': 'SYSTEM_ALERT',
                'REMINDER': 'REMINDER',
            };

            const resolvedType = typeMap[type] ?? 'OTHER';

            const notification = await this.notificationRepository.createWithDedup({
                userId,
                type: resolvedType as any,
                title,
                message,
                link,
                metadata,
                priority: priority ?? 'MEDIUM',
                dedupWindow: 1, // 1 hour dedup window for task assignments
            });

            logger.info({ jobId: job.id, notificationId: notification?.id }, 'Notification created');
            return { notificationId: notification?.id };
        });

        logger.info('Notification worker initialized');
    }
}

export const notificationWorker = new NotificationWorker();

import { Job } from 'bullmq';
import { QueueUtil } from '@utils/common/queue.util';
import { EmailService } from '@notifications/channels/email/email.service';
import { logger } from '@utils/common/logger.util';

/**
 * Email Worker - Processes email sending jobs
 */
export class EmailWorker {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
        this.initialize();
    }

    /**
     * Initialize worker
     */
    private initialize() {
        QueueUtil.createWorker('email', async (job: Job) => {
            try {
                logger.info({ jobId: job.id, name: job.name }, 'Processing email job');

                let success = false;

                switch (job.name) {
                    case 'send-otp':
                        success = !!await this.emailService.sendOTP({
                            to: job.data.to,
                            ...job.data.data
                        });
                        break;
                    case 'send-temporary-password':
                        success = !!await this.emailService.sendTemporaryPassword({
                            to: job.data.to,
                            ...job.data.data
                        });
                        break;
                    case 'send-password-reset-notification':
                        success = !!await this.emailService.sendPasswordReset({
                            to: job.data.to,
                            ...job.data.data
                        });
                        break;
                    case 'send-forgot-password-link':
                        success = !!await this.emailService.sendForgotPasswordLink({
                            to: job.data.to,
                            ...job.data.data
                        });
                        break;
                    default:
                        // Generic email send
                        success = await this.emailService.sendEmail(job.data);
                        break;
                }

                if (success) {
                    logger.info({ jobId: job.id }, 'Email processed successfully');
                } else {
                    logger.warn({ jobId: job.id }, 'Email processing finished but send failed');
                }

                return { success };
            } catch (error: any) {
                logger.error(
                    { jobId: job.id, error: error.message, stack: error.stack },
                    'Failed to process email job'
                );
                throw error;
            }
        });

        logger.info('Email worker initialized');
    }
}

// Initialize worker on module load
export const emailWorker = new EmailWorker();

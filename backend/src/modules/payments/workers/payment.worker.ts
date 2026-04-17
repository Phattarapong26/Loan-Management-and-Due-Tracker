import { Job } from 'bullmq';
import { QueueUtil } from '@utils/common/queue.util';
import { OptimisticLockError } from '@/core/utils/optimistic-locking.util';
import { logger } from '@utils/common/logger.util';
import { paymentReceiptService } from '@modules/invoices/services/payment-receipt.service';

/**
 * Payment Worker - Processes payment recording jobs
 * Handles race conditions and ensures data consistency
 * 
 * NOW USING SAFE SERVICES - Protected against race conditions
 */
export class PaymentWorker {
    constructor() {
        this.initialize();
    }

    /**
     * Initialize worker
     */
    private initialize() {
        QueueUtil.createWorker('payment-record', async (job: Job) => {
            try {
                logger.info({ jobId: job.id, data: job.data }, 'Processing payment recording');

                // Use payment-safe service for recording with retry mechanism
                const { processPaymentWithRetry } = await import('../services/payment-safe.service');
                const result = await processPaymentWithRetry(job.data);

                if (result.loan && result.payment) {
                    logger.info(
                        { jobId: job.id, paymentId: result.payment.id, loanId: result.loan.id },
                        'Payment recorded successfully'
                    );

                    // Generate receipt and send LINE notification
                    try {
                        const receipt = await paymentReceiptService.generatePaymentReceipt(
                            result.payment.id,
                            job.data.userId,
                            {
                                includeQRCode: false,
                                autoSend: true,
                                sendVia: 'LINE',
                            }
                        );

                        logger.info(
                            { 
                                jobId: job.id, 
                                paymentId: result.payment.id, 
                                receiptId: receipt.receiptId,
                                receiptNumber: receipt.receiptNumber 
                            },
                            'Payment receipt generated and sent via LINE'
                        );
                    } catch (receiptError: any) {
                        // Log error but don't fail the payment
                        logger.error(
                            { 
                                jobId: job.id, 
                                paymentId: result.payment.id, 
                                error: receiptError.message 
                            },
                            'Failed to generate receipt or send LINE notification (payment still recorded)'
                        );
                    }
                }

                // Store result in job returnvalue (BullMQ will handle this)
                return result;
            } catch (error: any) {
                // Handle optimistic lock conflicts
                if (error instanceof OptimisticLockError) {
                    logger.warn(
                        { 
                            jobId: job.id, 
                            entityType: error.entityType,
                            entityId: error.entityId,
                            expectedVersion: error.expectedVersion 
                        },
                        'Optimistic lock conflict detected - job will be retried by BullMQ'
                    );
                    throw error; // Let BullMQ retry
                }
                
                logger.error(
                    { jobId: job.id, error: error.message, stack: error.stack },
                    'Failed to record payment'
                );
                throw error;
            }
        });

        logger.info('Payment worker initialized with race-condition protection');
    }
}

// Initialize worker on module load
export const paymentWorker = new PaymentWorker();

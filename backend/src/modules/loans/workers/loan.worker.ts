import { Job } from 'bullmq';
import { QueueUtil } from '@utils/common/queue.util';
import { LoanService } from '../services/loan.service';
import { logger } from '@utils/common/logger.util';

/**
 * Loan Worker - Processes loan creation jobs
 * Handles race conditions and ensures data consistency
 */
export class LoanWorker {
    private loanService: LoanService;

    constructor() {
        this.loanService = new LoanService();
        this.initialize();
    }

    /**
     * Initialize worker
     */
    private initialize() {
        QueueUtil.createWorker('loan-create', async (job: Job) => {
            try {
                logger.info({ jobId: job.id, data: job.data }, 'Processing loan creation');

                const result = await this.loanService.processLoanCreation(job.data);

                if (result.loan) {
                    logger.info({ jobId: job.id, loanId: result.loan.id }, 'Loan created successfully');
                }

                // Store result in job returnvalue (BullMQ will handle this)
                return result;
            } catch (error: any) {
                logger.error(
                    { jobId: job.id, error: error.message, stack: error.stack },
                    'Failed to create loan'
                );
                throw error;
            }
        });

        logger.info('Loan worker initialized');
    }
}

// Initialize worker on module load
export const loanWorker = new LoanWorker();

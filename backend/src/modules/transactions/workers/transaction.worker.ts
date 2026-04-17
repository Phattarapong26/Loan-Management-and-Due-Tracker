import { Job } from 'bullmq';
import { QueueUtil } from '@utils/common/queue.util';
import { logger } from '@utils/common/logger.util';
import { TransactionRepository } from '../repositories/transaction.repository';

/**
 * Transaction processing worker
 * Processes transactions in the background
 */

const transactionRepository = new TransactionRepository();

async function processTransaction(job: Job) {
    const { transactionId } = job.data;

    logger.info({ transactionId }, 'Processing transaction');

    try {
        // Simulate transaction processing
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Update transaction status
        await transactionRepository.updateStatus(transactionId, 'COMPLETED');

        logger.info({ transactionId }, 'Transaction processed successfully');
    } catch (error: any) {
        logger.error({ transactionId, error }, 'Transaction processing failed');
        throw error;
    }
}

// Create worker
QueueUtil.createWorker('transaction-processing', processTransaction);

logger.info('Transaction processing worker started');

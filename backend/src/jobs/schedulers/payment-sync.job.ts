/**
 * Payment Sync Job
 * 
 * Scheduled job to refresh payment data every 15 minutes
 * This ensures the LINE integration displays up-to-date payment information
 */

import cron from 'node-cron';
import { paymentSyncService } from '@payments/services/payment-sync.service';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { logger } from '@utils/common/logger.util';

export class PaymentSyncJob {
  private job: ReturnType<typeof cron.schedule> | null = null;
  private loanRepository: LoanRepository;

  constructor() {
    this.loanRepository = new LoanRepository();
  }

  initialize(): void {
    this.job = cron.schedule('*/15 * * * *', async () => { await this.runSync(); }, { timezone: 'Asia/Bangkok' });
    logger.info('Payment sync job initialized - runs every 15 minutes');
  }

  private async runSync(): Promise<void> {
    const startTime = Date.now();
    logger.info('Starting scheduled payment sync');

    try {
      const scheduleResult = await paymentSyncService.syncPaymentSchedule();
      const historyResult = await paymentSyncService.syncPaymentHistory();

      const activeLoanIds = await this.loanRepository.findActiveIds();

      let instructionsProcessed = 0;
      let instructionsErrors = 0;

      for (const loanId of activeLoanIds) {
        try {
          await paymentSyncService.syncPaymentInstructions(loanId);
          instructionsProcessed++;
        } catch (error) {
          instructionsErrors++;
          logger.error({ loanId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to sync payment instructions');
        }
      }

      logger.info({
        duration: Date.now() - startTime,
        scheduleRecords: scheduleResult.recordsProcessed,
        historyRecords: historyResult.recordsProcessed,
        instructionsProcessed,
        instructionsErrors,
        totalLoans: activeLoanIds.length,
      }, 'Scheduled payment sync completed');

      const syncStatus = await paymentSyncService.getSyncStatus();
      logger.info(syncStatus, 'Payment sync status');
    } catch (error) {
      logger.error({ duration: Date.now() - startTime, error: error instanceof Error ? error.message : 'Unknown error' }, 'Scheduled payment sync failed');
    }
  }

  stop(): void {
    if (this.job) { this.job.stop(); logger.info('Payment sync job stopped'); }
  }

  async triggerManualSync(): Promise<void> {
    logger.info('Manual payment sync triggered');
    await this.runSync();
  }
}

export const paymentSyncJob = new PaymentSyncJob();

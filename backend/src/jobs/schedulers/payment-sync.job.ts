/**
 * Payment Sync Job
 * 
 * Scheduled job to refresh payment data every 15 minutes
 * This ensures the LINE integration displays up-to-date payment information
 */

import cron from 'node-cron';
import { paymentSyncService } from '@payments/services/payment-sync.service';
import { logger } from '@utils/common/logger.util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PaymentSyncJob {
  private job: ReturnType<typeof cron.schedule> | null = null;

  /**
   * Initialize and start the payment sync job
   * Runs every 15 minutes
   */
  initialize(): void {
    // Run every 15 minutes
    this.job = cron.schedule(
      '*/15 * * * *',
      async () => {
        await this.runSync();
      },
      {
        timezone: 'Asia/Bangkok',
      }
    );

    logger.info('Payment sync job initialized - runs every 15 minutes');
  }

  /**
   * Run the sync process
   */
  private async runSync(): Promise<void> {
    const startTime = Date.now();
    logger.info('Starting scheduled payment sync');

    try {
      // Sync payment schedules (updates overdue status)
      const scheduleResult = await paymentSyncService.syncPaymentSchedule();
      
      // Sync payment history (refreshes cache)
      const historyResult = await paymentSyncService.syncPaymentHistory();

      // Get active loans that need payment instruction updates
      const activeLoans = await prisma.loan.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      });

      // Sync payment instructions for active loans
      let instructionsProcessed = 0;
      let instructionsErrors = 0;

      for (const loan of activeLoans) {
        try {
          await paymentSyncService.syncPaymentInstructions(loan.id);
          instructionsProcessed++;
        } catch (error) {
          instructionsErrors++;
          logger.error({
            loanId: loan.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, 'Failed to sync payment instructions');
        }
      }

      const duration = Date.now() - startTime;

      logger.info({
        duration,
        scheduleRecords: scheduleResult.recordsProcessed,
        scheduleSuccess: scheduleResult.success,
        historyRecords: historyResult.recordsProcessed,
        historySuccess: historyResult.success,
        instructionsProcessed,
        instructionsErrors,
        totalLoans: activeLoans.length,
      }, 'Scheduled payment sync completed');

      // Log sync status for monitoring
      const syncStatus = await paymentSyncService.getSyncStatus();
      logger.info(syncStatus, 'Payment sync status');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Scheduled payment sync failed');
    }
  }

  /**
   * Stop the sync job
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      logger.info('Payment sync job stopped');
    }
  }

  /**
   * Manually trigger a sync (for testing or manual refresh)
   */
  async triggerManualSync(): Promise<void> {
    logger.info('Manual payment sync triggered');
    await this.runSync();
  }
}

export const paymentSyncJob = new PaymentSyncJob();

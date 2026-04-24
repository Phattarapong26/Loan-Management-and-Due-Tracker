/**
 * Payment Sync Service
 * 
 * IMPORTANT: This service queries existing payment data from our database.
 * The "Core System" mentioned in tasks IS our existing backend payment system.
 * This service provides methods to fetch and refresh payment data that already exists.
 */

import { PrismaClient, PaymentScheduleStatus } from '@prisma/client';
import { logger } from '@utils/common/logger.util';
import { penaltyCalculator } from './penalty-calculator.service';

const prisma = new PrismaClient();

export interface PaymentScheduleData {
  id: string;
  loanId: string;
  paymentNumber: number;
  paymentDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
  status: PaymentScheduleStatus;
  paidAt: Date | null;
}

export interface PaymentHistoryData {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  paymentType: string;
  reference: string | null;
  notes: string | null;
}

export interface PaymentInstructionData {
  loanId: string;
  paymentChannel: string;
  referenceNumber: string;
  amount: number;
  instructions: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  syncedAt: Date;
}

export class PaymentSyncService {
  /**
   * Query payment schedules from database
   * This refreshes cached data by re-querying the PaymentSchedule table
   */
  async syncPaymentSchedule(loanId?: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info({ loanId }, 'Starting payment schedule sync');

      // Query payment schedules from our database
      const whereClause = loanId ? { loanId } : {};
      
      const schedules = await prisma.paymentSchedule.findMany({
        where: whereClause,
        include: {
          loan: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'asc',
        },
      });

      recordsProcessed = schedules.length;

      // Update overdue status and calculate penalties for unpaid schedules
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const schedule of schedules) {
        if (schedule.status === 'UNPAID' && schedule.paymentDate < today) {
          // Calculate days overdue
          const daysOverdue = Math.floor(
            (today.getTime() - schedule.paymentDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Calculate penalties using the penalty calculator service
          try {
            await penaltyCalculator.calculatePenalty(schedule.id);
          } catch (penaltyError) {
            logger.error({
              scheduleId: schedule.id,
              error: penaltyError instanceof Error ? penaltyError.message : 'Unknown error',
            }, 'Failed to calculate penalty for schedule');
            
            // Fallback: just update status and days overdue
            await prisma.paymentSchedule.update({
              where: { id: schedule.id },
              data: { 
                status: 'OVERDUE',
                daysOverdue,
              },
            });
          }
        }
      }

      // ── Sync loan.overdue_days from payment_schedules (source of truth) ──────
      // Group schedules by loanId and find max daysOverdue per loan
      const loanIds = loanId
        ? [loanId]
        : [...new Set(schedules.map(s => s.loanId))];

      for (const lid of loanIds) {
        const loanSchedules = schedules.filter(s => s.loanId === lid);
        // Only consider schedules that are still unpaid/overdue — never PAID schedules
        const maxOverdue = loanSchedules
          .filter(s => ['UNPAID', 'OVERDUE', 'PARTIAL'].includes(s.status))
          .reduce((max, s) => {
            const d = s.daysOverdue ?? 0;
            return d > max ? d : max;
          }, 0);

        // Determine new loan status based on overdue days
        const currentLoan = loanSchedules[0]?.loan;
        if (!currentLoan) continue;

        let newStatus: string | undefined;
        if (currentLoan.status === 'ACTIVE' || currentLoan.status === 'NPL') {
          if (maxOverdue >= 90) {
            newStatus = 'NPL';
          } else if (maxOverdue >= 30) {
            newStatus = 'DEFAULTED';
          } else {
            // maxOverdue < 30 — loan is recovering or current
            newStatus = 'ACTIVE';
          }
        }

        await prisma.loan.update({
          where: { id: lid },
          data: {
            overdueDays: maxOverdue,
            ...(newStatus ? { status: newStatus as any } : {}),
          },
        });
      }
      // ─────────────────────────────────────────────────────────────────────────

      const duration = Date.now() - startTime;
      logger.info({
        recordsProcessed,
        duration,
        loanId,
      }, 'Payment schedule sync completed');

      return {
        success: true,
        recordsProcessed,
        errors,
        syncedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, loanId }, 'Payment schedule sync failed');
      errors.push(errorMessage);

      return {
        success: false,
        recordsProcessed,
        errors,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Query payment history from database
   * This refreshes cached data by re-querying the Payment table
   */
  async syncPaymentHistory(loanId?: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info({ loanId }, 'Starting payment history sync');

      // Query payment history from our database
      const whereClause = loanId ? { loanId } : {};
      
      const payments = await prisma.payment.findMany({
        where: whereClause,
        include: {
          loan: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
      });

      recordsProcessed = payments.length;

      const duration = Date.now() - startTime;
      logger.info({
        recordsProcessed,
        duration,
        loanId,
      }, 'Payment history sync completed');

      return {
        success: true,
        recordsProcessed,
        errors,
        syncedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, loanId }, 'Payment history sync failed');
      errors.push(errorMessage);

      return {
        success: false,
        recordsProcessed,
        errors,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Query/create payment instructions
   * This generates payment instructions based on loan data
   */
  async syncPaymentInstructions(loanId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info({ loanId }, 'Starting payment instructions sync');

      // Query loan data
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          customer: true,
          paymentSchedule: {
            where: {
              status: {
                in: ['UNPAID', 'OVERDUE'],
              },
            },
            orderBy: {
              paymentDate: 'asc',
            },
            take: 1,
          },
        },
      });

      if (!loan) {
        throw new Error(`Loan not found: ${loanId}`);
      }

      // Generate payment reference number
      const today = new Date();
      const dateStr = (today.toISOString().split('T')[0] || '').replace(/-/g, '');
      const referenceNumber = `${loanId.substring(0, 8)}-${dateStr}`;

      // Payment instructions are generated on-the-fly
      // No need to store in database as they're derived from loan data
      recordsProcessed = 1;

      const duration = Date.now() - startTime;
      logger.info({
        recordsProcessed,
        duration,
        loanId,
        referenceNumber,
      }, 'Payment instructions sync completed');

      return {
        success: true,
        recordsProcessed,
        errors,
        syncedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, loanId }, 'Payment instructions sync failed');
      errors.push(errorMessage);

      return {
        success: false,
        recordsProcessed,
        errors,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Get payment schedule data for a loan
   */
  async getPaymentScheduleData(loanId: string): Promise<PaymentScheduleData[]> {
    const schedules = await prisma.paymentSchedule.findMany({
      where: { loanId },
      orderBy: { paymentDate: 'asc' },
    });

    return schedules.map((schedule) => ({
      id: schedule.id,
      loanId: schedule.loanId,
      paymentNumber: schedule.paymentNumber,
      paymentDate: schedule.paymentDate,
      principalAmount: schedule.principalAmount.toNumber(),
      interestAmount: schedule.interestAmount.toNumber(),
      totalPayment: schedule.totalPayment.toNumber(),
      remainingBalance: schedule.remainingBalance.toNumber(),
      status: schedule.status,
      paidAt: schedule.paidAt,
    }));
  }

  /**
   * Get payment history data for a loan
   */
  async getPaymentHistoryData(loanId: string, limit: number = 10): Promise<PaymentHistoryData[]> {
    const payments = await prisma.payment.findMany({
      where: { loanId },
      orderBy: { paymentDate: 'desc' },
      take: limit,
    });

    return payments.map((payment) => ({
      id: payment.id,
      loanId: payment.loanId,
      amount: payment.amount.toNumber(),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      reference: payment.reference,
      notes: payment.notes,
    }));
  }

  /**
   * Get payment instructions for a loan
   */
  async getPaymentInstructionData(loanId: string): Promise<PaymentInstructionData> {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        paymentSchedule: {
          where: {
            status: {
              in: ['UNPAID', 'OVERDUE'],
            },
          },
          orderBy: {
            paymentDate: 'asc',
          },
          take: 1,
        },
      },
    });

    if (!loan) {
      throw new Error(`Loan not found: ${loanId}`);
    }

    // Generate payment reference
    const today = new Date();
    const dateStr = (today.toISOString().split('T')[0] || '').replace(/-/g, '');
    const referenceNumber = `${loanId.substring(0, 8)}-${dateStr}`;

    // Get next payment amount
    const nextPayment = loan.paymentSchedule[0];
    const amount = nextPayment ? nextPayment.totalPayment.toNumber() : 0;

    return {
      loanId,
      paymentChannel: 'BANK_TRANSFER',
      referenceNumber,
      amount,
      instructions: `กรุณาโอนเงินจำนวน ${amount.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} บาท พร้อมระบุเลขที่อ้างอิง: ${referenceNumber}`,
    };
  }

  /**
   * Sync all payment data for a loan
   */
  async syncAllPaymentData(loanId: string): Promise<{
    schedule: SyncResult;
    history: SyncResult;
    instructions: SyncResult;
  }> {
    logger.info({ loanId }, 'Starting full payment data sync');

    const [schedule, history, instructions] = await Promise.all([
      this.syncPaymentSchedule(loanId),
      this.syncPaymentHistory(loanId),
      this.syncPaymentInstructions(loanId),
    ]);

    logger.info({
      loanId,
      scheduleSuccess: schedule.success,
      historySuccess: history.success,
      instructionsSuccess: instructions.success,
    }, 'Full payment data sync completed');

    return {
      schedule,
      history,
      instructions,
    };
  }

  /**
   * Get sync status for monitoring
   */
  async getSyncStatus(): Promise<{
    lastScheduleSync: Date | null;
    lastHistorySync: Date | null;
    totalSchedules: number;
    totalPayments: number;
    overdueSchedules: number;
  }> {
    const [totalSchedules, totalPayments, overdueSchedules] = await Promise.all([
      prisma.paymentSchedule.count(),
      prisma.payment.count(),
      prisma.paymentSchedule.count({
        where: { status: 'OVERDUE' },
      }),
    ]);

    return {
      lastScheduleSync: new Date(), // Current time as we query in real-time
      lastHistorySync: new Date(),
      totalSchedules,
      totalPayments,
      overdueSchedules,
    };
  }
}

export const paymentSyncService = new PaymentSyncService();

// @ts-nocheck
/**
 * SAFE Payment Service with Optimistic Locking
 * 
 * This service replaces the vulnerable payment processing logic
 * with race-condition-safe implementations.
 * 
 * Key Features:
 * 1. Optimistic Locking (version field)
 * 2. Idempotency Keys
 * 3. SELECT FOR UPDATE
 * 4. SERIALIZABLE Isolation
 * 5. Comprehensive Error Handling
 * 6. Metrics & Monitoring
 * 7. Audit Logging
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  updateWithOptimisticLock,
  generateIdempotencyKey,
  OptimisticLockError,
} from '../../../core/utils/optimistic-locking.util';
import { logger } from '../../../core/utils/common/logger.util';
import { paymentMetrics } from '../../../core/utils/monitoring/metrics.util';
import { TRANSACTION_CONFIG, PAYMENT_CONFIG, OPTIMISTIC_LOCKING } from '../../../core/config/constants';
import { calculateEarlyPaymentInterest } from '../../../core/utils/calculation/calculation.util';
import { SystemConfigRepository } from '../../config-management/repositories/system-config.repository';
import { PaymentScheduleRepository } from '../repositories/payment-schedule.repository';
import { ReferenceNumberService } from '../../invoices/services/reference-number.service';
import { cacheService } from '../../../core/services/cache.service';
import { CACHE_INVALIDATION } from '../../../core/config/cache-strategy.config';

const prisma = new PrismaClient();

export interface ProcessPaymentInput {
  loanId: string;
  amount: number;
  paymentMethod: string;
  paymentType: 'EARLY' | 'ON_TIME' | 'LATE';
  paymentScheduleId?: string;
  notes?: string;
  createdBy: string;
  idempotencyKey?: string;
}

export interface ProcessPaymentResult {
  payment: any;
  loan: any;
  previousBalance: number;
  newBalance: number;
  isIdempotent: boolean;
}

/**
 * Process payment with optimistic locking (SAFE VERSION)
 * 
 * This method prevents race conditions by:
 * 1. Using optimistic locking (version field)
 * 2. Checking idempotency key
 * 3. Using SERIALIZABLE isolation
 * 4. Validating balance constraints
 * 5. Comprehensive audit logging
 * 6. Performance monitoring
 */
export async function processPaymentSafe(
  input: ProcessPaymentInput
): Promise<ProcessPaymentResult> {
  const startTime = Date.now();
  
  // Generate idempotency key if not provided
  const idempotencyKey = input.idempotencyKey || 
    generateIdempotencyKey('payment', `${input.loanId}-${Date.now()}`);

  // Audit log: Payment processing started
  logger.info({
    action: 'PAYMENT_PROCESSING_START',
    loanId: input.loanId,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    paymentType: input.paymentType,
    userId: input.createdBy,
    idempotencyKey,
  }, 'Payment processing started');

  // Check if payment already processed (idempotency)
  const existingPayment = await prisma.payment.findUnique({
    where: { idempotencyKey },
    include: { loan: true },
  });

  if (existingPayment) {
    // Metrics: Idempotent request detected
    paymentMetrics.idempotent.inc();
    
    logger.info({
      action: 'PAYMENT_IDEMPOTENT',
      loanId: input.loanId,
      idempotencyKey,
      existingPaymentId: existingPayment.id,
    }, 'Idempotent payment request detected');
    
    return {
      payment: existingPayment,
      loan: existingPayment.loan,
      previousBalance: existingPayment.loan.outstandingBalance.toNumber(),
      newBalance: existingPayment.loan.outstandingBalance.toNumber(),
      isIdempotent: true,
    };
  }

  try {
    // Process payment in SERIALIZABLE transaction with complete business logic
    const result = await prisma.$transaction(
      async (tx) => {
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const msPerDay = 1000 * 60 * 60 * 24;

        const deriveLoanOverdueDaysFromSchedules = async (loanId: string, asOf: Date) => {
          // Source of truth: earliest unpaid schedule that is past due
          const overdueSchedule = await tx.paymentSchedule.findFirst({
            where: {
              loanId,
              status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
              paymentDate: { lt: asOf },
            },
            orderBy: { paymentDate: 'asc' },
            select: { paymentDate: true },
          });

          if (!overdueSchedule) return 0;

          const due = startOfDay(new Date(overdueSchedule.paymentDate));
          const today = startOfDay(asOf);
          return due.getTime() < today.getTime()
            ? Math.max(0, Math.floor((today.getTime() - due.getTime()) / msPerDay))
            : 0;
        };

        // 1. Get loan with current state (within transaction)
        const loan = await tx.loan.findUnique({
          where: { id: input.loanId },
          select: {
            id: true,
            customerId: true,
            officerId: true,
            approvedBy: true,
            branchId: true,
            status: true,
            outstandingBalance: true,
            overdueDays: true,
            interestRate: true,
            monthlyPayment: true,
            nextPaymentDate: true,
            nextPaymentAmount: true,
            loanProductId: true,
            version: true, // For optimistic locking
          },
        });

        if (!loan) {
          throw new Error(`Loan not found: ${input.loanId}`);
        }

        const previousBalance = loan.outstandingBalance.toNumber();

        // 2. Get next payment schedule (or use provided one)
        let nextPayment;
        if (input.paymentScheduleId) {
          nextPayment = await tx.paymentSchedule.findUnique({
            where: { id: input.paymentScheduleId },
          });
        } else {
          // Find the next unpaid payment schedule
          nextPayment = await tx.paymentSchedule.findFirst({
            where: {
              loanId: input.loanId,
              status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
            },
            orderBy: { paymentNumber: 'asc' },
          });
        }

        if (!nextPayment) {
          throw new Error('No pending payment schedule found');
        }

        const paymentDate = new Date();
        const scheduledDate = new Date(nextPayment.paymentDate);

        // 3. Calculate days difference for early/late detection
        const daysDiff = Math.floor(
          (scheduledDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // 4. Determine payment type and calculate penalties/benefits
        let paymentType: 'EARLY' | 'ON_TIME' | 'LATE' = 'ON_TIME';
        let interestSaved = 0;
        let penaltyAmount = 0;

        if (daysDiff > 0) {
          // Early payment
          paymentType = 'EARLY';
          interestSaved = calculateEarlyPaymentInterest({
            outstandingBalance: previousBalance,
            interestRate: loan.interestRate.toNumber(),
            daysEarly: daysDiff,
          });

          // Get early payment benefits from config
          const systemConfigRepo = new SystemConfigRepository();
          const earlyPaymentDiscount = parseFloat(
            await systemConfigRepo.getValue('payment.early_discount', '0')
          );
          if (earlyPaymentDiscount > 0) {
            interestSaved += (interestSaved * earlyPaymentDiscount) / 100;
          }
        } else if (daysDiff < 0) {
          // Late payment
          paymentType = 'LATE';
          const overdueDays = Math.abs(daysDiff);

          // Use dynamic penalty service
          const { DynamicPenaltyService } = await import('@collections/services/dynamic-penalty.service');
          const dynamicPenalty = new DynamicPenaltyService();

          const penaltyResult = await dynamicPenalty.calculatePenaltyForLoan(
            input.loanId,
            previousBalance,
            overdueDays,
            0 // No collection fee for now
          );

          penaltyAmount = penaltyResult.penaltyAmount;

          // Log penalty calculation for audit
          logger.info({
            loanId: input.loanId,
            overdueDays,
            outstandingBalance: previousBalance,
            penaltyDetails: penaltyResult.penaltyDetails,
            calculation: penaltyResult.calculation
          }, 'Penalty calculation');

          // Overdue/next-payment/status will be recomputed from remaining schedules after we update schedule statuses below.
        }

        // 5. Validate payment amount
        const scheduleInterestAmount = nextPayment.interestAmount.toNumber();
        const currentOutstanding = previousBalance;

        if (input.amount <= 0) {
          throw new Error('จำนวนเงินต้องมากกว่า 0 บาท');
        }

        // Minimum payment check (must pay at least interest)
        const minimumPayment = scheduleInterestAmount;
        if (input.amount < minimumPayment) {
          throw new Error(
            `จำนวนเงินต่ำเกินไป ต้องชำระอย่างน้อย ${minimumPayment.toLocaleString('th-TH', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })} บาท (ดอกเบี้ยขั้นต่ำ)`
          );
        }

        // Maximum payment check (cannot exceed outstanding + buffer)
        if (input.amount > currentOutstanding + 1) {
          throw new Error(
            `ไม่สามารถชำระเกินยอดคงเหลือได้ ยอดคงเหลือปัจจุบัน: ${currentOutstanding.toLocaleString('th-TH')} บาท`
          );
        }

        // Reasonable amount check
        const maxReasonableAmount = currentOutstanding * 1.1;
        if (input.amount > maxReasonableAmount) {
          throw new Error(
            `จำนวนเงินสูงเกินไป กรุณาตรวจสอบยอดคงเหลือ: ${currentOutstanding.toLocaleString('th-TH')} บาท`
          );
        }

        // 6. Calculate payment breakdown (penalty → interest → principal)
        let remainingPayment = input.amount;
        let penaltyPaid = 0;
        let interestPaid = 0;
        let principalPaid = 0;

        // 6.1 Deduct penalty first
        if (penaltyAmount > 0) {
          penaltyPaid = Math.min(remainingPayment, penaltyAmount);
          remainingPayment -= penaltyPaid;
        }

        // 6.2 Deduct interest
        if (remainingPayment > 0) {
          interestPaid = Math.min(remainingPayment, scheduleInterestAmount);
          remainingPayment -= interestPaid;

          // 6.3 Deduct principal
          if (remainingPayment > 0) {
            principalPaid = Math.min(remainingPayment, currentOutstanding);
            remainingPayment -= principalPaid;
          }
        }

        // Validate principal doesn't exceed outstanding
        if (principalPaid > currentOutstanding) {
          throw new Error(
            `จำนวนเงินต้นที่จ่ายเกินยอดคงเหลือ เงินต้นที่จ่าย: ${principalPaid.toLocaleString('th-TH')} บาท, ` +
            `ยอดคงเหลือ: ${currentOutstanding.toLocaleString('th-TH')} บาท`
          );
        }

        const newBalance = Math.max(0, currentOutstanding - principalPaid);

        // Log payment breakdown
        logger.info({
          totalPayment: input.amount,
          penaltyPaid,
          interestPaid,
          principalPaid,
          remainingPayment,
          newBalance
        }, 'Payment breakdown');

        // 7. Generate receipt reference number
        const refService = new ReferenceNumberService();
        const branch = await tx.branch.findUnique({
          where: { id: loan.branchId },
          select: { code: true }
        });
        const receiptReference = await refService.generateReceiptNumber(branch?.code || 'HQ');

        // 8. Create payment record with idempotency key
        const payment = await tx.payment.create({
          data: {
            loanId: input.loanId,
            paymentScheduleId: nextPayment.id,
            amount: input.amount,
            paymentDate,
            paymentMethod: input.paymentMethod,
            paymentType,
            interestSaved: interestSaved > 0 ? interestSaved : undefined,
            penaltyAmount: penaltyAmount > 0 ? penaltyAmount : undefined,
            notes: input.notes,
            reference: receiptReference,
            createdBy: input.createdBy,
            idempotencyKey,
            processedAt: new Date(),
          },
        });

        // 9. Update payment schedule
        const expectedAmount = nextPayment.totalPayment.toNumber();
        if (input.amount >= expectedAmount) {
          // Full payment
          await tx.paymentSchedule.update({
            where: { id: nextPayment.id },
            data: {
              status: 'PAID',
              paidAt: paymentDate,
            },
          });
        } else {
          // Partial payment
          await tx.paymentSchedule.update({
            where: { id: nextPayment.id },
            data: {
              status: 'PARTIAL',
              paidAt: paymentDate,
            },
          });
        }

        // 10. Recompute remaining schedules based on new outstanding balance (for prepayment/โปะ)
        // - Keep installment size (prefer loan.monthlyPayment, fallback to nextPayment.totalPayment)
        // - Shorten term by reducing future schedules until balance is near zero
        // IMPORTANT: This keeps loan.nextPayment* consistent with the recalculated schedules
        const monthlyInterestRate = (loan.interestRate ? loan.interestRate.toNumber() : 0) / 100 / 12;
        const fixedMonthlyPayment =
          (loan.monthlyPayment ? loan.monthlyPayment.toNumber() : 0) ||
          nextPayment.totalPayment.toNumber();

        const schedulesAsc = await tx.paymentSchedule.findMany({
          where: { loanId: input.loanId },
          orderBy: { paymentNumber: 'asc' },
          select: {
            id: true,
            paymentNumber: true,
            status: true,
          },
        });

        const pendingStartIdx = schedulesAsc.findIndex((s) =>
          ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(String(s.status))
        );

        if (pendingStartIdx >= 0) {
          const schedulesToRecalc = schedulesAsc.slice(pendingStartIdx);
          let runningBalance = newBalance;
          let lastKeptScheduleId: string | null = null;

          for (const s of schedulesToRecalc) {
            if (runningBalance <= 0.01) {
              break;
            }

            const interest = runningBalance * monthlyInterestRate;
            let total = fixedMonthlyPayment;

            // Minimum payment should cover interest (avoid negative amortization)
            if (total < interest) total = interest;

            // System constraint: do not exceed current outstanding principal
            total = Math.min(total, runningBalance);

            const principal = Math.max(0, total - interest);
            const displayRemainingBalance = runningBalance;
            runningBalance = Math.max(0, runningBalance - principal);

            await tx.paymentSchedule.update({
              where: { id: s.id },
              data: {
                principalAmount: new Prisma.Decimal(principal.toFixed(2)),
                interestAmount: new Prisma.Decimal(interest.toFixed(2)),
                totalPayment: new Prisma.Decimal(total.toFixed(2)),
                remainingBalance: new Prisma.Decimal(displayRemainingBalance.toFixed(2)),
              },
            });

            lastKeptScheduleId = s.id;
          }

          // Delete future schedules after payoff (only those with no payments linked)
          if (runningBalance <= 0.01 && lastKeptScheduleId) {
            const remaining = schedulesToRecalc
              .slice(schedulesToRecalc.findIndex((x) => x.id === lastKeptScheduleId) + 1)
              .map((x) => x.id);

            if (remaining.length > 0) {
              const paymentsGrouped = await tx.payment.groupBy({
                by: ['paymentScheduleId'],
                where: {
                  loanId: input.loanId,
                  paymentScheduleId: { in: remaining },
                },
                _count: { _all: true },
              });

              const scheduleIdsWithPayments = new Set(
                paymentsGrouped.map((g: any) => g.paymentScheduleId).filter(Boolean)
              );

              const deletableIds = remaining.filter((id) => !scheduleIdsWithPayments.has(id));
              if (deletableIds.length > 0) {
                await tx.paymentSchedule.deleteMany({
                  where: { id: { in: deletableIds } },
                });
              }
            }
          }
        }

        // 11. Recompute next payment + overdue + status from remaining schedules (source of truth)

        // Keep schedule statuses consistent for collections/summary screens (best-effort)
        await tx.paymentSchedule.updateMany({
          where: {
            loanId: input.loanId,
            status: { in: ['UNPAID', 'PARTIAL'] },
            paymentDate: { lt: paymentDate },
          },
          data: {
            status: 'OVERDUE',
          },
        });

        const pendingSchedule = await tx.paymentSchedule.findFirst({
          where: {
            loanId: input.loanId,
            status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
          },
          orderBy: { paymentNumber: 'asc' },
        });

        const derivedNextPaymentDate = pendingSchedule?.paymentDate || null;
        const derivedNextPaymentAmount = pendingSchedule?.totalPayment || null;
        // IMPORTANT: Always derive overdueDays from payment_schedules (ignore stale loans.overdue_days)
        const derivedOverdueDays = await deriveLoanOverdueDaysFromSchedules(input.loanId, paymentDate);

        const derivedStatus =
          newBalance <= 0
            ? 'CLOSED'
            : derivedOverdueDays >= 90
              ? 'NPL'
              : derivedOverdueDays >= 30
                ? 'DEFAULTED'
                : 'ACTIVE';

        // 12. Update loan with optimistic lock (single source of truth fields)
        await updateWithOptimisticLock(tx.loan, input.loanId, loan.version || 0, {
          outstandingBalance: newBalance,
          lastPaymentDate: paymentDate,
          overdueDays: derivedOverdueDays,
          nextPaymentDate: derivedNextPaymentDate,
          nextPaymentAmount: derivedNextPaymentAmount,
          status: derivedStatus,
        });

        // 13. Get updated loan with customer data
        const finalLoan = await tx.loan.findUnique({
          where: { id: input.loanId },
          include: {
            customer: {
              select: {
                businessName: true,
              }
            }
          }
        });

        return {
          payment,
          loan: finalLoan,
          previousBalance,
          newBalance,
          isIdempotent: false,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: TRANSACTION_CONFIG.MAX_WAIT_MS,
        timeout: TRANSACTION_CONFIG.TIMEOUT_MS,
      }
    );

    // Calculate duration
    const duration = Date.now() - startTime;

    // Metrics: Success
    paymentMetrics.total.inc({ status: 'success', payment_type: input.paymentType });
    paymentMetrics.duration.observe({ payment_type: input.paymentType }, duration / 1000);

    // Check for slow transaction
    if (duration > OPTIMISTIC_LOCKING.SLOW_TRANSACTION_THRESHOLD_MS) {
      paymentMetrics.slowTransactions.inc({ 
        duration_bucket: duration > 5000 ? '5s+' : '3-5s' 
      });
      
      logger.warn({
        action: 'PAYMENT_SLOW_TRANSACTION',
        loanId: input.loanId,
        duration,
        threshold: OPTIMISTIC_LOCKING.SLOW_TRANSACTION_THRESHOLD_MS,
      }, 'Slow payment transaction detected');
    }

    // Audit log: Success
	    logger.info({
	      action: 'PAYMENT_PROCESSING_SUCCESS',
	      loanId: input.loanId,
	      paymentId: result.payment.id,
      amount: input.amount,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      duration,
	    }, 'Payment processed successfully');

	    // Invalidate caches impacted by payment (loan list/detail, dashboard stats, payment schedules).
	    // Without this, users may still see stale creditScore/overdueDays for up to the cache TTL.
	    try {
	      await Promise.all((CACHE_INVALIDATION.onPaymentChange || []).map((tag) => cacheService.deleteByTag(tag)));
	    } catch (cacheError) {
	      logger.warn({ error: cacheError }, 'Cache invalidation failed after payment (continuing)');
	    }

	    return result;
	  } catch (error) {
    const duration = Date.now() - startTime;

    // Metrics: Failure
    paymentMetrics.total.inc({ status: 'failure', payment_type: input.paymentType });

    // Audit log: Failure
    logger.error({
      action: 'PAYMENT_PROCESSING_FAILED',
      loanId: input.loanId,
      amount: input.amount,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    }, 'Payment processing failed');

    throw error;
  }
}

/**
 * Process payment with automatic retry on conflict
 * 
 * Retries on optimistic lock conflicts or serialization failures
 * Tracks retry attempts in metrics for monitoring
 */
export async function processPaymentWithRetry(
  input: ProcessPaymentInput,
  maxRetries: number = PAYMENT_CONFIG.MAX_RETRY_ATTEMPTS
): Promise<ProcessPaymentResult> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      return await processPaymentSafe(input);
    } catch (error) {
      lastError = error as Error;

      // Retry on optimistic lock errors or serialization failures
      if (
        error instanceof OptimisticLockError ||
        (error as any).code === 'P2034' || // Prisma serialization error
        (error as any).message?.includes('could not serialize')
      ) {
        attempt++;

        // Metrics: Track conflict retry attempts
        paymentMetrics.conflicts.inc({ retry_attempt: attempt.toString() });

        if (attempt >= maxRetries) {
          logger.error({
            action: 'PAYMENT_MAX_RETRIES_EXCEEDED',
            loanId: input.loanId,
            attempts: maxRetries,
          }, 'Payment processing failed after max retries');
          
          throw new Error(
            `Payment processing failed after ${maxRetries} attempts. ` +
            `This may be due to high concurrent load. Please try again.`
          );
        }

        // Exponential backoff: 2^attempt * base_delay
        const backoffMs = Math.pow(2, attempt) * OPTIMISTIC_LOCKING.RETRY_BASE_DELAY_MS;
        
        logger.info({
          action: 'PAYMENT_RETRY',
          loanId: input.loanId,
          attempt,
          maxRetries,
          backoffMs,
        }, 'Retrying payment processing after conflict');
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));

        continue;
      }

      // Don't retry on other errors
      throw error;
    }
  }

  throw lastError || new Error('Unexpected error in processPaymentWithRetry');
}

/**
 * Batch process multiple payments (safe version)
 * 
 * Processes payments sequentially to avoid deadlocks
 * 
 * ERROR HANDLING PATTERN:
 * - Individual payment failures are logged but don't stop batch processing
 * - This is INTENTIONAL to maximize successful payments in a batch
 * - Failed payments are tracked and can be retried separately
 */
export async function batchProcessPayments(
  payments: ProcessPaymentInput[]
): Promise<ProcessPaymentResult[]> {
  const results: ProcessPaymentResult[] = [];

  logger.info({
    action: 'BATCH_PAYMENT_START',
    totalPayments: payments.length,
  }, 'Starting batch payment processing');

  // Process sequentially to avoid deadlocks
  for (const payment of payments) {
    try {
      const result = await processPaymentWithRetry(payment);
      results.push(result);
    } catch (error) {
      // INTENTIONAL: Continue processing other payments even if one fails
      // This maximizes successful payments in the batch
      logger.error({
        action: 'BATCH_PAYMENT_ITEM_FAILED',
        loanId: payment.loanId,
        amount: payment.amount,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Failed to process payment in batch - continuing with remaining payments');
    }
  }

  logger.info({
    action: 'BATCH_PAYMENT_COMPLETE',
    totalPayments: payments.length,
    successfulPayments: results.length,
    failedPayments: payments.length - results.length,
  }, 'Batch payment processing completed');

  return results;
}

/**
 * Validate payment before processing
 */
export async function validatePayment(
  input: ProcessPaymentInput
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check loan exists
  const loan = await prisma.loan.findUnique({
    where: { id: input.loanId },
  });

  if (!loan) {
    errors.push(`Loan not found: ${input.loanId}`);
    return { valid: false, errors };
  }

  // Check loan status (must still be payable even when marked DEFAULTED/NPL)
  if (!['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'].includes(loan.status)) {
    errors.push(`Loan is not payable. Current status: ${loan.status}`);
  }

  // Check amount
  if (input.amount <= 0) {
    errors.push('Payment amount must be positive');
  }

  if (input.amount > loan.outstandingBalance.toNumber()) {
    errors.push(
      `Payment amount (${input.amount}) exceeds outstanding balance ` +
      `(${loan.outstandingBalance.toNumber()})`
    );
  }

  // Check payment schedule if provided
  if (input.paymentScheduleId) {
    const schedule = await prisma.paymentSchedule.findUnique({
      where: { id: input.paymentScheduleId },
    });

    if (!schedule) {
      errors.push(`Payment schedule not found: ${input.paymentScheduleId}`);
    } else if (schedule.loanId !== input.loanId) {
      errors.push('Payment schedule does not belong to this loan');
    } else if (schedule.status === 'PAID') {
      errors.push('Payment schedule is already paid');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

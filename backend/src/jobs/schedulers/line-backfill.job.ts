/**
 * LINE Data Backfill Job
 *
 * Backfills historical records created BEFORE the LINE integration existed.
 * Customers couldn't see their data on LINE because these records were never
 * linked to timeline events, receipts, or contract PDFs.
 *
 * Tasks (in order):
 *  A. Payment Timeline Events  - schedules with no timeline events
 *  B. Payment Receipts         - completed payments with no receipt (NO LINE send)
 *  C. Contract PDFs            - disbursed loans with no contract PDF
 *
 * Rules:
 *  - Batch size: 15 records, 800ms delay between batches
 *  - Never send LINE messages for historical data (autoSend: false)
 *  - Idempotent: safe to run multiple times
 *  - Track last run via SystemConfig key `line_backfill_last_run`
 */

import * as cron from 'node-cron';
import { prisma } from '@config/database.config';
import { PaymentTimelineService } from '@payments/services/payment-timeline.service';
import { PaymentReceiptService } from '@invoices/services/payment-receipt.service';
import { DisbursementService } from '@disbursements/services/disbursement.service';
import { logger } from '@utils/common/logger.util';

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 800;
const LAST_RUN_KEY = 'line_backfill_last_run';

export interface BackfillTaskResult {
    created: number;
    failed: number;
    skipped: number;
}

export interface BackfillStats {
    timelinesCreated: number;
    timelinesFailed: number;
    receiptsCreated: number;
    receiptsFailed: number;
    contractsCreated: number;
    contractsFailed: number;
    durationMs: number;
    ranAt: string;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runLineBackfill(): Promise<BackfillStats> {
    const startTime = Date.now();
    logger.info('LINE backfill started');

    const stats: BackfillStats = {
        timelinesCreated: 0,
        timelinesFailed: 0,
        receiptsCreated: 0,
        receiptsFailed: 0,
        contractsCreated: 0,
        contractsFailed: 0,
        durationMs: 0,
        ranAt: new Date().toISOString(),
    };

    // Task A: Payment Timeline Events
    try {
        const result = await backfillPaymentTimelines();
        stats.timelinesCreated = result.created;
        stats.timelinesFailed = result.failed;
    } catch (err) {
        logger.error({ err }, 'Task A (timelines) failed entirely');
    }

    // Task B: Payment Receipts
    try {
        const result = await backfillPaymentReceipts();
        stats.receiptsCreated = result.created;
        stats.receiptsFailed = result.failed;
    } catch (err) {
        logger.error({ err }, 'Task B (receipts) failed entirely');
    }

    // Task C: Contract PDFs
    try {
        const result = await backfillContractPdfs();
        stats.contractsCreated = result.created;
        stats.contractsFailed = result.failed;
    } catch (err) {
        logger.error({ err }, 'Task C (contracts) failed entirely');
    }

    stats.durationMs = Date.now() - startTime;

    // Persist last run status
    try {
        await prisma.systemConfig.upsert({
            where: { key: LAST_RUN_KEY },
            create: {
                key: LAST_RUN_KEY,
                value: JSON.stringify(stats),
                category: 'system',
                dataType: 'STRING',
                createdBy: 'SYSTEM',
                updatedBy: 'SYSTEM',
            },
            update: {
                value: JSON.stringify(stats),
                updatedBy: 'SYSTEM',
            },
        });
    } catch (err) {
        logger.warn({ err }, 'Failed to persist line_backfill_last_run');
    }

    logger.info(stats, 'LINE backfill completed');
    return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task A: Payment Timeline Events
// ─────────────────────────────────────────────────────────────────────────────

export async function backfillPaymentTimelines(): Promise<BackfillTaskResult> {
    logger.info('LINE backfill Task A: Payment Timeline Events');

    const schedules = await prisma.paymentSchedule.findMany({
        where: {
            status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
            loan: { status: { in: ['ACTIVE', 'DISBURSED'] } },
            NOT: { paymentTimelineEvents: { some: {} } },
        },
        select: {
            id: true,
            loanId: true,
            paymentDate: true,
            paymentNumber: true,
        },
        orderBy: { paymentDate: 'asc' },
    });

    logger.info({ total: schedules.length }, 'Task A: schedules needing timelines');

    const timelineService = new PaymentTimelineService();
    let created = 0;
    let failed = 0;

    for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
        const batch = schedules.slice(i, i + BATCH_SIZE);

        for (const schedule of batch) {
            try {
                await timelineService.createPaymentTimeline(
                    schedule.loanId,
                    schedule.id,
                    schedule.paymentDate
                );
                created++;
                logger.debug(
                    { scheduleId: schedule.id, loanId: schedule.loanId, paymentNumber: schedule.paymentNumber },
                    'Task A: timeline created'
                );
            } catch (err) {
                failed++;
                logger.error(
                    { err, scheduleId: schedule.id, loanId: schedule.loanId },
                    'Task A: failed to create timeline'
                );
            }
        }

        logger.info(
            { processed: Math.min(i + BATCH_SIZE, schedules.length), total: schedules.length, created, failed },
            'Task A: batch processed'
        );

        if (i + BATCH_SIZE < schedules.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    logger.info({ created, failed }, 'Task A complete');
    return { created, failed, skipped: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task B: Payment Receipts (NO LINE send)
// ─────────────────────────────────────────────────────────────────────────────

export async function backfillPaymentReceipts(): Promise<BackfillTaskResult> {
    logger.info('LINE backfill Task B: Payment Receipts');

    const payments = await prisma.payment.findMany({
        where: {
            status: 'COMPLETED',
            NOT: { paymentReceipts: { some: {} } },
            loan: { status: { in: ['ACTIVE', 'DISBURSED', 'PAID', 'CLOSED'] } },
        },
        select: {
            id: true,
            loanId: true,
            amount: true,
            paymentDate: true,
        },
        orderBy: { paymentDate: 'asc' },
    });

    logger.info({ total: payments.length }, 'Task B: payments needing receipts');

    const receiptService = new PaymentReceiptService();
    let created = 0;
    let failed = 0;

    for (let i = 0; i < payments.length; i += BATCH_SIZE) {
        const batch = payments.slice(i, i + BATCH_SIZE);

        for (const payment of batch) {
            try {
                // autoSend: false → NO LINE message for historical data
                await receiptService.generatePaymentReceipt(payment.id, 'SYSTEM', {
                    autoSend: false,
                });
                created++;
                logger.debug(
                    { paymentId: payment.id, loanId: payment.loanId },
                    'Task B: receipt generated (no LINE send)'
                );
            } catch (err) {
                failed++;
                logger.error(
                    { err, paymentId: payment.id, loanId: payment.loanId },
                    'Task B: failed to generate receipt'
                );
            }
        }

        logger.info(
            { processed: Math.min(i + BATCH_SIZE, payments.length), total: payments.length, created, failed },
            'Task B: batch processed'
        );

        if (i + BATCH_SIZE < payments.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    logger.info({ created, failed }, 'Task B complete');
    return { created, failed, skipped: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task C: Contract PDFs
// ─────────────────────────────────────────────────────────────────────────────

export async function backfillContractPdfs(): Promise<BackfillTaskResult> {
    logger.info('LINE backfill Task C: Contract PDFs');

    // Find DISBURSED/ACTIVE loans where productConfig has no disbursementPdfUrl
    const loans = await prisma.loan.findMany({
        where: {
            status: { in: ['ACTIVE', 'DISBURSED'] },
        },
        select: {
            id: true,
            productConfig: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    // Filter in-memory: loans where productConfig.disbursementPdfUrl is null/empty
    const loansNeedingPdf = loans.filter(loan => {
        const config = loan.productConfig as Record<string, unknown> | null;
        if (!config) return true;
        const url = config['disbursementPdfUrl'];
        return !url || url === '';
    });

    logger.info({ total: loansNeedingPdf.length }, 'Task C: loans needing contract PDF');

    const disbursementService = new DisbursementService();
    let created = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < loansNeedingPdf.length; i += BATCH_SIZE) {
        const batch = loansNeedingPdf.slice(i, i + BATCH_SIZE);

        for (const loan of batch) {
            try {
                await disbursementService.regenerateContractPdfForLoan(loan.id, 'SYSTEM');
                created++;
                logger.debug({ loanId: loan.id }, 'Task C: contract PDF generated');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                // Skip loans with no disbursement record - not an error
                if (message.includes('No disbursed disbursement found')) {
                    skipped++;
                    logger.debug({ loanId: loan.id }, 'Task C: skipped (no disbursement record)');
                } else {
                    failed++;
                    logger.error({ err, loanId: loan.id }, 'Task C: failed to generate contract PDF');
                }
            }
        }

        logger.info(
            { processed: Math.min(i + BATCH_SIZE, loansNeedingPdf.length), total: loansNeedingPdf.length, created, failed, skipped },
            'Task C: batch processed'
        );

        if (i + BATCH_SIZE < loansNeedingPdf.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    logger.info({ created, failed, skipped }, 'Task C complete');
    return { created, failed, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get last run status
// ─────────────────────────────────────────────────────────────────────────────

export async function getBackfillLastRunStatus(): Promise<BackfillStats | null> {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: LAST_RUN_KEY },
        });
        if (!config) return null;
        return JSON.parse(config.value) as BackfillStats;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron Job Registration (daily at 02:30 AM Bangkok time)
// ─────────────────────────────────────────────────────────────────────────────

export const startLineBackfillJob = (): void => {
    cron.schedule(
        '30 2 * * *',
        async () => {
            try {
                await runLineBackfill();
            } catch (err) {
                logger.error({ err }, 'LINE backfill cron job failed');
            }
        },
        { timezone: 'Asia/Bangkok' }
    );

    logger.info('LINE backfill cron job started - runs daily at 02:30 AM Bangkok time');
};

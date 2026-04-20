/**
 * LINE Data Backfill Job
 *
 * Backfills historical records that were created BEFORE the LINE integration existed.
 * These records never got their timeline events, invoices, receipts, or contract notifications.
 *
 * Priority order:
 *  1. Payment Timeline Events  - schedules with no timeline events
 *  2. Invoices                 - schedules due within 7 days with no invoice
 *  3. Payment Receipts         - payments with no receipt (NO LINE send)
 *  4. Contract notifications   - active loans with LINE-connected customers (future: skipped for now)
 *
 * Rules:
 *  - Process in batches of 10 with 500ms delay between batches
 *  - Never send LINE messages for historical data
 *  - Skip records that already have the data
 *  - Track last run via system config key `backfill_last_run`
 */

import * as cron from 'node-cron';
import { prisma } from '@config/database.config';
import { PaymentTimelineService } from '@payments/services/payment-timeline.service';
import { PaymentReceiptService } from '@invoices/services/payment-receipt.service';
import { NextPaymentInvoiceService } from '@invoices/services/next-payment-invoice.service';
import { logger } from '@utils/common/logger.util';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;
const BACKFILL_LAST_RUN_KEY = 'backfill_last_run';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface BackfillStats {
    timelinesCreated: number;
    timelinesFailed: number;
    invoicesCreated: number;
    invoicesFailed: number;
    receiptsCreated: number;
    receiptsFailed: number;
    durationMs: number;
    ranAt: string;
}

/**
 * Main backfill runner - processes all 3 phases in order
 */
export async function runLineDataBackfill(): Promise<BackfillStats> {
    const startTime = Date.now();
    logger.info('LINE data backfill started');

    const stats: BackfillStats = {
        timelinesCreated: 0,
        timelinesFailed: 0,
        invoicesCreated: 0,
        invoicesFailed: 0,
        receiptsCreated: 0,
        receiptsFailed: 0,
        durationMs: 0,
        ranAt: new Date().toISOString(),
    };

    // Phase 1: Payment Timeline Events
    try {
        const result = await backfillPaymentTimelines();
        stats.timelinesCreated = result.created;
        stats.timelinesFailed = result.failed;
    } catch (err) {
        logger.error({ err }, 'Phase 1 (timelines) failed entirely');
    }

    // Phase 2: Invoices (schedules due within 7 days, no invoice)
    try {
        const result = await backfillInvoices();
        stats.invoicesCreated = result.created;
        stats.invoicesFailed = result.failed;
    } catch (err) {
        logger.error({ err }, 'Phase 2 (invoices) failed entirely');
    }

    // Phase 3: Payment Receipts (no LINE send)
    try {
        const result = await backfillPaymentReceipts();
        stats.receiptsCreated = result.created;
        stats.receiptsFailed = result.failed;
    } catch (err) {
        logger.error({ err }, 'Phase 3 (receipts) failed entirely');
    }

    stats.durationMs = Date.now() - startTime;

    // Record last run timestamp
    try {
        await prisma.systemConfig.upsert({
            where: { key: BACKFILL_LAST_RUN_KEY },
            create: {
                key: BACKFILL_LAST_RUN_KEY,
                value: new Date().toISOString(),
                category: 'system',
                dataType: 'STRING',
                createdBy: 'SYSTEM',
                updatedBy: 'SYSTEM',
            },
            update: {
                value: new Date().toISOString(),
                updatedBy: 'SYSTEM',
            },
        });
    } catch (err) {
        logger.warn({ err }, 'Failed to update backfill_last_run config key');
    }

    logger.info(stats, 'LINE data backfill completed');
    return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Payment Timeline Events
// ─────────────────────────────────────────────────────────────────────────────

async function backfillPaymentTimelines(): Promise<{ created: number; failed: number }> {
    logger.info('Backfill Phase 1: Payment Timeline Events');

    // Find UNPAID/OVERDUE/PARTIAL schedules on ACTIVE/DISBURSED loans that have NO timeline events
    const schedules = await prisma.paymentSchedule.findMany({
        where: {
            status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
            loan: { status: { in: ['ACTIVE', 'DISBURSED'] } },
            NOT: {
                paymentTimelineEvents: { some: {} },
            },
        },
        select: {
            id: true,
            loanId: true,
            paymentDate: true,
            paymentNumber: true,
        },
        orderBy: { paymentDate: 'asc' },
    });

    logger.info({ total: schedules.length }, 'Phase 1: schedules needing timelines');

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
                    'Timeline created'
                );
            } catch (err) {
                failed++;
                logger.error(
                    { err, scheduleId: schedule.id, loanId: schedule.loanId },
                    'Failed to create timeline for schedule'
                );
            }
        }

        logger.info(
            { batchEnd: Math.min(i + BATCH_SIZE, schedules.length), total: schedules.length, created, failed },
            'Phase 1 batch processed'
        );

        if (i + BATCH_SIZE < schedules.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    logger.info({ created, failed }, 'Phase 1 complete');
    return { created, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Invoices
// ─────────────────────────────────────────────────────────────────────────────

async function backfillInvoices(): Promise<{ created: number; failed: number }> {
    logger.info('Backfill Phase 2: Invoices');

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find UNPAID schedules due within 7 days on ACTIVE/DISBURSED loans with no next-payment invoice
    const schedules = await prisma.paymentSchedule.findMany({
        where: {
            status: 'UNPAID',
            paymentDate: { gte: now, lte: sevenDaysFromNow },
            loan: { status: { in: ['ACTIVE', 'DISBURSED'] } },
            NOT: {
                nextPaymentInvoices: { some: {} },
            },
        },
        select: {
            id: true,
            loanId: true,
            paymentDate: true,
            paymentNumber: true,
        },
        orderBy: { paymentDate: 'asc' },
    });

    logger.info({ total: schedules.length }, 'Phase 2: schedules needing invoices');

    const invoiceService = new NextPaymentInvoiceService();
    let created = 0;
    let failed = 0;

    // Deduplicate by loanId - one invoice per loan is enough
    const processedLoanIds = new Set<string>();

    for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
        const batch = schedules.slice(i, i + BATCH_SIZE);

        for (const schedule of batch) {
            if (processedLoanIds.has(schedule.loanId)) {
                continue; // already generated invoice for this loan
            }
            processedLoanIds.add(schedule.loanId);

            try {
                await invoiceService.generateNextPaymentInvoice(schedule.loanId, 'SYSTEM');
                created++;
                logger.debug(
                    { loanId: schedule.loanId, scheduleId: schedule.id },
                    'Invoice generated (no LINE send)'
                );
            } catch (err) {
                failed++;
                logger.error(
                    { err, loanId: schedule.loanId, scheduleId: schedule.id },
                    'Failed to generate invoice'
                );
            }
        }

        logger.info(
            { batchEnd: Math.min(i + BATCH_SIZE, schedules.length), total: schedules.length, created, failed },
            'Phase 2 batch processed'
        );

        if (i + BATCH_SIZE < schedules.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    logger.info({ created, failed }, 'Phase 2 complete');
    return { created, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Payment Receipts (NO LINE send)
// ─────────────────────────────────────────────────────────────────────────────

async function backfillPaymentReceipts(): Promise<{ created: number; failed: number }> {
    logger.info('Backfill Phase 3: Payment Receipts');

    // Find payments that have no receipt record
    const payments = await prisma.payment.findMany({
        where: {
            NOT: {
                paymentReceipts: { some: {} },
            },
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

    logger.info({ total: payments.length }, 'Phase 3: payments needing receipts');

    const receiptService = new PaymentReceiptService();
    let created = 0;
    let failed = 0;

    for (let i = 0; i < payments.length; i += BATCH_SIZE) {
        const batch = payments.slice(i, i + BATCH_SIZE);

        for (const payment of batch) {
            try {
                // autoSend: false → NO LINE message sent for historical data
                await receiptService.generatePaymentReceipt(payment.id, 'SYSTEM', {
                    autoSend: false,
                });
                created++;
                logger.debug(
                    { paymentId: payment.id, loanId: payment.loanId },
                    'Receipt generated (no LINE send)'
                );
            } catch (err) {
                failed++;
                logger.error(
                    { err, paymentId: payment.id, loanId: payment.loanId },
                    'Failed to generate receipt'
                );
            }
        }

        logger.info(
            { batchEnd: Math.min(i + BATCH_SIZE, payments.length), total: payments.length, created, failed },
            'Phase 3 batch processed'
        );

        if (i + BATCH_SIZE < payments.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    logger.info({ created, failed }, 'Phase 3 complete');
    return { created, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron Job Registration (daily at 03:00 AM Bangkok time)
// ─────────────────────────────────────────────────────────────────────────────

export const startLineDataBackfillJob = (): void => {
    cron.schedule(
        '0 3 * * *',
        async () => {
            try {
                await runLineDataBackfill();
            } catch (err) {
                logger.error({ err }, 'LINE data backfill cron job failed');
            }
        },
        { timezone: 'Asia/Bangkok' }
    );

    logger.info('LINE data backfill cron job started - runs daily at 03:00 AM');
};

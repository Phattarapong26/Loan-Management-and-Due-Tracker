/**
 * Document Backfill Admin Routes
 *
 * Admin-only endpoints to monitor and trigger document backfill jobs.
 *
 * GET  /api/admin/document-backfill/stats          - get pending counts for each doc type
 * POST /api/admin/document-backfill/run            - trigger full backfill
 * POST /api/admin/document-backfill/run/:task      - trigger specific task (receipts | invoices | contracts)
 * GET  /api/admin/document-backfill/status         - get last run status
 */

import { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '@middlewares/security/auth.middleware';
import {
    runLineBackfill,
    backfillPaymentReceipts,
    backfillContractPdfs,
    getBackfillLastRunStatus,
} from '@jobs/schedulers/line-backfill.job';
import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

export async function documentBackfillRoutes(app: FastifyInstance): Promise<void> {
    // GET /api/admin/document-backfill/stats
    app.get(
        '/api/admin/document-backfill/stats',
        { preHandler: [authenticate, authorize('ADMIN')] },
        async (_request, reply) => {
            try {
                // Receipts: payments with no receipt
                const missingReceipts = await prisma.payment.count({
                    where: {
                        NOT: { paymentReceipts: { some: {} } },
                        loan: { status: { in: ['ACTIVE', 'DISBURSED', 'PAID', 'CLOSED', 'NPL', 'DEFAULTED'] } },
                    },
                });

                const totalPayments = await prisma.payment.count({
                    where: {
                        loan: { status: { in: ['ACTIVE', 'DISBURSED', 'PAID', 'CLOSED', 'NPL', 'DEFAULTED'] } },
                    },
                });

                const totalReceipts = await prisma.paymentReceipt.count();

                // Contracts: active/disbursed loans with no PDF
                const allLoans = await prisma.loan.findMany({
                    where: { status: { in: ['ACTIVE', 'DISBURSED'] } },
                    select: { id: true, productConfig: true },
                });

                const missingContracts = allLoans.filter(loan => {
                    const config = loan.productConfig as Record<string, unknown> | null;
                    if (!config) return true;
                    const url = config['disbursementPdfUrl'];
                    return !url || url === '';
                }).length;

                // Invoices: payment schedules with no invoice record
                const totalSchedules = await prisma.paymentSchedule.count({
                    where: {
                        loan: { status: { in: ['ACTIVE', 'DISBURSED'] } },
                    },
                });

                const schedulesWithInvoice = await prisma.paymentSchedule.count({
                    where: {
                        loan: { status: { in: ['ACTIVE', 'DISBURSED'] } },
                        invoices: { some: {} },
                    },
                });

                const missingInvoices = totalSchedules - schedulesWithInvoice;

                return reply.code(200).send({
                    success: true,
                    data: {
                        receipts: {
                            total: totalPayments,
                            completed: totalReceipts,
                            missing: missingReceipts,
                        },
                        contracts: {
                            total: allLoans.length,
                            completed: allLoans.length - missingContracts,
                            missing: missingContracts,
                        },
                        invoices: {
                            total: totalSchedules,
                            completed: schedulesWithInvoice,
                            missing: missingInvoices,
                        },
                    },
                });
            } catch (err) {
                logger.error({ err }, 'Failed to get document backfill stats');
                return reply.code(500).send({ success: false, message: 'Failed to get stats' });
            }
        }
    );

    // GET /api/admin/document-backfill/status
    app.get(
        '/api/admin/document-backfill/status',
        { preHandler: [authenticate, authorize('ADMIN')] },
        async (_request, reply) => {
            try {
                const status = await getBackfillLastRunStatus();
                return reply.code(200).send({ success: true, data: status });
            } catch (err) {
                logger.error({ err }, 'Failed to get backfill status');
                return reply.code(500).send({ success: false, message: 'Failed to get status' });
            }
        }
    );

    // POST /api/admin/document-backfill/run
    app.post(
        '/api/admin/document-backfill/run',
        { preHandler: [authenticate, authorize('ADMIN')] },
        async (_request, reply) => {
            try {
                runLineBackfill().catch(err => logger.error({ err }, 'Full backfill failed'));
                return reply.code(202).send({
                    success: true,
                    message: 'Full backfill started in background',
                });
            } catch (err) {
                logger.error({ err }, 'Failed to start full backfill');
                return reply.code(500).send({ success: false, message: 'Failed to start backfill' });
            }
        }
    );

    // POST /api/admin/document-backfill/run/:task
    app.post<{ Params: { task: string } }>(
        '/api/admin/document-backfill/run/:task',
        { preHandler: [authenticate, authorize('ADMIN')] },
        async (request, reply) => {
            const { task } = request.params;

            const taskMap: Record<string, () => Promise<{ created: number; failed: number; skipped: number }>> = {
                receipts: backfillPaymentReceipts,
                contracts: backfillContractPdfs,
            };

            const taskFn = taskMap[task];
            if (!taskFn) {
                return reply.code(400).send({
                    success: false,
                    message: `Unknown task "${task}". Valid: receipts, contracts`,
                });
            }

            try {
                taskFn().catch(err => logger.error({ err, task }, 'Backfill task failed'));
                return reply.code(202).send({
                    success: true,
                    message: `Task "${task}" started in background`,
                });
            } catch (err) {
                logger.error({ err, task }, 'Failed to start task');
                return reply.code(500).send({ success: false, message: 'Failed to start task' });
            }
        }
    );
}

/**
 * LINE Backfill Admin Routes
 *
 * Admin-only endpoints to manually trigger or inspect the LINE data backfill job.
 *
 * POST /api/admin/line-backfill/run              - trigger full backfill
 * GET  /api/admin/line-backfill/status           - get last run status
 * POST /api/admin/line-backfill/run-task/:task   - run a specific task (timeline/receipts/contracts)
 */

import { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '@middlewares/security/auth.middleware';
import {
    runLineBackfill,
    backfillPaymentTimelines,
    backfillPaymentReceipts,
    backfillContractPdfs,
    getBackfillLastRunStatus,
} from '@jobs/schedulers/line-backfill.job';
import { logger } from '@utils/common/logger.util';

export async function lineBackfillRoutes(app: FastifyInstance): Promise<void> {
    // POST /api/admin/line-backfill/run
    app.post(
        '/api/admin/line-backfill/run',
        { preHandler: [authenticate, authorize('ADMIN')] },
        async (_request, reply) => {
            logger.info('Manual LINE backfill triggered via API');
            try {
                // Run async - respond immediately so the HTTP request doesn't time out
                runLineBackfill().catch(err => {
                    logger.error({ err }, 'Manual LINE backfill failed');
                });

                return reply.code(202).send({
                    success: true,
                    message: 'LINE backfill started in background. Check /status for results.',
                });
            } catch (err) {
                logger.error({ err }, 'Failed to start LINE backfill');
                return reply.code(500).send({ success: false, message: 'Failed to start backfill' });
            }
        }
    );

    // GET /api/admin/line-backfill/status
    app.get(
        '/api/admin/line-backfill/status',
        { preHandler: [authenticate, authorize('ADMIN')] },
        async (_request, reply) => {
            try {
                const status = await getBackfillLastRunStatus();
                if (!status) {
                    return reply.code(200).send({
                        success: true,
                        data: null,
                        message: 'No backfill has been run yet',
                    });
                }
                return reply.code(200).send({ success: true, data: status });
            } catch (err) {
                logger.error({ err }, 'Failed to get backfill status');
                return reply.code(500).send({ success: false, message: 'Failed to get status' });
            }
        }
    );

    // POST /api/admin/line-backfill/run-task/:task
    app.post<{ Params: { task: string } }>(
        '/api/admin/line-backfill/run-task/:task',
        { preHandler: [authenticate, authorize('ADMIN')] },
        async (request, reply) => {
            const { task } = request.params;
            logger.info({ task }, 'Manual LINE backfill task triggered via API');

            const taskMap: Record<string, () => Promise<{ created: number; failed: number; skipped: number }>> = {
                timeline: backfillPaymentTimelines,
                receipts: backfillPaymentReceipts,
                contracts: backfillContractPdfs,
            };

            const taskFn = taskMap[task];
            if (!taskFn) {
                return reply.code(400).send({
                    success: false,
                    message: `Unknown task "${task}". Valid tasks: timeline, receipts, contracts`,
                });
            }

            try {
                // Run async - respond immediately
                taskFn().catch(err => {
                    logger.error({ err, task }, 'Manual LINE backfill task failed');
                });

                return reply.code(202).send({
                    success: true,
                    message: `Task "${task}" started in background.`,
                });
            } catch (err) {
                logger.error({ err, task }, 'Failed to start backfill task');
                return reply.code(500).send({ success: false, message: 'Failed to start task' });
            }
        }
    );
}

/**
 * Bucket Roll Rates Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { bucketRollRatesRealtimeService } from '../services/bucket-roll-rates-realtime.service';
import { ResponseUtil } from '@utils/formatting/response.util';

export class BucketRollRatesController {
    /**
     * GET /api/collections/bucket-roll-rates
     * Get bucket roll rates analysis (real-time from payment schedules)
     */
    getBucketRollRatesAnalysis = async (
        request: FastifyRequest<{
            Querystring: {
                interval?: 'week' | 'month';
                points?: string;
                branchId?: string;
                officerId?: string;
                productId?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const userId = request.user?.userId;
            const branchId = request.user?.branchId;
            const role = request.user?.role;

            // RBAC filtering:
            // ADMIN  → can filter by any branchId/officerId from query params (or see all)
            // MANAGER → restricted to own branch only
            // OFFICER → restricted to own branch AND own loans only
            let filterBranchId: string | undefined;
            let filterOfficerId: string | undefined;

            if (role === 'ADMIN') {
                filterBranchId = request.query?.branchId || undefined;
                filterOfficerId = request.query?.officerId || undefined;
            } else if (role === 'MANAGER') {
                filterBranchId = branchId;
                filterOfficerId = undefined; // Manager sees all officers in their branch
            } else {
                // OFFICER: see only their own loans in their branch
                filterBranchId = branchId;
                filterOfficerId = userId;
            }

            const points = request.query?.points ? Number(request.query.points) : undefined;
            const analysis = await bucketRollRatesRealtimeService.getBucketRollRatesAnalysis(filterBranchId, {
                interval: request.query?.interval,
                points: Number.isFinite(points as any) ? (points as number) : undefined,
                officerId: filterOfficerId,
                productId: role === 'ADMIN' ? (request.query?.productId || undefined) : undefined,
            });

            return ResponseUtil.success(reply, analysis);
        } catch (error: any) {
            console.error('Error in getBucketRollRatesAnalysis:', error);
            return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลการวิเคราะห์การเปลี่ยนแปลง Bucket ได้', 500, 'LOAD_ERROR');
        }
    };
}

export const bucketRollRatesController = new BucketRollRatesController();

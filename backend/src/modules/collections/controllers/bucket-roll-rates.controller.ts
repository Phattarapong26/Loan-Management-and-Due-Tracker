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
            const branchId = request.user?.branchId;
            const role = request.user?.role;
            
            // Admin can see all branches, optionally filter by branchId. Others see only their branch.
            const filterBranchId = role === 'ADMIN' ? (request.query?.branchId || undefined) : branchId;

            const points = request.query?.points ? Number(request.query.points) : undefined;
            const analysis = await bucketRollRatesRealtimeService.getBucketRollRatesAnalysis(filterBranchId, {
                interval: request.query?.interval,
                points: Number.isFinite(points as any) ? (points as number) : undefined,
                officerId: role === 'ADMIN' ? (request.query?.officerId || undefined) : undefined,
                productId: role === 'ADMIN' ? (request.query?.productId || undefined) : undefined,
            });

            return ResponseUtil.success(reply, analysis);
        } catch (error: any) {
            console.error('Error in getBucketRollRatesAnalysis:', error);
            return ResponseUtil.error(reply, error.message || 'Failed to get bucket roll rates analysis', 500);
        }
    };
}

export const bucketRollRatesController = new BucketRollRatesController();

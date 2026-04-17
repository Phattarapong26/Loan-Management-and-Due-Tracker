import { FastifyRequest, FastifyReply } from 'fastify';
import { CollectionFilterService } from '../services/collection-filter.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { AuthorizedUser } from '../../../shared/services/authorization.service';

/**
 * Collection Controller
 * Handles collection management and payment follow-ups
 */
export class CollectionController {
    private collectionService: CollectionFilterService;

    constructor() {
        this.collectionService = new CollectionFilterService();
    }

    /**
     * Get collection dashboard with all filters
     * GET /api/collections/dashboard
     */
    getDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const user = request.user as AuthorizedUser;
            if (!user) {
                return ResponseUtil.error(reply, 'Unauthorized', 401);
            }
            
            const dashboard = await this.collectionService.getCollectionDashboard(user);
            return ResponseUtil.success(reply, dashboard);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 500);
        }
    };

    /**
     * Get customers near due date (3-7 days before)
     * GET /api/collections/near-due?daysAhead=7
     */
    getNearDue = async (
        request: FastifyRequest<{
            Querystring: { daysAhead?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const user = request.user as AuthorizedUser;
            if (!user) {
                return ResponseUtil.error(reply, 'Unauthorized', 401);
            }
            
            const daysAhead = parseInt(request.query.daysAhead || '7');
            const customers = await this.collectionService.getCustomersNearDue(user, daysAhead);
            return ResponseUtil.success(reply, { customers, total: customers.length });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 500);
        }
    };

    /**
     * Get customers near overdue (1-3 days after due)
     * GET /api/collections/near-overdue?daysBack=3
     */
    getNearOverdue = async (
        request: FastifyRequest<{
            Querystring: { daysBack?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const user = request.user as AuthorizedUser;
            if (!user) {
                return ResponseUtil.error(reply, 'Unauthorized', 401);
            }
            
            const daysBack = parseInt(request.query.daysBack || '3');
            const customers = await this.collectionService.getCustomersNearOverdue(user, daysBack);
            return ResponseUtil.success(reply, { customers, total: customers.length });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 500);
        }
    };

    /**
     * Get overdue customers
     * GET /api/collections/overdue
     */
    getOverdue = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const user = request.user as AuthorizedUser;
            if (!user) {
                return ResponseUtil.error(reply, 'Unauthorized', 401);
            }
            
            const customers = await this.collectionService.getOverdueCustomers(user);
            return ResponseUtil.success(reply, { customers, total: customers.length });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 500);
        }
    };

    /**
     * Get collection statistics
     * GET /api/collections/stats
     */
    getStats = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const user = request.user as AuthorizedUser;
            if (!user) {
                return ResponseUtil.error(reply, 'Unauthorized', 401);
            }
            
            const stats = await this.collectionService.getCollectionStats(user);
            return ResponseUtil.success(reply, stats);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 500);
        }
    };
}

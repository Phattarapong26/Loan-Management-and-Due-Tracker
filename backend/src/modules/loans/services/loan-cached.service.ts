/**
 * Cached Loan Service
 * 
 * Smart caching for loan operations:
 * - Cache READ operations with short TTL (2-5 minutes) for real-time feel
 * - NO cache for WRITE operations (create, approve, reject)
 * - Auto-invalidate cache on any loan changes
 * 
 * Real-time Guarantee:
 * - Loan list: 5 min cache (acceptable delay for dashboard)
 * - Loan detail: 2 min cache (more real-time for active viewing)
 * - Statistics: 2 min cache (dashboard stats)
 * - Pending approvals: NO CACHE (must be real-time)
 */

import { FastifyRequest } from 'fastify';
import { LoanService } from './loan.service';
import { cacheService } from '@core/services/cache.service';
import { CACHE_STRATEGIES, CACHE_KEYS, CACHE_INVALIDATION } from '@core/config/cache-strategy.config';
import { logger } from '@utils/common/logger.util';
import type { CreateLoanInput, ApproveLoanInput, RejectLoanInput } from '../models/loan.model';

export class CachedLoanService extends LoanService {
    /**
     * Get loan by ID with caching (2 min TTL)
     */
    async getLoan(loanId: string, branchId?: string) {
        const cacheKey = CACHE_KEYS.loanDetail(loanId);

        return await cacheService.wrap(
            cacheKey,
            () => super.getLoan(loanId, branchId),
            CACHE_STRATEGIES.LOAN_DETAIL
        );
    }

    /**
     * List loans with caching (5 min TTL)
     */
    async listLoans(params: {
        branchId?: string;
        officerId?: string;
        page: number;
        limit: number;
        status?: string;
        customerId?: string;
        search?: string;
    }) {
        const cacheKey = CACHE_KEYS.loansList({
            branchId: params.branchId,
            status: params.status,
            officerId: params.officerId,
            customerId: params.customerId,
        }) + `:page:${params.page}:limit:${params.limit}`;

        return await cacheService.wrap(
            cacheKey,
            () => super.listLoans(params),
            CACHE_STRATEGIES.LOANS_LIST
        );
    }

    /**
     * Get loan statistics with caching (2 min TTL)
     */
    async getLoanStatistics(params: {
        branchId?: string;
        status?: string;
    }) {
        const cacheKey = `loan-stats:branch:${params.branchId || 'all'}:status:${params.status || 'all'}`;

        return await cacheService.wrap(
            cacheKey,
            () => super.getLoanStatistics(params),
            CACHE_STRATEGIES.DASHBOARD_STATS
        );
    }

    /**
     * Get pending approvals - NO CACHE (must be real-time)
     */
    async getPendingApprovals(branchId?: string) {
        // No caching for pending approvals - must be real-time
        return await super.getPendingApprovals(branchId);
    }

    /**
     * Create loan and invalidate cache
     */
    async createLoan(
        request: FastifyRequest,
        input: CreateLoanInput,
        branchId: string,
        officerId: string
    ) {
        // Create loan (no caching)
        const result = await super.createLoan(request, input, branchId, officerId);

        // Invalidate related caches
        await this.invalidateLoanCaches();

        logger.info({ loanId: result.loan.id }, '✅ Loan created - cache invalidated');

        return result;
    }

    /**
     * Approve loan and invalidate cache
     */
    async approveLoan(
        request: FastifyRequest,
        loanId: string,
        input: ApproveLoanInput,
        branchId: string | undefined,
        managerId: string,
        approverRole: 'MANAGER' | 'ADMIN'
    ) {
        // Approve loan (no caching)
        const result = await super.approveLoan(request, loanId, input, branchId, managerId, approverRole);

        // Invalidate related caches
        await this.invalidateLoanCaches();

        logger.info({ loanId }, '✅ Loan approved - cache invalidated');

        return result;
    }

    /**
     * Reject loan and invalidate cache
     */
    async rejectLoan(
        request: FastifyRequest,
        loanId: string,
        input: RejectLoanInput,
        branchId: string | undefined,
        managerId: string
    ) {
        // Reject loan (no caching)
        const result = await super.rejectLoan(request, loanId, input, branchId, managerId);

        // Invalidate related caches
        await this.invalidateLoanCaches();

        logger.info({ loanId }, '✅ Loan rejected - cache invalidated');

        return result;
    }

    /**
     * Invalidate all loan-related caches
     */
    private async invalidateLoanCaches(): Promise<void> {
        // Invalidate by tags
        for (const tag of CACHE_INVALIDATION.onLoanChange) {
            await cacheService.deleteByTag(tag);
        }
    }
}

// Export singleton instance
export const cachedLoanService = new CachedLoanService();

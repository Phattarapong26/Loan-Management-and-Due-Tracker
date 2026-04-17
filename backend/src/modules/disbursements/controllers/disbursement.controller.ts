// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { DisbursementService } from '../services/disbursement.service';
import {
    CreateDisbursementInput,
    UpdateDisbursementInput,
    ListDisbursementsQuery,
    ApproveDisbursementInput,
    RejectDisbursementInput,
    ExecuteDisbursementInput,
    DisbursementStatsQuery,
} from '../models/disbursement.model';
import { ResponseUtil } from '@utils/formatting/response.util';

export class DisbursementController {
    private disbursementService: DisbursementService;

    constructor() {
        this.disbursementService = new DisbursementService();
        
        // Bind methods to preserve 'this' context
        this.create = this.create.bind(this);
        this.getById = this.getById.bind(this);
        this.list = this.list.bind(this);
        this.update = this.update.bind(this);
        this.approve = this.approve.bind(this);
        this.reject = this.reject.bind(this);
        this.disburse = this.disburse.bind(this);
        this.cancel = this.cancel.bind(this);
        this.getByLoan = this.getByLoan.bind(this);
        this.getSummary = this.getSummary.bind(this);
        this.getStats = this.getStats.bind(this);
        this.delete = this.delete.bind(this);
        this.regenerateContractPdf = this.regenerateContractPdf.bind(this);
    }

    /**
     * Create new disbursement request
     */
    async create(request: FastifyRequest, reply: FastifyReply) {
        let body: CreateDisbursementInput | undefined;
        try {
            body = request.body as unknown as CreateDisbursementInput;
            const userId = (request.user as any).userId;
            const branchId = (request.user as any).branchId;

            const disbursement = await this.disbursementService.createDisbursement(
                body,
                userId,
                branchId
            );

            request.log.info({ disbursementId: disbursement.id, userId }, 'Disbursement created');
            return ResponseUtil.success(reply, disbursement, 201);
        } catch (error: any) {
            request.log.error({ err: error, body }, 'Failed to create disbursement');
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    /**
     * Get disbursement by ID
     */
    async getById(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const branchId = (request.user as any).branchId;

            const disbursement = await this.disbursementService.getDisbursement(id, branchId);

            return ResponseUtil.success(reply, disbursement);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    }

    /**
     * List disbursements
     */
    async list(request: FastifyRequest, reply: FastifyReply) {
        let query: ListDisbursementsQuery | undefined;
        try {
            query = request.query as unknown as ListDisbursementsQuery;
            const user = request.user as any;
            
            // Admin can see all branches (ignore user.branchId), others see only their branch
            const branchId = user.role.toUpperCase() === 'ADMIN' 
                ? query.branchId  // Admin: use query param (undefined = all branches)
                : user.branchId;  // Others: use their branch

            const result = await this.disbursementService.listDisbursements(query, branchId);

            const limit = Number(query.limit) || 20;
            return ResponseUtil.success(reply, {
                disbursements: result.disbursements,
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit),
                },
            });
        } catch (error: any) {
            request.log.error({ err: error, query }, 'Failed to list disbursements');
            return ResponseUtil.error(reply, error.message || 'Failed to list disbursements', 400);
        }
    }

    /**
     * Update disbursement
     */
    async update(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const body = request.body as unknown as UpdateDisbursementInput;
            const branchId = (request.user as any).branchId;

            const disbursement = await this.disbursementService.updateDisbursement(
                id,
                body,
                branchId
            );

            return ResponseUtil.success(reply, disbursement);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    /**
     * Approve disbursement
     */
    async approve(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const body = request.body as unknown as ApproveDisbursementInput;
            const userId = (request.user as any).userId;
            const branchId = (request.user as any).branchId;

            const disbursement = await this.disbursementService.approveDisbursement(
                id,
                body,
                userId,
                branchId
            );

            return ResponseUtil.success(reply, disbursement);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    /**
     * Reject disbursement
     */
    async reject(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const body = request.body as unknown as RejectDisbursementInput;
            const userId = (request.user as any).userId;
            const branchId = (request.user as any).branchId;

            const disbursement = await this.disbursementService.rejectDisbursement(
                id,
                body,
                userId,
                branchId
            );

            return ResponseUtil.success(reply, disbursement);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    /**
     * Execute disbursement (disburse funds)
     */
    async disburse(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const body = request.body as unknown as ExecuteDisbursementInput;
            const userId = (request.user as any).userId;
            const branchId = (request.user as any).branchId;

            const disbursement = await this.disbursementService.executeDisbursement(
                id,
                body,
                userId,
                branchId
            );

            return ResponseUtil.success(reply, disbursement);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    /**
     * Cancel disbursement
     */
    async cancel(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const branchId = (request.user as any).branchId;

            const disbursement = await this.disbursementService.cancelDisbursement(id, branchId);

            return ResponseUtil.success(reply, disbursement);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    /**
     * Get disbursements by loan
     */
    async getByLoan(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };
            const branchId = (request.user as any).branchId;

            const disbursements = await this.disbursementService.getDisbursementsByLoan(
                loanId,
                branchId
            );

            return ResponseUtil.success(reply, disbursements);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    }

    /**
     * Get disbursement summary for a loan
     */
    async getSummary(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };
            const branchId = (request.user as any).branchId;

            const summary = await this.disbursementService.getDisbursementSummary(
                loanId,
                branchId
            );

            return ResponseUtil.success(reply, summary);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    }

    /**
     * Get disbursement statistics
     */
    async getStats(request: FastifyRequest, reply: FastifyReply) {
        let query: DisbursementStatsQuery | undefined;
        try {
            query = request.query as unknown as DisbursementStatsQuery;
            const user = request.user as any;
            
            // Admin can see all branches stats (ignore user.branchId), others see only their branch
            const branchId = user.role.toUpperCase() === 'ADMIN' 
                ? query.branchId  // Admin: use query param (undefined = all branches)
                : user.branchId;  // Others: use their branch

            const stats = await this.disbursementService.getStats(query, branchId);

            return ResponseUtil.success(reply, stats);
        } catch (error: any) {
            request.log.error({ err: error, query }, 'Failed to get disbursement stats');
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    /**
     * Delete disbursement
     */
    async delete(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const branchId = (request.user as any).branchId;

            await this.disbursementService.deleteDisbursement(id, branchId);

            return ResponseUtil.success(reply, { success: true });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    }

    async regenerateContractPdf(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };
            const user = request.user as any;
            
            console.log('[Disbursement Controller] Regenerate PDF request:', {
                loanId,
                userId: user?.userId,
                branchId: user?.branchId,
                userRole: user?.role
            });
            
            if (!user || !user.userId) {
                console.log('[Disbursement Controller] User not authenticated');
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const userId: string = user.userId;
            const branchId: string | undefined = user.branchId;

            //@ts-expect-error TypeScript type inference issue
            const result = await this.disbursementService.regenerateContractPdfForLoan(loanId, userId, branchId);
            
            console.log('[Disbursement Controller] PDF regeneration successful:', result);
            return ResponseUtil.success(reply, result, 200);
        } catch (error: any) {
            console.error('[Disbursement Controller] Error regenerating contract PDF:', {
                error: error.message,
                stack: error.stack,
                loanId: (request.params as any)?.loanId
            });
            return ResponseUtil.error(reply, error.message || 'Failed to regenerate contract PDF', 400);
        }
    }
}

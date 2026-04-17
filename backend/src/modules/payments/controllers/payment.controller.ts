import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '../services/payment.service';
import { OptimisticLockError } from '@/core/utils/optimistic-locking.util';
import { ResponseUtil } from '@utils/formatting/response.util';
import { CreatePaymentInput, ListPaymentsQuery } from '../models/payment.model';
import { AuthorizedUser } from '@/shared/services/authorization.service';

/**
 * Payment Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 * 
 * NOW USING SAFE SERVICES - Protected against race conditions
 */
export class PaymentController {
    private paymentService: PaymentService;

    constructor() {
        this.paymentService = new PaymentService();
    }

    /**
     * Record payment (Race-condition safe)
     */
    create = async (
        request: FastifyRequest<{ Body: CreatePaymentInput }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            if (!branchId) {
                return ResponseUtil.error(
                    reply, 
                    'Branch ID is required', 
                    400,
                    'BRANCH_ID_REQUIRED'
                );
            }

            const result = await this.paymentService.recordPayment(
                request,
                request.body,
                branchId,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            // Handle optimistic lock conflicts
            if (error instanceof OptimisticLockError) {
                return ResponseUtil.error(
                    reply,
                    'Concurrent modification detected. Please try again.',
                    409,
                    'CONCURRENT_MODIFICATION'
                );
            }
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get payment by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.paymentService.getPayment(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404, 'NOT_FOUND');
        }
    };

    /**
     * List payments
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListPaymentsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const user: AuthorizedUser = {
                userId: request.user!.userId,
                role: request.user!.role,
                branchId: request.user!.branchId
            };

            const result = await this.paymentService.listPayments({
                loanId: request.query.loanId,
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                paymentType: request.query.paymentType,
                startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
                endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
            }, user);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get payment statistics
     */
    getStatistics = async (
        request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            
            const result = await this.paymentService.getPaymentStatistics({
                startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
                endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
                branchId: branchId || undefined,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get payment history for loan
     */
    getLoanHistory = async (
        request: FastifyRequest<{ Params: { loanId: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const user: AuthorizedUser = {
                userId: request.user!.userId,
                role: request.user!.role,
                branchId: request.user!.branchId
            };

            const result = await this.paymentService.getLoanPaymentHistory(
                request.params.loanId,
                user
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            if (String(error?.message || '').toLowerCase().includes('access denied')) {
                return ResponseUtil.error(reply, error.message, 403, 'FORBIDDEN');
            }
            if (String(error?.message || '').toLowerCase().includes('not found')) {
                return ResponseUtil.error(reply, error.message, 404, 'NOT_FOUND');
            }
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

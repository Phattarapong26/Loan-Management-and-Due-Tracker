import { FastifyRequest, FastifyReply } from 'fastify';
import { cachedLoanService } from '../services/loan-cached.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { prisma } from '@config/database.config';
import {
    CreateLoanInput,
    ApproveLoanInput,
    RejectLoanInput,
    ListLoansQuery,
} from '../models/loan.model';

/**
 * Loan Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class LoanController {
    private loanService = cachedLoanService;

    constructor() {
        // Using cached service singleton
    }

    /**
     * Create loan
     */
    create = async (
        request: FastifyRequest<{ Body: CreateLoanInput }>,
        reply: FastifyReply
    ) => {
        try {
            const userId = request.user!.userId;
            const role = request.user!.role;
            const userBranchId = request.user!.branchId;

            // Determine branch/officer ownership from the customer (portfolio owner = customer.createdBy)
            const resolvedCustomer = await prisma.customer.findUnique({
                where: { id: request.body.customerId },
                select: { id: true, branchId: true, createdBy: true },
            });

            if (!resolvedCustomer) {
                return ResponseUtil.error(reply, 'Customer not found', 400, 'NOT_FOUND');
            }

            if (role !== 'ADMIN' && !userBranchId) {
                return ResponseUtil.error(reply, 'Branch ID is required', 400, 'BRANCH_ID_REQUIRED');
            }

            // Enforce role-based scope
            if (role === 'OFFICER') {
                if (resolvedCustomer.branchId !== userBranchId || resolvedCustomer.createdBy !== userId) {
                    return ResponseUtil.forbidden(reply, 'You can only create loans for your own customers');
                }
            } else if (role === 'MANAGER') {
                if (resolvedCustomer.branchId !== userBranchId) {
                    return ResponseUtil.forbidden(reply, 'You can only create loans for customers in your branch');
                }
            }

            const branchId = role === 'ADMIN' ? resolvedCustomer.branchId : userBranchId!;
            const officerId = resolvedCustomer.createdBy || userId;

            const result = await this.loanService.createLoan(
                request,
                request.body,
                branchId,
                officerId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            // Log detailed error for debugging
            console.error('[Loan Create Error]', {
                message: error.message,
                stack: error.stack,
                body: request.body,
                userId: request.user?.userId,
                branchId: request.user?.branchId,
            });

            // Map specific error codes
            if (error.message === 'BUDGET_EXCEEDED') {
                return ResponseUtil.error(reply, 'Budget exceeded', 400, 'BUDGET_EXCEEDED');
            }
            if (error.message === 'CUSTOMER_BLACKLISTED') {
                return ResponseUtil.error(reply, 'Customer is blacklisted', 400, 'CUSTOMER_BLACKLISTED');
            }
            if (error.message === 'DUPLICATE_LOAN_APPLICATION') {
                // Include existing loan ID in response for frontend to create link
                const existingLoanId = (error as any).existingLoanId;
                return ResponseUtil.error(
                    reply, 
                    'Duplicate loan application', 
                    400, 
                    'DUPLICATE_LOAN_APPLICATION',
                    existingLoanId ? { existingLoanId } : undefined
                );
            }

            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get loan by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            const role = request.user!.role;

            // Admin can view all loans, others need branchId
            if (!branchId && role !== 'ADMIN') {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            const result = await this.loanService.getLoan(
                request.params.id, 
                branchId || undefined
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List loans
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListLoansQuery }>,
        reply: FastifyReply
    ) => {
        try {
            console.log('=== Loan Controller List ===');
            console.log('Query params:', request.query);
            
            const userId = request.user!.userId;
            const branchId = request.user!.branchId;
            const role = request.user!.role;

            console.log('User info:', { userId, branchId, role });

            // Determine officerId filter based on role
            let officerId: string | undefined;
            if (role === 'OFFICER' || role === 'USER') {
                // Officers can only see their own loans
                officerId = userId;
            } else if (request.query.officerId) {
                // Managers and admins can filter by specific officer
                officerId = request.query.officerId;
            }

            // Admin can see all branches, optionally filter by branchId. Others see only their branch.
            const filterBranchId = role === 'ADMIN' ? request.query.branchId : branchId;

            const result = await this.loanService.listLoans({
                branchId: filterBranchId,
                officerId,
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                status: request.query.status,
                customerId: request.query.customerId,
                search: request.query.search,
            });

            console.log('Controller result count:', result.loans?.length || 0);
            console.log('===============================');

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            console.error('Loan Controller List Error:', error);
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Approve loan (Manager only)
     */
    approve = async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: ApproveLoanInput;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            const role = request.user!.role;

            console.log('🔍 Loan Approval Request:', {
                loanId: request.params.id,
                body: request.body,
                branchId,
                role,
                userId: request.user!.userId
            });

            if (role !== 'MANAGER' && role !== 'ADMIN') {
                return ResponseUtil.forbidden(reply, 'Only managers can approve loans');
            }

            // Admin can approve without branchId, others need it
            if (!branchId && role !== 'ADMIN') {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            const result = await this.loanService.approveLoan(
                request,
                request.params.id,
                request.body,
                branchId || undefined,
                request.user!.userId,
                role === 'ADMIN' ? 'ADMIN' : 'MANAGER'
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            console.error('❌ Loan Approval Error:', {
                loanId: request.params.id,
                error: error.message,
                stack: error.stack
            });
            const code = error?.code as string | undefined;
            const details = error?.details;
            const statusCode =
                code === 'MANAGER_APPROVAL_LIMIT_EXCEEDED' ? 403 : 400;
            return ResponseUtil.error(reply, error.message, statusCode, code, details);
        }
    };

    /**
     * Reject loan (Manager only)
     */
    reject = async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: RejectLoanInput;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            const role = request.user!.role;

            if (role !== 'MANAGER' && role !== 'ADMIN') {
                return ResponseUtil.forbidden(reply, 'Only managers can reject loans');
            }

            // Admin can reject without branchId, others need it
            if (!branchId && role !== 'ADMIN') {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            const result = await this.loanService.rejectLoan(
                request,
                request.params.id,
                request.body,
                branchId || undefined,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get loan statistics
     */
    getStatistics = async (
        request: FastifyRequest<{ Querystring: { status?: string; branchId?: string; officerId?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            const role = request.user!.role;
            const userId = request.user!.userId;
            
            // Admin can see all branches, optionally filter by branchId.
            // Others see only their branch.
            const filterBranchId = role === 'ADMIN' ? request.query.branchId : branchId;

            // OFFICER: restrict stats to own portfolio
            const officerId = role === 'OFFICER' ? userId : request.query.officerId;
            
            const result = await this.loanService.getLoanStatistics({
                branchId: filterBranchId,
                officerId,
                status: request.query.status,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get pending approvals
     */
    getPendingApprovals = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const branchId = request.user!.branchId;
            const role = request.user!.role;

            if (role !== 'MANAGER' && role !== 'ADMIN') {
                return ResponseUtil.forbidden(reply, 'Only managers can view pending approvals');
            }

            // Admin can see all branches, others need branchId
            if (!branchId && role !== 'ADMIN') {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            // Admin can see all branches, others see only their branch
            const filterBranchId = role === 'ADMIN' ? undefined : branchId;

            const result = await this.loanService.getPendingApprovals(filterBranchId);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

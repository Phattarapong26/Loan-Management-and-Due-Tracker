import { FastifyRequest, FastifyReply } from 'fastify';
import { ExpenseService } from '../services/expense.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import {
    CreateExpenseInput,
    UpdateExpenseInput,
    ListExpensesQuery,
    ApproveExpenseInput,
    RejectExpenseInput,
} from '../models/expense.model';

/**
 * Expense Controller - Request/Response ONLY
 */
export class ExpenseController {
    private expenseService: ExpenseService;

    constructor() {
        this.expenseService = new ExpenseService();
    }

    /**
     * Create expense
     */
    create = async (
        request: FastifyRequest<{ Body: CreateExpenseInput }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            if (!branchId) {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            const result = await this.expenseService.createExpense(
                request,
                request.body,
                branchId,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get expense by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.expenseService.getExpense(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List expenses
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListExpensesQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const role = request.user!.role;
            const userBranchId = request.user!.branchId;
            
            // Admin can see all branches, others see only their branch
            const filterBranchId = role === 'ADMIN' 
                ? request.query.branchId  // Admin: use query param (undefined = all branches)
                : (request.query.branchId || userBranchId);  // Others: use their branch
            
            const result = await this.expenseService.listExpenses({
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                branchId: filterBranchId,
                status: request.query.status,
                category: request.query.category,
                dateFrom: request.query.dateFrom,
                dateTo: request.query.dateTo,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update expense
     */
    update = async (
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateExpenseInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.expenseService.updateExpense(
                request,
                request.params.id,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Approve expense
     */
    approve = async (
        request: FastifyRequest<{ Params: { id: string }; Body: ApproveExpenseInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.expenseService.approveExpense(
                request,
                request.params.id,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Reject expense
     */
    reject = async (
        request: FastifyRequest<{ Params: { id: string }; Body: RejectExpenseInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.expenseService.rejectExpense(
                request,
                request.params.id,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Reimburse expense
     */
    reimburse = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.expenseService.reimburseExpense(
                request,
                request.params.id,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

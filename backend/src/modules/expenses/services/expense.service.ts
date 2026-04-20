import { FastifyRequest } from 'fastify';
import { ExpenseRepository } from '../repositories/expense.repository';
import { BranchRepository } from '@branches/repositories/branch.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { CreateExpenseInput, UpdateExpenseInput, ApproveExpenseInput, RejectExpenseInput } from '../models/expense.model';
import { NotificationService } from '@notifications/services/notification.service';

/**
 * Expense Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class ExpenseService {
    private expenseRepository: ExpenseRepository;
    private branchRepository: BranchRepository;
    private userRepository: UserRepository;
    private notificationService: NotificationService;

    constructor() {
        this.expenseRepository = new ExpenseRepository();
        this.branchRepository = new BranchRepository();
        this.userRepository = new UserRepository();
        this.notificationService = new NotificationService();
    }

    /**
     * Create expense with validation
     */
    async createExpense(
        _request: FastifyRequest,
        input: CreateExpenseInput,
        branchId: string,
        createdBy: string
    ) {
        // Validate branch exists
        const branch = await this.branchRepository.findById(branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        // Create expense
        const expense = await this.expenseRepository.create({
            ...input,
            branchId,
            createdBy,
        });

        // Notify managers/admins via NotificationService
        try {
            const managers = await this.userRepository.findByBranchAndRoles(branchId, ['branch_manager', 'admin']);
            for (const manager of managers) {
                await this.notificationService.notify({
                    userId: manager.id,
                    type: 'SYSTEM_ALERT' as any,
                    title: 'ค่าใช้จ่ายรอการอนุมัติ',
                    message: `มีค่าใช้จ่าย ${Number(input.amount).toLocaleString('th-TH')} บาท รอการอนุมัติ`,
                    link: `/expenses/${expense.id}`,
                    priority: 'MEDIUM' as any,
                    dedupKey: `expense-created-${expense.id}-${manager.id}`,
                    dedupWindow: 24,
                    metadata: { expenseId: expense.id, branchId },
                });
            }
        } catch (error) {
            console.error('Failed to notify managers of new expense:', error);
        }

        return expense;
    }

    /**
     * Get expense by ID
     */
    async getExpense(expenseId: string) {
        const expense = await this.expenseRepository.findById(expenseId);
        if (!expense) {
            throw new Error('Expense not found');
        }

        return expense;
    }

    /**
     * List expenses
     */
    async listExpenses(params: {
        page: number;
        limit: number;
        branchId?: string;
        status?: string;
        category?: string;
        dateFrom?: string;
        dateTo?: string;
    }) {
        const result = await this.expenseRepository.list({
            page: params.page,
            limit: params.limit,
            branchId: params.branchId,
            status: params.status as any,
            category: params.category as any,
            dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
            dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
        });

        return {
            expenses: result.expenses,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
    }

    /**
     * Update expense
     */
    async updateExpense(
        _request: FastifyRequest,
        expenseId: string,
        input: UpdateExpenseInput,
        userId: string
    ) {
        // Check if expense exists
        const existingExpense = await this.expenseRepository.findById(expenseId);
        if (!existingExpense) {
            throw new Error('Expense not found');
        }

        // Only creator can update pending expenses
        if (existingExpense.status !== 'PENDING' && existingExpense.createdBy !== userId) {
            throw new Error('Only pending expenses can be updated by creator');
        }

        // Update expense
        const updateData: any = {};
        if (input.category) updateData.category = input.category;
        if (input.amount) updateData.amount = input.amount;
        if (input.description) updateData.description = input.description;
        if (input.expenseDate) updateData.expenseDate = new Date(input.expenseDate);
        if (input.receiptPath) updateData.receiptPath = input.receiptPath;

        const expense = await this.expenseRepository.update(expenseId, updateData);

        return expense;
    }

    /**
     * Approve expense
     */
    async approveExpense(
        _request: FastifyRequest,
        expenseId: string,
        _input: ApproveExpenseInput,
        approvedBy: string
    ) {
        // Check if expense exists
        const existingExpense = await this.expenseRepository.findById(expenseId);
        if (!existingExpense) {
            throw new Error('Expense not found');
        }

        if (existingExpense.status !== 'PENDING') {
            throw new Error('Only pending expenses can be approved');
        }

        // Approve expense
        const expense = await this.expenseRepository.approve(expenseId, approvedBy);

        // 🔔 Send in-app notification to creator
        try {
            await this.notificationService.createNotification({} as FastifyRequest, {
                userId: expense.createdBy,
                type: 'EXPENSE_APPROVED',
                title: 'อนุมัติค่าใช้จ่าย',
                message: `ค่าใช้จ่าย ${Number(expense.amount).toLocaleString('th-TH')} บาท ได้รับการอนุมัติแล้ว`,
                link: `/expenses/${expense.id}`,
                priority: 'MEDIUM',
                eventId: `EXPENSE_APPROVED:${expense.id}`,
                dedupKey: `EXPENSE_APPROVED-${expense.id}`,
                dedupWindow: 24,
                audienceRoles: ['OFFICER', 'MANAGER'],
                metadata: {
                    expenseId: expense.id,
                    amount: expense.amount,
                    category: expense.category,
                    approvedAt: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error('Failed to create expense approval notification:', error);
        }

        // Queue notification to creator (legacy)
        // REMOVED - notificationService.createNotification above handles this directly

        return expense;
    }

    /**
     * Reject expense
     */
    async rejectExpense(
        _request: FastifyRequest,
        expenseId: string,
        input: RejectExpenseInput,
        rejectedBy: string
    ) {
        // Check if expense exists
        const existingExpense = await this.expenseRepository.findById(expenseId);
        if (!existingExpense) {
            throw new Error('Expense not found');
        }

        if (existingExpense.status !== 'PENDING') {
            throw new Error('Only pending expenses can be rejected');
        }

        // Reject expense
        const expense = await this.expenseRepository.reject(expenseId, rejectedBy, input.reason);

        // 🔔 Send in-app notification to creator
        try {
            await this.notificationService.createNotification({} as FastifyRequest, {
                userId: expense.createdBy,
                type: 'EXPENSE_REJECTED',
                title: 'ปฏิเสธค่าใช้จ่าย',
                message: `ค่าใช้จ่าย ${Number(expense.amount).toLocaleString('th-TH')} บาท ถูกปฏิเสธ เหตุผล: ${input.reason}`,
                link: `/expenses/${expense.id}`,
                priority: 'MEDIUM',
                eventId: `EXPENSE_REJECTED:${expense.id}`,
                dedupKey: `EXPENSE_REJECTED-${expense.id}`,
                dedupWindow: 24,
                audienceRoles: ['OFFICER', 'MANAGER'],
                metadata: {
                    expenseId: expense.id,
                    amount: expense.amount,
                    category: expense.category,
                    reason: input.reason,
                    rejectedAt: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error('Failed to create expense rejection notification:', error);
        }

        // Queue notification to creator (legacy)
        // REMOVED - notificationService.createNotification above handles this directly

        return expense;
    }

    /**
     * Reimburse expense
     */
    async reimburseExpense(
        _request: FastifyRequest,
        expenseId: string,
        reimbursedBy: string
    ) {
        // Check if expense exists
        const existingExpense = await this.expenseRepository.findById(expenseId);
        if (!existingExpense) {
            throw new Error('Expense not found');
        }

        if (existingExpense.status !== 'APPROVED') {
            throw new Error('Only approved expenses can be reimbursed');
        }

        // Reimburse expense
        const expense = await this.expenseRepository.reimburse(expenseId, reimbursedBy);

        // Notify creator directly
        try {
            await this.notificationService.notify({
                userId: expense.createdBy,
                type: 'EXPENSE_APPROVED' as any,
                title: 'ค่าใช้จ่ายได้รับการเบิกจ่ายแล้ว',
                message: `ค่าใช้จ่าย ${Number(expense.amount).toLocaleString('th-TH')} บาท ได้รับการเบิกจ่ายแล้ว`,
                link: `/expenses/${expense.id}`,
                priority: 'MEDIUM' as any,
                dedupKey: `expense-reimbursed-${expense.id}`,
                dedupWindow: 24,
                metadata: { expenseId: expense.id },
            });
        } catch (error) {
            console.error('Failed to create expense reimbursed notification:', error);
        }

        return expense;
    }
}

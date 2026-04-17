import { PrismaClient, Expense, ExpenseStatus, ExpenseCategory, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';
import { CreateExpenseInput } from '../models/expense.model';

/**
 * Expense Repository - Database access ONLY
 * NO business logic allowed
 */
export class ExpenseRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Create expense
     */
    async create(data: CreateExpenseInput & { branchId: string; createdBy: string }): Promise<Expense> {
        return this.db.expense.create({
            data: {
                branchId: data.branchId,
                createdBy: data.createdBy,
                category: data.category,
                amount: data.amount,
                description: data.description,
                expenseDate: new Date(data.expenseDate),
                receiptPath: data.receiptPath,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Find expense by ID
     */
    async findById(id: string): Promise<Expense | null> {
        return this.db.expense.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * List expenses with pagination and filters
     */
    async list(params: {
        page: number;
        limit: number;
        branchId?: string;
        status?: ExpenseStatus;
        category?: ExpenseCategory;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<{ expenses: Expense[]; total: number }> {
        const where: Prisma.ExpenseWhereInput = {};

        if (params.branchId) {
            where.branchId = params.branchId;
        }

        if (params.status) {
            where.status = params.status;
        }

        if (params.category) {
            where.category = params.category;
        }

        if (params.dateFrom || params.dateTo) {
            where.expenseDate = {};
            if (params.dateFrom) {
                where.expenseDate.gte = params.dateFrom;
            }
            if (params.dateTo) {
                where.expenseDate.lte = params.dateTo;
            }
        }

        const [expenses, total] = await Promise.all([
            this.db.expense.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { expenseDate: 'desc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    branch: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                },
            }),
            this.db.expense.count({ where }),
        ]);

        return { expenses, total };
    }

    /**
     * Update expense
     */
    async update(id: string, data: Partial<{
        category: ExpenseCategory;
        amount: number;
        description: string;
        expenseDate: Date;
        receiptPath: string;
    }>): Promise<Expense> {
        return this.db.expense.update({
            where: { id },
            data,
        });
    }

    /**
     * Approve expense
     */
    async approve(id: string, approvedBy: string): Promise<Expense> {
        return this.db.expense.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvedAt: new Date(),
            },
        });
    }

    /**
     * Reject expense
     */
    async reject(id: string, rejectedBy: string, reason: string): Promise<Expense> {
        return this.db.expense.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectedBy,
                rejectedAt: new Date(),
                rejectedReason: reason,
            },
        });
    }

    /**
     * Mark expense as reimbursed
     */
    async reimburse(id: string, reimbursedBy: string): Promise<Expense> {
        return this.db.expense.update({
            where: { id },
            data: {
                reimbursed: true,
                reimbursedAt: new Date(),
                reimbursedBy,
                status: 'REIMBURSED',
            },
        });
    }
}

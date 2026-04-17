import { z } from 'zod';
import { ExpenseCategory, ExpenseStatus } from '@prisma/client';

/**
 * Create expense schema
 */
export const createExpenseSchema = z.object({
    category: z.nativeEnum(ExpenseCategory),
    amount: z.number().positive('Amount must be positive'),
    description: z.string().min(1, 'Description is required').max(500),
    expenseDate: z.string().datetime('Invalid date format'),
    receiptPath: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/**
 * Update expense schema
 */
export const updateExpenseSchema = z.object({
    category: z.nativeEnum(ExpenseCategory).optional(),
    amount: z.number().positive().optional(),
    description: z.string().min(1).max(500).optional(),
    expenseDate: z.string().datetime().optional(),
    receiptPath: z.string().optional(),
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

/**
 * List expenses query schema
 */
export const listExpensesQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    branchId: z.string().uuid().optional(),
    status: z.nativeEnum(ExpenseStatus).optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
});

export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

/**
 * Approve expense schema
 */
export const approveExpenseSchema = z.object({
    notes: z.string().max(500).optional(),
});

export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;

/**
 * Reject expense schema
 */
export const rejectExpenseSchema = z.object({
    reason: z.string().min(1, 'Reason is required').max(500),
});

export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;

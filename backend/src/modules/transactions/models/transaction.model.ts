import { z } from 'zod';

// Transaction type enum
export const transactionTypeSchema = z.enum([
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER',
    'LOAN_DISBURSEMENT',
    'LOAN_PAYMENT',
    'FEE',
    'INTEREST',
]);

// Transaction status enum
export const transactionStatusSchema = z.enum([
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REVERSED',
]);

// Create transaction schema
export const createTransactionSchema = z.object({
    type: transactionTypeSchema,
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().default('THB'),
    loanId: z.string().uuid().optional(),
    fromAccount: z.string().optional(),
    toAccount: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Update transaction schema
export const updateTransactionSchema = z.object({
    status: transactionStatusSchema,
    metadata: z.record(z.unknown()).optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// Transaction response
export interface TransactionResponse {
    id: string;
    userId: string;
    loanId?: string;
    type: string;
    amount: string;
    currency: string;
    status: string;
    fromAccount?: string;
    toAccount?: string;
    reference?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// List transactions query
export const listTransactionsQuerySchema = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    status: transactionStatusSchema.optional(),
    type: transactionTypeSchema.optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

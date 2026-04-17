import { z } from 'zod';
import { DisbursementStatus } from '@prisma/client';

/**
 * Create disbursement schema
 */
export const createDisbursementSchema = z.object({
    loanId: z.string().uuid('Invalid loan ID'),
    amount: z.number().positive('Amount must be positive'),
    purpose: z.string().min(1, 'Purpose is required').max(500),
    requestedDate: z.string().datetime('Invalid date format'),
    nextDisbursementDate: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
    // ✅ เพิ่ม payment schedule parameters (สำหรับ disbursement แรก)
    firstPaymentDate: z.string().datetime('Invalid first payment date').optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
});

export type CreateDisbursementInput = z.infer<typeof createDisbursementSchema>;

/**
 * Update disbursement schema
 */
export const updateDisbursementSchema = z.object({
    amount: z.number().positive().optional(),
    purpose: z.string().min(1).max(500).optional(),
    requestedDate: z.string().datetime().optional(),
    nextDisbursementDate: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
    // ✅ เพิ่ม payment schedule parameters สำหรับการแก้ไข
    firstPaymentDate: z.string().datetime('Invalid first payment date').optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
});

export type UpdateDisbursementInput = z.infer<typeof updateDisbursementSchema>;

/**
 * List disbursements query schema
 */
export const listDisbursementsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(20),
    loanId: z.string().uuid().nullish().or(z.literal('')),
    customerId: z.string().uuid().nullish().or(z.literal('')),
    branchId: z.string().uuid().nullish().or(z.literal('')),
    status: z.nativeEnum(DisbursementStatus).nullish().or(z.literal('')),
    dateFrom: z.string().datetime().nullish().or(z.literal('')),
    dateTo: z.string().datetime().nullish().or(z.literal('')),
});

export type ListDisbursementsQuery = z.infer<typeof listDisbursementsQuerySchema>;

/**
 * Approve disbursement schema
 */
export const approveDisbursementSchema = z.object({
    notes: z.string().max(500).optional(),
});

export type ApproveDisbursementInput = z.infer<typeof approveDisbursementSchema>;

/**
 * Reject disbursement schema
 */
export const rejectDisbursementSchema = z.object({
    reason: z.string().min(1, 'Reason is required').max(500),
});

export type RejectDisbursementInput = z.infer<typeof rejectDisbursementSchema>;

/**
 * Disburse (execute) disbursement schema
 */
export const executeDisbursementSchema = z.object({
    disbursementMethod: z.enum(['TRANSFER', 'CHECK', 'CASH'], {
        errorMap: () => ({ message: 'Invalid disbursement method' }),
    }),
    referenceNo: z.string().max(100).optional(), // Optional - will auto-generate if not provided
    notes: z.string().max(500).optional(),
});

export type ExecuteDisbursementInput = z.infer<typeof executeDisbursementSchema>;

/**
 * Disbursement stats schema
 */
export const disbursementStatsSchema = z.object({
    branchId: z.string().uuid().nullish().or(z.literal('')),
    dateFrom: z.string().datetime().nullish().or(z.literal('')),
    dateTo: z.string().datetime().nullish().or(z.literal('')),
});

export type DisbursementStatsQuery = z.infer<typeof disbursementStatsSchema>;

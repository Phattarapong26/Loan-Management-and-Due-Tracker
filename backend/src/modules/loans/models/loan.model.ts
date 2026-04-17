import { z } from 'zod';
import { validateAmount, validatePositiveInteger } from '@utils/formatting/validation.util';
import { validationMessages } from '@utils/formatting/validation-message-mapper.util';

/**
 * Loan creation schema with Thai validation messages
 */
export const createLoanSchema = z
    .object({
        customerId: z.string().uuid(validationMessages.generic.invalid.message),
        principal: z.number().positive(validationMessages.amount.tooLow.message),
        interestRate: z.number()
            .min(0, validationMessages.interestRate.outOfRange.message)
            .max(100, validationMessages.interestRate.outOfRange.message),
        termMonths: z.number()
            .int()
            .min(1, validationMessages.term.tooShort.message)
            .max(360, validationMessages.term.tooLong.message),
        paymentDay: z.number().int().min(1).max(31).default(1),
        firstPaymentDate: z.string().datetime(validationMessages.date.invalid.message).optional(),
        
        // Financial data for DSCR calculation
        annualRevenue: z.number().positive(validationMessages.amount.tooLow.message),
        annualCogs: z.number().min(0, validationMessages.amount.tooLow.message),
        annualOpex: z.number().min(0, validationMessages.amount.tooLow.message),
        
        // Product configuration
        productConfigId: z.string().uuid().optional(),
        loanProductId: z.string().uuid().optional(),
        loanType: z.enum(['SME', 'PERSONAL', 'MICRO']).default('SME'),
        
        // Optional metadata
        description: z.string().optional(),
    })
    .refine(
        (data) => {
            const result = validateAmount(data.principal);
            return result.valid;
        },
        { 
            message: validationMessages.amount.invalid.message, 
            path: ['principal'],
            params: {
                hint: validationMessages.amount.invalid.hint,
                example: validationMessages.amount.invalid.example
            }
        }
    )
    .refine(
        (data) => {
            const result = validatePositiveInteger(data.termMonths);
            return result.valid;
        },
        { 
            message: validationMessages.term.invalid.message, 
            path: ['termMonths'],
            params: {
                hint: validationMessages.term.invalid.hint,
                example: validationMessages.term.invalid.example
            }
        }
    )
    .refine(
        (data) => {
            // Net income must be positive for DSCR calculation
            const netIncome = data.annualRevenue - data.annualCogs - data.annualOpex;
            return netIncome > 0;
        },
        {
            message: 'รายได้สุทธิต้องมากกว่า 0 (รายได้ - ต้นทุน - ค่าใช้จ่าย)',
            path: ['annualRevenue'],
            params: {
                hint: 'กรุณาตรวจสอบรายได้และค่าใช้จ่าย',
                example: 'รายได้ 1,000,000 - ต้นทุน 500,000 - ค่าใช้จ่าย 200,000 = รายได้สุทธิ 300,000'
            }
        }
    );

export type CreateLoanInput = z.infer<typeof createLoanSchema>;

/**
 * Loan approval schema
 */
export const approveLoanSchema = z.object({
    disbursementDate: z.string().datetime('Invalid disbursement date').optional(),
    firstPaymentDate: z.string().datetime('Invalid first payment date').optional(), // Allow manager to adjust
    paymentDay: z.number().int().min(1).max(31).optional(), // Allow manager to adjust
    notes: z.string().optional(),
});

export type ApproveLoanInput = z.infer<typeof approveLoanSchema>;

/**
 * Loan rejection schema
 */
export const rejectLoanSchema = z.object({
    reason: z.string().min(1, 'Rejection reason is required').max(1000),
});

export type RejectLoanInput = z.infer<typeof rejectLoanSchema>;

/**
 * Loan query schema
 */
export const listLoansQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    status: z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const validStatuses = [
                    'PENDING_APPROVAL',
                    'APPROVED',
                    'REJECTED',
                    'DISBURSED',
                    'ACTIVE',
                    'CLOSED',
                    'DEFAULTED',
                    'NPL',
                ];
                const statuses = val.split(',').map(s => s.trim());
                return statuses.every(status => validStatuses.includes(status));
            },
            { message: 'Invalid status value(s)' }
        ),
    customerId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    officerId: z.string().uuid().optional(), // Add officerId filter
    search: z.string().optional(),
});

export type ListLoansQuery = z.infer<typeof listLoansQuerySchema>;

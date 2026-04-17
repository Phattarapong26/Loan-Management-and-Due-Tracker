import { z } from 'zod';
import { validateAmount } from '@utils/formatting/validation.util';

/**
 * Payment recording schema
 */
export const createPaymentSchema = z
    .object({
        customerId: z.string().uuid('Invalid customer ID').optional(),
        loanId: z.string().uuid('Invalid loan ID'),
        paymentScheduleId: z.string().uuid('Invalid payment schedule ID').optional(),
        amount: z.number()
            .positive('จำนวนเงินต้องมากกว่า 0')
            .max(999999999, 'จำนวนเงินเกินขีดจำกัด')
            .refine((val) => val < 100000000, { message: 'จำนวนเงินสูงเกินไป กรุณาตรวจสอบ' }),
        paymentDate: z.string().datetime('รูปแบบวันที่ไม่ถูกต้อง'),
        paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'OTHER'], {
            errorMap: () => ({ message: 'วิธีการชำระเงินไม่ถูกต้อง' })
        }),
        notes: z.string().optional(),
        reference: z.string().optional(),
    })
    .refine(
        (data) => {
            const result = validateAmount(data.amount);
            return result.valid;
        },
        { message: 'จำนวนเงินไม่ถูกต้อง', path: ['amount'] }
    );

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/**
 * Payment query schema
 */
export const listPaymentsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    loanId: z.string().optional(), // Allow any string (single UUID or comma-separated UUIDs)
    paymentType: z.enum(['EARLY', 'ON_TIME', 'LATE']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

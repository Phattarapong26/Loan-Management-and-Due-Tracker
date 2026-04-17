import { z } from 'zod';
import { validateThaiId, validateTaxId, validatePhone, validateEmail } from '@utils/formatting/validation.util';
import { validationMessages } from '@utils/formatting/validation-message-mapper.util';

/**
 * Customer creation schema with Thai validation messages
 */
export const createCustomerSchema = z
    .object({
        businessName: z.string()
            .min(1, validationMessages.businessName.required.message)
            .max(255, validationMessages.businessName.tooLong.message),
        businessType: z.string().optional(),
        phone: z.string().min(1, validationMessages.phone.required.message),
        email: z.string()
            .email(validationMessages.email.invalid.message)
            .optional()
            .or(z.literal('')),
        address: z.string().optional(),
        thaiId: z.string().optional(),
        taxId: z.string().min(1, validationMessages.taxId.required.message),
        annualRevenue: z.number()
            .positive(validationMessages.amount.tooLow.message)
            .optional(),
        // For ADMIN flows, branchId can be provided and validated here.
        branchId: z.string().uuid().optional(),
        // Officer responsible for this customer (ADMIN/MANAGER can assign to specific officer)
        officerId: z.string().uuid().optional(),
    })
    .refine(
        (data) => {
            if (data.thaiId) {
                const result = validateThaiId(data.thaiId);
                return result.valid;
            }
            return true;
        },
        {
            message: validationMessages.thaiId.invalid.message,
            path: ['thaiId'],
            params: {
                hint: validationMessages.thaiId.invalid.hint,
                example: validationMessages.thaiId.invalid.example
            }
        }
    )
    .refine(
        (data) => {
            const result = validateTaxId(data.taxId);
            return result.valid;
        },
        {
            message: validationMessages.taxId.invalid.message,
            path: ['taxId'],
            params: {
                hint: validationMessages.taxId.invalid.hint,
                example: validationMessages.taxId.invalid.example
            }
        }
    )
    .refine(
        (data) => {
            const result = validatePhone(data.phone);
            return result.valid;
        },
        {
            message: validationMessages.phone.invalid.message,
            path: ['phone'],
            params: {
                hint: validationMessages.phone.invalid.hint,
                example: validationMessages.phone.invalid.example
            }
        }
    )
    .refine(
        (data) => {
            if (data.email && data.email !== '') {
                const result = validateEmail(data.email);
                return result.valid;
            }
            return true;
        },
        {
            message: validationMessages.email.invalid.message,
            path: ['email'],
            params: {
                hint: validationMessages.email.invalid.hint,
                example: validationMessages.email.invalid.example
            }
        }
    );

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/**
 * Customer update schema with Thai validation messages
 */
export const updateCustomerSchema = z.object({
    businessName: z.string()
        .min(1, validationMessages.businessName.tooShort.message)
        .max(255, validationMessages.businessName.tooLong.message)
        .optional(),
    businessType: z.string().optional(),
    phone: z.string().optional(),
    email: z.string()
        .email(validationMessages.email.invalid.message)
        .optional()
        .or(z.literal('')),
    address: z.string().optional(),
    thaiId: z.string().optional(),
    taxId: z.string().optional(),
    avatar: z.string().url('URL รูปภาพไม่ถูกต้อง').max(500).optional().nullable(),
    annualRevenue: z.number().positive(validationMessages.amount.tooLow.message).optional(),
}).refine(
    (data) => {
        if (data.thaiId) {
            const result = validateThaiId(data.thaiId);
            return result.valid;
        }
        return true;
    },
    { 
        message: validationMessages.thaiId.invalid.message, 
        path: ['thaiId'],
        params: {
            hint: validationMessages.thaiId.invalid.hint,
            example: validationMessages.thaiId.invalid.example
        }
    }
).refine(
    (data) => {
        if (data.taxId) {
            const result = validateTaxId(data.taxId);
            return result.valid;
        }
        return true;
    },
    { 
        message: validationMessages.taxId.invalid.message, 
        path: ['taxId'],
        params: {
            hint: validationMessages.taxId.invalid.hint,
            example: validationMessages.taxId.invalid.example
        }
    }
).refine(
    (data) => {
        if (data.phone) {
            const result = validatePhone(data.phone);
            return result.valid;
        }
        return true;
    },
    { message: 'Phone must be exactly 10 digits starting with 0', path: ['phone'] }
);

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

/**
 * Customer query schema
 */
export const listCustomersQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
    branchId: z.string().optional(),
    officerId: z.string().optional(),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

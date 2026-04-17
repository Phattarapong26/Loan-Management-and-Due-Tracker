import { z } from 'zod';

/**
 * Branch creation schema
 */
export const createBranchSchema = z.object({
    code: z.string().min(1, 'Branch code is required').max(10).regex(/^[A-Z0-9]+$/, 'Branch code must be uppercase alphanumeric'),
    name: z.string().min(1, 'Branch name is required').max(255),
    address: z.string().max(500).optional(),
    phone: z.string().max(20).optional(),
    province: z.string().max(255).optional(),
    district: z.string().max(255).optional(),
    subdistrict: z.string().max(255).optional(),
    postalCode: z.string().max(20).optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

/**
 * Branch update schema
 */
export const updateBranchSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(20).optional(),
    province: z.string().max(255).optional(),
    district: z.string().max(255).optional(),
    subdistrict: z.string().max(255).optional(),
    postalCode: z.string().max(20).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

/**
 * List branches query schema
 */
export const listBranchesQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
});

export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>;

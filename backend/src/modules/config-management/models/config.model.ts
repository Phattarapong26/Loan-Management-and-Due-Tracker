import { z } from 'zod';

/**
 * System Config creation/update schema
 */
export const createSystemConfigSchema = z.object({
    key: z.string().min(1).max(100),
    value: z.string().min(1).max(1000),
    category: z.string().min(1).max(50),
    description: z.string().max(500).optional(),
});

export type CreateSystemConfigInput = z.infer<typeof createSystemConfigSchema>;

export const updateSystemConfigSchema = createSystemConfigSchema.partial().omit({ key: true });

export type UpdateSystemConfigInput = z.infer<typeof updateSystemConfigSchema>;

/**
 * Product Config creation schema
 */
export const createProductConfigSchema = z.object({
    productCode: z.string().min(1).max(50),
    productName: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    config: z.record(z.any()), // JSON object
    activeFrom: z.string().datetime(),
    activeUntil: z.string().datetime().optional(),
});

export type CreateProductConfigInput = z.infer<typeof createProductConfigSchema>;

export const updateProductConfigSchema = createProductConfigSchema
    .partial()
    .omit({ productCode: true });

export type UpdateProductConfigInput = z.infer<typeof updateProductConfigSchema>;

/**
 * Config query schema
 */
export const listSystemConfigsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    category: z.string().optional(),
    search: z.string().optional(),
});

export type ListSystemConfigsQuery = z.infer<typeof listSystemConfigsQuerySchema>;

export const listProductConfigsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    search: z.string().optional(),
});

export type ListProductConfigsQuery = z.infer<typeof listProductConfigsQuerySchema>;

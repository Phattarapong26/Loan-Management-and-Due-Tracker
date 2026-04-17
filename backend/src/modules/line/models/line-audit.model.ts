import { z } from 'zod';

/**
 * LINE Audit Log Actions
 */
export enum LineAuditAction {
    CONNECT = 'CONNECT',
    DISCONNECT = 'DISCONNECT', 
    RECONNECT = 'RECONNECT',
    ADMIN_DISCONNECT = 'ADMIN_DISCONNECT',
    ADMIN_FORCE_DISCONNECT = 'ADMIN_FORCE_DISCONNECT'
}

/**
 * Create LINE audit log schema
 */
export const createLineAuditLogSchema = z.object({
    userId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    action: z.nativeEnum(LineAuditAction),
    lineUserId: z.string().optional(),
    previousLineUserId: z.string().optional(),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export type CreateLineAuditLogInput = z.infer<typeof createLineAuditLogSchema>;

/**
 * List LINE audit logs query schema
 */
export const listLineAuditLogsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    userId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    action: z.nativeEnum(LineAuditAction).optional(),
    lineUserId: z.string().optional(),
    performedBy: z.string().uuid().optional(),
    startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
    endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export type ListLineAuditLogsQuery = z.infer<typeof listLineAuditLogsQuerySchema>;

/**
 * Disconnect LINE user schema
 */
export const disconnectLineUserSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
    forceDisconnect: z.boolean().default(false),
});

export type DisconnectLineUserInput = z.infer<typeof disconnectLineUserSchema>;
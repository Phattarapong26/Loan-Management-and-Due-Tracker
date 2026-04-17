import { z } from 'zod';

export const auditLogQuerySchema = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
    userId: z.string().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    severity: z.string().optional(), // high, medium, low from metadata
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export interface AuditLogResponse {
    id: string;
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    changes: any;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: any;
    createdAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    } | null;
}

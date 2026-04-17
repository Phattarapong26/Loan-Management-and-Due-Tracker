import { z } from 'zod';
import { ContactStatus, ContactMethod } from '@prisma/client';

/**
 * Create contact log schema
 */
export const createContactLogSchema = z.object({
    customerId: z.string().uuid('Invalid customer ID'),
    loanId: z.string().uuid('Invalid loan ID').optional(),
    contactDate: z.string().datetime('Invalid date format'),
    contactStatus: z.nativeEnum(ContactStatus),
    contactMethod: z.nativeEnum(ContactMethod),
    notes: z.string().min(1, 'Notes are required').max(2000),
    promisedDate: z.string().datetime('Invalid date format').optional(),
    taskId: z.string().optional(), // Link to task that triggered contact
    nextFollowUpDate: z.string().datetime('Invalid date format').optional(), // When to follow up next
    outcome: z.nativeEnum(ContactStatus).optional(), // Outcome of contact
});

export type CreateContactLogInput = z.infer<typeof createContactLogSchema>;

/**
 * List contact logs query schema
 */
export const listContactLogsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    customerId: z.string().uuid().optional(),
    loanId: z.string().uuid().optional(),
    officerId: z.string().uuid().optional(),
    contactStatus: z.nativeEnum(ContactStatus).optional(),
    contactMethod: z.nativeEnum(ContactMethod).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
});

export type ListContactLogsQuery = z.infer<typeof listContactLogsQuerySchema>;

/**
 * Get reminders query schema
 */
export const getRemindersQuerySchema = z.object({
    officerId: z.string().uuid().optional(),
    status: z.enum(['pending', 'overdue', 'completed', 'all']).optional().default('all'),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
});

export type GetRemindersQuery = z.infer<typeof getRemindersQuerySchema>;

import { z } from 'zod';
import { NotificationType } from '@prisma/client';

/**
 * Create notification schema with production features
 */
export const createNotificationSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    type: z.nativeEnum(NotificationType),
    title: z.string().min(1, 'Title is required').max(200),
    message: z.string().min(1, 'Message is required').max(1000),
    link: z.string().url('Invalid URL').optional(),
    metadata: z.record(z.any()).optional(),

    // Production features
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    eventId: z.string().optional(), // Unique event identifier
    dedupKey: z.string().optional(), // Deduplication key
    dedupWindow: z.number().default(24), // Hours to check for duplicates
    audienceRoles: z.array(z.string()).default([]), // Roles that should receive this
    actionId: z.string().optional(),
    actionLabel: z.string().optional(),
});

export type CreateNotificationInput = z.input<typeof createNotificationSchema>;

/**
 * List notifications query schema with advanced filters
 */
export const listNotificationsQuerySchema = z.object({
    page: z.coerce.number().min(1, 'Page must be at least 1').default(1).optional(),
    limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20).optional(),
    read: z.string().optional().transform((val) => val === 'true'),
    type: z.nativeEnum(NotificationType).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z.enum(['date', 'priority']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    archived: z.string().optional().transform((val) => val === 'true'),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

/**
 * Notification priority enum
 */
export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

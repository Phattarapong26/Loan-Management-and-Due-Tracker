import { z } from 'zod';
export const EventType = {
    MEETING: 'MEETING',
    PAYMENT_DUE: 'PAYMENT_DUE',
    FOLLOW_UP: 'FOLLOW_UP',
    APPOINTMENT: 'APPOINTMENT',
    REMINDER: 'REMINDER',
    HOLIDAY: 'HOLIDAY',
    OTHER: 'OTHER',
} as const;

export const EventCategory = {
    LOAN_RELATED: 'LOAN_RELATED',
    CUSTOMER_VISIT: 'CUSTOMER_VISIT',
    INTERNAL_MEETING: 'INTERNAL_MEETING',
    TRAINING: 'TRAINING',
    HOLIDAY: 'HOLIDAY',
    OTHER: 'OTHER',
} as const;

export const TaskPriority = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
} as const;

/**
 * Create calendar event schema
 */
export const createCalendarEventSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(1000).optional(),
    startDate: z.string().datetime('Invalid date format'),
    endDate: z.string().datetime('Invalid date format').optional(),
    allDay: z.boolean().default(false),
    eventType: z.nativeEnum(EventType),
    category: z.nativeEnum(EventCategory).optional(),
    loanId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    location: z.string().max(200).optional(),
    attendees: z.array(z.string().uuid()).optional(),
    recurring: z.boolean().default(false),
    recurrenceRule: z.string().optional(), // RRULE format
    reminderMinutes: z.array(z.number().int().min(0)).optional(),
    // Task assignment fields (for Manager)
    assignedTo: z.string().uuid().optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

/**
 * Update calendar event schema
 */
export const updateCalendarEventSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    allDay: z.boolean().optional(),
    eventType: z.nativeEnum(EventType).optional(),
    category: z.nativeEnum(EventCategory).optional(),
    loanId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    location: z.string().max(200).optional(),
    attendees: z.array(z.string().uuid()).optional(),
    recurring: z.boolean().optional(),
    recurrenceRule: z.string().optional().nullable(),
    reminderMinutes: z.array(z.number().int().min(0)).optional(),
    // Task assignment fields
    assignedTo: z.string().uuid().optional().nullable(),
    priority: z.nativeEnum(TaskPriority).optional(),
});

export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

/**
 * List calendar events query schema
 */
export const listCalendarEventsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    branchId: z.string().uuid().optional(),
    eventType: z.nativeEnum(EventType).optional(),
    category: z.nativeEnum(EventCategory).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    loanId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
});

export type ListCalendarEventsQuery = z.infer<typeof listCalendarEventsQuerySchema>;

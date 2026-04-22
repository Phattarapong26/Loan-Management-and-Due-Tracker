import { PrismaClient, CalendarEvent, EventType, EventCategory, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';
import { CreateCalendarEventInput } from '../models/calendar-event.model';

/**
 * Calendar Event Repository - Database access ONLY
 * NO business logic allowed
 */
export class CalendarEventRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Create calendar event
     */
    async create(data: CreateCalendarEventInput & { branchId?: string; createdBy: string }): Promise<CalendarEvent> {
        return this.db.calendarEvent.create({
            data: {
                branchId: data.branchId,
                createdBy: data.createdBy,
                title: data.title,
                description: data.description,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                allDay: data.allDay,
                event_type: data.eventType,
                category: data.category,
                loanId: data.loanId || null,
                customerId: data.customerId || null,
                location: data.location,
                attendees: data.attendees,
                recurring: data.recurring,
                recurrenceRule: data.recurrenceRule,
                reminderMinutes: data.reminderMinutes,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                loan: {
                    select: {
                        id: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                    },
                },
            },
        });
    }

    /**
     * Find event by ID
     */
    async findById(id: string): Promise<CalendarEvent | null> {
        return this.db.calendarEvent.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                loan: {
                    select: {
                        id: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                    },
                },
            },
        });
    }

    /**
     * List events with pagination and filters
     */
    async list(params: {
        page: number;
        limit: number;
        branchId?: string;
        eventType?: EventType;
        category?: EventCategory;
        dateFrom?: Date;
        dateTo?: Date;
        loanId?: string;
        customerId?: string;
    }): Promise<{ events: CalendarEvent[]; total: number }> {
        const where: Prisma.CalendarEventWhereInput = {};

        if (params.branchId) {
            where.branchId = params.branchId;
        }

        if (params.eventType) {
            where.event_type = params.eventType;
        }

        if (params.category) {
            where.category = params.category;
        }

        if (params.loanId) {
            where.loanId = params.loanId;
        }

        if (params.customerId) {
            where.customerId = params.customerId;
        }

        if (params.dateFrom || params.dateTo) {
            where.startDate = {};
            if (params.dateFrom) {
                where.startDate.gte = params.dateFrom;
            }
            if (params.dateTo) {
                where.startDate.lte = params.dateTo;
            }
        }

        const [events, total] = await Promise.all([
            this.db.calendarEvent.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { startDate: 'asc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            businessName: true,
                        },
                    },
                    loan: {
                        select: {
                            id: true,
                        },
                    },
                },
            }),
            this.db.calendarEvent.count({ where }),
        ]);

        return { events, total };
    }

    /**
     * Update event
     */
    async update(id: string, data: Partial<{
        title: string;
        description: string;
        startDate: Date;
        endDate: Date | null;
        allDay: boolean;
        event_type: EventType;
        category: EventCategory | null;
        loanId: string | null;
        customerId: string | null;
        location: string;
        attendees: string[];
        recurring: boolean;
        recurrenceRule: string | null;
        reminderMinutes: number[];
    }>): Promise<CalendarEvent> {
        return this.db.calendarEvent.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete event
     */
    async delete(id: string): Promise<CalendarEvent> {
        return this.db.calendarEvent.delete({
            where: { id },
        });
    }

    /**
     * Create task assignment (for Manager feature)
     */
    async createTaskAssignment(data: {
        taskId: string;
        taskType: string;
        assignedTo: string;
        assignedBy: string;
        priority: string;
        dueDate: Date;
        status: string;
        notes?: string;
    }): Promise<any> {
        return this.db.task_assignments.create({
            data: {
                task_id: data.taskId,
                task_type: data.taskType as any,
                assigned_to: data.assignedTo,
                assigned_by: data.assignedBy,
                priority: data.priority,
                due_date: data.dueDate,
                status: data.status,
                notes: data.notes,
                created_at: new Date(),
            },
        });
    }
}

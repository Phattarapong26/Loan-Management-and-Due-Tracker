import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Payment Timeline Repository - Database access ONLY
 */
export class PaymentTimelineRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma as unknown as PrismaClient;
    }

    /**
     * Create a timeline event
     */
    async createEvent(data: {
        loanId: string;
        paymentScheduleId: string;
        eventType: string;
        scheduledDate: Date;
        status: string;
        metadata?: any;
    }): Promise<any> {
        return (this.db as any).paymentTimelineEvent.create({ data });
    }

    /**
     * Find pending events scheduled up to now
     */
    async findPendingEvents(): Promise<any[]> {
        return (this.db as any).paymentTimelineEvent.findMany({
            where: {
                scheduledDate: { lte: new Date() },
                status: 'PENDING',
            },
            include: {
                loan: {
                    include: {
                        customer: {
                            include: {
                                branch: true,
                            },
                        },
                    },
                },
                paymentSchedule: true,
            },
            orderBy: { scheduledDate: 'asc' },
        });
    }

    /**
     * Update event status
     */
    async updateEventStatus(id: string, status: string, metadata?: any): Promise<any> {
        return (this.db as any).paymentTimelineEvent.update({
            where: { id },
            data: {
                status,
                executedAt: new Date(),
                ...(metadata !== undefined ? { metadata } : {}),
            },
        });
    }

    /**
     * Find events by loan ID
     */
    async findByLoanId(loanId: string): Promise<any[]> {
        return (this.db as any).paymentTimelineEvent.findMany({
            where: { loanId },
            include: {
                paymentSchedule: {
                    select: {
                        paymentNumber: true,
                        paymentDate: true,
                        totalPayment: true,
                        status: true,
                    },
                },
            },
            orderBy: { scheduledDate: 'asc' },
        });
    }

    /**
     * Cancel pending events for a payment schedule
     */
    async cancelEventsByScheduleId(paymentScheduleId: string, metadata: any): Promise<void> {
        await (this.db as any).paymentTimelineEvent.updateMany({
            where: {
                paymentScheduleId,
                status: 'PENDING',
            },
            data: {
                status: 'CANCELLED',
                executedAt: new Date(),
                metadata,
            },
        });
    }

    /**
     * Update payment schedule status (used during overdue/penalty processing)
     */
    async updatePaymentScheduleStatus(id: string, data: { status?: string; daysOverdue?: number; penaltyAmount?: number }): Promise<void> {
        await (this.db as any).paymentSchedule.update({
            where: { id },
            data,
        });
    }

    /**
     * Count overdue payment schedules for a loan
     */
    async countOverdueSchedules(loanId: string): Promise<number> {
        return (this.db as any).paymentSchedule.count({
            where: { loanId, status: 'OVERDUE' },
        });
    }

    /**
     * Update loan status
     */
    async updateLoanStatus(loanId: string, status: string): Promise<void> {
        await (this.db as any).loan.update({
            where: { id: loanId },
            data: { status },
        });
    }

    /**
     * Create a collection task assignment
     */
    async createCollectionTask(data: {
        taskId: string;
        taskType: string;
        assignedTo: string;
        assignedBy: string;
        priority: string;
        dueDate: Date;
        status: string;
        notes: string;
    }): Promise<void> {
        await (this.db as any).taskAssignment.create({ data });
    }
}

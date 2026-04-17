import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentTimelineService } from '@payments/services/payment-timeline.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { logger } from '@utils/common/logger.util';
import {
    manualTriggerTimelineProcessing,
    manualTriggerTimelineCreation
} from '@jobs/schedulers/payment-timeline.job';

const paymentTimelineService = new PaymentTimelineService();

export class PaymentTimelineController {

    /**
     * ดึงข้อมูล Timeline สำหรับ Loan
     */
    async getPaymentTimeline(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };

            const timeline = await paymentTimelineService.getPaymentTimeline(loanId);

            return ResponseUtil.success(reply, {
                loanId,
                timeline,
                totalEvents: timeline.length,
            });
        } catch (error) {
            logger.error({ error }, 'Error getting payment timeline');
            return ResponseUtil.error(reply, 'Failed to get payment timeline', 500);
        }
    }

    /**
     * สร้าง Timeline Events สำหรับ Payment Schedule
     */
    async createPaymentTimeline(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId, paymentScheduleId } = request.params as {
                loanId: string;
                paymentScheduleId: string;
            };
            const { dueDate, config } = request.body as {
                dueDate: string;
                config?: any;
            };

            const timeline = await paymentTimelineService.createPaymentTimeline(
                loanId,
                paymentScheduleId,
                new Date(dueDate),
                config
            );

            return ResponseUtil.success(reply, {
                message: 'Payment timeline created successfully',
                timeline,
                eventsCreated: timeline.length,
            });
        } catch (error) {
            logger.error({ error }, 'Error creating payment timeline');
            return ResponseUtil.error(reply, 'Failed to create payment timeline', 500);
        }
    }

    /**
     * ยกเลิก Timeline Events
     */
    async cancelTimelineEvents(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { paymentScheduleId } = request.params as { paymentScheduleId: string };
            const { reason } = request.body as { reason?: string };

            await paymentTimelineService.cancelTimelineEvents(
                paymentScheduleId,
                reason || 'Manual cancellation'
            );

            return ResponseUtil.success(reply, {
                message: 'Timeline events cancelled successfully',
                paymentScheduleId,
                reason: reason || 'Manual cancellation',
            });
        } catch (error) {
            logger.error({ error }, 'Error cancelling timeline events');
            return ResponseUtil.error(reply, 'Failed to cancel timeline events', 500);
        }
    }

    /**
     * ประมวลผล Timeline Events ที่ถึงเวลาแล้ว (Manual Trigger)
     */
    async processScheduledEvents(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await manualTriggerTimelineProcessing();

            return ResponseUtil.success(reply, {
                message: 'Timeline events processed successfully',
                ...result,
            });
        } catch (error) {
            logger.error({ error }, 'Error processing scheduled events');
            return ResponseUtil.error(reply, 'Failed to process scheduled events', 500);
        }
    }

    /**
     * สร้าง Timeline Events สำหรับ Payment Schedules ใหม่ (Manual Trigger)
     */
    async createTimelineForUpcomingPayments(_request: FastifyRequest, reply: FastifyReply) {
        try {
            await manualTriggerTimelineCreation();

            return ResponseUtil.success(reply, {
                message: 'Timeline creation completed successfully',
            });
        } catch (error) {
            logger.error({ error }, 'Error creating timeline for upcoming payments');
            return ResponseUtil.error(reply, 'Failed to create timeline for upcoming payments', 500);
        }
    }

    /**
     * คำนวณค่าปรับสะสม
     */
    async calculatePenalty(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { principalAmount, daysOverdue, penaltyRate } = request.body as {
                principalAmount: number;
                daysOverdue: number;
                penaltyRate?: number;
            };

            const penalty = paymentTimelineService.calculateAccumulatedPenalty(
                principalAmount,
                daysOverdue,
                penaltyRate
            );

            return ResponseUtil.success(reply, {
                principalAmount,
                daysOverdue,
                penaltyRate: penaltyRate || 0.0005,
                penaltyAmount: penalty,
                totalAmount: principalAmount + penalty,
                calculation: {
                    formula: 'Principal × Penalty Rate × Days Overdue',
                    details: `${principalAmount} × ${penaltyRate || 0.0005} × ${daysOverdue} = ${penalty}`,
                },
            });
        } catch (error) {
            logger.error({ error }, 'Error calculating penalty');
            return ResponseUtil.error(reply, 'Failed to calculate penalty', 500);
        }
    }

    /**
     * ดึงสถิติ Timeline Events
     */
    async getTimelineStatistics(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const { prisma } = await import('@config/database.config');

            // สถิติ Events ตามประเภท
            const eventTypeStats = await prisma.paymentTimelineEvent.groupBy({
                by: ['eventType', 'status'],
                _count: {
                    id: true,
                },
            });

            // Events ที่จะมาถึงใน 7 วันข้างหน้า
            const upcomingEvents = await prisma.paymentTimelineEvent.findMany({
                where: {
                    scheduledDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                    status: 'PENDING',
                },
                include: {
                    loan: {
                        include: {
                            customer: {
                                select: {
                                    businessName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { scheduledDate: 'asc' },
            });

            // Events ที่ล้มเหลวใน 24 ชั่วโมงที่ผ่านมา
            const failedEvents = await prisma.paymentTimelineEvent.findMany({
                where: {
                    status: 'FAILED',
                    executedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
                include: {
                    loan: {
                        include: {
                            customer: {
                                select: {
                                    businessName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { executedAt: 'desc' },
            });

            return ResponseUtil.success(reply, {
                statistics: {
                    eventTypeStats: eventTypeStats.reduce((acc, stat) => {
                        const key = `${stat.eventType}_${stat.status}`;
                        acc[key] = stat._count.id;
                        return acc;
                    }, {} as Record<string, number>),
                    upcomingEventsCount: upcomingEvents.length,
                    failedEventsLast24h: failedEvents.length,
                },
                upcomingEvents: upcomingEvents.map(event => ({
                    id: event.id,
                    eventType: event.eventType,
                    scheduledDate: event.scheduledDate,
                    loanId: event.loanId,
                    customerName: event.loan.customer.businessName,
                    description: (event.metadata as any)?.description,
                })),
                recentFailures: failedEvents.map(event => ({
                    id: event.id,
                    eventType: event.eventType,
                    executedAt: event.executedAt,
                    loanId: event.loanId,
                    customerName: event.loan.customer.businessName,
                    error: (event.metadata as any)?.error,
                })),
            });
        } catch (error) {
            logger.error({ error }, 'Error getting timeline statistics');
            return ResponseUtil.error(reply, 'Failed to get timeline statistics', 500);
        }
    }

    /**
     * ดึงข้อมูล Timeline Events ที่ต้องการความสนใจ (Dashboard)
     */
    async getTimelineDashboard(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const { prisma } = await import('@config/database.config');

            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            // Events วันนี้
            const todayEvents = await prisma.paymentTimelineEvent.count({
                where: {
                    scheduledDate: {
                        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                        lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
                    },
                    status: 'PENDING',
                },
            });

            // Events พรุ่งนี้
            const tomorrowEvents = await prisma.paymentTimelineEvent.count({
                where: {
                    scheduledDate: {
                        gte: tomorrow,
                        lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
                    },
                    status: 'PENDING',
                },
            });

            // Events สัปดาห์หน้า
            const nextWeekEvents = await prisma.paymentTimelineEvent.count({
                where: {
                    scheduledDate: {
                        gte: now,
                        lt: nextWeek,
                    },
                    status: 'PENDING',
                },
            });

            // Overdue Events
            const overdueEvents = await prisma.paymentTimelineEvent.count({
                where: {
                    scheduledDate: { lt: now },
                    status: 'PENDING',
                },
            });

            // Failed Events ใน 24 ชั่วโมงที่ผ่านมา
            const recentFailures = await prisma.paymentTimelineEvent.count({
                where: {
                    status: 'FAILED',
                    executedAt: {
                        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                    },
                },
            });

            return ResponseUtil.success(reply, {
                dashboard: {
                    todayEvents,
                    tomorrowEvents,
                    nextWeekEvents,
                    overdueEvents,
                    recentFailures,
                },
                alerts: {
                    hasOverdueEvents: overdueEvents > 0,
                    hasRecentFailures: recentFailures > 0,
                    highVolumeToday: todayEvents > 50,
                },
                generatedAt: now,
            });
        } catch (error) {
            logger.error({ error }, 'Error getting timeline dashboard');
            return ResponseUtil.error(reply, 'Failed to get timeline dashboard', 500);
        }
    }
}

export const paymentTimelineController = new PaymentTimelineController();
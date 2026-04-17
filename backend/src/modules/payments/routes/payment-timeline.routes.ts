import { FastifyInstance } from 'fastify';
import { paymentTimelineController } from '../controllers/payment-timeline.controller';
import { authorize } from '@middlewares/security/auth.middleware';

export async function paymentTimelineRoutes(fastify: FastifyInstance) {
    // ดึงข้อมูล Timeline สำหรับ Loan
    fastify.get('/loans/:loanId/timeline', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            description: 'Get payment timeline for a loan',
            tags: ['Payment Timeline'],
            params: {
                type: 'object',
                properties: {
                    loanId: { type: 'string' },
                },
                required: ['loanId'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                loanId: { type: 'string' },
                                timeline: { type: 'array' },
                                totalEvents: { type: 'number' },
                            },
                        },
                    },
                },
            },
        } as any,
    }, paymentTimelineController.getPaymentTimeline.bind(paymentTimelineController));

    // สร้าง Timeline Events สำหรับ Payment Schedule
    fastify.post('/loans/:loanId/payment-schedules/:paymentScheduleId/timeline', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            description: 'Create payment timeline for a payment schedule',
            tags: ['Payment Timeline'],
            params: {
                type: 'object',
                properties: {
                    loanId: { type: 'string' },
                    paymentScheduleId: { type: 'string' },
                },
                required: ['loanId', 'paymentScheduleId'],
            },
            body: {
                type: 'object',
                properties: {
                    dueDate: { type: 'string', format: 'date-time' },
                    config: {
                        type: 'object',
                        properties: {
                            invoiceGenerationDays: { type: 'number' },
                            firstReminderDays: { type: 'number' },
                            secondReminderDays: { type: 'number' },
                            penaltyStartDays: { type: 'number' },
                            nplDays: { type: 'number' },
                            penaltyRate: { type: 'number' },
                        },
                    },
                },
                required: ['dueDate'],
            },
        } as any,
    }, paymentTimelineController.createPaymentTimeline.bind(paymentTimelineController));

    // ยกเลิก Timeline Events
    fastify.delete('/payment-schedules/:paymentScheduleId/timeline', {
        preHandler: [authorize('MANAGER', 'ADMIN')],
        schema: {
            description: 'Cancel timeline events for a payment schedule',
            tags: ['Payment Timeline'],
            params: {
                type: 'object',
                properties: {
                    paymentScheduleId: { type: 'string' },
                },
                required: ['paymentScheduleId'],
            },
            body: {
                type: 'object',
                properties: {
                    reason: { type: 'string' },
                },
            },
        } as any,
    }, paymentTimelineController.cancelTimelineEvents.bind(paymentTimelineController));

    // ประมวลผล Timeline Events (Manual Trigger)
    fastify.post('/timeline/process', {
        preHandler: [authorize('ADMIN')],
        schema: {
            description: 'Manually trigger timeline events processing',
            tags: ['Payment Timeline', 'Admin'],
        } as any,
    }, paymentTimelineController.processScheduledEvents.bind(paymentTimelineController));

    // สร้าง Timeline Events สำหรับ Payment Schedules ใหม่ (Manual Trigger)
    fastify.post('/timeline/create-upcoming', {
        preHandler: [authorize('ADMIN')],
        schema: {
            description: 'Manually trigger timeline creation for upcoming payments',
            tags: ['Payment Timeline', 'Admin'],
        } as any,
    }, paymentTimelineController.createTimelineForUpcomingPayments.bind(paymentTimelineController));

    // คำนวณค่าปรับ
    fastify.post('/timeline/calculate-penalty', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            description: 'Calculate accumulated penalty',
            tags: ['Payment Timeline'],
            body: {
                type: 'object',
                properties: {
                    principalAmount: { type: 'number' },
                    daysOverdue: { type: 'number' },
                    penaltyRate: { type: 'number' },
                },
                required: ['principalAmount', 'daysOverdue'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                principalAmount: { type: 'number' },
                                daysOverdue: { type: 'number' },
                                penaltyRate: { type: 'number' },
                                penaltyAmount: { type: 'number' },
                                totalAmount: { type: 'number' },
                                calculation: { type: 'object' },
                            },
                        },
                    },
                },
            },
        } as any,
    }, paymentTimelineController.calculatePenalty.bind(paymentTimelineController));

    // สถิติ Timeline Events
    fastify.get('/timeline/statistics', {
        preHandler: [authorize('MANAGER', 'ADMIN')],
        schema: {
            description: 'Get timeline events statistics',
            tags: ['Payment Timeline', 'Statistics'],
        } as any,
    }, paymentTimelineController.getTimelineStatistics.bind(paymentTimelineController));

    // Dashboard Timeline
    fastify.get('/timeline/dashboard', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            description: 'Get timeline dashboard data',
            tags: ['Payment Timeline', 'Dashboard'],
        } as any,
    }, paymentTimelineController.getTimelineDashboard.bind(paymentTimelineController));
}
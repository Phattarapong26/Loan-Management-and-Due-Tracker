import * as cron from 'node-cron';
import { PaymentTimelineService } from '@payments/services/payment-timeline.service';
import { logger } from '@utils/common/logger.util';

const paymentTimelineService = new PaymentTimelineService();

/**
 * Cron Job สำหรับประมวลผล Payment Timeline Events
 * รันทุก 30 นาที เพื่อตรวจสอบและประมวลผล Events ที่ถึงเวลาแล้ว
 */
export const startPaymentTimelineJob = () => {
    // รันทุก 30 นาที
    cron.schedule('*/30 * * * *', async () => {
        try {
            logger.info('Starting payment timeline job execution');

            const result = await paymentTimelineService.processScheduledEvents();

            logger.info({
                processed: result.processed,
                failed: result.failed,
                totalEvents: result.details.length,
            }, 'Payment timeline job completed');

            // Log รายละเอียดของ Events ที่ล้มเหลว
            if (result.failed > 0) {
                const failedEvents = result.details.filter(detail => detail.status === 'FAILED');
                logger.warn({
                    failedEvents: failedEvents.map(event => ({
                        eventId: event.eventId,
                        error: event.error,
                    })),
                }, 'Some timeline events failed to execute');
            }

        } catch (error) {
            logger.error({ error }, 'Payment timeline job execution failed');
        }
    }, {
        timezone: 'Asia/Bangkok'
    });

    logger.info('Payment timeline cron job started - runs every 30 minutes');
};

/**
 * Cron Job สำหรับสร้าง Timeline Events สำหรับ Payment Schedules ใหม่
 * รันทุกวันเวลา 00:30 เพื่อสร้าง Timeline สำหรับงวดที่จะมาถึง
 */
export const startTimelineCreationJob = () => {
    // รันทุกวันเวลา 00:30
    cron.schedule('30 0 * * *', async () => {
        try {
            logger.info('Starting timeline creation job');

            await createTimelineForUpcomingPayments();

            logger.info('Timeline creation job completed');

        } catch (error) {
            logger.error({ error }, 'Timeline creation job failed');
        }
    }, {
        timezone: 'Asia/Bangkok'
    });

    logger.info('Timeline creation cron job started - runs daily at 00:30');
};

/**
 * สร้าง Timeline Events สำหรับ Payment Schedules ที่ยังไม่มี Timeline
 */
async function createTimelineForUpcomingPayments(): Promise<void> {
    const { prisma } = await import('@config/database.config');

    try {
        // หา Payment Schedules ที่ยังไม่ได้ชำระและยังไม่มี Timeline Events
        const upcomingPayments = await prisma.paymentSchedule.findMany({
            where: {
                status: 'UNPAID',
                paymentDate: {
                    gte: new Date(), // วันที่ครบกำหนดในอนาคต
                },
                // ยังไม่มี Timeline Events
                NOT: {
                    paymentTimelineEvents: {
                        some: {}
                    }
                }
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        status: true,
                    }
                }
            },
            take: 100, // จำกัดจำนวนเพื่อป้องกันการประมวลผลมากเกินไป
        });

        let created = 0;
        let failed = 0;

        for (const payment of upcomingPayments) {
            try {
                // สร้าง Timeline Events สำหรับ Payment Schedule นี้
                await paymentTimelineService.createPaymentTimeline(
                    payment.loanId,
                    payment.id,
                    payment.paymentDate
                );

                created++;

                logger.debug({
                    paymentScheduleId: payment.id,
                    loanId: payment.loanId,
                    paymentDate: payment.paymentDate,
                }, 'Timeline created for payment schedule');

            } catch (error) {
                failed++;
                logger.error({
                    error,
                    paymentScheduleId: payment.id,
                    loanId: payment.loanId,
                }, 'Failed to create timeline for payment schedule');
            }
        }

        logger.info({
            totalPayments: upcomingPayments.length,
            created,
            failed,
        }, 'Timeline creation completed');

    } catch (error) {
        logger.error({ error }, 'Error in createTimelineForUpcomingPayments');
        throw error;
    }
}

/**
 * Cron Job สำหรับทำความสะอาด Timeline Events เก่า
 * รันทุกวันอาทิตย์เวลา 02:00
 */
export const startTimelineCleanupJob = () => {
    // รันทุกวันอาทิตย์เวลา 02:00
    cron.schedule('0 2 * * 0', async () => {
        try {
            logger.info('Starting timeline cleanup job');

            await cleanupOldTimelineEvents();

            logger.info('Timeline cleanup job completed');

        } catch (error) {
            logger.error({ error }, 'Timeline cleanup job failed');
        }
    }, {
        timezone: 'Asia/Bangkok'
    });

    logger.info('Timeline cleanup cron job started - runs weekly on Sunday at 02:00');
};

/**
 * ลบ Timeline Events เก่าที่ไม่จำเป็นแล้ว
 */
async function cleanupOldTimelineEvents(): Promise<void> {
    const { prisma } = await import('@config/database.config');

    try {
        // ลบ Events ที่เก่ากว่า 6 เดือนและสถานะเป็น EXECUTED หรือ CANCELLED
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const deleteResult = await prisma.paymentTimelineEvent.deleteMany({
            where: {
                createdAt: {
                    lt: sixMonthsAgo,
                },
                status: {
                    in: ['COMPLETED', 'CANCELLED'],
                },
            },
        });

        logger.info({
            deletedCount: deleteResult.count,
            cutoffDate: sixMonthsAgo,
        }, 'Old timeline events cleaned up');

    } catch (error) {
        logger.error({ error }, 'Error in cleanupOldTimelineEvents');
        throw error;
    }
}

/**
 * เริ่มต้น Cron Jobs ทั้งหมด
 */
export const startAllPaymentTimelineJobs = () => {
    startPaymentTimelineJob();
    startTimelineCreationJob();
    startTimelineCleanupJob();

    logger.info('All payment timeline cron jobs started');
};

/**
 * Manual trigger สำหรับการทดสอบ
 */
export const manualTriggerTimelineProcessing = async () => {
    try {
        logger.info('Manual trigger: Processing timeline events');
        const result = await paymentTimelineService.processScheduledEvents();
        logger.info(result, 'Manual trigger completed');
        return result;
    } catch (error) {
        logger.error({ error }, 'Manual trigger failed');
        throw error;
    }
};

export const manualTriggerTimelineCreation = async () => {
    try {
        logger.info('Manual trigger: Creating timeline events');
        await createTimelineForUpcomingPayments();
        logger.info('Manual trigger timeline creation completed');
    } catch (error) {
        logger.error({ error }, 'Manual trigger timeline creation failed');
        throw error;
    }
};
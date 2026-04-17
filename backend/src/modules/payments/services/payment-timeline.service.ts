import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import { NextPaymentInvoiceService } from '@invoices/services/next-payment-invoice.service';
import { LineNotificationService } from '@line/services/messaging/line-notification.service';

// Use type assertion to work around TypeScript language server issues
const db = prisma as any;

export interface PaymentTimelineEvent {
    id: string;
    loanId: string;
    paymentScheduleId: string;
    eventType: 'INVOICE_GENERATION' | 'REMINDER_1' | 'REMINDER_2' | 'OVERDUE_UPDATE' | 'PENALTY_INVOICE' | 'NPL_STATUS_UPDATE';
    scheduledDate: Date;
    executedAt?: Date;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentTimelineConfig {
    invoiceGenerationDays: number; // T-7 วัน
    firstReminderDays: number;     // T-3 วัน
    secondReminderDays: number;    // T-1 วัน
    penaltyStartDays: number;      // T+1 วัน
    nplDays: number;               // T+90 วัน
    penaltyRate: number;           // 0.05% ต่อวัน
}

export class PaymentTimelineService {
    private nextPaymentInvoiceService: NextPaymentInvoiceService;
    private lineNotificationService: LineNotificationService;
    
    private defaultConfig: PaymentTimelineConfig = {
        invoiceGenerationDays: 7,    // T-7
        firstReminderDays: 3,        // T-3
        secondReminderDays: 1,       // T-1
        penaltyStartDays: 1,         // T+1
        nplDays: 90,                 // T+90
        penaltyRate: 0.0005,         // 0.05% per day
    };

    constructor() {
        this.nextPaymentInvoiceService = new NextPaymentInvoiceService();
        this.lineNotificationService = new LineNotificationService();
    }

    /**
     * สร้าง Timeline Events สำหรับ Payment Schedule ใหม่
     */
    async createPaymentTimeline(
        loanId: string,
        paymentScheduleId: string,
        dueDate: Date,
        config?: Partial<PaymentTimelineConfig>
    ): Promise<PaymentTimelineEvent[]> {
        try {
            const timelineConfig = { ...this.defaultConfig, ...config };
            const events: PaymentTimelineEvent[] = [];

            // T-7: Invoice Generation
            const invoiceDate = new Date(dueDate);
            invoiceDate.setDate(invoiceDate.getDate() - timelineConfig.invoiceGenerationDays);
            
            events.push(await this.createTimelineEvent({
                loanId,
                paymentScheduleId,
                eventType: 'INVOICE_GENERATION',
                scheduledDate: invoiceDate,
                metadata: {
                    description: 'ออก Invoice และส่งไปยัง LINE เตือนลูกค้า',
                    daysBeforeDue: timelineConfig.invoiceGenerationDays,
                },
            }));

            // T-3: First Reminder
            const firstReminderDate = new Date(dueDate);
            firstReminderDate.setDate(firstReminderDate.getDate() - timelineConfig.firstReminderDays);
            
            events.push(await this.createTimelineEvent({
                loanId,
                paymentScheduleId,
                eventType: 'REMINDER_1',
                scheduledDate: firstReminderDate,
                metadata: {
                    description: 'LINE เตือนครั้งที่ 1',
                    daysBeforeDue: timelineConfig.firstReminderDays,
                },
            }));

            // T-1: Second Reminder
            const secondReminderDate = new Date(dueDate);
            secondReminderDate.setDate(secondReminderDate.getDate() - timelineConfig.secondReminderDays);
            
            events.push(await this.createTimelineEvent({
                loanId,
                paymentScheduleId,
                eventType: 'REMINDER_2',
                scheduledDate: secondReminderDate,
                metadata: {
                    description: 'LINE เตือนครั้งที่ 2',
                    daysBeforeDue: timelineConfig.secondReminderDays,
                },
            }));

            // T: Overdue Update (วันครบกำหนด)
            events.push(await this.createTimelineEvent({
                loanId,
                paymentScheduleId,
                eventType: 'OVERDUE_UPDATE',
                scheduledDate: new Date(dueDate),
                metadata: {
                    description: 'อัพเดทสถานะเป็น OVERDUE',
                    daysAfterDue: 0,
                },
            }));

            // T+1: Penalty Invoice
            const penaltyDate = new Date(dueDate);
            penaltyDate.setDate(penaltyDate.getDate() + timelineConfig.penaltyStartDays);
            
            events.push(await this.createTimelineEvent({
                loanId,
                paymentScheduleId,
                eventType: 'PENALTY_INVOICE',
                scheduledDate: penaltyDate,
                metadata: {
                    description: 'ส่งใบแจ้งหนี้ใหม่ที่มีค่าปรับ',
                    daysAfterDue: timelineConfig.penaltyStartDays,
                    penaltyRate: timelineConfig.penaltyRate,
                },
            }));

            // T+90: NPL Update
            const nplDate = new Date(dueDate);
            nplDate.setDate(nplDate.getDate() + timelineConfig.nplDays);
            
            events.push(await this.createTimelineEvent({
                loanId,
                paymentScheduleId,
                eventType: 'NPL_STATUS_UPDATE',
                scheduledDate: nplDate,
                metadata: {
                    description: 'อัพเดทสถานะเป็น NPL',
                    daysAfterDue: timelineConfig.nplDays,
                },
            }));

            logger.info({
                loanId,
                paymentScheduleId,
                eventsCreated: events.length,
                dueDate,
            }, 'Payment timeline created successfully');

            return events;
        } catch (error) {
            logger.error({ error, loanId, paymentScheduleId }, 'Error creating payment timeline');
            throw error;
        }
    }

    /**
     * ประมวลผล Timeline Events ที่ถึงเวลาแล้ว
     */
    async processScheduledEvents(): Promise<{
        processed: number;
        failed: number;
        details: Array<{ eventId: string; status: 'SUCCESS' | 'FAILED'; error?: string }>;
    }> {
        try {
            const now = new Date();
            
            // ดึง Events ที่ถึงเวลาแล้วและยังไม่ได้ประมวลผล
            const pendingEvents = await db.paymentTimelineEvent.findMany({
                where: {
                    scheduledDate: { lte: now },
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

            const results = [];
            let processed = 0;
            let failed = 0;

            for (const event of pendingEvents) {
                try {
                    await this.executeTimelineEvent(event);
                    
                    // อัพเดทสถานะเป็น COMPLETED
                    await db.paymentTimelineEvent.update({
                        where: { id: event.id },
                        data: {
                            status: 'COMPLETED',
                            executedAt: new Date(),
                        },
                    });

                    results.push({
                        eventId: event.id,
                        status: 'SUCCESS' as const,
                    });
                    processed++;

                    logger.info({
                        eventId: event.id,
                        eventType: event.eventType,
                        loanId: event.loanId,
                    }, 'Timeline event completed successfully');

                } catch (error) {
                    // อัพเดทสถานะเป็น FAILED
                    await db.paymentTimelineEvent.update({
                        where: { id: event.id },
                        data: {
                            status: 'FAILED',
                            executedAt: new Date(),
                            metadata: {
                                ...event.metadata,
                                error: error instanceof Error ? error.message : 'Unknown error',
                            },
                        },
                    });

                    results.push({
                        eventId: event.id,
                        status: 'FAILED' as const,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    failed++;

                    logger.error({
                        error,
                        eventId: event.id,
                        eventType: event.eventType,
                        loanId: event.loanId,
                    }, 'Timeline event execution failed');
                }
            }

            logger.info({
                totalEvents: pendingEvents.length,
                processed,
                failed,
            }, 'Timeline events processing completed');

            return { processed, failed, details: results };
        } catch (error) {
            logger.error({ error }, 'Error processing scheduled events');
            throw error;
        }
    }

    /**
     * ดึงข้อมูล Timeline สำหรับ Loan
     */
    async getPaymentTimeline(loanId: string): Promise<PaymentTimelineEvent[]> {
        try {
            const events = await db.paymentTimelineEvent.findMany({
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

            return events;
        } catch (error) {
            logger.error({ error, loanId }, 'Error getting payment timeline');
            throw error;
        }
    }

    /**
     * ยกเลิก Timeline Events สำหรับ Payment Schedule ที่ชำระแล้ว
     */
    async cancelTimelineEvents(paymentScheduleId: string, reason: string = 'Payment completed'): Promise<void> {
        try {
            await db.paymentTimelineEvent.updateMany({
                where: {
                    paymentScheduleId,
                    status: 'PENDING',
                },
                data: {
                    status: 'CANCELLED',
                    executedAt: new Date(),
                    metadata: {
                        cancelReason: reason,
                        cancelledAt: new Date(),
                    },
                },
            });

            logger.info({
                paymentScheduleId,
                reason,
            }, 'Timeline events cancelled');
        } catch (error) {
            logger.error({ error, paymentScheduleId }, 'Error cancelling timeline events');
            throw error;
        }
    }

    /**
     * คำนวณค่าปรับสะสม
     */
    calculateAccumulatedPenalty(
        principalAmount: number,
        daysOverdue: number,
        penaltyRate: number = this.defaultConfig.penaltyRate
    ): number {
        return principalAmount * penaltyRate * daysOverdue;
    }

    // Private methods

    private async createTimelineEvent(eventData: {
        loanId: string;
        paymentScheduleId: string;
        eventType: PaymentTimelineEvent['eventType'];
        scheduledDate: Date;
        metadata?: any;
    }): Promise<PaymentTimelineEvent> {
        return await db.paymentTimelineEvent.create({
            data: {
                ...eventData,
                status: 'PENDING',
            },
        });
    }

    private async executeTimelineEvent(event: any): Promise<void> {
        switch (event.eventType) {
            case 'INVOICE_GENERATION':
                await this.executeInvoiceGeneration(event);
                break;
            
            case 'REMINDER_1':
            case 'REMINDER_2':
                await this.executeReminder(event);
                break;
            
            case 'OVERDUE_UPDATE':
                await this.executeOverdueUpdate(event);
                break;
            
            case 'PENALTY_INVOICE':
                await this.executePenaltyInvoice(event);
                break;
            
            case 'NPL_STATUS_UPDATE':
                await this.executeNPLUpdate(event);
                break;
            
            default:
                throw new Error(`Unknown event type: ${event.eventType}`);
        }
    }

    private async executeInvoiceGeneration(event: any): Promise<void> {
        // ออก Invoice และส่งไปยัง LINE
        const invoice = await this.nextPaymentInvoiceService.generateNextPaymentInvoice(
            event.loanId,
            'SYSTEM'
        );

        // ส่ง Invoice ผ่าน LINE
        if (event.loan.customer.lineUserId) {
            await this.lineNotificationService.sendPaymentInvoice(
                event.loan.customer.lineUserId,
                invoice
            );
        }
    }

    private async executeReminder(event: any): Promise<void> {
        // ส่งการแจ้งเตือนผ่าน LINE
        if (event.loan.customer.lineUserId) {
            const reminderNumber = event.eventType === 'REMINDER_1' ? 1 : 2;
            await this.lineNotificationService.sendPaymentReminder(
                event.loan.customer.lineUserId,
                {
                    loanId: event.loanId,
                    paymentSchedule: event.paymentSchedule,
                    reminderNumber,
                    daysUntilDue: event.metadata.daysBeforeDue,
                }
            );
        }
    }

    private async executeOverdueUpdate(event: any): Promise<void> {
        // อัพเดทสถานะ Payment Schedule เป็น OVERDUE
        await db.paymentSchedule.update({
            where: { id: event.paymentScheduleId },
            data: {
                status: 'OVERDUE',
                daysOverdue: 1,
            },
        });

        // อัพเดทสถานะ Loan ถ้าจำเป็น
        const overdueCount = await db.paymentSchedule.count({
            where: {
                loanId: event.loanId,
                status: 'OVERDUE',
            },
        });

        if (overdueCount === 1) {
            // เป็นงวดแรกที่เลยกำหนด
            await db.loan.update({
                where: { id: event.loanId },
                data: { status: 'DEFAULTED' },
            });
        }
    }

    private async executePenaltyInvoice(event: any): Promise<void> {
        // คำนวณค่าปรับ
        const daysOverdue = Math.floor(
            (new Date().getTime() - event.paymentSchedule.paymentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const penaltyAmount = this.calculateAccumulatedPenalty(
            Number(event.paymentSchedule.totalPayment),
            daysOverdue,
            event.metadata.penaltyRate
        );

        // อัพเดท Payment Schedule ด้วยค่าปรับ
        await db.paymentSchedule.update({
            where: { id: event.paymentScheduleId },
            data: {
                penaltyAmount,
                daysOverdue,
            },
        });

        // ออก Invoice ใหม่ที่รวมค่าปรับ
        const invoice = await this.nextPaymentInvoiceService.generateNextPaymentInvoice(
            event.loanId,
            'SYSTEM'
        );

        // ส่ง Invoice ผ่าน LINE
        if (event.loan.customer.lineUserId) {
            await this.lineNotificationService.sendPenaltyInvoice(
                event.loan.customer.lineUserId,
                {
                    invoice,
                    penaltyAmount,
                    daysOverdue,
                }
            );
        }
    }

    private async executeNPLUpdate(event: any): Promise<void> {
        // อัพเดทสถานะ Loan เป็น NPL
        await db.loan.update({
            where: { id: event.loanId },
            data: { status: 'NPL' },
        });

        // ส่งการแจ้งเตือน NPL
        if (event.loan.customer.lineUserId) {
            await this.lineNotificationService.sendNPLNotification(
                event.loan.customer.lineUserId,
                {
                    loanId: event.loanId,
                    customerName: event.loan.customer.businessName,
                    daysOverdue: event.metadata.daysAfterDue,
                }
            );
        }

        // สร้าง Task สำหรับ Collection Team
        await this.createCollectionTask(event.loanId);
    }

    private async createCollectionTask(loanId: string): Promise<void> {
        // สร้าง Task สำหรับทีม Collection
        await db.taskAssignment.create({
            data: {
                taskId: `NPL-${loanId}-${Date.now()}`,
                taskType: 'COLLECTION',
                assignedTo: 'COLLECTION_TEAM', // จะต้องมีการกำหนด Collection Team
                assignedBy: 'SYSTEM',
                priority: 'HIGH',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 วัน
                status: 'PENDING',
                notes: `NPL Loan requires immediate collection action. Loan ID: ${loanId}`,
            },
        });
    }
}

export const paymentTimelineService = new PaymentTimelineService();
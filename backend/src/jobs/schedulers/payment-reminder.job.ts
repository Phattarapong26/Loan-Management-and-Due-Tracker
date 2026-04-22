import { PaymentScheduleRepository } from '@payments/repositories/payment-schedule.repository';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { notificationHelper } from '@notifications/services/notification-helper.service';
import { logger } from '@utils/common/logger.util';
import { prisma } from '@config/database.config';

export class PaymentReminderJob {
    private paymentScheduleRepository: PaymentScheduleRepository;
    private loanRepository: LoanRepository;

    constructor() {
        this.paymentScheduleRepository = new PaymentScheduleRepository();
        this.loanRepository = new LoanRepository();
    }

    async sendUpcomingPaymentReminders() {
        logger.info('[PaymentReminder] Checking upcoming payments...');

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        threeDaysFromNow.setHours(0, 0, 0, 0);

        const fourDaysFromNow = new Date(threeDaysFromNow);
        fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1);

        const upcomingPayments = await this.paymentScheduleRepository.findUpcomingInWindow(threeDaysFromNow, fourDaysFromNow);

        logger.info({ count: upcomingPayments.length }, '[PaymentReminder] Found upcoming payments');

        for (const schedule of upcomingPayments) {
            try {
                await notificationHelper.sendPaymentReminder({
                    loanId: schedule.loanId,
                    customerId: schedule.loan.customerId,
                    customerName: schedule.loan.customer.businessName,
                    dueDate: schedule.paymentDate,
                    amount: Number(schedule.totalPayment),
                });
            } catch (error) {
                logger.error({ scheduleId: schedule.id, error }, '[PaymentReminder] Failed to send reminder');
            }
        }

        return { processed: upcomingPayments.length, date: threeDaysFromNow };
    }

    async sendOverduePaymentAlerts() {
        logger.info('[PaymentReminder] Checking overdue payments...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overduePayments = await this.paymentScheduleRepository.findOverdueUnpaid(today);

        logger.info({ count: overduePayments.length }, '[PaymentReminder] Found overdue payments');

        for (const schedule of overduePayments) {
            try {
                const daysOverdue = Math.floor(
                    (today.getTime() - schedule.paymentDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                await notificationHelper.sendPaymentReminder({
                    loanId: schedule.loanId,
                    customerId: schedule.loan.customerId,
                    customerName: schedule.loan.customer.businessName,
                    dueDate: schedule.paymentDate,
                    amount: Number(schedule.totalPayment),
                    daysOverdue,
                });

                // ส่ง LINE ให้ลูกค้าโดยตรง (วันละ 1 ครั้ง)
                try {
                    const customerUser = await prisma.user.findFirst({
                        where: {
                            customers: { some: { id: schedule.loan.customerId } },
                            lineUserId: { not: null },
                        },
                        select: { lineUserId: true },
                    });

                    if (customerUser?.lineUserId) {
                        const { LineService } = await import('@line/services/core/line.service');
                        const lineService = new LineService();
                        const dueDate = new Date(schedule.paymentDate).toLocaleDateString('th-TH', {
                            year: 'numeric', month: 'long', day: 'numeric',
                        });
                        const amount = Number(schedule.totalPayment).toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                        });
                        await lineService.pushMessage(customerUser.lineUserId, [
                            {
                                type: 'flex',
                                altText: `⚠️ แจ้งเตือน: ค้างชำระ ${daysOverdue} วัน`,
                                contents: {
                                    type: 'bubble',
                                    header: {
                                        type: 'box',
                                        layout: 'vertical',
                                        backgroundColor: '#FF4444',
                                        paddingAll: '15px',
                                        contents: [
                                            { type: 'text', text: '⚠️ แจ้งเตือนชำระหนี้', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                                        ],
                                    },
                                    body: {
                                        type: 'box',
                                        layout: 'vertical',
                                        paddingAll: '15px',
                                        contents: [
                                            { type: 'text', text: `คุณมียอดค้างชำระ ${daysOverdue} วัน`, size: 'md', weight: 'bold', color: '#FF4444', wrap: true },
                                            { type: 'separator', margin: 'md' },
                                            {
                                                type: 'box', layout: 'horizontal', margin: 'md',
                                                contents: [
                                                    { type: 'text', text: 'ครบกำหนด:', size: 'sm', color: '#666666', flex: 1 },
                                                    { type: 'text', text: dueDate, size: 'sm', weight: 'bold', flex: 2, align: 'end' },
                                                ],
                                            },
                                            {
                                                type: 'box', layout: 'horizontal', margin: 'sm',
                                                contents: [
                                                    { type: 'text', text: 'ยอดชำระ:', size: 'sm', color: '#666666', flex: 1 },
                                                    { type: 'text', text: `${amount} บาท`, size: 'sm', weight: 'bold', color: '#FF4444', flex: 2, align: 'end' },
                                                ],
                                            },
                                            { type: 'text', text: 'กรุณาชำระโดยเร็วเพื่อหลีกเลี่ยงค่าปรับ', size: 'xs', color: '#999999', margin: 'md', wrap: true },
                                        ],
                                    },
                                    footer: {
                                        type: 'box', layout: 'vertical', paddingAll: '12px',
                                        contents: [
                                            {
                                                type: 'button',
                                                action: { type: 'message', label: '📄 ขอใบแจ้งหนี้', text: 'ใบแจ้งหนี้' },
                                                style: 'primary', color: '#00B900', height: 'sm',
                                            },
                                        ],
                                    },
                                },
                            },
                        ]);
                        logger.info({ customerId: schedule.loan.customerId, daysOverdue }, '[PaymentReminder] LINE overdue alert sent to customer');
                    }
                } catch (lineErr) {
                    logger.warn({ err: lineErr, customerId: schedule.loan.customerId }, '[PaymentReminder] Failed to send LINE to customer');
                }
            } catch (error) {
                logger.error({ scheduleId: schedule.id, error }, '[PaymentReminder] Failed to send overdue alert');
            }
        }

        return { processed: overduePayments.length, date: today };
    }

    async sendNPLAlerts() {
        logger.info('[PaymentReminder] Checking NPL loans...');

        const nplLoans = await this.loanRepository.findNPLLoans();

        logger.info({ count: nplLoans.length }, '[PaymentReminder] Found NPL loans');

        for (const loan of nplLoans) {
            try {
                await notificationHelper.sendNPLAlert({
                    loanId: loan.id,
                    branchId: loan.branchId,
                    customerName: loan.customer.businessName,
                    daysOverdue: loan.overdueDays || 90,
                    outstandingAmount: Number(loan.outstandingBalance),
                });

                if (loan.status !== 'NPL') {
                    await this.loanRepository.updateStatus(loan.id, 'NPL');
                }
            } catch (error) {
                logger.error({ loanId: loan.id, error }, '[PaymentReminder] Failed to send NPL alert');
            }
        }

        return { processed: nplLoans.length, date: new Date() };
    }

    async runAll() {
        logger.info('[PaymentReminder] Starting payment reminder job...');
        const results = {
            upcoming: await this.sendUpcomingPaymentReminders(),
            overdue: await this.sendOverduePaymentAlerts(),
            npl: await this.sendNPLAlerts(),
        };
        logger.info({ results }, '[PaymentReminder] Payment reminder job completed');
        return results;
    }
}

// Export singleton instance
export const paymentReminderJob = new PaymentReminderJob();

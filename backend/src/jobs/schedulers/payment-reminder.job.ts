import { PaymentScheduleRepository } from '@payments/repositories/payment-schedule.repository';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { notificationHelper } from '@notifications/services/notification-helper.service';
import { logger } from '@utils/common/logger.util';

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

import { prisma } from '@config/database.config';
import { notificationHelper } from '@notifications/services/notification-helper.service';
import { logger } from '@utils/common/logger.util';

/**
 * Payment Reminder Job
 * Sends payment reminders to loan officers for upcoming and overdue payments
 * Runs daily to check payment schedules
 */
export class PaymentReminderJob {
    /**
     * Send reminders for upcoming payments (3 days before due date)
     */
    async sendUpcomingPaymentReminders() {
        logger.info('[PaymentReminder] Checking upcoming payments...');

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        threeDaysFromNow.setHours(0, 0, 0, 0);

        const fourDaysFromNow = new Date(threeDaysFromNow);
        fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1);

        // Get unpaid schedules due in 3 days
        const upcomingPayments = await prisma.paymentSchedule.findMany({
            where: {
                status: 'UNPAID',
                paymentDate: {
                    gte: threeDaysFromNow,
                    lt: fourDaysFromNow,
                },
                loan: {
                    status: {
                        in: ['ACTIVE', 'DISBURSED'],
                    },
                },
            },
            include: {
                loan: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                            },
                        },
                    },
                },
            },
        });

        logger.info({ count: upcomingPayments.length }, '[PaymentReminder] Found upcoming payments');

        // Send reminders
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

        return {
            processed: upcomingPayments.length,
            date: threeDaysFromNow,
        };
    }

    /**
     * Send alerts for overdue payments
     */
    async sendOverduePaymentAlerts() {
        logger.info('[PaymentReminder] Checking overdue payments...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get overdue unpaid schedules
        const overduePayments = await prisma.paymentSchedule.findMany({
            where: {
                status: 'UNPAID',
                paymentDate: {
                    lt: today,
                },
                loan: {
                    status: {
                        in: ['ACTIVE', 'DISBURSED'],
                    },
                },
            },
            include: {
                loan: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                            },
                        },
                    },
                },
            },
        });

        logger.info({ count: overduePayments.length }, '[PaymentReminder] Found overdue payments');

        // Send overdue alerts
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

        return {
            processed: overduePayments.length,
            date: today,
        };
    }

    /**
     * Send NPL alerts for loans overdue > 90 days
     */
    async sendNPLAlerts() {
        logger.info('[PaymentReminder] Checking NPL loans...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Get loans with payments overdue > 90 days
        const nplLoans = await prisma.loan.findMany({
            where: {
                status: {
                    in: ['ACTIVE', 'DISBURSED', 'NPL'],
                },
                OR: [
                    // Loans already marked as NPL
                    { status: 'NPL' },
                    // Loans with overdue days >= 90
                    { overdueDays: { gte: 90 } },
                ],
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                    },
                },
            },
        });

        logger.info({ count: nplLoans.length }, '[PaymentReminder] Found NPL loans');

        // Send NPL alerts
        for (const loan of nplLoans) {
            try {
                await notificationHelper.sendNPLAlert({
                    loanId: loan.id,
                    branchId: loan.branchId,
                    customerName: loan.customer.businessName,
                    daysOverdue: loan.overdueDays || 90,
                    outstandingAmount: Number(loan.outstandingBalance),
                });

                // Update loan status to NPL if not already
                if (loan.status !== 'NPL') {
                    await prisma.loan.update({
                        where: { id: loan.id },
                        data: { status: 'NPL' },
                    });
                }
            } catch (error) {
                logger.error({ loanId: loan.id, error }, '[PaymentReminder] Failed to send NPL alert');
            }
        }

        return {
            processed: nplLoans.length,
            date: today,
        };
    }

    /**
     * Run all payment reminder jobs
     */
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

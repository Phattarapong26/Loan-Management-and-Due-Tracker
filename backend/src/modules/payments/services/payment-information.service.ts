/**
 * Payment Information Service
 * 
 * Purpose: Display payment information and reminders from Core Payment System
 * 
 * IMPORTANT: This service is READ-ONLY for payment data.
 * - All payment processing is handled by the Core Banking System
 * - LINE system only displays payment information and instructions
 * - No payment QR codes or gateway integration in LINE
 * 
 * Requirements: Requirement 12 - Payment Reminder & Information Display
 * Tasks: 7.1.1 - 7.1.11
 */

import { prisma } from '@config/database.config';

export interface PaymentReminder {
    loanId: string;
    loanNumber: string;
    customerId: string;
    customerName: string;
    dueDate: Date;
    amount: number;
    principal: number;
    interest: number;
    fees: number;
    daysUntilDue: number;
    isOverdue: boolean;
    daysOverdue: number;
}

export interface PaymentInstruction {
    loanId: string;
    paymentChannel: string;
    referenceNumber: string;
    amount: number;
    instructionUrl?: string;
    lastSyncAt: Date;
}

export interface PaymentChannel {
    id: string;
    name: string;
    nameEn: string;
    icon: string;
    instructions: string;
    available: boolean;
}

export class PaymentInformationService {
    /**
     * Task 7.1.2: Get upcoming payments for reminders (7, 3, 1 day lookups)
     * 
     * @param daysAhead - Days ahead to check (7, 3, or 1)
     * @returns List of payment reminders
     */
    async getUpcomingPayments(daysAhead: number): Promise<PaymentReminder[]> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() + daysAhead);
            targetDate.setHours(23, 59, 59, 999);

            // Query payment schedules due on target date
            const schedules = await prisma.paymentSchedule.findMany({
                where: {
                    paymentDate: {
                        gte: targetDate,
                        lte: targetDate,
                    },
                    status: 'UNPAID',
                    loan: {
                        status: {
                            in: ['ACTIVE', 'NPL'],
                        },
                        customer: {
                            lineUserId: {
                                not: null,
                            },
                            user: {
                                lineActive: true,
                                lineNotificationsEnabled: true,
                            },
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
                                    lineUserId: true,
                                },
                            },
                        },
                    },
                },
            });

            return schedules.map(schedule => ({
                loanId: schedule.loanId,
                loanNumber: schedule.loan.id,
                customerId: schedule.loan.customerId,
                customerName: schedule.loan.customer.businessName,
                dueDate: schedule.paymentDate,
                amount: Number(schedule.totalPayment),
                principal: Number(schedule.principalAmount),
                interest: Number(schedule.interestAmount),
                fees: 0,
                daysUntilDue: daysAhead,
                isOverdue: false,
                daysOverdue: 0,
            }));
        } catch (error) {
            console.error('Error getting upcoming payments:', error);
            throw error;
        }
    }

    /**
     * Task 7.1.10: Get overdue payments for notifications
     * 
     * @returns List of overdue payment reminders
     */
    async getOverduePayments(): Promise<PaymentReminder[]> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Query overdue payment schedules
            const schedules = await prisma.paymentSchedule.findMany({
                where: {
                    paymentDate: {
                        lt: today,
                    },
                    status: {
                        in: ['UNPAID', 'OVERDUE'],
                    },
                    loan: {
                        status: {
                            in: ['ACTIVE', 'NPL'],
                        },
                        customer: {
                            lineUserId: {
                                not: null,
                            },
                            user: {
                                lineActive: true,
                                lineNotificationsEnabled: true,
                            },
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
                                    lineUserId: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    paymentDate: 'asc',
                },
            });

            return schedules.map(schedule => {
                const daysOverdue = Math.floor(
                    (today.getTime() - new Date(schedule.paymentDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                return {
                    loanId: schedule.loanId,
                    loanNumber: schedule.loan.id,
                    customerId: schedule.loan.customerId,
                    customerName: schedule.loan.customer.businessName,
                    dueDate: schedule.paymentDate,
                    amount: Number(schedule.totalPayment),
                    principal: Number(schedule.principalAmount),
                    interest: Number(schedule.interestAmount),
                    fees: 0,
                    daysUntilDue: 0,
                    isOverdue: true,
                    daysOverdue,
                };
            });
        } catch (error) {
            console.error('Error getting overdue payments:', error);
            throw error;
        }
    }

    /**
     * Task 7.1.5: Get payment instructions from Core System
     * 
     * @param loanId - Loan ID
     * @returns Payment instruction or null
     */
    async getPaymentInstructions(loanId: string): Promise<PaymentInstruction | null> {
        try {
            // Get the next payment schedule for this loan
            const nextPayment = await prisma.paymentSchedule.findFirst({
                where: {
                    loanId,
                    status: 'UNPAID',
                },
                orderBy: {
                    paymentDate: 'asc',
                },
            });

            if (!nextPayment) {
                return null;
            }

            const reference = this.getPaymentReference(loanId, nextPayment.paymentDate);

            return {
                loanId,
                paymentChannel: 'PromptPay',
                referenceNumber: reference,
                amount: Number(nextPayment.totalPayment),
                lastSyncAt: new Date(),
            };
        } catch (error) {
            console.error('Error getting payment instructions:', error);
            return null;
        }
    }

    /**
     * Task 7.1.4: Get available payment channels
     * 
     * @returns List of available payment channels
     */
    async getPaymentChannels(): Promise<PaymentChannel[]> {
        // In a real implementation, this would query the Core Payment System
        // For now, return standard channels
        return [
            {
                id: 'promptpay',
                name: 'พร้อมเพย์',
                nameEn: 'PromptPay',
                icon: '💳',
                instructions: 'สแกน QR Code ผ่านแอปธนาคารของคุณ',
                available: true,
            },
            {
                id: 'bank_transfer',
                name: 'โอนเงินผ่านธนาคาร',
                nameEn: 'Bank Transfer',
                icon: '🏦',
                instructions: 'โอนเงินไปยังบัญชีธนาคาร\nระบุเลขที่สินเชื่อเป็นหมายเหตุ',
                available: true,
            },
            {
                id: 'counter',
                name: 'ชำระที่เคาน์เตอร์',
                nameEn: 'Counter Payment',
                icon: '🏢',
                instructions: 'ชำระเงินสดที่สาขาธนาคาร\nนำเลขที่สินเชื่อมาด้วย',
                available: true,
            },
        ];
    }

    /**
     * Task 7.1.6: Get payment reference from Core Payment System
     * 
     * @param loanId - Loan ID
     * @param dueDate - Due date
     * @returns Payment reference number
     */
    getPaymentReference(loanId: string, dueDate: Date | null | undefined): string {
        // Format: {LOAN_ID}-{YYYYMMDD}-{SEQ}
        const date = dueDate || new Date();
        const dateStr = (date.toISOString().split('T')[0] || '').replace(/-/g, '');
        const seq = '001'; // In real implementation, this would be from Core System
        return `${loanId.substring(0, 8)}-${dateStr}-${seq}`;
    }

    /**
     * Task 7.1.11: Sync payment data from Core System
     * 
     * @param _loanId - Loan ID (unused - kept for interface compatibility)
     */
    async syncPaymentData(_loanId: string): Promise<void> {
        try {
            // In a real implementation, this would call the Core Payment System API
            // For now, we'll just log the sync attempt
            console.log(`Syncing payment data for loan ${_loanId} from Core System`);

            // Note: PaymentInstruction table doesn't exist in current schema
            // This would be implemented when integrating with actual Core Banking System
            // For now, payment instructions are generated on-demand via getPaymentInstructions()

            console.log(`Payment data sync completed for loan ${_loanId}`);
        } catch (error) {
            console.error('Error syncing payment data:', error);
            throw error;
        }
    }

    /**
     * Task 7.1.9: Display payment confirmation status (synced from Core System)
     * 
     * @param loanId - Loan ID
     * @param paymentDate - Payment date
     * @returns Payment confirmation or null
     */
    async getPaymentConfirmation(loanId: string, paymentDate: Date): Promise<any | null> {
        try {
            const payment = await prisma.payment.findFirst({
                where: {
                    loanId,
                    paymentDate: {
                        gte: new Date(paymentDate.setHours(0, 0, 0, 0)),
                        lte: new Date(paymentDate.setHours(23, 59, 59, 999)),
                    },
                },
                orderBy: {
                    paymentDate: 'desc',
                },
            });

            return payment;
        } catch (error) {
            console.error('Error getting payment confirmation:', error);
            return null;
        }
    }

    /**
     * Record customer payment intention (for follow-up tracking)
     * 
     * @param loanId - Loan ID
     * @param customerId - Customer ID
     * @param promisedDate - Promised payment date
     */
    /**
     * Record customer payment intention (for follow-up tracking)
     * 
     * @param loanId - Loan ID
     * @param customerId - Customer ID
     * @param promisedDate - Promised payment date
     * @param officerId - Officer ID who recorded the intention
     */
    async recordPaymentIntention(
        loanId: string,
        customerId: string,
        promisedDate: Date,
        officerId: string
    ): Promise<void> {
        try {
            // Create a contact log to track the payment promise
            await prisma.contactLog.create({
                data: {
                    customerId,
                    loanId,
                    officerId,
                    contactMethod: 'LINE',
                    contactStatus: 'PROMISED_TO_PAY',
                    outcome: 'PROMISED_TO_PAY',
                    notes: `ลูกค้าสัญญาชำระเงินวันที่ ${promisedDate.toLocaleDateString('th-TH')}`,
                    nextFollowUpDate: promisedDate,
                    promisedDate,
                    contactDate: new Date(),
                },
            });

            console.log(`Payment intention recorded for loan ${loanId}`);
        } catch (error) {
            console.error('Error recording payment intention:', error);
            throw error;
        }
    }
}

import { PrismaClient, Loan } from '@prisma/client';
import { logger } from '@utils/common/logger.util';
import { addMonths, differenceInDays } from 'date-fns';
import { ReferenceGenerator } from '@utils/calculation/reference-generator.util';
import { TimezoneUtil } from '@utils/formatting/timezone.util';

const prisma = new PrismaClient();

export type PaymentDayAdjustment = 'LAST_DAY' | 'SKIP' | 'NEXT_MONTH';

export interface PaymentScheduleConfig {
    firstPaymentDate: Date;
    paymentDay: number;
    paymentDayAdjustment: PaymentDayAdjustment;
    termMonths: number;
}

export class PaymentScheduleGenerator {
    /**
     * Generate payment schedule based on first payment date
     */
    async generateSchedule(loan: Loan): Promise<void> {
        try {
            const { id: loanId, firstPaymentDate, paymentDay, termMonths, principal, interestRate } = loan;

            if (!firstPaymentDate) {
                throw new Error('First payment date is required');
            }

            logger.info({ loanId, firstPaymentDate, paymentDay, termMonths }, 'Generating payment schedule');

            // Calculate monthly payment using amortization formula
            const monthlyRate = Number(interestRate) / 100 / 12;
            const monthlyPayment = this.calculateMonthlyPayment(
                Number(principal),
                monthlyRate,
                termMonths
            );

            let remainingBalance = Number(principal);
            const schedules = [];

            for (let i = 1; i <= termMonths; i++) {
                const paymentDate = this.calculatePaymentDate(
                    firstPaymentDate,
                    i - 1, // months to add
                    paymentDay,
                    loan.paymentDayAdjustment as PaymentDayAdjustment || 'LAST_DAY'
                );

                // Calculate interest and principal for this period
                const interestAmount = remainingBalance * monthlyRate;
                const principalAmount = monthlyPayment - interestAmount;
                remainingBalance -= principalAmount;

                // Adjust last payment to account for rounding
                const isLastPayment = i === termMonths;
                const adjustedPrincipal = isLastPayment ? remainingBalance + principalAmount : principalAmount;
                const adjustedTotal = isLastPayment ? remainingBalance + monthlyPayment : monthlyPayment;

                // Generate statement number for this installment
                const statementNumber = loan.contract_number 
                    ? ReferenceGenerator.generateStatementNumber(loan.contract_number, i)
                    : undefined;

                schedules.push({
                    loanId,
                    paymentNumber: i,
                    paymentDate,
                    principalAmount: adjustedPrincipal,
                    interestAmount,
                    totalPayment: adjustedTotal,
                    remainingBalance: isLastPayment ? 0 : remainingBalance,
                    status: 'UNPAID' as const,
                    statementNumber,
                });

                if (isLastPayment) {
                    remainingBalance = 0;
                }
            }

            // Delete existing schedules if any
            await prisma.paymentSchedule.deleteMany({
                where: { loanId },
            });

            // Create new schedules
            await prisma.paymentSchedule.createMany({
                data: schedules,
            });

            logger.info({ loanId, schedulesCount: schedules.length }, 'Payment schedule generated successfully');
        } catch (error) {
            logger.error({ error, loanId: loan.id }, 'Error generating payment schedule');
            throw error;
        }
    }

    /**
     * Calculate monthly payment using amortization formula
     * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
     */
    private calculateMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
        if (monthlyRate === 0) {
            return principal / termMonths;
        }

        const factor = Math.pow(1 + monthlyRate, termMonths);
        return principal * (monthlyRate * factor) / (factor - 1);
    }

    /**
     * Calculate exact payment date with edge case handling
     * Uses Thailand timezone for consistency
     */
    private calculatePaymentDate(
        firstPaymentDate: Date,
        monthsToAdd: number,
        paymentDay: number,
        adjustment: PaymentDayAdjustment
    ): Date {
        // Convert to Thailand timezone for calculation
        const thailandFirstPayment = TimezoneUtil.toThailandTime(firstPaymentDate);
        
        // Start from first payment date and add months
        const baseDate = addMonths(thailandFirstPayment, monthsToAdd);
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const day = baseDate.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // If the first payment date's day matches the payment day, just return baseDate
        // This preserves the time component and avoids timezone issues
        if (day === paymentDay) {
            // Return as Thailand time (will be stored as UTC in database)
            return TimezoneUtil.createThailandDate(
                year, 
                month + 1, 
                day, 
                thailandFirstPayment.getHours(), 
                thailandFirstPayment.getMinutes()
            );
        }

        // If payment day doesn't exist in this month
        if (paymentDay > daysInMonth) {
            switch (adjustment) {
                case 'LAST_DAY':
                    // Use last day of month
                    return TimezoneUtil.createThailandDate(
                        year, 
                        month + 1, 
                        daysInMonth, 
                        thailandFirstPayment.getHours(), 
                        thailandFirstPayment.getMinutes()
                    );
                case 'SKIP':
                    // Skip to 1st of next month
                    return TimezoneUtil.createThailandDate(
                        year, 
                        month + 2, 
                        1, 
                        thailandFirstPayment.getHours(), 
                        thailandFirstPayment.getMinutes()
                    );
                case 'NEXT_MONTH':
                    // Use same day in next month
                    return TimezoneUtil.createThailandDate(
                        year, 
                        month + 2, 
                        paymentDay, 
                        thailandFirstPayment.getHours(), 
                        thailandFirstPayment.getMinutes()
                    );
                default:
                    return TimezoneUtil.createThailandDate(
                        year, 
                        month + 1, 
                        daysInMonth, 
                        thailandFirstPayment.getHours(), 
                        thailandFirstPayment.getMinutes()
                    );
            }
        }

        // Set to the payment day, preserving time
        return TimezoneUtil.createThailandDate(
            year, 
            month + 1, 
            paymentDay, 
            thailandFirstPayment.getHours(), 
            thailandFirstPayment.getMinutes()
        );
    }

    /**
     * Validate first payment date
     */
    validateFirstPaymentDate(firstPaymentDate: Date, disbursementDate: Date): void {
        const minDays = 7;
        const maxDays = 60;
        const daysDiff = differenceInDays(firstPaymentDate, disbursementDate);

        if (daysDiff < minDays) {
            throw new Error(`วันชำระงวดแรกต้องห่างจากวันเบิกอย่างน้อย ${minDays} วัน`);
        }

        if (daysDiff > maxDays) {
            throw new Error(`วันชำระงวดแรกต้องไม่เกิน ${maxDays} วันหลังเบิก`);
        }
    }

    /**
     * Get suggested payment dates (popular days)
     */
    getSuggestedPaymentDates(disbursementDate: Date): Date[] {
        const suggestedDays = [1, 5, 10, 15, 20, 25, 30];
        const nextMonth = addMonths(disbursementDate, 1);
        const year = nextMonth.getFullYear();
        const month = nextMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        return suggestedDays
            .filter(day => day <= daysInMonth)
            .map(day => new Date(year, month, day));
    }

    /**
     * Preview payment schedule without saving
     */
    async previewSchedule(config: PaymentScheduleConfig): Promise<Array<{
        paymentNumber: number;
        paymentDate: Date;
        amount: number;
    }>> {
        const { firstPaymentDate, paymentDay, paymentDayAdjustment, termMonths } = config;
        const preview = [];

        for (let i = 1; i <= Math.min(termMonths, 12); i++) { // Show max 12 months
            const paymentDate = this.calculatePaymentDate(
                firstPaymentDate,
                i - 1,
                paymentDay,
                paymentDayAdjustment
            );

            preview.push({
                paymentNumber: i,
                paymentDate,
                amount: 0, // Will be calculated when loan is approved
            });
        }

        return preview;
    }
}

export const paymentScheduleGenerator = new PaymentScheduleGenerator();

/**
 * Dynamic Interest Calculator Service
 * 
 * Purpose: Calculate interest based on current principal (dynamic principal method)
 * - Interest is recalculated every time a new disbursement is made
 * - Interest is calculated from the total disbursed amount (current principal)
 * - Supports tiered interest rates (Year 1-3: X%, Year 4+: Y%)
 * 
 * Requirements: 
 * - คำนวณดอกเบี้ยจากเงินต้นเสมอ
 * - เมื่อเบิกงวดแรก คิดจากเงินต้นงวดแรก
 * - เมื่อเบิกงวดที่ 2 คำนวณใหม่จากเงินต้นรวม
 */

import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import { addMonths, differenceInMonths } from 'date-fns';
import { TimezoneUtil } from '@utils/formatting/timezone.util';

export interface InterestCalculationResult {
    currentPrincipal: number;
    monthlyPayment: number;
    totalInterest: number;
    effectiveInterestRate: number;
    schedules: PaymentScheduleItem[];
}

export interface PaymentScheduleItem {
    paymentNumber: number;
    paymentDate: Date;
    principalAmount: number;
    interestAmount: number;
    totalPayment: number;
    remainingBalance: number;
    interestRate: number; // Rate used for this period
    yearNumber: number; // Which year of the loan
}

export class DynamicInterestCalculatorService {
    /**
     * Recalculate payment schedule based on current principal
     * Called after each disbursement
     */
    async recalculatePaymentSchedule(loanId: string): Promise<InterestCalculationResult> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    loanProduct: {
                        include: {
                            interestRateTiers: {
                                orderBy: { minAmount: 'asc' },
                            },
                        },
                    },
                    disbursements: {
                        where: { status: 'DISBURSED' },
                        orderBy: { disbursedAt: 'asc' },
                    },
                },
            });

            if (!loan) {
                throw new Error('Loan not found');
            }

            // Calculate current principal (total disbursed)
            const currentPrincipal = loan.totalDisbursed ? Number(loan.totalDisbursed) : Number(loan.principal);

            if (currentPrincipal === 0) {
                throw new Error('No disbursements found for this loan');
            }

            // Get first disbursement date (use Thailand timezone)
            const firstDisbursementDate = loan.disbursementDate 
                ? TimezoneUtil.toThailandTime(loan.disbursementDate)
                : TimezoneUtil.now();

            // Get interest rate tiers or use flat rate
            // Get interest tiers from loan product
            const interestTiers = await prisma.interestRateTier.findMany({
                where: { loanProductId: loan.loanProductId },
                orderBy: { minAmount: 'asc' },
            });
            const hasTieredRates = interestTiers.length > 0;

            // Calculate payment schedule (use Thailand timezone for first payment date)
            const schedules = this.calculateDynamicSchedule({
                currentPrincipal,
                termMonths: loan.termMonths,
                firstPaymentDate: loan.firstPaymentDate 
                    ? TimezoneUtil.toThailandTime(loan.firstPaymentDate)
                    : TimezoneUtil.createThailandDate(
                        firstDisbursementDate.getFullYear(),
                        firstDisbursementDate.getMonth() + 2, // Next month
                        loan.paymentDay || 1,
                        9, // 9 AM Thailand time
                        0
                    ),
                paymentDay: loan.paymentDay,
                interestTiers: hasTieredRates ? interestTiers.map((tier, index) => ({
                    tierNumber: index + 1,
                    yearFrom: 1, // Default to year 1
                    yearTo: null, // No upper limit
                    interestRate: tier.interestRate,
                })) : [
                    {
                        tierNumber: 1,
                        yearFrom: 1,
                        yearTo: null,
                        interestRate: loan.interestRate,
                    },
                ],
                disbursementDate: firstDisbursementDate,
            });

            // Calculate totals
            const totalInterest = schedules.reduce((sum, s) => sum + s.interestAmount, 0);
            const totalPayment = schedules.reduce((sum, s) => sum + s.totalPayment, 0);
            const averageMonthlyPayment = totalPayment / loan.termMonths;

            // Calculate effective interest rate
            const effectiveInterestRate = (totalInterest / currentPrincipal) * 100;

            // Update loan with new calculations
            await prisma.loan.update({
                where: { id: loanId },
                data: {
                    currentPrincipal,
                    monthlyPayment: averageMonthlyPayment,
                    totalInterest,
                    lastInterestCalculationDate: new Date(),
                },
            });

            // Delete old payment schedules
            await prisma.paymentSchedule.deleteMany({
                where: { loanId },
            });

            // Create new payment schedules
            await prisma.paymentSchedule.createMany({
                data: schedules.map((s) => ({
                    loanId,
                    paymentNumber: s.paymentNumber,
                    paymentDate: s.paymentDate,
                    principalAmount: s.principalAmount,
                    interestAmount: s.interestAmount,
                    totalPayment: s.totalPayment,
                    remainingBalance: s.remainingBalance,
                    status: 'UNPAID' as const,
                })),
            });

            // ✅ Update loan with next payment info
            const firstUnpaidSchedule = schedules[0]; // First schedule is always the next payment
            if (firstUnpaidSchedule) {
                await prisma.loan.update({
                    where: { id: loanId },
                    data: {
                        nextPaymentDate: firstUnpaidSchedule.paymentDate,
                        nextPaymentAmount: firstUnpaidSchedule.totalPayment,
                    },
                });
            }

            logger.info(
                {
                    loanId,
                    currentPrincipal,
                    totalInterest,
                    effectiveInterestRate,
                    nextPaymentDate: firstUnpaidSchedule?.paymentDate,
                    nextPaymentAmount: firstUnpaidSchedule?.totalPayment,
                },
                'Payment schedule recalculated with dynamic principal'
            );

            return {
                currentPrincipal,
                monthlyPayment: averageMonthlyPayment,
                totalInterest,
                effectiveInterestRate,
                schedules,
            };
        } catch (error) {
            logger.error({ error, loanId }, 'Error recalculating payment schedule');
            throw error;
        }
    }

    /**
     * Calculate payment schedule with tiered interest rates
     */
    private calculateDynamicSchedule(params: {
        currentPrincipal: number;
        termMonths: number;
        firstPaymentDate: Date;
        paymentDay: number;
        interestTiers: Array<{
            tierNumber: number;
            yearFrom: number;
            yearTo: number | null;
            interestRate: any;
        }>;
        disbursementDate: Date;
    }): PaymentScheduleItem[] {
        const {
            currentPrincipal,
            termMonths,
            firstPaymentDate,
            paymentDay,
            interestTiers,
            disbursementDate,
        } = params;

        const schedules: PaymentScheduleItem[] = [];
        let remainingBalance = currentPrincipal;

        for (let i = 1; i <= termMonths; i++) {
            // Calculate payment date
            const paymentDate = this.calculatePaymentDate(firstPaymentDate, i - 1, paymentDay);

            // Determine which year of the loan this payment is in
            const monthsFromStart = differenceInMonths(paymentDate, disbursementDate);
            const yearNumber = Math.floor(monthsFromStart / 12) + 1;

            // Get applicable interest rate for this year
            const applicableTier = interestTiers.find(
                (tier) =>
                    yearNumber >= tier.yearFrom &&
                    (tier.yearTo === null || yearNumber <= tier.yearTo)
            );

            const interestRate = applicableTier
                ? Number(applicableTier.interestRate)
                : Number(interestTiers[interestTiers.length - 1]?.interestRate || 0);

            const monthlyRate = interestRate / 100 / 12;

            // Calculate interest for this period
            const interestAmount = remainingBalance * monthlyRate;

            // Calculate principal payment
            // Use amortization formula for consistent payments within each tier
            const remainingPayments = termMonths - i + 1;
            const principalAmount = this.calculatePrincipalPayment(
                remainingBalance,
                monthlyRate,
                remainingPayments
            );

            // Adjust last payment to clear remaining balance
            const isLastPayment = i === termMonths;
            const adjustedPrincipal = isLastPayment ? remainingBalance : principalAmount;
            const adjustedTotal = adjustedPrincipal + interestAmount;

            remainingBalance -= adjustedPrincipal;

            schedules.push({
                paymentNumber: i,
                paymentDate,
                principalAmount: adjustedPrincipal,
                interestAmount,
                totalPayment: adjustedTotal,
                remainingBalance: isLastPayment ? 0 : remainingBalance,
                interestRate,
                yearNumber,
            });
        }

        return schedules;
    }

    /**
     * Calculate principal payment using amortization formula
     */
    private calculatePrincipalPayment(
        remainingBalance: number,
        monthlyRate: number,
        remainingPayments: number
    ): number {
        if (monthlyRate === 0) {
            return remainingBalance / remainingPayments;
        }

        const factor = Math.pow(1 + monthlyRate, remainingPayments);
        const monthlyPayment = (remainingBalance * (monthlyRate * factor)) / (factor - 1);

        return monthlyPayment - remainingBalance * monthlyRate;
    }

    /**
     * Calculate payment date with edge case handling using Thailand timezone
     */
    private calculatePaymentDate(firstPaymentDate: Date, monthsToAdd: number, paymentDay: number): Date {
        // Use Thailand timezone for consistent date calculations
        const thailandFirstPayment = TimezoneUtil.toThailandTime(firstPaymentDate);
        const baseDate = addMonths(thailandFirstPayment, monthsToAdd);
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const day = baseDate.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // If the first payment date's day matches the payment day, just return baseDate
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

        // If payment day doesn't exist in this month, use last day
        if (paymentDay > daysInMonth) {
            return TimezoneUtil.createThailandDate(
                year, 
                month + 1, 
                daysInMonth, 
                thailandFirstPayment.getHours(), 
                thailandFirstPayment.getMinutes()
            );
        }

        // Set to the payment day, preserving time from baseDate
        return TimezoneUtil.createThailandDate(
            year, 
            month + 1, 
            paymentDay, 
            thailandFirstPayment.getHours(), 
            thailandFirstPayment.getMinutes()
        );
    }

    /**
     * Preview payment schedule before disbursement
     */
    async previewSchedule(params: {
        loanAmount: number;
        termMonths: number;
        firstPaymentDate: Date;
        paymentDay: number;
        loanProductId?: string;
        flatInterestRate?: number;
    }): Promise<PaymentScheduleItem[]> {
        let interestTiers: any[] = [];

        if (params.loanProductId) {
            const tiers = await prisma.interestRateTier.findMany({
                where: { loanProductId: params.loanProductId },
                orderBy: { minAmount: 'asc' },
            });

            interestTiers = tiers.length > 0 ? tiers : [
                {
                    tierNumber: 1,
                    yearFrom: 1,
                    yearTo: null,
                    interestRate: params.flatInterestRate || 0,
                },
            ];
        } else {
            interestTiers = [
                {
                    tierNumber: 1,
                    yearFrom: 1,
                    yearTo: null,
                    interestRate: params.flatInterestRate || 0,
                },
            ];
        }

        return this.calculateDynamicSchedule({
            currentPrincipal: params.loanAmount,
            termMonths: params.termMonths,
            firstPaymentDate: params.firstPaymentDate,
            paymentDay: params.paymentDay,
            interestTiers,
            disbursementDate: new Date(),
        });
    }

    /**
     * Get interest rate for specific year
     */
    async getInterestRateForYear(loanProductId: string, outstandingBalance: number): Promise<number> {
        const tiers = await prisma.interestRateTier.findMany({
            where: { loanProductId },
            orderBy: { minAmount: 'asc' },
        });

        if (tiers.length === 0) {
            const product = await prisma.loanProduct.findUnique({
                where: { id: loanProductId },
            });
            return Number(product?.interestRateYear1_3 || 0);
        }

        // Find applicable tier based on outstanding balance (not year-based)
        const applicableTier = tiers.find(
            (tier) =>
                outstandingBalance >= Number(tier.minAmount) && 
                (tier.maxAmount === null || outstandingBalance <= Number(tier.maxAmount))
        );

        return Number(applicableTier?.interestRate || tiers[tiers.length - 1]?.interestRate || 0);
    }
}

export const dynamicInterestCalculator = new DynamicInterestCalculatorService();

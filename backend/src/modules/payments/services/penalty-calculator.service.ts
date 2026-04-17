/**
 * Penalty Calculator Service
 * 
 * Purpose: Calculate penalties for late payments with dynamic rules
 * - Supports percentage-based penalties
 * - Supports fixed amount penalties
 * - Supports compound interest on overdue amounts
 * - Rules can be configured per loan product or globally
 * 
 * Requirements:
 * - ค่าปรับแบบ Dynamic ที่กำหนดได้ในระบบ
 * - คำนวณเป็นเปอร์เซ็นต์ของยอดค้างชำระหรือเป็นจำนวนเงินคงที่
 * - มีระบบคำนวณดอกเบี้ยทบต้นสำหรับยอดค้างชำระ
 */

import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import { differenceInDays } from 'date-fns';

export interface PenaltyCalculationResult {
    daysOverdue: number;
    penaltyAmount: number;
    compoundInterestAmount: number;
    totalPenalty: number;
    appliedRule: {
        ruleName: string;
        penaltyType: string;
        penaltyRate?: number;
        penaltyAmount?: number;
        compoundRate?: number;
    } | null;
}

export class PenaltyCalculatorService {
    /**
     * Calculate penalty for a payment schedule
     */
    async calculatePenalty(
        paymentScheduleId: string,
        currentDate: Date = new Date()
    ): Promise<PenaltyCalculationResult> {
        try {
            const schedule = await prisma.paymentSchedule.findUnique({
                where: { id: paymentScheduleId },
                include: {
                    loan: {
                        include: {
                            loanProduct: true,
                        },
                    },
                },
            });

            if (!schedule) {
                throw new Error('Payment schedule not found');
            }

            // Check if payment is overdue
            const daysOverdue = differenceInDays(currentDate, schedule.paymentDate);

            if (daysOverdue <= 0) {
                return {
                    daysOverdue: 0,
                    penaltyAmount: 0,
                    compoundInterestAmount: 0,
                    totalPenalty: 0,
                    appliedRule: null,
                };
            }

            // Get applicable penalty rule
            const rule = await this.getApplicablePenaltyRule(
                daysOverdue,
                schedule.loan.loanProductId
            );

            if (!rule) {
                logger.warn(
                    { paymentScheduleId, daysOverdue },
                    'No penalty rule found for overdue payment'
                );
                return {
                    daysOverdue,
                    penaltyAmount: 0,
                    compoundInterestAmount: 0,
                    totalPenalty: 0,
                    appliedRule: null,
                };
            }

            // Calculate penalty based on rule type
            const outstandingAmount = Number(schedule.totalPayment);
            let penaltyAmount = 0;
            let compoundInterestAmount = 0;

            switch (rule.penaltyType) {
                case 'DAILY':
                    // Daily rate × days overdue × outstanding amount
                    penaltyAmount = outstandingAmount * (Number(rule.penaltyRate || 0) / 100) * daysOverdue;
                    break;

                case 'PERCENTAGE':
                    // One-time percentage of outstanding
                    penaltyAmount = outstandingAmount * (Number(rule.penaltyRate || 0) / 100);
                    break;

                case 'FIXED_AMOUNT':
                    penaltyAmount = Number(rule.penaltyAmount || 0);
                    break;

                case 'BOTH':
                    const percentagePenalty =
                        outstandingAmount * (Number(rule.penaltyRate || 0) / 100);
                    const fixedPenalty = Number(rule.penaltyAmount || 0);
                    penaltyAmount = percentagePenalty + fixedPenalty;
                    break;

                default:
                    logger.warn({ penaltyType: rule.penaltyType }, 'Unknown penalty type — defaulting to 0');
            }

            // Calculate compound interest if applicable
            if (rule.compoundInterest && rule.compoundRate) {
                const dailyCompoundRate = Number(rule.compoundRate) / 100 / 365;
                compoundInterestAmount = outstandingAmount * dailyCompoundRate * daysOverdue;
            }

            const totalPenalty = penaltyAmount + compoundInterestAmount;

            // Update payment schedule with penalty
            await prisma.paymentSchedule.update({
                where: { id: paymentScheduleId },
                data: {
                    daysOverdue,
                    penaltyAmount,
                    compoundInterestAmount,
                    status: 'OVERDUE',
                },
            });

            logger.info(
                {
                    paymentScheduleId,
                    daysOverdue,
                    penaltyAmount,
                    compoundInterestAmount,
                    totalPenalty,
                    ruleName: rule.ruleName,
                },
                'Penalty calculated'
            );

            return {
                daysOverdue,
                penaltyAmount,
                compoundInterestAmount,
                totalPenalty,
                appliedRule: {
                    ruleName: rule.ruleName,
                    penaltyType: rule.penaltyType,
                    penaltyRate: rule.penaltyRate ? Number(rule.penaltyRate) : undefined,
                    penaltyAmount: rule.penaltyAmount ? Number(rule.penaltyAmount) : undefined,
                    compoundRate: rule.compoundRate ? Number(rule.compoundRate) : undefined,
                },
            };
        } catch (error) {
            logger.error({ error, paymentScheduleId }, 'Error calculating penalty');
            throw error;
        }
    }

    /**
     * Get applicable penalty rule based on days overdue and loan product
     */
    private async getApplicablePenaltyRule(
        daysOverdue: number,
        loanProductId: string | null
    ): Promise<any> {
        // First, try to find product-specific rule
        if (loanProductId) {
            const productRule = await prisma.penaltyRule.findFirst({
                where: {
                    loanProductId,
                    status: 'ACTIVE',
                    daysOverdueFrom: { lte: daysOverdue },
                    OR: [{ daysOverdueTo: { gte: daysOverdue } }, { daysOverdueTo: null }],
                },
                orderBy: { daysOverdueFrom: 'desc' },
            });

            if (productRule) {
                return productRule;
            }
        }

        // Fall back to default rule
        const defaultRule = await prisma.penaltyRule.findFirst({
            where: {
                loanProductId: null,
                isDefault: true,
                status: 'ACTIVE',
                daysOverdueFrom: { lte: daysOverdue },
                OR: [{ daysOverdueTo: { gte: daysOverdue } }, { daysOverdueTo: null }],
            },
            orderBy: { daysOverdueFrom: 'desc' },
        });

        return defaultRule;
    }

    /**
     * Calculate penalties for all overdue payments in a loan
     */
    async calculateLoanPenalties(loanId: string): Promise<{
        totalPenalty: number;
        schedules: Array<{
            scheduleId: string;
            paymentNumber: number;
            daysOverdue: number;
            penalty: PenaltyCalculationResult;
        }>;
    }> {
        const schedules = await prisma.paymentSchedule.findMany({
            where: {
                loanId,
                status: { in: ['UNPAID', 'OVERDUE'] },
                paymentDate: { lt: new Date() },
            },
            orderBy: { paymentNumber: 'asc' },
        });

        const results = [];
        let totalPenalty = 0;

        for (const schedule of schedules) {
            const penalty = await this.calculatePenalty(schedule.id);
            totalPenalty += penalty.totalPenalty;

            results.push({
                scheduleId: schedule.id,
                paymentNumber: schedule.paymentNumber,
                daysOverdue: penalty.daysOverdue,
                penalty,
            });
        }

        return {
            totalPenalty,
            schedules: results,
        };
    }

    /**
     * Update all overdue payment schedules (run as scheduled job)
     */
    async updateAllOverdueSchedules(): Promise<{
        updated: number;
        totalPenalty: number;
    }> {
        try {
            const overdueSchedules = await prisma.paymentSchedule.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    paymentDate: { lt: new Date() },
                },
            });

            let updated = 0;
            let totalPenalty = 0;

            for (const schedule of overdueSchedules) {
                try {
                    const penalty = await this.calculatePenalty(schedule.id);
                    totalPenalty += penalty.totalPenalty;
                    updated++;
                } catch (error) {
                    logger.error(
                        { error, scheduleId: schedule.id },
                        'Error updating overdue schedule'
                    );
                }
            }

            logger.info(
                { updated, totalPenalty },
                'Updated all overdue payment schedules'
            );

            return { updated, totalPenalty };
        } catch (error) {
            logger.error({ error }, 'Error updating overdue schedules');
            throw error;
        }
    }

    /**
     * Get penalty summary for a loan
     */
    async getLoanPenaltySummary(loanId: string): Promise<{
        totalPenaltyAmount: number;
        totalCompoundInterest: number;
        totalOverdue: number;
        overdueSchedules: number;
        oldestOverdueDays: number;
    }> {
        const schedules = await prisma.paymentSchedule.findMany({
            where: {
                loanId,
                status: { in: ['OVERDUE', 'PARTIAL'] },
            },
        });

        const totalPenaltyAmount = schedules.reduce(
            (sum, s) => sum + Number(s.penaltyAmount || 0),
            0
        );
        const totalCompoundInterest = schedules.reduce(
            (sum, s) => sum + Number(s.compoundInterestAmount || 0),
            0
        );
        const totalOverdue = totalPenaltyAmount + totalCompoundInterest;
        const overdueSchedules = schedules.length;
        const oldestOverdueDays = Math.max(...schedules.map((s) => s.daysOverdue), 0);

        return {
            totalPenaltyAmount,
            totalCompoundInterest,
            totalOverdue,
            overdueSchedules,
            oldestOverdueDays,
        };
    }
}

export const penaltyCalculator = new PenaltyCalculatorService();

import { PenaltyRuleRepository } from '../repositories/penalty-rule.repository';
import { logger } from '@utils/common/logger.util';

export interface PenaltyRateResult {
    penaltyRate: number;
    maxAnnualRate: number;
    ruleName: string;
    penaltyType: string;
    compoundInterest: boolean;
    compoundRate?: number;
}

export class DynamicPenaltyService {
    private penaltyRuleRepository: PenaltyRuleRepository;

    constructor() {
        this.penaltyRuleRepository = new PenaltyRuleRepository();
    }

    async getPenaltyRateForLoan(loanId: string, overdueDays: number): Promise<PenaltyRateResult> {
        try {
            const loan = await this.penaltyRuleRepository.findLoanWithPenaltyRules(loanId, overdueDays);

            if (!loan) throw new Error(`Loan ${loanId} not found`);

            let penaltyRule = loan.loanProduct?.penaltyRules?.[0] || null;

            if (!penaltyRule) {
                penaltyRule = await this.penaltyRuleRepository.findDefault(overdueDays);
            }

            if (!penaltyRule) {
                logger.warn({ loanId, overdueDays }, 'No penalty rule found, using system default');
                return this.getSystemDefaultPenalty();
            }

            let dailyRate: number;
            switch (penaltyRule.penaltyType) {
                case 'DAILY': dailyRate = Number(penaltyRule.penaltyRate || 0); break;
                case 'MONTHLY': dailyRate = Number(penaltyRule.penaltyRate || 0) / 30; break;
                case 'ANNUAL': dailyRate = Number(penaltyRule.penaltyRate || 0) / 365; break;
                default: dailyRate = Number(penaltyRule.penaltyRate || 0);
            }

            dailyRate = Math.min(dailyRate, 18 / 365);

            return {
                penaltyRate: dailyRate,
                maxAnnualRate: 18,
                ruleName: penaltyRule.ruleName,
                penaltyType: penaltyRule.penaltyType,
                compoundInterest: penaltyRule.compoundInterest,
                compoundRate: penaltyRule.compoundRate ? Number(penaltyRule.compoundRate) : undefined,
            };
        } catch (error) {
            logger.error({ error, loanId, overdueDays }, 'Error getting penalty rate for loan');
            return this.getSystemDefaultPenalty();
        }
    }

    async calculatePenaltyForLoan(loanId: string, outstandingBalance: number, overdueDays: number, collectionFee: number = 0) {
        const penaltyDetails = await this.getPenaltyRateForLoan(loanId, overdueDays);
        const basePenalty = outstandingBalance * (penaltyDetails.penaltyRate / 100) * overdueDays;
        const maxPenaltyForDays = (outstandingBalance * (penaltyDetails.maxAnnualRate / 100) / 365) * overdueDays;
        const cappedPenalty = Math.min(basePenalty, maxPenaltyForDays);
        const totalPenalty = cappedPenalty + collectionFee;

        return {
            penaltyAmount: Math.round(totalPenalty * 100) / 100,
            penaltyDetails,
            calculation: {
                dailyRate: penaltyDetails.penaltyRate,
                daysApplied: overdueDays,
                baseAmount: Math.round(basePenalty * 100) / 100,
                cappedAmount: Math.round(cappedPenalty * 100) / 100,
                collectionFee,
                totalAmount: Math.round(totalPenalty * 100) / 100,
            },
        };
    }

    private getSystemDefaultPenalty(): PenaltyRateResult {
        return { penaltyRate: 0.05, maxAnnualRate: 18, ruleName: 'System Default', penaltyType: 'DAILY', compoundInterest: false };
    }

    async createDefaultPenaltyRules(loanProductId: string, createdBy: string): Promise<void> {
        try {
            await this.penaltyRuleRepository.createMany([
                { loanProductId, ruleName: 'Early Overdue (1-30 days)', daysOverdueFrom: 1, daysOverdueTo: 30, penaltyType: 'DAILY', penaltyRate: 0.03, compoundInterest: false, createdBy },
                { loanProductId, ruleName: 'Medium Overdue (31-90 days)', daysOverdueFrom: 31, daysOverdueTo: 90, penaltyType: 'DAILY', penaltyRate: 0.04, compoundInterest: false, createdBy },
                { loanProductId, ruleName: 'Severe Overdue (90+ days)', daysOverdueFrom: 91, daysOverdueTo: null, penaltyType: 'DAILY', penaltyRate: 0.0493, compoundInterest: true, compoundRate: 0.01, createdBy },
            ]);
            logger.info({ loanProductId }, 'Default penalty rules created');
        } catch (error) {
            logger.error({ error, loanProductId }, 'Error creating default penalty rules');
            throw error;
        }
    }

    async getPenaltyRulesForProduct(loanProductId: string): Promise<any[]> {
        return this.penaltyRuleRepository.findByProduct(loanProductId);
    }
}

export const dynamicPenaltyService = new DynamicPenaltyService();
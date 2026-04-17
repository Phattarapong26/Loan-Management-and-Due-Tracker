import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

export interface PenaltyRateResult {
    penaltyRate: number; // Daily rate (percentage)
    maxAnnualRate: number; // Max annual rate (percentage)
    ruleName: string;
    penaltyType: string;
    compoundInterest: boolean;
    compoundRate?: number;
}

/**
 * Dynamic Penalty Service
 * Calculates penalty rates based on loan product configuration
 */
export class DynamicPenaltyService {
    
    /**
     * Get penalty rate for specific loan and overdue days
     */
    async getPenaltyRateForLoan(loanId: string, overdueDays: number): Promise<PenaltyRateResult> {
        try {
            // Get loan with product information
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    loanProduct: {
                        include: {
                            penaltyRules: {
                                where: {
                                    status: 'ACTIVE',
                                    daysOverdueFrom: { lte: overdueDays },
                                    OR: [
                                        { daysOverdueTo: null },
                                        { daysOverdueTo: { gte: overdueDays } }
                                    ]
                                },
                                orderBy: [
                                    { daysOverdueFrom: 'desc' }, // Get the most specific rule
                                    { createdAt: 'desc' }
                                ]
                            }
                        }
                    }
                }
            });

            if (!loan) {
                throw new Error(`Loan ${loanId} not found`);
            }

            // Find applicable penalty rule
            let penaltyRule = loan.loanProduct?.penaltyRules?.[0] || null;

            // If no product-specific rule, get default rule
            if (!penaltyRule) {
                penaltyRule = await prisma.penaltyRule.findFirst({
                    where: {
                        loanProductId: null, // Default rule
                        isDefault: true,
                        status: 'ACTIVE',
                        daysOverdueFrom: { lte: overdueDays },
                        OR: [
                            { daysOverdueTo: null },
                            { daysOverdueTo: { gte: overdueDays } }
                        ]
                    },
                    orderBy: [
                        { daysOverdueFrom: 'desc' },
                        { createdAt: 'desc' }
                    ]
                });
            }

            // If still no rule, use system default
            if (!penaltyRule) {
                logger.warn({ loanId, overdueDays }, 'No penalty rule found, using system default');
                return this.getSystemDefaultPenalty();
            }

            // Convert penalty rate to daily rate
            let dailyRate: number;
            
            switch (penaltyRule.penaltyType) {
                case 'DAILY':
                    dailyRate = Number(penaltyRule.penaltyRate || 0);
                    break;
                case 'MONTHLY':
                    dailyRate = Number(penaltyRule.penaltyRate || 0) / 30;
                    break;
                case 'ANNUAL':
                    dailyRate = Number(penaltyRule.penaltyRate || 0) / 365;
                    break;
                default:
                    // Default to daily
                    dailyRate = Number(penaltyRule.penaltyRate || 0);
            }

            // Apply max cap of 18% per year (0.0493% per day)
            const maxDailyRate = 18 / 365; // 0.0493% per day
            dailyRate = Math.min(dailyRate, maxDailyRate);

            return {
                penaltyRate: dailyRate,
                maxAnnualRate: 18, // Hard cap at 18% per year
                ruleName: penaltyRule.ruleName,
                penaltyType: penaltyRule.penaltyType,
                compoundInterest: penaltyRule.compoundInterest,
                compoundRate: penaltyRule.compoundRate ? Number(penaltyRule.compoundRate) : undefined
            };

        } catch (error) {
            logger.error({ error, loanId, overdueDays }, 'Error getting penalty rate for loan');
            return this.getSystemDefaultPenalty();
        }
    }

    /**
     * Calculate penalty amount for loan
     */
    async calculatePenaltyForLoan(
        loanId: string, 
        outstandingBalance: number, 
        overdueDays: number,
        collectionFee: number = 0
    ): Promise<{
        penaltyAmount: number;
        penaltyDetails: PenaltyRateResult;
        calculation: {
            dailyRate: number;
            daysApplied: number;
            baseAmount: number;
            cappedAmount: number;
            collectionFee: number;
            totalAmount: number;
        };
    }> {
        const penaltyDetails = await this.getPenaltyRateForLoan(loanId, overdueDays);
        
        // Calculate base penalty
        const dailyPenaltyAmount = outstandingBalance * (penaltyDetails.penaltyRate / 100);
        const basePenalty = dailyPenaltyAmount * overdueDays;
        
        // Apply max cap (18% per year)
        const maxAnnualPenalty = outstandingBalance * (penaltyDetails.maxAnnualRate / 100);
        const maxDailyPenalty = maxAnnualPenalty / 365;
        const maxPenaltyForDays = maxDailyPenalty * overdueDays;
        
        // Use the lower of calculated penalty or max cap
        const cappedPenalty = Math.min(basePenalty, maxPenaltyForDays);
        
        // Add collection fee
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
                totalAmount: Math.round(totalPenalty * 100) / 100
            }
        };
    }

    /**
     * Get system default penalty (fallback)
     */
    private getSystemDefaultPenalty(): PenaltyRateResult {
        return {
            penaltyRate: 0.05, // 0.05% per day (18.25% per year, but capped at 18%)
            maxAnnualRate: 18,
            ruleName: 'System Default',
            penaltyType: 'DAILY',
            compoundInterest: false
        };
    }

    /**
     * Create default penalty rules for a loan product
     */
    async createDefaultPenaltyRules(loanProductId: string, createdBy: string): Promise<void> {
        try {
            const defaultRules = [
                {
                    loanProductId,
                    ruleName: 'Early Overdue (1-30 days)',
                    daysOverdueFrom: 1,
                    daysOverdueTo: 30,
                    penaltyType: 'DAILY',
                    penaltyRate: 0.03, // 0.03% per day (10.95% per year)
                    compoundInterest: false,
                    createdBy
                },
                {
                    loanProductId,
                    ruleName: 'Medium Overdue (31-90 days)',
                    daysOverdueFrom: 31,
                    daysOverdueTo: 90,
                    penaltyType: 'DAILY',
                    penaltyRate: 0.04, // 0.04% per day (14.6% per year)
                    compoundInterest: false,
                    createdBy
                },
                {
                    loanProductId,
                    ruleName: 'Severe Overdue (90+ days)',
                    daysOverdueFrom: 91,
                    daysOverdueTo: null, // No upper limit
                    penaltyType: 'DAILY',
                    penaltyRate: 0.0493, // 0.0493% per day (18% per year - max cap)
                    compoundInterest: true,
                    compoundRate: 0.01, // 1% compound monthly
                    createdBy
                }
            ];

            await prisma.penaltyRule.createMany({
                data: defaultRules
            });

            logger.info({ loanProductId }, 'Default penalty rules created for loan product');

        } catch (error) {
            logger.error({ error, loanProductId }, 'Error creating default penalty rules');
            throw error;
        }
    }

    /**
     * Get all penalty rules for a loan product
     */
    async getPenaltyRulesForProduct(loanProductId: string): Promise<any[]> {
        return prisma.penaltyRule.findMany({
            where: {
                loanProductId,
                status: 'ACTIVE'
            },
            orderBy: [
                { daysOverdueFrom: 'asc' }
            ]
        });
    }
}

export const dynamicPenaltyService = new DynamicPenaltyService();
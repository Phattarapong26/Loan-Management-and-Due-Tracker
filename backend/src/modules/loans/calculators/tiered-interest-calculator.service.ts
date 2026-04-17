import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

// Use type assertion to work around TypeScript language server issues
const db = prisma as any;

export interface TieredInterestCalculationResult {
    loanId: string;
    paymentNumber: number;
    outstandingBalance: number;
    appliedTier: {
        tierName: string;
        interestRate: number;
        gracePeriodDays: number;
        minAmount: number;
        maxAmount?: number;
    };
    gracePeriodActive: boolean;
    daysInGracePeriod?: number;
    interestAmount: number;
    effectiveRate: number;
    calculationDate: Date;
    nextTierThreshold?: {
        amount: number;
        newRate: number;
        tierName: string;
    };
}

export interface TieredInterestSummary {
    totalInterestSaved: number;
    gracePeriodBenefits: number;
    currentTierBenefits: number;
    projectedAnnualInterest: number;
    recommendedPaymentStrategy: string;
}

export class TieredInterestCalculatorService {
    /**
     * คำนวณดอกเบี้ยแบบ Tiered สำหรับงวดปัจจุบัน
     * รองรับ Grace Period และอัตราดอกเบี้ยแบบขั้นบันได
     */
    async calculateTieredInterest(
        loanId: string,
        paymentNumber: number,
        outstandingBalance: number,
        calculationDate: Date = new Date()
    ): Promise<TieredInterestCalculationResult> {
        try {
            // ดึงข้อมูลสินเชื่อและ Product
            const loan = await db.loan.findUnique({
                where: { id: loanId },
                include: {
                    loanProduct: {
                        include: {
                            interestRateTiers: {
                                where: {
                                    status: 'ACTIVE',
                                    effectiveFrom: { lte: calculationDate }
                                },
                                orderBy: { minAmount: 'asc' }
                            }
                        }
                    }
                }
            });

            if (!loan) {
                throw new Error('Loan not found');
            }

            if (!loan?.loanProduct?.interestRateTiers?.length) {
                // ใช้อัตราดอกเบี้ยพื้นฐานจากสินเชื่อ
                const basicRate = Number(loan.interestRate) / 100;
                const monthlyRate = basicRate / 12;
                const interestAmount = outstandingBalance * monthlyRate;

                return {
                    loanId,
                    paymentNumber,
                    outstandingBalance,
                    appliedTier: {
                        tierName: 'Standard Rate',
                        interestRate: basicRate,
                        gracePeriodDays: 0,
                        minAmount: 0,
                    },
                    gracePeriodActive: false,
                    interestAmount,
                    effectiveRate: basicRate,
                    calculationDate,
                };
            }

            // หา Tier ที่เหมาะสมตามยอดคงเหลือ
            const applicableTier = this.findApplicableTier(
                loan.loanProduct?.interestRateTiers || [],
                outstandingBalance
            );

            if (!applicableTier) {
                throw new Error('No applicable interest rate tier found');
            }

            // ตรวจสอบ Grace Period
            const disbursementDate = loan.disbursementDate || loan.createdAt;
            const daysSinceDisbursement = Math.floor(
                (calculationDate.getTime() - disbursementDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            const gracePeriodActive = daysSinceDisbursement <= applicableTier.gracePeriodDays;
            const daysInGracePeriod = gracePeriodActive ? daysSinceDisbursement : undefined;

            // คำนวณดอกเบี้ย
            let effectiveRate = Number(applicableTier.interestRate);
            let interestAmount = 0;

            if (gracePeriodActive) {
                // ในช่วง Grace Period = ไม่มีดอกเบี้ย
                effectiveRate = 0;
                interestAmount = 0;
            } else {
                // คำนวณดอกเบี้ยตามปกติ
                const annualRate = effectiveRate;
                const monthlyRate = annualRate / 12;
                interestAmount = outstandingBalance * monthlyRate;
            }

            // หา Tier ถัดไปสำหรับแนะนำ
            const nextTierThreshold = this.findNextTierThreshold(
                loan.loanProduct?.interestRateTiers || [],
                outstandingBalance
            );

            // บันทึกประวัติการคำนวณ
            await this.saveLoanInterestHistory({
                loanId,
                paymentNumber,
                outstandingBalance,
                appliedRate: effectiveRate,
                tierName: applicableTier.tierName,
                gracePeriodDays: applicableTier.gracePeriodDays,
                interestAmount,
                calculatedAt: calculationDate,
                effectiveDate: calculationDate,
            });

            const result: TieredInterestCalculationResult = {
                loanId,
                paymentNumber,
                outstandingBalance,
                appliedTier: {
                    tierName: applicableTier.tierName,
                    interestRate: Number(applicableTier.interestRate),
                    gracePeriodDays: applicableTier.gracePeriodDays,
                    minAmount: Number(applicableTier.minAmount),
                    maxAmount: applicableTier.maxAmount ? Number(applicableTier.maxAmount) : undefined,
                },
                gracePeriodActive,
                daysInGracePeriod,
                interestAmount,
                effectiveRate,
                calculationDate,
                nextTierThreshold,
            };

            logger.info(
                {
                    loanId,
                    paymentNumber,
                    tierName: applicableTier.tierName,
                    gracePeriodActive,
                    interestAmount,
                },
                'Tiered interest calculation completed'
            );

            return result;
        } catch (error) {
            logger.error({ error, loanId }, 'Error calculating tiered interest');
            throw error;
        }
    }

    /**
     * คำนวณสรุปผลประโยชน์จากระบบ Tiered Interest
     */
    async calculateTieredInterestSummary(loanId: string): Promise<TieredInterestSummary> {
        try {
            // ดึงประวัติการคำนวณดอกเบี้ย
            const interestHistory = await db.loanInterestHistory.findMany({
                where: { loanId },
                orderBy: { paymentNumber: 'asc' },
            });

            const loan = await db.loan.findUnique({
                where: { id: loanId },
                select: {
                    principal: true,
                    interestRate: true,
                    termMonths: true,
                }
            });

            if (!loan) {
                throw new Error('Loan not found');
            }

            // คำนวณดอกเบี้ยที่ประหยัดได้
            const standardRate = Number(loan.interestRate) / 100 / 12;
            let totalInterestSaved = 0;
            let gracePeriodBenefits = 0;
            let currentTierBenefits = 0;

            for (const history of interestHistory) {
                const standardInterest = Number(history.outstandingBalance) * standardRate;
                const actualInterest = Number(history.interestAmount);
                const saved = standardInterest - actualInterest;

                totalInterestSaved += saved;

                if (history.gracePeriodDays > 0 && actualInterest === 0) {
                    gracePeriodBenefits += standardInterest;
                } else if (saved > 0) {
                    currentTierBenefits += saved;
                }
            }

            // คำนวณดอกเบี้ยประมาณการต่อปี
            const currentBalance = interestHistory.length > 0 && interestHistory[interestHistory.length - 1]
                ? Number(interestHistory[interestHistory.length - 1]?.outstandingBalance || 0)
                : Number(loan.principal);

            const projectedAnnualInterest = currentBalance * (Number(loan.interestRate) / 100);

            // แนะนำกลยุทธ์การชำระเงิน
            let recommendedPaymentStrategy = 'ชำระตามกำหนดเพื่อรักษาสิทธิประโยชน์';
            
            if (gracePeriodBenefits > 0) {
                recommendedPaymentStrategy = 'อยู่ในช่วงปลอดดอกเบี้ย - แนะนำชำระเงินต้นเพิ่มเติม';
            } else if (currentTierBenefits > 0) {
                recommendedPaymentStrategy = 'ได้รับอัตราดอกเบี้ยพิเศษ - พิจารณาชำระก่อนกำหนด';
            }

            return {
                totalInterestSaved,
                gracePeriodBenefits,
                currentTierBenefits,
                projectedAnnualInterest,
                recommendedPaymentStrategy,
            };
        } catch (error) {
            logger.error({ error, loanId }, 'Error calculating tiered interest summary');
            throw error;
        }
    }

    /**
     * จำลองผลกระทบของการชำระเงินต้นเพิ่มเติม
     */
    async simulateAdditionalPrincipalPayment(
        loanId: string,
        additionalAmount: number,
        paymentDate: Date = new Date()
    ): Promise<{
        currentTier: TieredInterestCalculationResult;
        afterPaymentTier: TieredInterestCalculationResult;
        interestSavings: number;
        tierChangeImpact?: {
            newTierName: string;
            rateDifference: number;
            monthlyInterestSavings: number;
        };
    }> {
        try {
            const loan = await db.loan.findUnique({
                where: { id: loanId },
                select: { outstandingBalance: true }
            });

            if (!loan) {
                throw new Error('Loan not found');
            }

            const currentBalance = Number(loan.outstandingBalance);
            const newBalance = Math.max(0, currentBalance - additionalAmount);

            // คำนวณ Tier ปัจจุบัน
            const currentTier = await this.calculateTieredInterest(
                loanId,
                1, // Dummy payment number for simulation
                currentBalance,
                paymentDate
            );

            // คำนวณ Tier หลังชำระเพิ่ม
            const afterPaymentTier = await this.calculateTieredInterest(
                loanId,
                1,
                newBalance,
                paymentDate
            );

            // คำนวณดอกเบี้ยที่ประหยัดได้
            const interestSavings = currentTier.interestAmount - afterPaymentTier.interestAmount;

            // ตรวจสอบการเปลี่ยน Tier
            let tierChangeImpact;
            if (currentTier.appliedTier.tierName !== afterPaymentTier.appliedTier.tierName) {
                const rateDifference = currentTier.appliedTier.interestRate - afterPaymentTier.appliedTier.interestRate;
                const monthlyInterestSavings = newBalance * (rateDifference / 12);

                tierChangeImpact = {
                    newTierName: afterPaymentTier.appliedTier.tierName,
                    rateDifference,
                    monthlyInterestSavings,
                };
            }

            return {
                currentTier,
                afterPaymentTier,
                interestSavings,
                tierChangeImpact,
            };
        } catch (error) {
            logger.error({ error, loanId }, 'Error simulating additional principal payment');
            throw error;
        }
    }

    // Private helper methods

    private findApplicableTier(tiers: any[], outstandingBalance: number) {
        // หา Tier ที่เหมาะสมตามยอดคงเหลือ
        for (let i = tiers.length - 1; i >= 0; i--) {
            const tier = tiers[i];
            const minAmount = Number(tier.minAmount);
            const maxAmount = tier.maxAmount ? Number(tier.maxAmount) : Infinity;

            if (outstandingBalance >= minAmount && outstandingBalance <= maxAmount) {
                return tier;
            }
        }

        // ถ้าไม่เจอ ใช้ Tier แรก (ต่ำสุด)
        return tiers[0];
    }

    private findNextTierThreshold(tiers: any[], currentBalance: number) {
        // หา Tier ถัดไปที่ดีกว่า (อัตราดอกเบี้ยต่ำกว่า)
        const currentTier = this.findApplicableTier(tiers, currentBalance);
        if (!currentTier) return undefined;

        const currentRate = Number(currentTier.interestRate);

        for (const tier of tiers) {
            const tierRate = Number(tier.interestRate);
            const tierMinAmount = Number(tier.minAmount);

            if (tierRate < currentRate && tierMinAmount > currentBalance) {
                return {
                    amount: tierMinAmount,
                    newRate: tierRate,
                    tierName: tier.tierName,
                };
            }
        }

        return undefined;
    }

    private async saveLoanInterestHistory(data: {
        loanId: string;
        paymentNumber: number;
        outstandingBalance: number;
        appliedRate: number;
        tierName: string;
        gracePeriodDays: number;
        interestAmount: number;
        calculatedAt: Date;
        effectiveDate: Date;
    }) {
        try {
            await db.loanInterestHistory.create({
                data: {
                    loanId: data.loanId,
                    paymentNumber: data.paymentNumber,
                    outstandingBalance: data.outstandingBalance,
                    appliedRate: data.appliedRate,
                    tierName: data.tierName,
                    gracePeriodDays: data.gracePeriodDays,
                    interestAmount: data.interestAmount,
                    calculatedAt: data.calculatedAt,
                    effectiveDate: data.effectiveDate,
                },
            });
        } catch (error) {
            // ไม่ให้ error ของการบันทึกประวัติไปกระทบการคำนวณหลัก
            logger.warn({ error, loanId: data.loanId }, 'Failed to save loan interest history');
        }
    }
}

export const tieredInterestCalculatorService = new TieredInterestCalculatorService();
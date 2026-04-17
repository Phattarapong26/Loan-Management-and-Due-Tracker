import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

export interface PrincipalCalculationResult {
    loanId: string;
    currentOutstandingBalance: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    totalPenaltiesPaid: number;
    totalAmountPaid: number;
    remainingPrincipal: number;
    nextPaymentSchedule?: {
        id: string;
        paymentNumber: number;
        paymentDate: Date;
        principalAmount: number;
        interestAmount: number;
        totalPayment: number;
        status: string;
    };
    paymentProgress: {
        completedInstallments: number;
        totalInstallments: number;
        progressPercentage: number;
    };
    earlyPaymentBenefit?: {
        potentialInterestSaved: number;
        daysEarly: number;
    };
}

export class PrincipalCalculatorService {
    /**
     * คำนวณเงินต้นปัจจุบันแบบ real-time
     * รวมการคำนวณทุกอย่างที่เกี่ยวข้องกับเงินต้น
     */
    async calculateCurrentPrincipal(loanId: string): Promise<PrincipalCalculationResult> {
        try {
            // ดึงข้อมูลสินเชื่อ
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        select: {
                            businessName: true,
                        },
                    },
                },
            });

            if (!loan) {
                throw new Error('Loan not found');
            }

            // ดึงประวัติการชำระเงินทั้งหมด
            const payments = await prisma.payment.findMany({
                where: { loanId },
                orderBy: { paymentDate: 'asc' },
            });

            // ดึงตารางผ่อนทั้งหมด
            const paymentSchedules = await prisma.paymentSchedule.findMany({
                where: { loanId },
                orderBy: { paymentNumber: 'asc' },
            });

            // คำนวณยอดที่ชำระแล้ว
            const totalAmountPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            const totalPenaltiesPaid = payments.reduce((sum, payment) => sum + Number(payment.penaltyAmount || 0), 0);

            // คำนวณเงินต้นและดอกเบี้ยที่ชำระแล้ว
            let totalPrincipalPaid = 0;
            let totalInterestPaid = 0;

            // วิธีคำนวณแบบ accurate: ดูจากตารางผ่อนที่ชำระแล้ว
            const paidSchedules = paymentSchedules.filter(schedule => schedule.status === 'PAID');
            
            for (const schedule of paidSchedules) {
                totalPrincipalPaid += Number(schedule.principalAmount);
                totalInterestPaid += Number(schedule.interestAmount);
            }

            // สำหรับงวดที่ชำระบางส่วน (PARTIAL)
            const partialSchedules = paymentSchedules.filter(schedule => schedule.status === 'PARTIAL');
            for (const schedule of partialSchedules) {
                // ดึงการชำระเงินสำหรับงวดนี้
                const schedulePayments = payments.filter(p => p.paymentScheduleId === schedule.id);
                const paidAmount = schedulePayments.reduce((sum, p) => sum + Number(p.amount), 0);
                
                // คำนวณสัดส่วนเงินต้นและดอกเบี้ย
                const totalScheduleAmount = Number(schedule.totalPayment);
                const principalRatio = Number(schedule.principalAmount) / totalScheduleAmount;
                const interestRatio = Number(schedule.interestAmount) / totalScheduleAmount;
                
                totalPrincipalPaid += paidAmount * principalRatio;
                totalInterestPaid += paidAmount * interestRatio;
            }

            // คำนวณเงินต้นคงเหลือ
            const originalPrincipal = Number(loan.principal);
            const remainingPrincipal = originalPrincipal - totalPrincipalPaid;
            const currentOutstandingBalance = Number(loan.outstandingBalance);

            // หางวดถัดไปที่ต้องชำระ
            const nextPaymentSchedule = paymentSchedules.find(
                schedule => schedule.status === 'UNPAID' || schedule.status === 'PARTIAL'
            );

            // คำนวณความคืบหน้าการชำระ
            const completedInstallments = paidSchedules.length;
            const totalInstallments = loan.termMonths;
            const progressPercentage = (completedInstallments / totalInstallments) * 100;

            // คำนวณประโยชน์จากการชำระก่อนกำหนด (ถ้ามี)
            let earlyPaymentBenefit;
            if (nextPaymentSchedule) {
                const today = new Date();
                const dueDate = new Date(nextPaymentSchedule.paymentDate);
                const daysEarly = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysEarly > 0) {
                    // คำนวณดอกเบี้ยที่จะประหยัดได้
                    const dailyInterestRate = Number(loan.interestRate) / 100 / 365;
                    const potentialInterestSaved = currentOutstandingBalance * dailyInterestRate * daysEarly;
                    
                    earlyPaymentBenefit = {
                        potentialInterestSaved,
                        daysEarly,
                    };
                }
            }

            const result: PrincipalCalculationResult = {
                loanId,
                currentOutstandingBalance,
                totalPrincipalPaid,
                totalInterestPaid,
                totalPenaltiesPaid,
                totalAmountPaid,
                remainingPrincipal,
                nextPaymentSchedule: nextPaymentSchedule ? {
                    id: nextPaymentSchedule.id,
                    paymentNumber: nextPaymentSchedule.paymentNumber,
                    paymentDate: nextPaymentSchedule.paymentDate,
                    principalAmount: Number(nextPaymentSchedule.principalAmount),
                    interestAmount: Number(nextPaymentSchedule.interestAmount),
                    totalPayment: Number(nextPaymentSchedule.totalPayment),
                    status: nextPaymentSchedule.status,
                } : undefined,
                paymentProgress: {
                    completedInstallments,
                    totalInstallments,
                    progressPercentage: Math.round(progressPercentage * 100) / 100,
                },
                earlyPaymentBenefit,
            };

            logger.info(
                {
                    loanId,
                    remainingPrincipal,
                    progressPercentage: result.paymentProgress.progressPercentage,
                },
                'Principal calculation completed'
            );

            return result;
        } catch (error) {
            logger.error({ error, loanId }, 'Error calculating current principal');
            throw error;
        }
    }

    /**
     * คำนวณผลกระทบของการชำระเงินก่อนบันทึกจริง
     * ใช้สำหรับแสดงผลให้ผู้ใช้เห็นก่อนยืนยัน
     */
    async simulatePaymentImpact(
        loanId: string,
        paymentAmount: number,
        paymentDate: Date = new Date()
    ): Promise<{
        beforePayment: PrincipalCalculationResult;
        afterPayment: {
            newOutstandingBalance: number;
            newRemainingPrincipal: number;
            principalReduction: number;
            interestPaid: number;
            penaltyAmount?: number;
            paymentType: 'EARLY' | 'ON_TIME' | 'LATE';
            interestSaved?: number;
        };
    }> {
        try {
            // คำนวณสถานะปัจจุบัน
            const beforePayment = await this.calculateCurrentPrincipal(loanId);

            if (!beforePayment.nextPaymentSchedule) {
                throw new Error('No pending payment schedule found');
            }

            const nextSchedule = beforePayment.nextPaymentSchedule;
            const scheduledDate = new Date(nextSchedule.paymentDate);
            const daysDiff = Math.floor(
                (scheduledDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // กำหนดประเภทการชำระ
            let paymentType: 'EARLY' | 'ON_TIME' | 'LATE' = 'ON_TIME';
            let interestSaved = 0;
            let penaltyAmount = 0;

            if (daysDiff > 0) {
                paymentType = 'EARLY';
                // คำนวณดอกเบี้ยที่ประหยัดได้
                const dailyInterestRate = Number(await this.getLoanInterestRate(loanId)) / 100 / 365;
                interestSaved = beforePayment.currentOutstandingBalance * dailyInterestRate * daysDiff;
            } else if (daysDiff < 0) {
                paymentType = 'LATE';
                // คำนวณค่าปรับ (ใช้ logic เดียวกับ payment service)
                const overdueDays = Math.abs(daysDiff);
                const penaltyRate = 2; // 2% per year default
                penaltyAmount = (beforePayment.currentOutstandingBalance * penaltyRate / 100 / 365) * overdueDays;
            }

            // คำนวณการจัดสรรเงิน
            const effectivePayment = paymentAmount - penaltyAmount;
            const principalReduction = Math.min(effectivePayment, nextSchedule.principalAmount);
            const interestPaid = Math.min(effectivePayment - principalReduction, nextSchedule.interestAmount);

            // คำนวณยอดใหม่
            const newRemainingPrincipal = beforePayment.remainingPrincipal - principalReduction;
            const newOutstandingBalance = beforePayment.currentOutstandingBalance - principalReduction;

            return {
                beforePayment,
                afterPayment: {
                    newOutstandingBalance,
                    newRemainingPrincipal,
                    principalReduction,
                    interestPaid,
                    penaltyAmount: penaltyAmount > 0 ? penaltyAmount : undefined,
                    paymentType,
                    interestSaved: interestSaved > 0 ? interestSaved : undefined,
                },
            };
        } catch (error) {
            logger.error({ error, loanId }, 'Error simulating payment impact');
            throw error;
        }
    }

    /**
     * ดึงอัตราดอกเบี้ยของสินเชื่อ
     */
    private async getLoanInterestRate(loanId: string): Promise<number> {
        const loan = await prisma.loan.findUnique({
            where: { id: loanId },
            select: { interestRate: true },
        });

        if (!loan) {
            throw new Error('Loan not found');
        }

        return Number(loan.interestRate);
    }

    /**
     * คำนวณเงินต้นสำหรับหลายสินเชื่อพร้อมกัน (สำหรับ dashboard)
     */
    async calculateMultiplePrincipals(loanIds: string[]): Promise<PrincipalCalculationResult[]> {
        try {
            const results = await Promise.all(
                loanIds.map(loanId => this.calculateCurrentPrincipal(loanId))
            );

            return results;
        } catch (error) {
            logger.error({ error, loanIds }, 'Error calculating multiple principals');
            throw error;
        }
    }

    /**
     * สรุปสถิติเงินต้นรวม (สำหรับรายงาน)
     */
    async getPrincipalSummary(branchId?: string): Promise<{
        totalOriginalPrincipal: number;
        totalPrincipalPaid: number;
        totalRemainingPrincipal: number;
        totalOutstandingBalance: number;
        averagePaymentProgress: number;
        activeLoansCount: number;
    }> {
        try {
            const whereClause = branchId ? { branchId } : {};
            
            const loans = await prisma.loan.findMany({
                where: {
                    ...whereClause,
                    status: {
                        in: ['ACTIVE', 'DISBURSED'],
                    },
                },
                select: {
                    id: true,
                    principal: true,
                    outstandingBalance: true,
                    termMonths: true,
                },
            });

            let totalOriginalPrincipal = 0;
            let totalPrincipalPaid = 0;
            let totalRemainingPrincipal = 0;
            let totalOutstandingBalance = 0;
            let totalProgressPercentage = 0;

            for (const loan of loans) {
                const calculation = await this.calculateCurrentPrincipal(loan.id);
                
                totalOriginalPrincipal += Number(loan.principal);
                totalPrincipalPaid += calculation.totalPrincipalPaid;
                totalRemainingPrincipal += calculation.remainingPrincipal;
                totalOutstandingBalance += calculation.currentOutstandingBalance;
                totalProgressPercentage += calculation.paymentProgress.progressPercentage;
            }

            const averagePaymentProgress = loans.length > 0 
                ? totalProgressPercentage / loans.length 
                : 0;

            return {
                totalOriginalPrincipal,
                totalPrincipalPaid,
                totalRemainingPrincipal,
                totalOutstandingBalance,
                averagePaymentProgress: Math.round(averagePaymentProgress * 100) / 100,
                activeLoansCount: loans.length,
            };
        } catch (error) {
            logger.error({ error, branchId }, 'Error getting principal summary');
            throw error;
        }
    }
}

export const principalCalculatorService = new PrincipalCalculatorService();
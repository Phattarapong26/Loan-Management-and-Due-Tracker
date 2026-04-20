import { PaymentScheduleRepository } from '../repositories/payment-schedule.repository';

export interface PaymentScheduleWithCalculation {
    id: string;
    loanId: string;
    paymentNumber: number;
    paymentDate: Date;
    principalAmount: number;
    interestAmount: number;
    totalPayment: number;
    remainingBalance: number;
    status: string;
    paidAmount: number;
    paidDate?: Date;
    isRecalculated: boolean;
    penaltyAmount?: number;
    compoundInterestAmount?: number;
    daysOverdue?: number;
}

/**
 * Payment Schedule Service - Business Logic ONLY
 * Handles dynamic interest calculation based on current outstanding balance
 */
export class PaymentScheduleService {
    private paymentScheduleRepo: PaymentScheduleRepository;

    constructor() {
        this.paymentScheduleRepo = new PaymentScheduleRepository();
    }

    /**
     * ✅ CORRECT: Get payment schedule with dynamic calculation
     * - PAID schedules: Keep original amounts
     * - UNPAID schedules: Recalculate based on current outstanding balance
     * - Generate new schedules until remainingBalance = 0
     */
    async getPaymentScheduleWithDynamicCalculation(loanId: string): Promise<PaymentScheduleWithCalculation[]> {
        const toNumber = (v: any): number => {
            if (v === null || v === undefined) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') return Number(v);
            if (typeof v?.toNumber === 'function') return v.toNumber();
            return Number(v);
        };

        // 1. Get loan data
        const loan = await this.paymentScheduleRepo.findLoanForSchedule(loanId);

        if (!loan) {
            throw new Error('Loan not found');
        }

        // 2. Get existing schedules from repository (for PAID schedules)
        const existingSchedules = await this.paymentScheduleRepo.findByLoanId(loanId);

        // 3. Get all payments
        const allPayments = await this.paymentScheduleRepo.findPaymentsByLoanId(loanId);

        const totalPrincipal = Number(loan.principal);
        const currentOutstanding = Number(loan.outstandingBalance);
        const monthlyInterestRate = toNumber(loan.interestRate) / 100 / 12;

        console.log(`💰 Loan ${loanId}: Principal=${totalPrincipal}, Outstanding=${currentOutstanding}, Rate=${monthlyInterestRate}`);

        // 4. Process existing PAID schedules first
        const result: PaymentScheduleWithCalculation[] = [];
        let runningBalanceForPaid = totalPrincipal;
        let lastPaymentNumber = 0;

        // Sort existing schedules by payment number
        const sortedExistingSchedules = existingSchedules.sort((a, b) => a.paymentNumber - b.paymentNumber);

        for (const schedule of sortedExistingSchedules) {
            const originalPrincipalAmount = Number(schedule.principalAmount);
            const originalInterestAmount = Number(schedule.interestAmount);
            const originalTotalPayment = Number(schedule.totalPayment);

            // Get payments for this schedule
            const schedulePayments = allPayments.filter(p => p.paymentScheduleId === schedule.id);
            const paidAmount = schedulePayments.reduce((sum, p) => sum + Number(p.amount), 0);

            const isFullyPaid = paidAmount >= originalTotalPayment;

            if (isFullyPaid) {
                // ✅ PAID schedules: Keep original amounts
                const displayRemainingBalance = runningBalanceForPaid;
                runningBalanceForPaid = Math.max(0, runningBalanceForPaid - originalPrincipalAmount);

                result.push({
                    id: schedule.id,
                    loanId: schedule.loanId,
                    paymentNumber: schedule.paymentNumber,
                    paymentDate: schedule.paymentDate,
                    principalAmount: Number(originalPrincipalAmount.toFixed(2)),
                    interestAmount: Number(originalInterestAmount.toFixed(2)),
                    totalPayment: Number(originalTotalPayment.toFixed(2)),
                    remainingBalance: Number(displayRemainingBalance.toFixed(2)),
                    status: 'PAID',
                    paidAmount,
                    paidDate: schedulePayments.length > 0 
                        ? schedulePayments[schedulePayments.length - 1]?.paymentDate 
                        : undefined,
                    isRecalculated: false,
                    penaltyAmount: Number(schedule.penaltyAmount ?? 0),
                    compoundInterestAmount: Number(schedule.compoundInterestAmount ?? 0),
                    daysOverdue: schedule.daysOverdue ?? 0,
                });

                lastPaymentNumber = schedule.paymentNumber;
                console.log(`✅ Paid #${schedule.paymentNumber}: Balance=${displayRemainingBalance.toFixed(2)}`);
            }
        }

        // 5. Generate new dynamic schedules for remaining balance
        if (currentOutstanding > 0.01) {
            let runningBalance = currentOutstanding;
            let paymentNumber = lastPaymentNumber + 1;
            const maxSchedules = 600; // Safety limit (50 years max)
            let scheduleCount = 0;

            // Determine fixed installment (prefer the contract monthly payment)
            const firstUnpaidExisting = sortedExistingSchedules.find(
                (s) => s.paymentNumber >= paymentNumber
            );
            const fixedMonthlyPayment =
                toNumber(loan.monthlyPayment) ||
                (firstUnpaidExisting ? toNumber(firstUnpaidExisting.totalPayment) : 0);

            // Fallback: amortization-based estimate (legacy)
            const remainingMonths = Math.max(1, loan.termMonths - lastPaymentNumber);
            const monthlyPayment =
                fixedMonthlyPayment > 0
                    ? fixedMonthlyPayment
                    : this.calculateMonthlyPayment(currentOutstanding, monthlyInterestRate, remainingMonths);

            console.log(`🔄 Generating dynamic schedules: Starting balance=${currentOutstanding}, Monthly payment=${monthlyPayment.toFixed(2)}`);

            // Calculate payment dates starting from next month
            const getNextPaymentDate = (paymentNum: number): Date => {
                const existing = sortedExistingSchedules.find((s) => s.paymentNumber === paymentNum);
                if (existing?.paymentDate) return new Date(existing.paymentDate);

                if (loan.firstPaymentDate) {
                    const firstDate = new Date(loan.firstPaymentDate);
                    const nextDate = new Date(firstDate);
                    // Add months based on payment number (starting from the first unpaid payment)
                    nextDate.setMonth(firstDate.getMonth() + (paymentNum - 1));
                    
                    // Apply payment day if specified
                    if (loan.paymentDay && loan.paymentDay > 0) {
                        nextDate.setDate(loan.paymentDay);
                    }
                    
                    return nextDate;
                } else {
                    // Fallback: use current date + payment number months
                    const today = new Date();
                    const nextDate = new Date(today);
                    nextDate.setMonth(today.getMonth() + (paymentNum - lastPaymentNumber));
                    
                    // Use payment day or default to day 1
                    const paymentDay = loan.paymentDay || 1;
                    nextDate.setDate(paymentDay);
                    
                    return nextDate;
                }
            };

            // ✅ Use while loop to generate schedules until balance = 0
            while (runningBalance > 0.01 && scheduleCount < maxSchedules) {
                const interestAmount = runningBalance * monthlyInterestRate;
                let scheduledTotalPayment = monthlyPayment;

                // Minimum payment should cover interest (avoid negative amortization)
                if (scheduledTotalPayment < interestAmount) scheduledTotalPayment = interestAmount;

                // System constraint: do not exceed current outstanding principal
                scheduledTotalPayment = Math.min(scheduledTotalPayment, runningBalance);

                const actualPrincipalAmount = Math.max(0, scheduledTotalPayment - interestAmount);
                const actualTotalPayment = scheduledTotalPayment;

                const paymentDate = getNextPaymentDate(paymentNumber);
                const displayRemainingBalance = runningBalance;

                // Update running balance
                runningBalance = Math.max(0, runningBalance - actualPrincipalAmount);

                // Determine status based on payment date
                const today = new Date();
                const status = paymentDate < today ? 'OVERDUE' : 'UNPAID';

                // Look up existing schedule for penalty data
                const existingForPenalty = sortedExistingSchedules.find(s => s.paymentNumber === paymentNumber);

                result.push({
                    id: existingForPenalty?.id ?? `dynamic-${paymentNumber}`,
                    loanId: loanId,
                    paymentNumber: paymentNumber,
                    paymentDate: paymentDate,
                    principalAmount: Number(actualPrincipalAmount.toFixed(2)),
                    interestAmount: Number(interestAmount.toFixed(2)),
                    totalPayment: Number(actualTotalPayment.toFixed(2)),
                    remainingBalance: Number(displayRemainingBalance.toFixed(2)),
                    status: existingForPenalty?.status ?? status,
                    paidAmount: 0,
                    paidDate: undefined,
                    isRecalculated: true,
                    penaltyAmount: Number(existingForPenalty?.penaltyAmount ?? 0),
                    compoundInterestAmount: Number(existingForPenalty?.compoundInterestAmount ?? 0),
                    daysOverdue: existingForPenalty?.daysOverdue ?? 0,
                });

                console.log(`🔄 Dynamic #${paymentNumber}: Principal=${actualPrincipalAmount.toFixed(2)}, Interest=${interestAmount.toFixed(2)}, Balance=${displayRemainingBalance.toFixed(2)} -> ${runningBalance.toFixed(2)}`);

                paymentNumber++;
                scheduleCount++;

                // Break if we've paid off the loan
                if (runningBalance <= 0.01) {
                    break;
                }
            }

            console.log(`✅ Generated ${scheduleCount} dynamic schedules, final balance: ${runningBalance.toFixed(2)}`);
        }

        console.log(`✅ Total schedules: ${result.length} (${result.filter(r => !r.isRecalculated).length} paid + ${result.filter(r => r.isRecalculated).length} dynamic)`);
        return result;
    }

    /**
     * Calculate monthly payment using amortization formula
     */
    private calculateMonthlyPayment(
        principal: number,
        monthlyInterestRate: number,
        termMonths: number
    ): number {
        if (termMonths === 0) return 0;
        
        if (monthlyInterestRate === 0) {
            return principal / termMonths;
        }

        const rate = monthlyInterestRate;
        const n = termMonths;
        const numerator = principal * rate * Math.pow(1 + rate, n);
        const denominator = Math.pow(1 + rate, n) - 1;

        return numerator / denominator;
    }

    /**
     * Determine schedule status
     */
    private determineScheduleStatus(
        _schedule: any,
        paidAmount: number,
        totalPayment: number,
        dueDate: Date
    ): string {
        const now = new Date();

        if (paidAmount >= totalPayment) {
            return 'PAID';
        } else if (paidAmount > 0 && paidAmount < totalPayment) {
            return 'PARTIAL';
        } else if (dueDate < now && paidAmount === 0) {
            return 'OVERDUE';
        } else {
            return 'UNPAID';
        }
    }
}

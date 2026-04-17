/**
 * Business calculation utilities
 * DSCR, Payment Schedule, Interest calculations
 */

// Decimal type from Prisma is used but not directly imported

/**
 * Calculate DSCR (Debt Service Coverage Ratio) - Monthly Basis
 * DSCR = Monthly Net Income / Monthly Debt Service
 * 
 * @param monthlyRevenue - Monthly revenue
 * @param monthlyCogs - Monthly cost of goods sold
 * @param monthlyOpex - Monthly operating expenses
 * @param loanAmount - Loan principal
 * @param interestRate - Annual interest rate (percentage)
 * @param durationMonths - Loan duration in months
 * @returns DSCR calculation result
 */
export function calculateDSCR(params: {
    monthlyRevenue: number;
    monthlyCogs: number;
    monthlyOpex: number;
    loanAmount: number;
    interestRate: number;
    durationMonths: number;
}): {
    dscr: number;
    status: 'excellent' | 'warning' | 'risk';
    netIncome: number;
    monthlyDebtService: number;
    monthlyPayment: number;
    recommendation: string;
} {
    const { monthlyRevenue, monthlyCogs, monthlyOpex, loanAmount, interestRate, durationMonths } = params;

    // Calculate monthly net income (รายได้ก่อนหักค่าใช้จ่ายในการชำระหนี้)
    const netIncome = monthlyRevenue - monthlyCogs - monthlyOpex;

    // If negative, return risk status
    if (netIncome <= 0) {
        return {
            dscr: 0,
            status: 'risk',
            netIncome,
            monthlyDebtService: 0,
            monthlyPayment: 0,
            recommendation: 'Business is operating at a loss. Loan should be rejected.',
        };
    }

    // Calculate monthly interest rate
    const monthlyRate = interestRate / 12 / 100;

    // Calculate monthly payment using annuity formula
    // PMT = P × r × (1+r)^n / [(1+r)^n - 1]
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, durationMonths);
    const denominator = Math.pow(1 + monthlyRate, durationMonths) - 1;
    const monthlyPayment = loanAmount * (numerator / denominator);

    // Monthly debt service = monthly payment (จำนวนหนี้ที่ต้องชำระต่อเดือน)
    const monthlyDebtService = monthlyPayment;

    // Calculate DSCR (Monthly basis)
    const dscr = netIncome / monthlyDebtService;
    const roundedDSCR = Math.round(dscr * 100) / 100;

    // Determine status
    let status: 'excellent' | 'warning' | 'risk';
    let recommendation: string;

    if (dscr >= 1.5) {
        status = 'excellent';
        recommendation = 'Passes criteria. Loan can be approved.';
    } else if (dscr >= 1.25) {
        status = 'warning';
        recommendation = 'Good criteria. Consider additional income verification.';
    } else if (dscr >= 1.2) {
        status = 'warning';
        recommendation = 'Meets minimum criteria but requires close monitoring.';
    } else {
        status = 'risk';
        recommendation = 'Below minimum threshold. Loan should be rejected or loan amount reduced.';
    }

    return {
        dscr: roundedDSCR,
        status,
        netIncome,
        monthlyDebtService: Math.round(monthlyDebtService * 100) / 100,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        recommendation,
    };
}

/**
 * Generate payment schedule (Amortization table)
 */
export function generatePaymentSchedule(params: {
    loanAmount: number;
    interestRate: number;
    durationMonths: number;
    disbursementDate: Date;
    paymentDay: number; // Day of month for payment
}): Array<{
    paymentNumber: number;
    paymentDate: Date;
    principalAmount: number;
    interestAmount: number;
    totalPayment: number;
    remainingBalance: number;
}> {
    const { loanAmount, interestRate, durationMonths, disbursementDate, paymentDay } = params;

    const monthlyRate = interestRate / 12 / 100;
    const schedule: Array<{
        paymentNumber: number;
        paymentDate: Date;
        principalAmount: number;
        interestAmount: number;
        totalPayment: number;
        remainingBalance: number;
    }> = [];

    // Calculate monthly payment
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, durationMonths);
    const denominator = Math.pow(1 + monthlyRate, durationMonths) - 1;
    const monthlyPayment = loanAmount * (numerator / denominator);

    let remainingBalance = loanAmount;

    for (let i = 1; i <= durationMonths; i++) {
        // Calculate payment date
        const paymentDate = new Date(disbursementDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        paymentDate.setDate(paymentDay);

        // Calculate interest for this period
        const interestAmount = remainingBalance * monthlyRate;

        // Calculate principal payment
        let principalAmount = monthlyPayment - interestAmount;

        // Last payment adjustment
        if (i === durationMonths) {
            principalAmount = remainingBalance;
        }

        // Update remaining balance
        remainingBalance = remainingBalance - principalAmount;

        // Round to 2 decimal places
        const totalPayment = i === durationMonths 
            ? principalAmount + interestAmount 
            : monthlyPayment;

        schedule.push({
            paymentNumber: i,
            paymentDate,
            principalAmount: Math.round(principalAmount * 100) / 100,
            interestAmount: Math.round(interestAmount * 100) / 100,
            totalPayment: Math.round(totalPayment * 100) / 100,
            remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
        });
    }

    return schedule;
}

/**
 * Calculate interest saved for early payment
 */
export function calculateEarlyPaymentInterest(params: {
    outstandingBalance: number;
    interestRate: number;
    daysEarly: number;
}): number {
    const { outstandingBalance, interestRate, daysEarly } = params;

    if (daysEarly <= 0) {
        return 0;
    }

    // Calculate daily interest rate
    const dailyRate = interestRate / 365 / 100;

    // Interest saved = outstanding balance × daily rate × days early
    const interestSaved = outstandingBalance * dailyRate * daysEarly;

    return Math.round(interestSaved * 100) / 100;
}

/**
 * Calculate penalty for late payment with dynamic rates and max cap
 */
export function calculateLatePenalty(params: {
    outstandingBalance: number;
    penaltyRate: number; // Daily penalty rate (percentage)
    overdueDays: number;
    collectionFee?: number; // Fixed collection fee
    maxAnnualRate?: number; // Max annual penalty rate (default 18%)
}): number {
    const { outstandingBalance, penaltyRate, overdueDays, collectionFee = 0, maxAnnualRate = 18 } = params;

    if (overdueDays <= 0) {
        return 0;
    }

    // Calculate daily penalty
    const dailyPenalty = outstandingBalance * (penaltyRate / 100);
    
    // Calculate penalty for overdue days
    let totalPenalty = dailyPenalty * overdueDays;

    // Apply max cap (18% per year)
    const maxAnnualPenalty = outstandingBalance * (maxAnnualRate / 100);
    const maxDailyPenalty = maxAnnualPenalty / 365;
    const maxPenaltyForDays = maxDailyPenalty * overdueDays;

    // Use the lower of calculated penalty or max cap
    totalPenalty = Math.min(totalPenalty, maxPenaltyForDays);

    // Add collection fee
    totalPenalty += collectionFee;

    return Math.round(totalPenalty * 100) / 100;
}

/**
 * Get penalty rate for loan product (dynamic based on product configuration)
 * This function is deprecated - use DynamicPenaltyService instead
 */
export async function getPenaltyRateForLoan(_loanId: string, _overdueDays: number): Promise<{
    penaltyRate: number; // Daily rate
    maxAnnualRate: number;
    ruleName: string;
}> {
    // This would be implemented to fetch from database
    // For now, return default values
    return {
        penaltyRate: 0.05, // 0.05% per day (18.25% per year)
        maxAnnualRate: 18, // 18% per year max
        ruleName: 'Default Penalty Rule'
    };
}

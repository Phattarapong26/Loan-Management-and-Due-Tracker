/**
 * Payment Validation Utilities
 * 
 * Validates payment amounts against loan balances with empathy-driven error messages.
 * Implements Properties 12, 13, 14, 15 from the design document.
 * 
 * @module paymentValidation
 */

export interface PaymentValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  celebration?: string;
  remainingBalance?: number;
}

export interface LoanInfo {
  outstandingBalance: number;
  regularInstallment: number;
  loanId: string;
}

/**
 * Validate payment amount against loan balance
 * 
 * Property 12: Payment Amount Boundary Validation
 * Property 13: Payment Amount Range Validation
 * Property 14: Loan Payoff Celebration
 * Property 15: Real-time Balance Calculation
 * 
 * @param amount - Payment amount to validate
 * @param loanInfo - Loan information including outstanding balance and regular installment
 * @returns Validation result with error/warning/celebration messages
 * 
 * @example
 * ```typescript
 * const result = validatePaymentAmount(5000, {
 *   outstandingBalance: 10000,
 *   regularInstallment: 2000,
 *   loanId: 'L001'
 * });
 * 
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validatePaymentAmount(
  amount: number,
  loanInfo: LoanInfo
): PaymentValidationResult {
  const { outstandingBalance, regularInstallment } = loanInfo;

  // Property 13: Validate amount > 0
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'กรุณากรอกยอดชำระที่มากกว่า 0 บาทค่ะ 🙏',
    };
  }

  // Property 12: Check if amount exceeds outstanding balance
  if (amount > outstandingBalance) {
    const excess = amount - outstandingBalance;
    return {
      isValid: false,
      error: `ยอดชำระเกินยอดคงเหลือค่ะ\n` +
        `ยอดคงเหลือ: ${formatCurrency(outstandingBalance)} บาท\n` +
        `ยอดที่กรอก: ${formatCurrency(amount)} บาท\n` +
        `เกินไป: ${formatCurrency(excess)} บาท\n` +
        `กรุณากรอกยอดไม่เกิน ${formatCurrency(outstandingBalance)} บาทค่ะ 🙏`,
    };
  }

  // Property 14: Check for exact payoff (celebration!)
  if (amount === outstandingBalance) {
    return {
      isValid: true,
      celebration: `🎉 ยินดีด้วยค่ะ! ชำระเงินครบถ้วนแล้ว\n` +
        `ยอดชำระ: ${formatCurrency(amount)} บาท\n` +
        `สินเชื่อนี้จะปิดบัญชีหลังจากบันทึกการชำระเงินค่ะ`,
      remainingBalance: 0,
    };
  }

  // Property 13: Check for unusually high payment (>2x regular installment)
  if (regularInstallment > 0 && amount > regularInstallment * 2) {
    const remaining = outstandingBalance - amount;
    return {
      isValid: true,
      warning: `⚠️ ยอดชำระสูงกว่างวดปกติ (${formatCurrency(regularInstallment)} บาท) มากค่ะ\n` +
        `ยอดที่กรอก: ${formatCurrency(amount)} บาท\n` +
        `ยอดคงเหลือหลังชำระ: ${formatCurrency(remaining)} บาท\n` +
        `กรุณาตรวจสอบความถูกต้องอีกครั้งค่ะ 🙏`,
      remainingBalance: remaining,
    };
  }

  // Property 15: Calculate remaining balance
  const remaining = outstandingBalance - amount;
  return {
    isValid: true,
    remainingBalance: remaining,
  };
}

/**
 * Format currency with Thai Baht formatting
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string with thousand separators
 * 
 * @example
 * ```typescript
 * formatCurrency(1234567.89); // "1,234,567.89"
 * ```
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate remaining balance after payment
 * 
 * Property 15: Real-time Balance Calculation
 * 
 * @param outstandingBalance - Current outstanding balance
 * @param paymentAmount - Payment amount
 * @returns Remaining balance after payment
 * 
 * @example
 * ```typescript
 * calculateRemainingBalance(10000, 3000); // 7000
 * ```
 */
export function calculateRemainingBalance(
  outstandingBalance: number,
  paymentAmount: number
): number {
  if (paymentAmount < 0) {
    return outstandingBalance;
  }
  
  const remaining = outstandingBalance - paymentAmount;
  return Math.max(0, remaining);
}

/**
 * Check if payment amount is unusually high
 * 
 * Property 13: Payment Amount Range Validation
 * 
 * @param amount - Payment amount
 * @param regularInstallment - Regular installment amount
 * @returns True if amount is unusually high (>2x regular installment)
 * 
 * @example
 * ```typescript
 * isUnusuallyHighPayment(5000, 2000); // true (5000 > 2000 * 2)
 * isUnusuallyHighPayment(3000, 2000); // false
 * ```
 */
export function isUnusuallyHighPayment(
  amount: number,
  regularInstallment: number
): boolean {
  if (regularInstallment <= 0) {
    return false;
  }
  return amount > regularInstallment * 2;
}

/**
 * Check if payment is exact payoff
 * 
 * Property 14: Loan Payoff Celebration
 * 
 * @param amount - Payment amount
 * @param outstandingBalance - Outstanding balance
 * @returns True if payment exactly matches outstanding balance
 * 
 * @example
 * ```typescript
 * isExactPayoff(10000, 10000); // true
 * isExactPayoff(9999, 10000); // false
 * ```
 */
export function isExactPayoff(
  amount: number,
  outstandingBalance: number
): boolean {
  return amount === outstandingBalance && amount > 0;
}

/**
 * Get payment validation message
 * 
 * Returns empathy-driven validation message based on payment amount and loan info.
 * 
 * @param amount - Payment amount
 * @param loanInfo - Loan information
 * @returns Validation message (error, warning, or celebration)
 * 
 * @example
 * ```typescript
 * getPaymentValidationMessage(15000, {
 *   outstandingBalance: 10000,
 *   regularInstallment: 2000,
 *   loanId: 'L001'
 * });
 * // Returns: "ยอดชำระเกินยอดคงเหลือค่ะ..."
 * ```
 */
export function getPaymentValidationMessage(
  amount: number,
  loanInfo: LoanInfo
): string | undefined {
  const result = validatePaymentAmount(amount, loanInfo);
  
  if (result.error) {
    return result.error;
  }
  
  if (result.celebration) {
    return result.celebration;
  }
  
  if (result.warning) {
    return result.warning;
  }
  
  return undefined;
}

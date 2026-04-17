/**
 * Data Consistency Validation Utilities
 * 
 * Utilities for validating data consistency across the application
 * 
 * Features:
 * - Validate loan amount against credit limit
 * - Validate payment date against disbursement date
 * - Validate loan term against product configuration
 * - Validate financial data for negative values
 * - Detect potential duplicate records
 * - Implements Property 50: Data Consistency Validation
 * 
 * @module dataConsistency
 */

export interface LoanConsistencyData {
  loanAmount: number;
  creditLimit?: number;
  term: number;
  minTerm?: number;
  maxTerm?: number;
  interestRate: number;
  minInterestRate?: number;
  maxInterestRate?: number;
}

export interface PaymentConsistencyData {
  paymentDate: Date;
  disbursementDate: Date;
  amount: number;
  outstandingBalance: number;
}

export interface FinancialConsistencyData {
  revenue?: number;
  expenses?: number;
  netIncome?: number;
  assets?: number;
  liabilities?: number;
  equity?: number;
}

export interface DuplicateCheckData {
  customerId?: string;
  nationalId?: string;
  taxId?: string;
  phone?: string;
  email?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate loan amount against credit limit
 */
export function validateLoanAmount(data: LoanConsistencyData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if loan amount is positive
  if (data.loanAmount <= 0) {
    errors.push('วงเงินกู้ต้องมากกว่า 0 บาท');
  }

  // Check against credit limit
  if (data.creditLimit !== undefined) {
    if (data.loanAmount > data.creditLimit) {
      errors.push(
        `วงเงินกู้ (${data.loanAmount.toLocaleString()} บาท) เกินวงเงินสินเชื่อที่อนุมัติ (${data.creditLimit.toLocaleString()} บาท)`
      );
    } else if (data.loanAmount > data.creditLimit * 0.95) {
      warnings.push(
        `วงเงินกู้ใกล้เคียงวงเงินสินเชื่อสูงสุด (${((data.loanAmount / data.creditLimit) * 100).toFixed(1)}%)`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate loan term against product configuration
 */
export function validateLoanTerm(data: LoanConsistencyData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if term is positive
  if (data.term <= 0) {
    errors.push('ระยะเวลากู้ต้องมากกว่า 0 เดือน');
  }

  // Check against min/max term
  if (data.minTerm !== undefined && data.term < data.minTerm) {
    errors.push(
      `ระยะเวลากู้ (${data.term} เดือน) ต่ำกว่าขั้นต่ำที่กำหนด (${data.minTerm} เดือน)`
    );
  }

  if (data.maxTerm !== undefined && data.term > data.maxTerm) {
    errors.push(
      `ระยะเวลากู้ (${data.term} เดือน) เกินสูงสุดที่กำหนด (${data.maxTerm} เดือน)`
    );
  }

  // Check interest rate
  if (data.interestRate <= 0) {
    errors.push('อัตราดอกเบี้ยต้องมากกว่า 0%');
  }

  if (data.minInterestRate !== undefined && data.interestRate < data.minInterestRate) {
    errors.push(
      `อัตราดอกเบี้ย (${data.interestRate}%) ต่ำกว่าขั้นต่ำที่กำหนด (${data.minInterestRate}%)`
    );
  }

  if (data.maxInterestRate !== undefined && data.interestRate > data.maxInterestRate) {
    errors.push(
      `อัตราดอกเบี้ย (${data.interestRate}%) เกินสูงสุดที่กำหนด (${data.maxInterestRate}%)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate payment date against disbursement date
 */
export function validatePaymentDate(data: PaymentConsistencyData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Payment date must be after disbursement date
  if (data.paymentDate < data.disbursementDate) {
    errors.push(
      'วันที่ชำระเงินต้องไม่ก่อนวันที่เบิกจ่าย'
    );
  }

  // Check payment amount
  if (data.amount <= 0) {
    errors.push('จำนวนเงินชำระต้องมากกว่า 0 บาท');
  }

  if (data.amount > data.outstandingBalance) {
    errors.push(
      `จำนวนเงินชำระ (${data.amount.toLocaleString()} บาท) เกินยอดคงเหลือ (${data.outstandingBalance.toLocaleString()} บาท)`
    );
  }

  // Warning if payment is very old
  const daysSinceDisbursement = Math.floor(
    (data.paymentDate.getTime() - data.disbursementDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDisbursement > 365 * 5) {
    warnings.push(
      `วันที่ชำระห่างจากวันเบิกจ่ายมากกว่า 5 ปี (${Math.floor(daysSinceDisbursement / 365)} ปี)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate financial data for negative values
 */
export function validateFinancialData(data: FinancialConsistencyData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for negative values
  if (data.revenue !== undefined && data.revenue < 0) {
    errors.push('รายได้ต้องไม่เป็นค่าลบ');
  }

  if (data.expenses !== undefined && data.expenses < 0) {
    errors.push('ค่าใช้จ่ายต้องไม่เป็นค่าลบ');
  }

  if (data.assets !== undefined && data.assets < 0) {
    errors.push('สินทรัพย์ต้องไม่เป็นค่าลบ');
  }

  if (data.liabilities !== undefined && data.liabilities < 0) {
    errors.push('หนี้สินต้องไม่เป็นค่าลบ');
  }

  // Check accounting equation: Assets = Liabilities + Equity
  if (
    data.assets !== undefined &&
    data.liabilities !== undefined &&
    data.equity !== undefined
  ) {
    const calculatedEquity = data.assets - data.liabilities;
    const difference = Math.abs(calculatedEquity - data.equity);

    if (difference > 0.01) {
      errors.push(
        `สมการบัญชีไม่สมดุล: สินทรัพย์ (${data.assets.toLocaleString()}) ≠ หนี้สิน (${data.liabilities.toLocaleString()}) + ส่วนของเจ้าของ (${data.equity.toLocaleString()})`
      );
    }
  }

  // Check income statement: Net Income = Revenue - Expenses
  if (
    data.revenue !== undefined &&
    data.expenses !== undefined &&
    data.netIncome !== undefined
  ) {
    const calculatedNetIncome = data.revenue - data.expenses;
    const difference = Math.abs(calculatedNetIncome - data.netIncome);

    if (difference > 0.01) {
      errors.push(
        `กำไรสุทธิไม่ถูกต้อง: รายได้ (${data.revenue.toLocaleString()}) - ค่าใช้จ่าย (${data.expenses.toLocaleString()}) ≠ กำไรสุทธิ (${data.netIncome.toLocaleString()})`
      );
    }
  }

  // Warnings
  if (data.revenue !== undefined && data.expenses !== undefined) {
    if (data.expenses > data.revenue) {
      warnings.push(
        `ค่าใช้จ่ายสูงกว่ารายได้ (ขาดทุน ${(data.expenses - data.revenue).toLocaleString()} บาท)`
      );
    }
  }

  if (data.liabilities !== undefined && data.assets !== undefined) {
    const debtRatio = data.liabilities / data.assets;
    if (debtRatio > 0.7) {
      warnings.push(
        `อัตราส่วนหนี้สินต่อสินทรัพย์สูง (${(debtRatio * 100).toFixed(1)}%)`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect potential duplicate records
 */
export function detectDuplicates(
  newData: DuplicateCheckData,
  existingRecords: DuplicateCheckData[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const existing of existingRecords) {
    const matches: string[] = [];

    // Check exact matches
    if (newData.nationalId && existing.nationalId === newData.nationalId) {
      matches.push('เลขบัตรประชาชน');
    }

    if (newData.taxId && existing.taxId === newData.taxId) {
      matches.push('เลขผู้เสียภาษี');
    }

    if (newData.phone && existing.phone === newData.phone) {
      matches.push('เบอร์โทรศัพท์');
    }

    if (newData.email && existing.email === newData.email) {
      matches.push('อีเมล');
    }

    if (matches.length > 0) {
      if (matches.length >= 2) {
        errors.push(
          `พบข้อมูลซ้ำกับลูกค้าที่มีอยู่แล้ว: ${matches.join(', ')}`
        );
      } else {
        warnings.push(
          `พบข้อมูลที่อาจซ้ำกับลูกค้าที่มีอยู่แล้ว: ${matches.join(', ')}`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all consistency rules
 */
export function validateAllConsistency(data: {
  loan?: LoanConsistencyData;
  payment?: PaymentConsistencyData;
  financial?: FinancialConsistencyData;
  duplicate?: {
    newData: DuplicateCheckData;
    existingRecords: DuplicateCheckData[];
  };
}): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  if (data.loan) {
    const loanAmountResult = validateLoanAmount(data.loan);
    allErrors.push(...loanAmountResult.errors);
    allWarnings.push(...loanAmountResult.warnings);

    const loanTermResult = validateLoanTerm(data.loan);
    allErrors.push(...loanTermResult.errors);
    allWarnings.push(...loanTermResult.warnings);
  }

  if (data.payment) {
    const paymentResult = validatePaymentDate(data.payment);
    allErrors.push(...paymentResult.errors);
    allWarnings.push(...paymentResult.warnings);
  }

  if (data.financial) {
    const financialResult = validateFinancialData(data.financial);
    allErrors.push(...financialResult.errors);
    allWarnings.push(...financialResult.warnings);
  }

  if (data.duplicate) {
    const duplicateResult = detectDuplicates(
      data.duplicate.newData,
      data.duplicate.existingRecords
    );
    allErrors.push(...duplicateResult.errors);
    allWarnings.push(...duplicateResult.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

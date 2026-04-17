/**
 * DSCR (Debt Service Coverage Ratio) Calculation Utilities
 * 
 * DSCR = Net Operating Income / Total Debt Service
 * 
 * Risk Levels:
 * - DSCR < 1.25: High Risk (Red) - รายได้ไม่เพียงพอชำระหนี้
 * - DSCR 1.25-1.50: Medium Risk (Yellow) - รายได้พอชำระหนี้แต่มีความเสี่ยง
 * - DSCR > 1.50: Low Risk (Green) - รายได้เพียงพอชำระหนี้
 * 
 * Implements Properties 16, 17, 18, 19, 20 from the design document.
 * 
 * @module dscrCalculation
 */

export interface DSCRCalculationResult {
  dscr: number;
  isValid: boolean;
  error?: string;
  riskLevel?: 'high' | 'medium' | 'low';
  riskMessage?: string;
  warning?: string;
}

export interface DSCRInput {
  netIncome: number;
  totalDebtService: number;
}

export interface DSCRConflict {
  hasConflict: boolean;
  message?: string;
  dscr: number;
  qualitativeScore: number;
}

/**
 * Calculate DSCR from net income and debt service
 * 
 * Property 16: DSCR Real-time Calculation
 * 
 * @param netIncome - Net operating income (รายได้สุทธิ)
 * @param totalDebtService - Total debt service (ภาระหนี้ทั้งหมด)
 * @returns DSCR calculation result with validation
 * 
 * @example
 * ```typescript
 * const result = calculateDSCR(150000, 100000);
 * // result.dscr = 1.50
 * // result.riskLevel = 'low'
 * ```
 */
export function calculateDSCR(
  netIncome: number,
  totalDebtService: number
): DSCRCalculationResult {
  // Validate inputs
  if (netIncome < 0) {
    return {
      dscr: 0,
      isValid: false,
      error: 'รายได้สุทธิต้องมากกว่าหรือเท่ากับ 0 บาทค่ะ 🙏\n' +
        'กรุณาตรวจสอบข้อมูลรายได้อีกครั้ง',
    };
  }

  if (totalDebtService < 0) {
    return {
      dscr: 0,
      isValid: false,
      error: 'ภาระหนี้ทั้งหมดต้องมากกว่าหรือเท่ากับ 0 บาทค่ะ 🙏\n' +
        'กรุณาตรวจสอบข้อมูลภาระหนี้อีกครั้ง',
    };
  }

  // Handle division by zero
  if (totalDebtService === 0) {
    return {
      dscr: 0,
      isValid: false,
      error: 'ไม่สามารถคำนวณ DSCR ได้เนื่องจากภาระหนี้เป็น 0 บาท\n' +
        'กรุณากรอกข้อมูลภาระหนี้ทั้งหมดค่ะ 🙏',
    };
  }

  // Calculate DSCR
  const dscr = netIncome / totalDebtService;

  // Determine risk level and message
  const { riskLevel, riskMessage } = getDSCRRiskLevel(dscr);

  // Check for extreme values
  const extremeWarning = checkExtremeValue(dscr);

  return {
    dscr,
    isValid: true,
    riskLevel,
    riskMessage,
    warning: extremeWarning,
  };
}

/**
 * Get DSCR risk level and message
 * 
 * Property 17: DSCR Risk Level Messaging
 * 
 * @param dscr - DSCR value
 * @returns Risk level and message
 * 
 * @example
 * ```typescript
 * getDSCRRiskLevel(1.15); // { riskLevel: 'high', riskMessage: '...' }
 * getDSCRRiskLevel(1.35); // { riskLevel: 'medium', riskMessage: '...' }
 * getDSCRRiskLevel(1.75); // { riskLevel: 'low', riskMessage: '...' }
 * ```
 */
export function getDSCRRiskLevel(dscr: number): {
  riskLevel: 'high' | 'medium' | 'low';
  riskMessage: string;
} {
  if (dscr < 1.25) {
    const deficit = ((1.25 - dscr) / 1.25 * 100).toFixed(1);
    return {
      riskLevel: 'high',
      riskMessage: `⚠️ ความเสี่ยงสูง: DSCR ${dscr.toFixed(2)}\n` +
        `รายได้ต่ำกว่าเกณฑ์ขั้นต่ำ ${deficit}%\n` +
        `แนะนำ: เพิ่มรายได้หรือลดภาระหนี้เพื่อให้ DSCR ≥ 1.25`,
    };
  }

  if (dscr >= 1.25 && dscr <= 1.50) {
    return {
      riskLevel: 'medium',
      riskMessage: `⚠️ ความเสี่ยงปานกลาง: DSCR ${dscr.toFixed(2)}\n` +
        `รายได้พอชำระหนี้ แต่มีความเสี่ยงหากรายได้ลดลง\n` +
        `แนะนำ: เพิ่มรายได้เพื่อให้ DSCR > 1.50 เพื่อความปลอดภัย`,
    };
  }

  return {
    riskLevel: 'low',
    riskMessage: `✅ ความเสี่ยงต่ำ: DSCR ${dscr.toFixed(2)}\n` +
      `รายได้เพียงพอชำระหนี้และมีเงินเหลือเพียงพอ\n` +
      `สถานะ: ผ่านเกณฑ์การพิจารณา`,
  };
}

/**
 * Check for extreme DSCR values
 * 
 * Property 20: DSCR Extreme Value Confirmation
 * 
 * @param dscr - DSCR value
 * @returns Warning message if value is extreme, undefined otherwise
 * 
 * @example
 * ```typescript
 * checkExtremeValue(0.3); // Returns warning message
 * checkExtremeValue(7.5); // Returns warning message
 * checkExtremeValue(2.0); // Returns undefined
 * ```
 */
export function checkExtremeValue(dscr: number): string | undefined {
  if (dscr < 0.5) {
    return `⚠️ ค่า DSCR ต่ำมาก (${dscr.toFixed(2)})\n` +
      `กรุณาตรวจสอบความถูกต้องของข้อมูล:\n` +
      `- รายได้สุทธิถูกต้องหรือไม่?\n` +
      `- ภาระหนี้ทั้งหมดถูกต้องหรือไม่?\n` +
      `หากข้อมูลถูกต้อง กรุณายืนยันเพื่อดำเนินการต่อ`;
  }

  if (dscr > 5.0) {
    return `⚠️ ค่า DSCR สูงมาก (${dscr.toFixed(2)})\n` +
      `กรุณาตรวจสอบความถูกต้องของข้อมูล:\n` +
      `- รายได้สุทธิถูกต้องหรือไม่?\n` +
      `- ภาระหนี้ทั้งหมดครบถ้วนหรือไม่?\n` +
      `หากข้อมูลถูกต้อง กรุณายืนยันเพื่อดำเนินการต่อ`;
  }

  return undefined;
}

/**
 * Detect conflict between DSCR and qualitative score
 * 
 * Property 19: DSCR Conflict Detection
 * 
 * @param dscr - DSCR value
 * @param qualitativeScore - Qualitative assessment score (0-100)
 * @returns Conflict detection result
 * 
 * @example
 * ```typescript
 * // DSCR low but qualitative score high - conflict!
 * detectDSCRConflict(1.15, 85);
 * // { hasConflict: true, message: '...' }
 * 
 * // DSCR and qualitative score aligned - no conflict
 * detectDSCRConflict(1.75, 85);
 * // { hasConflict: false }
 * ```
 */
export function detectDSCRConflict(
  dscr: number,
  qualitativeScore: number
): DSCRConflict {
  // Conflict: DSCR < 1.25 (high risk) but qualitative score > 80 (excellent)
  if (dscr < 1.25 && qualitativeScore > 80) {
    return {
      hasConflict: true,
      dscr,
      qualitativeScore,
      message: `⚠️ พบความขัดแย้งระหว่างข้อมูล:\n\n` +
        `DSCR: ${dscr.toFixed(2)} (ความเสี่ยงสูง)\n` +
        `คะแนนคุณภาพ: ${qualitativeScore}/100 (ดีมาก)\n\n` +
        `กรุณาตรวจสอบ:\n` +
        `1. ข้อมูลทางการเงิน (รายได้/ภาระหนี้) ถูกต้องหรือไม่?\n` +
        `2. การประเมินคุณภาพสอดคล้องกับข้อมูลทางการเงินหรือไม่?\n` +
        `3. มีปัจจัยพิเศษที่ทำให้คะแนนคุณภาพสูงแม้ DSCR ต่ำหรือไม่?\n\n` +
        `กรุณายืนยันข้อมูลก่อนดำเนินการต่อค่ะ 🙏`,
    };
  }

  // Conflict: DSCR > 1.50 (low risk) but qualitative score < 50 (poor)
  if (dscr > 1.50 && qualitativeScore < 50) {
    return {
      hasConflict: true,
      dscr,
      qualitativeScore,
      message: `⚠️ พบความขัดแย้งระหว่างข้อมูล:\n\n` +
        `DSCR: ${dscr.toFixed(2)} (ความเสี่ยงต่ำ)\n` +
        `คะแนนคุณภาพ: ${qualitativeScore}/100 (ต่ำ)\n\n` +
        `กรุณาตรวจสอบ:\n` +
        `1. ข้อมูลทางการเงิน (รายได้/ภาระหนี้) ถูกต้องหรือไม่?\n` +
        `2. การประเมินคุณภาพสอดคล้องกับข้อมูลทางการเงินหรือไม่?\n` +
        `3. มีปัจจัยพิเศษที่ทำให้คะแนนคุณภาพต่ำแม้ DSCR สูงหรือไม่?\n\n` +
        `กรุณายืนยันข้อมูลก่อนดำเนินการต่อค่ะ 🙏`,
    };
  }

  return {
    hasConflict: false,
    dscr,
    qualitativeScore,
  };
}

/**
 * Format DSCR value for display
 * 
 * @param dscr - DSCR value
 * @returns Formatted DSCR string
 * 
 * @example
 * ```typescript
 * formatDSCR(1.5); // "1.50"
 * formatDSCR(2.123); // "2.12"
 * ```
 */
export function formatDSCR(dscr: number): string {
  return dscr.toFixed(2);
}

/**
 * Get DSCR color based on risk level
 * 
 * @param dscr - DSCR value
 * @returns Color class name
 * 
 * @example
 * ```typescript
 * getDSCRColor(1.15); // 'text-red-600'
 * getDSCRColor(1.35); // 'text-amber-600'
 * getDSCRColor(1.75); // 'text-green-600'
 * ```
 */
export function getDSCRColor(dscr: number): string {
  if (dscr < 1.25) {
    return 'text-red-600';
  }
  if (dscr >= 1.25 && dscr <= 1.50) {
    return 'text-amber-600';
  }
  return 'text-green-600';
}

/**
 * Get DSCR background color based on risk level
 * 
 * @param dscr - DSCR value
 * @returns Background color class name
 * 
 * @example
 * ```typescript
 * getDSCRBackgroundColor(1.15); // 'bg-red-50'
 * getDSCRBackgroundColor(1.35); // 'bg-amber-50'
 * getDSCRBackgroundColor(1.75); // 'bg-green-50'
 * ```
 */
export function getDSCRBackgroundColor(dscr: number): string {
  if (dscr < 1.25) {
    return 'bg-red-50';
  }
  if (dscr >= 1.25 && dscr <= 1.50) {
    return 'bg-amber-50';
  }
  return 'bg-green-50';
}

/**
 * Get DSCR border color based on risk level
 * 
 * @param dscr - DSCR value
 * @returns Border color class name
 */
export function getDSCRBorderColor(dscr: number): string {
  if (dscr < 1.25) {
    return 'border-red-200';
  }
  if (dscr >= 1.25 && dscr <= 1.50) {
    return 'border-amber-200';
  }
  return 'border-green-200';
}

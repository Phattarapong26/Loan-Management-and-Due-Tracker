/**
 * Excel Sheet Configuration
 * Based on Evena Entertainment 15-sheet structure
 */

export interface SheetConfig {
  headerRow: number;
  type: string;
  keyFields: string[];
  hasManyMergedCells?: boolean;
  specialHandling?: boolean;
  description: string;
  expectedColumns?: number;
  expectedRows?: number;
}

export const SHEET_CONFIGS: Record<string, SheetConfig> = {
  'รายละเอียด': {
    headerRow: 6,
    type: 'loan_application',
    keyFields: ['ชื่อลูกค้า', 'วงเงิน', 'วัตถุประสงค์', 'ทุนจดทะเบียน'],
    hasManyMergedCells: true,
    specialHandling: true,
    description: 'Main Application Form - รายงานการขออนุมัติสินเชื่อ',
    expectedColumns: 82,
    expectedRows: 197,
  },
  
  'ใบสรุปวงเงิน': {
    headerRow: 3,
    type: 'credit_summary',
    keyFields: ['ลำดับ', 'ประเภท', 'วงเงิน', 'ภาระหนี้', 'ดอกเบี้ย'],
    description: 'Credit Limit Summary',
    expectedColumns: 10,
    expectedRows: 41,
  },
  
  'ภพ 30': {
    headerRow: 3,
    type: 'tax_certificate',
    keyFields: ['ลำดับที่', 'ชื่อบริษัท', 'เลขประจำตัวผู้เสียภาษี', 'จำนวนเงิน'],
    hasManyMergedCells: true,
    description: 'Tax Withholding Certificate (ภ.พ.30)',
    expectedColumns: 9,
    expectedRows: 94,
  },
  
  'ภ.พ.30': { // Alternative name
    headerRow: 3,
    type: 'tax_certificate',
    keyFields: ['ลำดับที่', 'ชื่อบริษัท', 'เลขประจำตัวผู้เสียภาษี', 'จำนวนเงิน'],
    hasManyMergedCells: true,
    description: 'Tax Withholding Certificate (ภ.พ.30)',
    expectedColumns: 9,
    expectedRows: 94,
  },
  
  'โครงสร้าง': {
    headerRow: 5,
    type: 'investment_structure',
    keyFields: ['โครงสร้างการลงทุน', 'ผู้ถือหุ้น', 'สัดส่วน'],
    description: 'Investment Structure',
    expectedColumns: 12,
    expectedRows: 40,
  },
  
  'งบการเงิน': {
    headerRow: 5,
    type: 'financial_statement',
    keyFields: ['รายได้', 'ต้นทุน', 'กำไร', 'ขาดทุน'],
    hasManyMergedCells: true,
    description: 'Financial Statements (Income Statement)',
    expectedColumns: 11,
    expectedRows: 38,
  },
  
  'ความต้องการ': {
    headerRow: 9,
    type: 'capital_requirements',
    keyFields: ['รายการ', 'จำนวนเงิน', 'วัตถุประสงค์'],
    hasManyMergedCells: true,
    description: 'Working Capital Requirements',
    expectedColumns: 14,
    expectedRows: 58,
  },
  
  'ประมาณการ': {
    headerRow: 3,
    type: 'revenue_projection',
    keyFields: ['รายการ', 'เดือน', 'รายได้', 'ต้นทุน'],
    description: 'Revenue Projection',
    expectedColumns: 24,
    expectedRows: 76,
  },
  
  'เครดิตบูโร': {
    headerRow: 5,
    type: 'credit_bureau',
    keyFields: ['ชื่อ', 'สถาบันการเงิน', 'วงเงิน', 'ภาระหนี้'],
    hasManyMergedCells: true,
    specialHandling: true,
    description: 'Credit Bureau Report',
    expectedColumns: 49,
    expectedRows: 61,
  },
  
  'Statement': {
    headerRow: 4,
    type: 'bank_statement',
    keyFields: ['วันที่', 'รายการ', 'ฝาก', 'ถอน', 'คงเหลือ'],
    hasManyMergedCells: true,
    description: 'Bank Statement Analysis',
    expectedColumns: 16,
    expectedRows: 81,
  },
  
  'statement': { // Alternative lowercase
    headerRow: 4,
    type: 'bank_statement',
    keyFields: ['วันที่', 'รายการ', 'ฝาก', 'ถอน', 'คงเหลือ'],
    hasManyMergedCells: true,
    description: 'Bank Statement Analysis',
    expectedColumns: 16,
    expectedRows: 81,
  },
  
  'งบสรรพากร': {
    headerRow: 5,
    type: 'tax_statement',
    keyFields: ['รายได้', 'ค่าใช้จ่าย', 'กำไร', 'ภาษี'],
    description: 'Tax Statements (Income Statement - Tax Basis)',
    expectedColumns: 16,
    expectedRows: 120,
  },
  
  'DSCR (2)': {
    headerRow: 7,
    type: 'dscr_analysis',
    keyFields: ['รายได้', 'รายจ่าย', 'กระแสเงินสด', 'DSCR'],
    hasManyMergedCells: true,
    description: 'Debt Service Coverage Ratio Analysis',
    expectedColumns: 82,
    expectedRows: 50,
  },
  
  'DSCR': { // Alternative name
    headerRow: 7,
    type: 'dscr_analysis',
    keyFields: ['รายได้', 'รายจ่าย', 'กระแสเงินสด', 'DSCR'],
    hasManyMergedCells: true,
    description: 'Debt Service Coverage Ratio Analysis',
    expectedColumns: 82,
    expectedRows: 50,
  },
  
  'ความเห็น': {
    headerRow: 9,
    type: 'approval_comments',
    keyFields: ['เจ้าหน้าที่', 'ความเห็น', 'ข้อเสนอแนะ'],
    hasManyMergedCells: true,
    description: 'Comments and Recommendations',
    expectedColumns: 85,
    expectedRows: 88,
  },
  
  'ประวัติกิจการ': {
    headerRow: 9,
    type: 'business_history',
    keyFields: ['ชื่อกิจการ', 'ประเภทกิจการ', 'วันที่จดทะเบียน'],
    description: 'Business History',
    expectedColumns: 10,
    expectedRows: 43,
  },
  
  'ผู้ขายผู้ซื้อ': {
    headerRow: 2,
    type: 'suppliers_customers',
    keyFields: ['ชื่อ', 'ที่อยู่', 'โทรศัพท์', 'ประเภทสินค้า'],
    hasManyMergedCells: true,
    description: 'Suppliers and Customers',
    expectedColumns: 13,
    expectedRows: 16,
  },
  
  'Sheet2': {
    headerRow: 4,
    type: 'miscellaneous',
    keyFields: [],
    description: 'Miscellaneous/Additional Data',
    expectedColumns: 37,
    expectedRows: 18,
  },
};

/**
 * Get sheet configuration by name
 */
export function getSheetConfig(sheetName: string): SheetConfig | null {
  return SHEET_CONFIGS[sheetName] || null;
}

/**
 * Detect document type based on sheet names
 */
export function detectDocumentType(sheetNames: string[]): {
  type: 'LOAN_APPLICATION' | 'FINANCIAL' | 'TAX_DOC' | 'BANK_STATEMENT' | 'CREDIT_BUREAU' | 'OTHER';
  confidence: number;
  matchedSheets: string[];
} {
  const lowerNames = sheetNames.map(n => n.toLowerCase());
  const matchedSheets: string[] = [];
  
  // Check for loan application (10+ sheets with specific names)
  const loanAppSheets = ['รายละเอียด', 'ใบสรุปวงเงิน', 'งบการเงิน', 'เครดิตบูโร'];
  const loanAppMatches = loanAppSheets.filter(sheet => 
    sheetNames.some(name => name.includes(sheet))
  );
  
  if (sheetNames.length >= 10 && loanAppMatches.length >= 3) {
    return {
      type: 'LOAN_APPLICATION',
      confidence: 0.95,
      matchedSheets: loanAppMatches,
    };
  }
  
  // Check for tax document
  if (lowerNames.some(n => n.includes('ภพ') || n.includes('ภาษี'))) {
    return {
      type: 'TAX_DOC',
      confidence: 0.90,
      matchedSheets: sheetNames.filter(n => n.includes('ภพ') || n.includes('ภาษี')),
    };
  }
  
  // Check for bank statement
  if (lowerNames.some(n => n.includes('statement') || n.includes('บัญชี'))) {
    return {
      type: 'BANK_STATEMENT',
      confidence: 0.85,
      matchedSheets: sheetNames.filter(n => n.toLowerCase().includes('statement')),
    };
  }
  
  // Check for credit bureau
  if (lowerNames.some(n => n.includes('เครดิต') || n.includes('credit') || n.includes('bureau'))) {
    return {
      type: 'CREDIT_BUREAU',
      confidence: 0.85,
      matchedSheets: sheetNames.filter(n => n.includes('เครดิต')),
    };
  }
  
  // Check for financial statement
  if (lowerNames.some(n => n.includes('งบการเงิน') || n.includes('financial'))) {
    return {
      type: 'FINANCIAL',
      confidence: 0.80,
      matchedSheets: sheetNames.filter(n => n.includes('งบการเงิน')),
    };
  }
  
  return {
    type: 'OTHER',
    confidence: 0.50,
    matchedSheets: [],
  };
}

/**
 * Validate sheet structure
 */
export function validateSheetStructure(
  sheetName: string,
  actualRows: number,
  actualColumns: number
): {
  isValid: boolean;
  warnings: string[];
} {
  const config = getSheetConfig(sheetName);
  const warnings: string[] = [];
  
  if (!config) {
    warnings.push(`ไม่พบ configuration สำหรับ sheet "${sheetName}"`);
    return { isValid: false, warnings };
  }
  
  // Check row count (allow 20% variance)
  if (config.expectedRows) {
    const variance = Math.abs(actualRows - config.expectedRows) / config.expectedRows;
    if (variance > 0.2) {
      warnings.push(
        `จำนวนแถวไม่ตรงกับที่คาดหวัง: คาดหวัง ${config.expectedRows} แถว แต่พบ ${actualRows} แถว`
      );
    }
  }
  
  // Check column count (allow 10% variance)
  if (config.expectedColumns) {
    const variance = Math.abs(actualColumns - config.expectedColumns) / config.expectedColumns;
    if (variance > 0.1) {
      warnings.push(
        `จำนวนคอลัมน์ไม่ตรงกับที่คาดหวัง: คาดหวัง ${config.expectedColumns} คอลัมน์ แต่พบ ${actualColumns} คอลัมน์`
      );
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

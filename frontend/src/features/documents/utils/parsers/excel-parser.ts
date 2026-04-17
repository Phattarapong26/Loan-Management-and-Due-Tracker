import { readExcelFile, WorkBook, WorkSheet, getSheetRange } from './core/exceljs-adapter';
import { 
  getSheetConfig, 
  detectDocumentType, 
  validateSheetStructure 
} from './helpers/excel-sheet-config';
import {
  getSheetDataWithMergedCells,
  extractDataFromHeaderRow,
  sheetToStructuredData,
  getMergedCellsStats,
} from './core/excel-merged-cells-handler';

/**
 * Excel Parser - Enhanced Version v3.0
 * รองรับ Evena Entertainment Schema (15 sheets)
 * แก้ปัญหา NaN, missing data, และ merged cells
 * Migrated to ExcelJS for security (no Prototype Pollution/ReDoS)
 */

export interface ParsedBusinessProfile {
  id?: string;
  companyInfo: {
    companyName: string;
    registrationNumber?: string;
    registrationDate?: string;
    registeredCapital?: number;
    paidUpCapital?: number;
    businessType?: string;
    experience?: string;
    address?: string;
    employeeCount?: number;
    description?: string;
    taxId?: string;
    phone?: string;
    email?: string;
    establishmentYear?: number;
  };
  shareholders?: Array<{
    name?: string;
    sharePercentage?: number;
    shareValue?: number;
    hasSigningAuthority?: boolean;
    conditions?: string;
  }>;
  loanSummary: {
    existingLoans?: Array<{
      order?: number;
      loanType?: string;
      productName?: string;
      amount?: number;
      outstandingDebt?: number;
      interestRate?: string;
      loanTerm?: string;
      collateral?: string;
      status?: string;
    }>;
    newLoans?: Array<{
      order?: number;
      loanType?: string;
      productName?: string;
      amount?: number;
      outstandingDebt?: number;
      interestRate?: string;
      loanTerm?: string;
      collateral?: string;
      status?: string;
    }>;
    totalExisting?: number;
    totalNew?: number;
    totalAll?: number;
  };
  financialStatements?: Array<{
    lineItem: string;
    year: string;
    amount: number;
    category: 'revenue' | 'cogs' | 'expense' | 'profit' | 'other' | 'balance-sheet';
  }>;
  balanceSheets?: Array<{
    period: string;
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
  }>;
  vatRecords?: Array<{
    period: string;
    companyName: string;
    taxId: string;
    salesAmount: number;
    salesTax?: number;
    purchaseAmount: number;
    purchaseTax?: number;
    taxWithheld: number;
    tableName?: string;
    cashSales?: number;
    creditSales?: number;
  }>;
  creditBureauReports?: Array<{
    borrowerName: string;
    reportDate: string;
    totalCreditLimit: number;
    totalOutstanding: number;
    creditUtilization: number;
    nplAccounts: number;
    accounts: Array<{
      bank: string;
      accountType: string;
      openDate?: string;
      creditLimit: number;
      outstanding: number;
      monthlyPayment?: number;
      paymentStatus: string;
    }>;
  }>;
  bankStatements?: Array<{
    accountName: string;
    bank: string;
    accountNumber: string;
    accountType: string;
    creditLimit: number;
    period: string;
    openingBalance: number;
    closingBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    averageBalance: number;
    turnover: number;
    monthlyTransactions: Array<{
      month: string;
      withdrawalCount: number;
      withdrawalAmount: number;
      depositCount: number;
      depositAmount: number;
      balance: number;
    }>;
  }>;
  investmentStructure?: {
    totalInvestment: number;
    ownerEquity: number;
    otherLoans: number;
    requestedLoan: number;
    debtToEquityRatio: number;
    investmentItems: Array<{
      item: string;
      amount: number;
    }>;
  };
  collaterals?: Array<{
    type: string;
    description: string;
    estimatedValue: number;
  }>;
  workingCapital?: {
    assets?: Array<{ label: string; amount: number }>;
    liabilities?: Array<{ label: string; amount: number }>;
    accountsReceivable: number;
    inventory: number;
    accountsPayable: number;
    totalNeeded: number;
    existingCredit: number;
    newCredit: number;
    remaining: number;
  };
  revenueProjection?: {
    // Old structure (keep for backward compatibility)
    projectionYear?: number;
    growthRate?: number;
    monthlyProjections?: Array<{
      month: number;
      projectedRevenue: number;
      projectedCost: number;
      projectedProfit: number;
    }>;
    annualTotal?: {
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
    };
    
    // New detailed structure
    taxYears?: Array<{
      year: string;        // e.g., "ปี 2567"
      period?: string;     // e.g., "(ภ.พ.30 ม.ค.68-มิ.ย.68)"
    }>;
    projectionYears?: Array<{
      year: string;        // e.g., "ปี 2568"
      period?: string;
    }>;
    rows?: Array<{
      label: string;       // e.g., "รายได้จากการขาย"
      labelEn?: string;    // e.g., "Sales Revenue"
      taxData: number[];   // Values for each tax year
      taxPercent: number[]; // Percentages for each tax year
      projectionData: number[]; // Values for each projection year
      projectionPercent: number[]; // Percentages for each projection year
      rowType: 'header' | 'revenue' | 'cost' | 'profit' | 'expense' | 'ebitda' | 'debt' | 'dscr' | 'total';
      indent?: number;     // For sub-items (0, 1, 2)
      isEditable?: boolean;
    }>;
  };
  dscr?: {
    customerName: string;
    analysisYear: number;
    netOperatingIncome: number;
    totalDebtService: number;
    dscrRatio: number;
    dscrStatus: string;
  };
  suppliers?: Array<{
    name: string;
    address: string;
    phone: string;
    productType: string;
    paymentTerms: string;
    creditLimit: number;
    contactDuration?: string;
  }>;
  customers?: Array<{
    name: string;
    address: string;
    phone: string;
    productService: string;
    paymentTerms: string;
    salesProportion: number;
    contactDuration?: string;
  }>;
  businessHistory?: {
    establishmentYear: number;
    founder: string;
    businessEvolution: string;
    majorMilestones: Array<{
      year: number;
      event: string;
    }>;
    productsServices: string[];
    targetMarket: string;
    mainCustomers: string[];
    competitors: string[];
  };
  approvalComments?: {
    marketingOfficer?: {
      name: string;
      comments: string;
      date: string;
    };
    creditOfficer?: {
      name: string;
      riskAssessment: string;
      comments: string;
      recommendation: string;
      date: string;
    };
    branchManager?: {
      name: string;
      comments: string;
      recommendation: string;
      date: string;
    };
    approver?: {
      name: string;
      position: string;
      decision: string;
      approvedAmount: number;
      specialConditions: string;
      approvalDate: string;
    };
  };
  recommendation?: string;
  createdAt?: string;
  sourceFileName: string;
  matchConfidence: number;
  sheetsParsed?: string[];
  warnings?: string[];
  enhanced_data?: Record<string, unknown>;
  confidence_score?: number;
  
  // ===== ENHANCED DATA (Raw + Detailed) =====
  enhancedData?: {
    // Raw sheet data
    rawSheets?: Array<{
      sheetName: string;
      sheetIndex: number;
      rowCount: number;
      columnCount: number;
      headers: string[];
      tables: Array<{
        name: string;
        headers: string[];
        rows: unknown[][];
      }>;
      textBlocks: Array<{
        startRow: number;
        endRow: number;
        content: string;
      }>;
    }>;
    
    // Extended financial statements
    extendedFinancialStatements?: Array<{
      period: string;
      revenue: number;
      otherIncome?: number;
      totalRevenue?: number;
      costOfGoodsSold: number;
      grossProfit: number;
      operatingExpenses: number;
      operatingProfit: number;
      ebitda?: number;
      financialExpenses?: number;
      interestExpense?: number;
      depreciation?: number;
      profitBeforeTax?: number;
      tax?: number;
      netProfit: number;
      revenueBreakdown?: Array<{ item: string; amount: number; percentage: number }>;
      expenseBreakdown?: Array<{ item: string; amount: number; percentage: number }>;
    }>;
    
    // Extended balance sheets
    extendedBalanceSheets?: Array<{
      period: string;
      totalAssets: number;
      totalLiabilities: number;
      equity: number;
      currentAssets?: {
        cash: number;
        accountsReceivable: number;
        inventory: number;
        otherCurrentAssets: number;
        total: number;
      };
      nonCurrentAssets?: {
        ppe: number;
        intangibleAssets: number;
        investments: number;
        otherNonCurrentAssets: number;
        total: number;
      };
      currentLiabilities?: {
        accountsPayable: number;
        shortTermLoans: number;
        otherCurrentLiabilities: number;
        total: number;
      };
      nonCurrentLiabilities?: {
        longTermLoans: number;
        otherNonCurrentLiabilities: number;
        total: number;
      };
      equityBreakdown?: {
        registeredCapital: number;
        retainedEarnings: number;
        otherEquity: number;
        total: number;
      };
    }>;
    
    // Executive profiles
    executiveProfiles?: Array<{
      name: string;
      position: string;
      dateOfBirth?: string;
      age?: number;
      maritalStatus?: string;
      idCard?: string;
      address?: string;
      registeredAddress?: string;
      education?: string;
      experience?: string;
      shareholding?: {
        shares: number;
        percentage: number;
        value: number;
      };
    }>;
    
    // Loan rationale
    loanRationale?: {
      purpose: string;
      usageDetails: string;
      repaymentCapability: string;
      businessStrengths: string[];
      businessWeaknesses: string[];
      riskFactors: string[];
      mitigationPlans: string[];
    };
    
    // Detailed approval comments
    detailedApprovalComments?: {
      fullText: string;
      loanDetails: Array<{
        loanType: string;
        amount: number;
        purpose: string;
        term: string;
        interestRate: string;
        conditions: string[];
      }>;
      collateralDetails: Array<{
        type: string;
        description: string;
        owner: string;
        estimatedValue?: number;
      }>;
      guarantorDetails: Array<{
        name: string;
        relationship: string;
        guaranteeAmount: number;
      }>;
      machineryList?: Array<{
        order: number;
        item: string;
        ownFunding: number;
        loanAmount: number;
        total: number;
      }>;
      shareholderSigningAuthority?: Array<{
        name: string;
        sharePercentage: number;
        shareValue: number;
        signingAuthority: string;
        conditions: string;
      }>;
    };
  };
  
  // Index signature for dynamic access
  [key: string]: unknown;
}

// ===== UTILITY FUNCTIONS =====

function getSheetData(sheet: WorkSheet): unknown[][] {
  // Use merged cells handler instead of direct conversion
  return getSheetDataWithMergedCells(sheet) as unknown[][];
}

function safeParseNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    // Remove commas, spaces, and Thai currency symbols
    const cleaned = value.replace(/[,\s฿บาท]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function safeParsePercentage(value: unknown): number {
  const num = safeParseNumber(value);
  // If value contains %, it's already a percentage
  if (typeof value === 'string' && value.includes('%')) {
    return num;
  }
  // If value is between 0-1, convert to percentage
  if (num > 0 && num <= 1) {
    return num * 100;
  }
  return num;
}

function extractCompanyName(text: string): string | null {
  // Pattern: "บริษัท [ชื่อ] จำกัด"
  const patterns = [
    /บริษัท\s+([^\s]+(?:\s+[^\s]+)*?)\s+จำกัด/,
    /บจก\.\s*([^\s]+(?:\s+[^\s]+)*)/,
    /หจก\.\s*([^\s]+(?:\s+[^\s]+)*)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

function extractRegistrationNumber(text: string): string | null {
  // Pattern: 13-digit number near "ทะเบียน" or "เลขที่"
  const match = text.match(/(?:ทะเบียน|เลขที่).*?(\d{13})/);
  if (match) {
    return match[1];
  }
  return null;
}

function extractRegisteredCapital(text: string): number {
  // Pattern: "ทุนจดทะเบียน X.XX ล้านบาท" or "ทุนจดทะเบียน X,XXX,XXX บาท"
  const patterns = [
    /ทุนจดทะเบียน\s+([\d.,]+)\s*ล้านบาท/,
    /ทุนจดทะเบียน\s+([\d.,]+)\s*บาท/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let amount = safeParseNumber(match[1]);
      if (text.includes('ล้าน')) {
        amount *= 1000000;
      }
      return amount;
    }
  }
  return 0;
}

function extractRegistrationDate(text: string): string {
  // Pattern: "15 พ.ค.2562" or "15 พฤษภาคม 2562"
  const match = text.match(/(\d{1,2}\s+(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*\d{4})/);
  if (match) {
    return match[1];
  }
  return '-';
}

function extractShareholders(text: string): ParsedBusinessProfile['shareholders'] {
  const shareholders: ParsedBusinessProfile['shareholders'] = [];

  // Pattern: capture Thai title + name before 'ถือหุ้น'
  // Handles: "นายกมล ย้อยยิ้ม ถือหุ้น 80 %"
  const shareholderPattern = /(นายสาว|นางสาว|นาย|นาง)([^\u0e16]+?)\s+ถือหุ้น\s*([\d.,]+)\s*%/g;

  let match;
  const seen = new Set<string>();

  while ((match = shareholderPattern.exec(text)) !== null) {
    const title = match[1].trim();
    const namePart = match[2].trim();
    const name = (title + ' ' + namePart).trim();
    const percentage = safeParsePercentage(match[3]);

    // Avoid duplicates
    if (seen.has(name)) continue;
    seen.add(name);

    // Find conditions (อำนาจลงนาม) in text after shareholder mention
    const startPos = match.index;
    const endPos = Math.min(text.length, match.index + match[0].length + 50);
    const context = text.substring(startPos, endPos);

    // Check signing authority
    const hasSigningAuthority =
      context.includes('มีอำนาจลงนาม') && !context.includes('ไม่มีอำนาจลงนาม');

    shareholders.push({
      name,
      sharePercentage: percentage,
      shareValue: 0, // Will be calculated later based on registered capital
      hasSigningAuthority,
      conditions: hasSigningAuthority ? 'มีอำนาจลงนาม' : 'ไม่มีอำนาจลงนาม',
    });
  }

  return shareholders;
}

// ===== SHEET PARSERS =====

/**
 * Sheet 1: รายละเอียด (Main Application Form)
 */
export function parseCompanyInfo(
  workbook: WorkBook
): { companyInfo: ParsedBusinessProfile['companyInfo']; shareholders: ParsedBusinessProfile['shareholders'] } {
  let companyName = '';
  let registrationNumber = '';
  let registrationDate = '';
  let registeredCapital = 0;
  let paidUpCapital = 0;
  let shareholderText = '';

  const detailSheet = workbook.Sheets['รายละเอียด'] || workbook.Sheets[workbook.SheetNames[0]];

  if (!detailSheet) {
    console.error('[Parser] ❌ No detail sheet found');
    return {
      companyInfo: {
        companyName: 'ไม่ระบุ',
        registrationNumber: '-',
        registrationDate: '-',
        registeredCapital: 0,
        paidUpCapital: 0,
        businessType: 'ไม่ระบุ',
        experience: '0 ปี',
        address: '-',
        employeeCount: 0,
        description: '-',
        taxId: '-',
        phone: '-',
        email: '-',
      },
      shareholders: [],
    };
  }

  const data = getSheetData(detailSheet);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (!cell || typeof cell !== 'string') continue;

      const cellText = String(cell);

      if (!companyName && cellText.includes('บริษัท')) {
        const extracted = extractCompanyName(cellText);
        if (extracted) companyName = extracted;
      }

      if (!registrationNumber && cellText.includes('ทะเบียน')) {
        const extracted = extractRegistrationNumber(cellText);
        if (extracted) registrationNumber = extracted;
      }

      if (!registrationDate && cellText.includes('จดทะเบียน')) {
        const extracted = extractRegistrationDate(cellText);
        if (extracted !== '-') registrationDate = extracted;
      }

      if (registeredCapital === 0 && cellText.includes('ทุนจดทะเบียน')) {
        const extracted = extractRegisteredCapital(cellText);
        if (extracted > 0) registeredCapital = extracted;
      }

      if (paidUpCapital === 0 && cellText.includes('ทุนชำระแล้ว')) {
        const extracted = extractRegisteredCapital(cellText);
        if (extracted > 0) paidUpCapital = extracted;
      }

      if (cellText.includes('ถือหุ้น')) {
        shareholderText += ' ' + cellText;
      }
    }
  }

  let shareholders = extractShareholders(shareholderText);

  if (registeredCapital > 0) {
    shareholders = shareholders.map(sh => ({
      ...sh,
      shareValue: (registeredCapital * sh.sharePercentage) / 100,
    }));
  }

  return {
    companyInfo: {
      companyName: companyName || 'ไม่ระบุ',
      registrationNumber: registrationNumber || '-',
      registrationDate: registrationDate || '-',
      registeredCapital: registeredCapital || 0,
      paidUpCapital: paidUpCapital || registeredCapital,
      businessType: 'ไม่ระบุ',
      experience: '0 ปี',
      address: '-',
      employeeCount: 0,
      description: '-',
      taxId: registrationNumber || '-',
      phone: '-',
      email: '-',
    },
    shareholders,
  };
}

/**
 * Sheet 2: ใบสรุปวงเงิน (Credit Limit Summary)
 */
export function parseLoanSummary(workbook: WorkBook): ParsedBusinessProfile['loanSummary'] {
  const existingLoans: ParsedBusinessProfile['loanSummary']['existingLoans'] = [];
  const newLoans: ParsedBusinessProfile['loanSummary']['newLoans'] = [];
  let totalExisting = 0;
  let totalNew = 0;

  const loanSheet = workbook.Sheets['ใบสรุปวงเงิน'] || workbook.Sheets[workbook.SheetNames[1]];

  if (!loanSheet) {
    console.error('[Parser] ❌ No loan summary sheet found');
    return { existingLoans, newLoans, totalExisting, totalNew, totalAll: 0 };
  }

  const data = getSheetData(loanSheet);

  let headerRow = -1;
  let colOrder = -1;
  let colType = -1;
  let colAmount = -1;
  let colDebt = -1;
  let colInterest = -1;
  let colTerm = -1;
  let colCollateral = -1;

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    const rowText = row.map((c: unknown) => String(c).toLowerCase()).join(' ');

    if (rowText.includes('ลำดับ') && rowText.includes('วงเงิน')) {
      headerRow = i;

      for (let j = 0; j < row.length; j++) {
        const cellText = String(row[j]).toLowerCase();
        if (cellText.includes('ลำดับ')) colOrder = j;
        if (cellText.includes('ประเภท')) colType = j;
        // FIX: วงเงิน must come BEFORE ภาระหนี้ in column order
        if (cellText.includes('วงเงิน') && colAmount === -1) colAmount = j;
        if ((cellText.includes('ภาระหนี้') || cellText.includes('คงเหลือ')) && colDebt === -1) colDebt = j;
        if (cellText.includes('ดอกเบี้ย')) colInterest = j;
        if (cellText.includes('ระยะเวลา')) colTerm = j;
        if (cellText.includes('หลักประกัน') || cellText.includes('ผู้ค้ำ')) colCollateral = j;
      }

      break;
    }
  }

  if (headerRow === -1) {
    console.warn('[Parser] ⚠️ No header row found in loan summary');
    return { existingLoans, newLoans, totalExisting, totalNew, totalAll: 0 };
  }

  let currentSection: 'existing' | 'new' | null = null;
  let currentLoan: (ParsedBusinessProfile['loanSummary'] extends { existingLoans?: Array<infer T> } ? T : never) | null = null;

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    const rowText = row.map((c: unknown) => String(c).toLowerCase()).join(' ');

    if (rowText.includes('เดิม') || rowText.includes('วงเงินที่มีอยู่')) {
      currentSection = 'existing';
      continue;
    }
    if (rowText.includes('ครั้งนี้') || rowText.includes('วงเงินใหม่') || rowText.includes('วงเงินที่ขอ')) {
      currentSection = 'new';
      continue;
    }
    if (rowText.includes('รวม')) {
      currentSection = null;
      currentLoan = null;
      continue;
    }

    if (currentSection && row.length > Math.max(colOrder, colType, colAmount)) {
      const order = colOrder >= 0 ? String(row[colOrder]).trim() : '';
      const type = colType >= 0 ? String(row[colType]).trim() : 'PN';
      const amountStr = colAmount >= 0 ? String(row[colAmount]).trim() : '0';
      const debtStr = colDebt >= 0 ? String(row[colDebt]).trim() : '0';

      const amount = safeParseNumber(amountStr);
      const debt = safeParseNumber(debtStr);

      if ((order && order !== '' && !isNaN(parseInt(order))) || amount >= 10000) {
        if (currentLoan) {
          if (currentSection === 'existing') {
            existingLoans.push(currentLoan);
            totalExisting += currentLoan.amount;
          } else {
            newLoans.push(currentLoan);
            totalNew += currentLoan.amount;
          }
        }

        // FIX: If amount is 0 from mapped column, scan all cells for largest number
        let finalAmount = amount;
        if (finalAmount === 0) {
          let maxNum = 0;
          for (let c = 0; c < row.length; c++) {
            if (c === colOrder || c === colDebt || c === colInterest) continue;
            const num = safeParseNumber(row[c]);
            if (num >= 10000 && num > maxNum) maxNum = num;
          }
          if (maxNum > 0) finalAmount = maxNum;
        }

        currentLoan = {
          order: parseInt(order) || (currentSection === 'existing' ? existingLoans.length + 1 : newLoans.length + 1),
          loanType: type.toUpperCase() || 'PN',
          productName: 'สินเชื่อ SME',
          amount: finalAmount,
          outstandingDebt: debt,
          interestRate: colInterest >= 0 ? String(row[colInterest] || '-').trim() : '-',
          loanTerm: colTerm >= 0 ? String(row[colTerm] || '-').trim() : '-',
          collateral: colCollateral >= 0 ? String(row[colCollateral] || '-').trim() : '-',
          status: currentSection === 'existing' ? 'เดิม' : 'ใหม่',
        };

        if (i > 0) {
          const prevRow = data[i - 1];
          const prevText = prevRow.map((c: unknown) => String(c)).join(' ');
          if (prevText.includes('โครงการ')) {
            currentLoan.productName = prevText.trim();
          }
        }
      } else if (currentLoan) {
        const interestText = colInterest >= 0 ? String(row[colInterest] || '').trim() : '';
        const collateralText = colCollateral >= 0 ? String(row[colCollateral] || '').trim() : '';

        if (interestText && interestText !== '-') {
          currentLoan.interestRate = currentLoan.interestRate === '-'
            ? interestText
            : currentLoan.interestRate + ' ' + interestText;
        }

        if (collateralText && collateralText !== '-') {
          currentLoan.collateral = currentLoan.collateral === '-'
            ? collateralText
            : currentLoan.collateral + ' ' + collateralText;
        }
      }
    }
  }

  if (currentLoan) {
    if (currentSection === 'existing') {
      existingLoans.push(currentLoan);
      totalExisting += currentLoan.amount;
    } else if (currentSection === 'new') {
      newLoans.push(currentLoan);
      totalNew += currentLoan.amount;
    }
  }

  console.log('[Parser] Loan parsing complete:', {
    existingLoans: existingLoans.length,
    newLoans: newLoans.length,
    totalExisting,
    totalNew,
  });

  return {
    existingLoans,
    newLoans,
    totalExisting,
    totalNew,
    totalAll: totalExisting + totalNew,
  };
}

/**
 * Main parser function - Enhanced version v3.0
 * Parses all 15 sheets from Evena Entertainment schema
 * WITH merged cells support and sheet-specific handling
 */
export async function parseExcel(file: File): Promise<ParsedBusinessProfile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = await readExcelFile(arrayBuffer);

        console.log('[Parser v3] ✅ Processing workbook with', workbook.SheetNames.length, 'sheets');
        console.log('[Parser v3] Sheet names:', workbook.SheetNames);

        const warnings: string[] = [];
        const sheetsParsed: string[] = [];
        const sheetValidations: Record<string, unknown> = {};

        // Auto-detect document type
        const docTypeInfo = detectDocumentType(workbook.SheetNames);
        console.log('[Parser v3] 📋 Document Type:', docTypeInfo.type, `(${Math.round(docTypeInfo.confidence * 100)}% confidence)`);
        console.log('[Parser v3] 📊 Matched Sheets:', docTypeInfo.matchedSheets);

        // Validate each sheet structure
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const config = getSheetConfig(sheetName);
          
          if (config) {
            const range = getSheetRange(sheet);
            const actualRows = range.e.r + 1;
            const actualColumns = range.e.c + 1;
            
            const validation = validateSheetStructure(sheetName, actualRows, actualColumns);
            sheetValidations[sheetName] = validation;
            
            if (!validation.isValid) {
              warnings.push(...validation.warnings);
            }
            
            // Log merged cells stats
            const mergedStats = getMergedCellsStats(sheet);
            console.log(`[Parser v3] 📄 ${sheetName}:`, {
              rows: actualRows,
              cols: actualColumns,
              mergedRanges: mergedStats.totalMergedRanges,
              mergedCells: mergedStats.totalMergedCells,
              headerRow: config.headerRow,
            });
          }
        }

        // Import extended parsers
        const {
          parseVATRecords,
          parseFinancialStatements,
          parseBalanceSheets,
          parseCreditBureauReports,
          parseBankStatements,
          parseDSCR,
          parseSuppliersAndCustomers,
        } = await import('./extended/excel-parser-extended');
        
        // Import sheet-specific parsers
        const {
          parseRevenueProjection,
          parseApprovalComments,
          parseBusinessHistory,
          parseWorkingCapitalRequirements,
          parseInvestmentStructure,
        } = await import('./extended/excel-sheet-parsers');
        
        // Import detailed parsers
        const {
          parseRevenueProjectionDetailed,
        } = await import('./extended/parsers');

        // Parse all sheets
        const { companyInfo, shareholders } = parseCompanyInfo(workbook);
        sheetsParsed.push('รายละเอียด');

        const loanSummary = parseLoanSummary(workbook);
        sheetsParsed.push('ใบสรุปวงเงิน');

        const vatRecords = parseVATRecords(workbook);
        if (vatRecords.length > 0) sheetsParsed.push('ภพ 30');

        const financialStatements = parseFinancialStatements(workbook);
        if (financialStatements.length > 0) sheetsParsed.push('งบการเงิน');

        const balanceSheets = parseBalanceSheets(workbook);
        // Balance sheets are in the same sheet as financial statements, no need to add to sheetsParsed again

        const creditBureauReports = parseCreditBureauReports(workbook);
        if (creditBureauReports.length > 0) sheetsParsed.push('เครดิตบูโร');

        const bankStatements = parseBankStatements(workbook);
        if (bankStatements.length > 0) sheetsParsed.push('Statement');

        const dscr = parseDSCR(workbook);
        if (dscr.dscrRatio > 0) sheetsParsed.push('DSCR');

        const { suppliers, customers } = parseSuppliersAndCustomers(workbook);
        if (suppliers.length > 0 || customers.length > 0) sheetsParsed.push('ผู้ขายผู้ซื้อ');

        // Parse new sheets (Phase 2)
        // Try detailed parser first, fallback to old parser
        let revenueProjection = parseRevenueProjectionDetailed(workbook);
        if (!revenueProjection.rows || revenueProjection.rows.length === 0) {
          console.log('[Parser v3] ⚠️ Detailed revenue projection parser found no data, trying old parser...');
          revenueProjection = parseRevenueProjection(workbook);
        }
        if ((revenueProjection.rows && revenueProjection.rows.length > 0) || 
            (revenueProjection.monthlyProjections && revenueProjection.monthlyProjections.length > 0)) {
          sheetsParsed.push('ประมาณการ');
        }

        const approvalComments = parseApprovalComments(workbook);
        if (Object.keys(approvalComments).length > 0) sheetsParsed.push('ความเห็น');

        const businessHistory = parseBusinessHistory(workbook);
        if (businessHistory.establishmentYear > 0) sheetsParsed.push('ประวัติกิจการ');

        const workingCapitalReq = parseWorkingCapitalRequirements(workbook);
        if (workingCapitalReq.totalNeeded > 0) sheetsParsed.push('ความต้องการ');

        const investmentStructure = parseInvestmentStructure(workbook);
        if (investmentStructure.totalInvestment > 0) sheetsParsed.push('โครงสร้าง');

        // ===== PHASE 2: ENHANCED DATA EXTRACTION =====
        console.log('[Parser v3] 🚀 Phase 2: Extracting enhanced data...');
        
        let enhancedData: ParsedBusinessProfile['enhancedData'];
        
        try {
          // Import raw data extractor
          const { extractRawData } = await import('./helpers/excel-raw-data-extractor');
          
          // Import enhanced parsers
          const {
            parseExtendedFinancialStatements,
            parseExtendedBalanceSheets,
            parseExecutiveProfiles,
            parseLoanRationale,
            parseDetailedApprovalComments,
          } = await import('./extended/excel-enhanced-parsers');
          
          // Extract raw data
          const rawDataExtraction = extractRawData(workbook);
          
          // Parse enhanced data
          const extendedFinancialStatements = parseExtendedFinancialStatements(workbook);
          const extendedBalanceSheets = parseExtendedBalanceSheets(workbook);
          const executiveProfiles = parseExecutiveProfiles(workbook);
          const loanRationale = parseLoanRationale(workbook);
          const detailedApprovalComments = parseDetailedApprovalComments(workbook);
          
          enhancedData = {
            rawSheets: rawDataExtraction.sheets.map(sheet => ({
              sheetName: sheet.sheetName,
              sheetIndex: sheet.sheetIndex,
              rowCount: sheet.rowCount,
              columnCount: sheet.columnCount,
              headers: sheet.headers,
              tables: sheet.tables.map(table => ({
                name: table.name,
                headers: table.headers,
                rows: table.rows,
              })),
              textBlocks: sheet.textBlocks.map(tb => ({
                startRow: tb.startRow,
                endRow: tb.endRow || tb.startRow,
                content: tb.content,
              })),
            })),
            extendedFinancialStatements,
            extendedBalanceSheets,
            executiveProfiles,
            loanRationale: loanRationale || undefined,
            detailedApprovalComments: detailedApprovalComments || undefined,
          };
          
          console.log('[Parser v3] ✅ Enhanced data extracted:', {
            rawSheets: enhancedData.rawSheets?.length || 0,
            extendedFinancialStatements: extendedFinancialStatements.length,
            extendedBalanceSheets: extendedBalanceSheets.length,
            executiveProfiles: executiveProfiles.length,
            hasLoanRationale: !!loanRationale,
            hasDetailedApprovalComments: !!detailedApprovalComments,
          });
        } catch (error) {
          console.error('[Parser v3] ⚠️ Enhanced data extraction failed:', error);
          enhancedData = undefined;
        }

        // Calculate confidence score (improved algorithm)
        let confidence = 0;
        const maxScore = 112; // Increased to account for Phase 2 sheets + investment structure

        // Company info (25 points)
        if (companyInfo.companyName !== 'ไม่ระบุ') confidence += 10;
        if (companyInfo.registrationNumber !== '-') confidence += 10;
        if (companyInfo.registeredCapital > 0) confidence += 5;

        // Shareholders (10 points)
        if (shareholders.length > 0) {
          confidence += 5;
          // Bonus if shareholding adds up to ~100%
          const totalShares = shareholders.reduce((sum, sh) => sum + sh.sharePercentage, 0);
          if (totalShares >= 95 && totalShares <= 105) confidence += 5;
        }

        // Loan summary (30 points)
        if (loanSummary.newLoans.length > 0) confidence += 20;
        if (loanSummary.totalNew > 0) confidence += 10;

        // Financial data (20 points)
        if (financialStatements.length > 0) confidence += 10;
        if (vatRecords.length > 0) confidence += 5;
        if (bankStatements.length > 0) confidence += 5;

        // Additional data (15 points)
        if (creditBureauReports.length > 0) confidence += 5;
        if (dscr.dscrRatio > 0) confidence += 5;
        if (suppliers.length > 0 || customers.length > 0) confidence += 5;

        // Phase 2 sheets (10 points)
        if (revenueProjection?.monthlyProjections?.length > 0 || revenueProjection?.rows?.length > 0) confidence += 3;
        if (Object.keys(approvalComments).length > 0) confidence += 3;
        if (businessHistory.establishmentYear > 0) confidence += 2;
        if (workingCapitalReq.totalNeeded > 0) confidence += 2;
        if (investmentStructure.totalInvestment > 0) confidence += 2;

        // Warnings
        if (companyInfo.companyName === 'ไม่ระบุ') {
          warnings.push('⚠️ ไม่พบชื่อบริษัท');
        }
        if (loanSummary.newLoans.length === 0) {
          warnings.push('⚠️ ไม่พบข้อมูลวงเงินใหม่');
        }
        if (shareholders.length === 0) {
          warnings.push('⚠️ ไม่พบข้อมูลผู้ถือหุ้น');
        }
        
        // Cross-sheet validation
        const crossSheetWarnings = validateCrossSheetConsistency({
          companyInfo,
          vatRecords,
          financialStatements,
          balanceSheets,
        });
        warnings.push(...crossSheetWarnings);

        const profile: ParsedBusinessProfile = {
          id: crypto.randomUUID(),
          companyInfo,
          shareholders,
          loanSummary,
          financialStatements,
          balanceSheets,
          vatRecords,
          creditBureauReports,
          bankStatements,
          investmentStructure: {
            totalInvestment: investmentStructure.totalInvestment || 0,
            ownerEquity: investmentStructure.ownerEquity || 0,
            otherLoans: investmentStructure.otherLoans || 0,
            requestedLoan: investmentStructure.requestedLoan || 0,
            debtToEquityRatio: investmentStructure.debtToEquityRatio || 0,
            investmentItems: investmentStructure.investmentItems || [],
          },
          collaterals: [],
          workingCapital: {
            accountsReceivable: workingCapitalReq.accountsReceivable || 0,
            inventory: workingCapitalReq.inventory || 0,
            accountsPayable: workingCapitalReq.accountsPayable || 0,
            totalNeeded: workingCapitalReq.totalNeeded || 0,
            existingCredit: workingCapitalReq.existingCredit || 0,
            newCredit: workingCapitalReq.newCredit || 0,
            remaining: workingCapitalReq.remaining || 0,
          },
          revenueProjection,
          dscr,
          suppliers,
          customers,
          businessHistory: {
            establishmentYear: businessHistory.establishmentYear || 0,
            founder: businessHistory.founder || '',
            businessEvolution: businessHistory.businessEvolution || '',
            majorMilestones: businessHistory.majorMilestones || [],
            productsServices: businessHistory.productsServices || [],
            targetMarket: businessHistory.targetMarket || '',
            mainCustomers: businessHistory.mainCustomers || [],
            competitors: businessHistory.competitors || [],
          },
          approvalComments,
          recommendation: '',
          createdAt: new Date().toISOString(),
          sourceFileName: file.name,
          matchConfidence: Math.min(confidence / maxScore, 1),
          sheetsParsed,
          warnings,
          enhancedData,
        };

        console.log('[Parser v3] ✅ Parsing complete!', {
          company: profile.companyInfo.companyName,
          registration: profile.companyInfo.registrationNumber,
          capital: profile.companyInfo.registeredCapital,
          shareholders: profile.shareholders.length,
          newLoans: profile.loanSummary.newLoans.length,
          totalAmount: profile.loanSummary.totalNew,
          sheetsParsed: profile.sheetsParsed.length,
          confidence: Math.round(profile.matchConfidence * 100) + '%',
          warnings: profile.warnings.length,
          documentType: docTypeInfo.type,
        });

        // Debug: Log all parsed data counts
        console.log('[Parser v3] 📊 Data Summary:', {
          financialStatements: profile.financialStatements.length,
          vatRecords: profile.vatRecords.length,
          creditBureauReports: profile.creditBureauReports.length,
          bankStatements: profile.bankStatements.length,
          workingCapital: profile.workingCapital.totalNeeded,
          revenueProjection: profile.revenueProjection?.monthlyProjections?.length || profile.revenueProjection?.rows?.length || 0,
          dscr: profile.dscr.dscrRatio,
          businessHistory: profile.businessHistory.establishmentYear,
          suppliers: profile.suppliers.length,
          customers: profile.customers.length,
        });

        // 🔍 DETAILED OBJECT STRUCTURE FOR UI DEVELOPMENT
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📦 FULL PARSED OBJECT STRUCTURE (for UI development):');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(JSON.stringify(profile, null, 2));
        console.log('═══════════════════════════════════════════════════════════');
        console.log('💡 TIP: Copy this JSON to understand the complete data structure');
        console.log('═══════════════════════════════════════════════════════════');

        resolve(profile);
      } catch (err) {
        console.error('[Parser v3] ❌ Error:', err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate cross-sheet consistency
 */
function validateCrossSheetConsistency(data: {
  companyInfo: ParsedBusinessProfile['companyInfo'];
  vatRecords: ParsedBusinessProfile['vatRecords'];
  financialStatements: ParsedBusinessProfile['financialStatements'];
  balanceSheets: ParsedBusinessProfile['balanceSheets'];
}): string[] {
  const warnings: string[] = [];
  
  // Check company name consistency
  const companyNames = new Set<string>();
  
  if (data.companyInfo.companyName !== 'ไม่ระบุ') {
    companyNames.add(data.companyInfo.companyName);
  }
  
  data.vatRecords.forEach(vat => {
    if (vat.companyName) companyNames.add(vat.companyName);
  });
  
  if (companyNames.size > 1) {
    warnings.push(`⚠️ ชื่อบริษัทไม่ตรงกันระหว่าง sheets: ${Array.from(companyNames).join(', ')}`);
  }
  
  // Validate Financial Statements
  if (data.financialStatements.length > 0) {
    // Group by year
    const byYear = data.financialStatements.reduce((acc, item) => {
      if (!acc[item.year]) acc[item.year] = [];
      acc[item.year].push(item);
      return acc;
    }, {} as Record<string, typeof data.financialStatements>);
    
    Object.entries(byYear).forEach(([year, items]) => {
      // Check if year name is suspicious
      if (year.match(/^\d+\.?\d*$/) || !year.includes('ปี')) {
        warnings.push(`⚠️ งบการเงิน: ชื่อปีผิดปกติ "${year}" - อาจอ่าน column ผิด`);
      }
      
      // Check if has revenue
      const hasRevenue = items.some(item => item.category === 'revenue' && item.amount > 0);
      if (!hasRevenue) {
        warnings.push(`⚠️ งบการเงิน ${year}: ไม่พบรายได้ - ข้อมูลอาจไม่สมบูรณ์`);
      }
      
      // Check if has profit
      const hasProfit = items.some(item => item.category === 'profit');
      if (!hasProfit) {
        warnings.push(`⚠️ งบการเงิน ${year}: ไม่พบกำไร/ขาดทุน - ข้อมูลอาจไม่สมบูรณ์`);
      }
    });
    
    // Check if too many years (should be 2-3 years max)
    if (Object.keys(byYear).length > 4) {
      warnings.push(`⚠️ งบการเงิน: พบ ${Object.keys(byYear).length} ปี (มากเกินไป) - ควรมี 2-3 ปี`);
    }
  }
  
  // Validate Balance Sheets
  if (data.balanceSheets.length === 0 && data.financialStatements.length > 0) {
    warnings.push('⚠️ ไม่พบงบดุล แต่มีงบกำไรขาดทุน - ข้อมูลไม่สมบูรณ์');
  }
  
  return warnings;
}

export function formatCurrency(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0.00';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}


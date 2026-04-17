/**
 * Enhanced Parsers - Parse ข้อมูลแบบละเอียดจาก Raw Data
 * ใช้ร่วมกับ excel-raw-data-extractor.ts
 */

import { WorkBook } from '../core/exceljs-adapter';
import {
  extractRawData,
  findSheetByName,
  findTableInSheet,
  getTextBlocksInRange,
  getCellValue,
  findRowsByPattern,
  RawSheetData,
  RawTable,
  ExtendedFinancialStatement,
  ExtendedBalanceSheet,
  ExecutiveProfile,
  LoanRationale,
  DetailedApprovalComments,
} from '../helpers/excel-raw-data-extractor';
import { fillMergedCells, getSheetDataWithMergedCells } from '../core/excel-merged-cells-handler';

// ===== UTILITY =====

function safeParseNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s฿บาท]/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    if (value.includes('ล้าน')) return parsed * 1000000;
    return parsed;
  }
  return 0;
}

// ===== ENHANCED FINANCIAL STATEMENTS PARSER =====

export function parseExtendedFinancialStatements(workbook: WorkBook): ExtendedFinancialStatement[] {
  console.log('[Enhanced Parser] Parsing extended financial statements...');
  
  const rawData = extractRawData(workbook);
  const sheet = findSheetByName(rawData.sheets, 'งบการเงิน') || 
                findSheetByName(rawData.sheets, 'งบสรรพากร') ||
                findSheetByName(rawData.sheets, /financial/i);
  
  if (!sheet) {
    console.log('[Enhanced Parser] ❌ Financial statement sheet not found');
    return [];
  }
  
  console.log(`[Enhanced Parser] ✅ Found sheet: "${sheet.sheetName}"`);
  
  const statements: ExtendedFinancialStatement[] = [];
  const sheetData = workbook.Sheets[sheet.sheetName];
  const filledSheet = fillMergedCells(sheetData);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  // Find year columns
  const yearColumns: Array<{ col: number; period: string }> = [];
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '');
      const yearMatch = cell.match(/ปี\s*(\d{2,4})/);
      if (yearMatch) {
        const year = yearMatch[1].length === 2 ? `25${yearMatch[1]}` : yearMatch[1];
        yearColumns.push({ col: j, period: year });
      }
    }
    
    if (yearColumns.length >= 2) break;
  }
  
  console.log(`[Enhanced Parser] Found ${yearColumns.length} year columns:`, yearColumns);
  
  // Parse each year
  for (const { col, period } of yearColumns) {
    const statement: ExtendedFinancialStatement = {
      period,
      revenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      operatingProfit: 0,
      netProfit: 0,
      revenueBreakdown: [],
      expenseBreakdown: [],
    };
    
    // Parse line items
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const label = String(row[0] || '').toLowerCase();
      const value = safeParseNumber(row[col]);
      
      // Revenue items
      if (label.includes('รายได้จากการบริการ') || label.includes('รายได้จากการขาย')) {
        statement.revenue = value;
        statement.revenueBreakdown?.push({
          item: String(row[0]),
          amount: value,
          percentage: 0,
        });
      }
      if (label.includes('รายได้อื่น')) {
        statement.otherIncome = value;
        statement.revenueBreakdown?.push({
          item: String(row[0]),
          amount: value,
          percentage: 0,
        });
      }
      if (label.includes('รวมรายได้')) {
        statement.totalRevenue = value;
      }
      
      // Cost items
      if (label.includes('ต้นทุนบริการ') || label.includes('ต้นทุนขาย')) {
        statement.costOfGoodsSold = value;
      }
      if (label.includes('รวมต้นทุน')) {
        statement.costOfGoodsSold = value;
      }
      
      // Profit items
      if (label.includes('กำไรขั้นต้น')) {
        statement.grossProfit = value;
      }
      
      // Expenses
      if (label.includes('ค่าใช้จ่ายในการขายและบริหาร')) {
        statement.operatingExpenses = value;
        statement.expenseBreakdown?.push({
          item: String(row[0]),
          amount: value,
          percentage: 0,
        });
      }
      if (label.includes('รวมค่าใช้จ่าย')) {
        statement.operatingExpenses = value;
      }
      
      // EBITDA
      if (label.includes('ebitda')) {
        statement.ebitda = value;
      }
      
      // Financial expenses
      if (label.includes('ต้นทุนทางการเงิน') || label.includes('ดอกเบี้ยจ่าย')) {
        statement.financialExpenses = value;
        statement.interestExpense = value;
      }
      
      // Depreciation
      if (label.includes('ค่าเสื่อม')) {
        statement.depreciation = value;
      }
      
      // Profit before tax
      if (label.includes('กำไรก่อนดอกเบี้ย') || label.includes('กำไรก่อนภาษี')) {
        statement.profitBeforeTax = value;
      }
      
      // Net profit
      if (label.includes('กำไรสุทธิ') || label.includes('คงเหลือเฉลี่ยต่อเดือน')) {
        statement.netProfit = value;
      }
    }
    
    // Calculate percentages
    if (statement.totalRevenue && statement.totalRevenue > 0) {
      statement.revenueBreakdown?.forEach(item => {
        item.percentage = (item.amount / statement.totalRevenue!) * 100;
      });
      statement.expenseBreakdown?.forEach(item => {
        item.percentage = (item.amount / statement.totalRevenue!) * 100;
      });
    }
    
    statements.push(statement);
  }
  
  console.log(`[Enhanced Parser] ✅ Parsed ${statements.length} financial statements`);
  return statements;
}

// ===== ENHANCED BALANCE SHEET PARSER =====

export function parseExtendedBalanceSheets(workbook: WorkBook): ExtendedBalanceSheet[] {
  console.log('[Enhanced Parser] Parsing extended balance sheets...');
  
  const rawData = extractRawData(workbook);
  const sheet = findSheetByName(rawData.sheets, 'งบการเงิน') || 
                findSheetByName(rawData.sheets, 'งบสรรพากร') ||
                findSheetByName(rawData.sheets, /balance/i);
  
  if (!sheet) {
    console.log('[Enhanced Parser] ❌ Balance sheet not found');
    return [];
  }
  
  const balanceSheets: ExtendedBalanceSheet[] = [];
  const sheetData = workbook.Sheets[sheet.sheetName];
  const filledSheet = fillMergedCells(sheetData);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  // Find year columns (same as financial statements)
  const yearColumns: Array<{ col: number; period: string }> = [];
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '');
      const yearMatch = cell.match(/ปี\s*(\d{2,4})/);
      if (yearMatch) {
        const year = yearMatch[1].length === 2 ? `25${yearMatch[1]}` : yearMatch[1];
        yearColumns.push({ col: j, period: year });
      }
    }
    
    if (yearColumns.length >= 2) break;
  }
  
  // Find balance sheet section (usually after row 30)
  let balanceSheetStartRow = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const label = String(row[0] || '').toLowerCase();
    if (label.includes('สินทรัพย์หมุนเวียน') || label.includes('current assets')) {
      balanceSheetStartRow = i;
      break;
    }
  }
  
  if (balanceSheetStartRow === -1) {
    console.log('[Enhanced Parser] ⚠️ Balance sheet section not found');
    return [];
  }
  
  console.log(`[Enhanced Parser] Found balance sheet section at row ${balanceSheetStartRow}`);
  
  // Parse each year
  for (const { col, period } of yearColumns) {
    const balanceSheet: ExtendedBalanceSheet = {
      period,
      totalAssets: 0,
      totalLiabilities: 0,
      equity: 0,
      currentAssets: {
        cash: 0,
        accountsReceivable: 0,
        inventory: 0,
        otherCurrentAssets: 0,
        total: 0,
      },
      nonCurrentAssets: {
        ppe: 0,
        intangibleAssets: 0,
        investments: 0,
        otherNonCurrentAssets: 0,
        total: 0,
      },
      currentLiabilities: {
        accountsPayable: 0,
        shortTermLoans: 0,
        otherCurrentLiabilities: 0,
        total: 0,
      },
      nonCurrentLiabilities: {
        longTermLoans: 0,
        otherNonCurrentLiabilities: 0,
        total: 0,
      },
      equityBreakdown: {
        registeredCapital: 0,
        retainedEarnings: 0,
        otherEquity: 0,
        total: 0,
      },
    };
    
    // Parse line items
    for (let i = balanceSheetStartRow; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const label = String(row[0] || '').toLowerCase();
      const value = safeParseNumber(row[col]);
      
      // Current Assets
      if (label.includes('เงินสดและรายการเทียบเท่าเงินสด') || label.includes('cash')) {
        balanceSheet.currentAssets!.cash = value;
      }
      if (label.includes('ลูกหนี้การค้า') || label.includes('receivable')) {
        balanceSheet.currentAssets!.accountsReceivable = value;
      }
      if (label.includes('สินค้าคงคลัง') || label.includes('inventory')) {
        balanceSheet.currentAssets!.inventory = value;
      }
      if (label.includes('รวมสินทรัพย์หมุนเวียน')) {
        balanceSheet.currentAssets!.total = value;
      }
      
      // Non-Current Assets
      if (label.includes('ที่ดิน อาคาร และอุปกรณ์') || label.includes('ppe')) {
        balanceSheet.nonCurrentAssets!.ppe = value;
      }
      if (label.includes('สินทรัพย์ไม่มีตัวตน')) {
        balanceSheet.nonCurrentAssets!.intangibleAssets = value;
      }
      if (label.includes('รวมสินทรัพย์ไม่หมุนเวียน')) {
        balanceSheet.nonCurrentAssets!.total = value;
      }
      
      // Total Assets
      if (label.includes('รวมสินทรัพย์') && !label.includes('หมุนเวียน') && !label.includes('ไม่หมุนเวียน')) {
        balanceSheet.totalAssets = value;
      }
      
      // Current Liabilities
      if (label.includes('เจ้าหนี้การค้า') || label.includes('payable')) {
        balanceSheet.currentLiabilities!.accountsPayable = value;
      }
      if (label.includes('เงินกู้ระยะสั้น')) {
        balanceSheet.currentLiabilities!.shortTermLoans = value;
      }
      if (label.includes('รวมหนี้สินหมุนเวียน')) {
        balanceSheet.currentLiabilities!.total = value;
      }
      
      // Non-Current Liabilities
      if (label.includes('เงินกู้ระยะยาว')) {
        balanceSheet.nonCurrentLiabilities!.longTermLoans = value;
      }
      if (label.includes('รวมหนี้สินไม่หมุนเวียน')) {
        balanceSheet.nonCurrentLiabilities!.total = value;
      }
      
      // Total Liabilities
      if (label === 'รวมหนี้สิน' || (label.includes('รวมหนี้สิน') && !label.includes('และส่วนผู้ถือหุ้น'))) {
        balanceSheet.totalLiabilities = value;
      }
      
      // Equity
      if (label.includes('ทุนจดทะเบียน')) {
        balanceSheet.equityBreakdown!.registeredCapital = value;
      }
      if (label.includes('กำไรสะสม')) {
        balanceSheet.equityBreakdown!.retainedEarnings = value;
      }
      if (label.includes('รวมส่วนของผู้ถือหุ้น')) {
        balanceSheet.equity = value;
        balanceSheet.equityBreakdown!.total = value;
      }
    }
    
    balanceSheets.push(balanceSheet);
  }
  
  console.log(`[Enhanced Parser] ✅ Parsed ${balanceSheets.length} balance sheets`);
  return balanceSheets;
}

// ===== EXECUTIVE PROFILE PARSER =====

export function parseExecutiveProfiles(workbook: WorkBook): ExecutiveProfile[] {
  console.log('[Enhanced Parser] Parsing executive profiles...');
  
  const rawData = extractRawData(workbook);
  const sheet = findSheetByName(rawData.sheets, 'ประวัติ') ||
                findSheetByName(rawData.sheets, /executive/i);
  
  if (!sheet) {
    console.log('[Enhanced Parser] ❌ Executive profile sheet not found');
    return [];
  }
  
  const profiles: ExecutiveProfile[] = [];
  const sheetData = workbook.Sheets[sheet.sheetName];
  const filledSheet = fillMergedCells(sheetData);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  let currentProfile: Partial<ExecutiveProfile> | null = null;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const label = String(row[0] || '').toLowerCase();
    const value = String(row[1] || '');
    
    // Start new profile
    if (label.includes('ชื่อ') && !label.includes('ชื่อ-สกุล') && value.length > 0) {
      if (currentProfile && currentProfile.name) {
        profiles.push(currentProfile as ExecutiveProfile);
      }
      currentProfile = {
        name: value,
        position: '',
      };
    }
    
    if (!currentProfile) continue;
    
    // Parse fields
    if (label.includes('วันเดือนปี') || label.includes('เกิด')) {
      currentProfile.dateOfBirth = value;
    }
    if (label.includes('อายุ')) {
      currentProfile.age = parseInt(value);
    }
    if (label.includes('สถานะภาพ')) {
      currentProfile.maritalStatus = value;
    }
    if (label.includes('บัตรประชาชน')) {
      currentProfile.idCard = value;
    }
    if (label.includes('ที่อยู่ตามบัตร')) {
      currentProfile.address = value;
    }
    if (label.includes('ที่อยู่ตามทะเบียน')) {
      currentProfile.registeredAddress = value;
    }
    if (label.includes('การศึกษา')) {
      currentProfile.education = value;
    }
    if (label.includes('ประสบการณ์')) {
      currentProfile.experience = value;
    }
  }
  
  // Add last profile
  if (currentProfile && currentProfile.name) {
    profiles.push(currentProfile as ExecutiveProfile);
  }
  
  console.log(`[Enhanced Parser] ✅ Parsed ${profiles.length} executive profiles`);
  return profiles;
}

// ===== LOAN RATIONALE PARSER =====

export function parseLoanRationale(workbook: WorkBook): LoanRationale | null {
  console.log('[Enhanced Parser] Parsing loan rationale...');
  
  const rawData = extractRawData(workbook);
  const sheet = findSheetByName(rawData.sheets, 'เหตุผล') ||
                findSheetByName(rawData.sheets, 'ความต้องการ') ||
                findSheetByName(rawData.sheets, /rationale/i);
  
  if (!sheet) {
    console.log('[Enhanced Parser] ❌ Loan rationale sheet not found');
    return null;
  }
  
  const textBlocks = sheet.textBlocks;
  const fullText = textBlocks.map(tb => tb.content).join('\n\n');
  
  const rationale: LoanRationale = {
    purpose: '',
    usageDetails: '',
    repaymentCapability: '',
    businessStrengths: [],
    businessWeaknesses: [],
    riskFactors: [],
    mitigationPlans: [],
  };
  
  // Extract purpose
  const purposeMatch = fullText.match(/วัตถุประสงค์[:\s]*([^\n]+)/i);
  if (purposeMatch) {
    rationale.purpose = purposeMatch[1].trim();
  }
  
  // Extract usage details
  const usageMatch = fullText.match(/การใช้เงิน[:\s]*([^\n]+)/i);
  if (usageMatch) {
    rationale.usageDetails = usageMatch[1].trim();
  }
  
  console.log('[Enhanced Parser] ✅ Parsed loan rationale');
  return rationale;
}

// ===== DETAILED APPROVAL COMMENTS PARSER =====

export function parseDetailedApprovalComments(workbook: WorkBook): DetailedApprovalComments | null {
  console.log('[Enhanced Parser] Parsing detailed approval comments...');
  
  const rawData = extractRawData(workbook);
  const sheet = findSheetByName(rawData.sheets, 'ความเห็น') ||
                findSheetByName(rawData.sheets, /approval/i);
  
  if (!sheet) {
    console.log('[Enhanced Parser] ❌ Approval comments sheet not found');
    return null;
  }
  
  const sheetData = workbook.Sheets[sheet.sheetName];
  const filledSheet = fillMergedCells(sheetData);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  const comments: DetailedApprovalComments = {
    fullText: '',
    loanDetails: [],
    collateralDetails: [],
    guarantorDetails: [],
  };
  
  // Extract full text
  const textBlocks = sheet.textBlocks;
  comments.fullText = textBlocks.map(tb => tb.content).join('\n\n');
  
  // Parse loan details
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const text = String(row[0] || '');
    
    // Detect loan type
    if (text.includes('เงินกู้ระยะสั้น') || text.includes('P/N')) {
      const amountMatch = text.match(/([\d,]+)\s*บาท/);
      if (amountMatch) {
        comments.loanDetails.push({
          loanType: 'P/N',
          amount: safeParseNumber(amountMatch[1]),
          purpose: '',
          term: '',
          interestRate: '',
          conditions: [],
        });
      }
    }
    
    if (text.includes('เงินกู้ระยะยาว') || text.includes('F/L')) {
      const amountMatch = text.match(/([\d.]+)\s*ล้านบาท/);
      if (amountMatch) {
        comments.loanDetails.push({
          loanType: 'F/L',
          amount: safeParseNumber(amountMatch[1]) * 1000000,
          purpose: '',
          term: '',
          interestRate: '',
          conditions: [],
        });
      }
    }
  }
  
  console.log(`[Enhanced Parser] ✅ Parsed approval comments with ${comments.loanDetails.length} loan details`);
  return comments;
}

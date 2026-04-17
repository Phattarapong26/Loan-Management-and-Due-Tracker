/**
 * Confidence Calculator for Excel Parser Results
 * Calculates how confident we are in the parsed data quality
 */

import { ParsedBusinessProfile } from '../excel-parser';

export interface ConfidenceReport {
  overall: number; // 0-100
  breakdown: {
    companyInfo: number;
    shareholders: number;
    loanSummary: number;
    financialStatements: number;
    balanceSheets: number;
    vatRecords: number;
    creditBureau: number;
    bankStatements: number;
    dscr: number;
  };
  missingFields: string[];
  lowQualityFields: string[];
  warnings: string[];
}

export function calculateConfidence(
  profile: ParsedBusinessProfile
): ConfidenceReport {
  const breakdown = {
    companyInfo: 0,
    shareholders: 0,
    loanSummary: 0,
    financialStatements: 0,
    balanceSheets: 0,
    vatRecords: 0,
    creditBureau: 0,
    bankStatements: 0,
    dscr: 0,
  };

  const missingFields: string[] = [];
  const lowQualityFields: string[] = [];

  // Company Info (15 points)
  if (profile.companyInfo?.companyName) {
    breakdown.companyInfo += 10;
    if (profile.companyInfo.registrationNumber) breakdown.companyInfo += 5;
  } else {
    missingFields.push('companyInfo');
  }

  // Shareholders (10 points)
  const shareholders = profile.shareholders || [];
  if (shareholders.length > 0) {
    breakdown.shareholders += 5;
    const totalPercentage = shareholders.reduce((sum, s) => sum + s.sharePercentage, 0);
    if (Math.abs(totalPercentage - 100) < 1) breakdown.shareholders += 5; // Close to 100%
  } else {
    missingFields.push('shareholders');
  }

  // Loan Summary (10 points)
  const loans = profile.loanSummary;
  if (loans && (loans.existingLoans.length > 0 || loans.newLoans.length > 0)) {
    // Give points even if amount is 0 (structure exists)
    breakdown.loanSummary += 7;
    // Bonus if has actual amounts
    const hasAmount = loans.totalNew > 0 || loans.totalExisting > 0;
    if (hasAmount) breakdown.loanSummary += 3;
  } else {
    missingFields.push('loanSummary');
  }

  // Financial Statements (25 points)
  const stmts = profile.financialStatements || [];
  if (stmts.length >= 2) {
    breakdown.financialStatements += 15;
    const hasRevenue = stmts.some(s => s.revenue > 0);
    const hasProfit = stmts.some(s => s.netProfit !== 0);
    if (hasRevenue) breakdown.financialStatements += 5;
    if (hasProfit) breakdown.financialStatements += 5;
  } else if (stmts.length === 1) {
    breakdown.financialStatements += 10;
    lowQualityFields.push('financialStatements');
  } else {
    missingFields.push('financialStatements');
  }

  // Balance Sheets (20 points)
  const balances = profile.balanceSheets || [];
  if (balances.length >= 2) {
    breakdown.balanceSheets += 12; // Give more base points for having 2 years
    // Check if accounting equation balances (Assets = Liabilities + Equity)
    const balanced = balances.every(b => {
      if (b.totalAssets === 0) return false;
      const diff = Math.abs(b.totalAssets - b.totalLiabilities - b.equity);
      return diff / b.totalAssets < 0.01; // Within 1%
    });
    if (balanced) {
      breakdown.balanceSheets += 8;
    } else {
      // Still give partial credit if data exists but doesn't balance
      lowQualityFields.push('balanceSheets (ไม่สมดุล)');
      breakdown.balanceSheets += 4;
    }
  } else if (balances.length === 1) {
    breakdown.balanceSheets += 10;
    lowQualityFields.push('balanceSheets (เพียง 1 ปี)');
  } else {
    missingFields.push('balanceSheets');
  }

  // VAT Records (10 points)
  const vat = profile.vatRecords || [];
  if (vat.length >= 12) {
    breakdown.vatRecords += 10;
  } else if (vat.length >= 6) {
    breakdown.vatRecords += 7;
    lowQualityFields.push('vatRecords');
  } else if (vat.length > 0) {
    breakdown.vatRecords += 4;
    lowQualityFields.push('vatRecords');
  } else {
    missingFields.push('vatRecords');
  }

  // Credit Bureau (5 points)
  if ((profile.creditBureauReports?.length || 0) > 0) {
    breakdown.creditBureau += 5;
  } else {
    missingFields.push('creditBureau');
  }

  // Bank Statements (3 points)
  if ((profile.bankStatements?.length || 0) > 0) {
    breakdown.bankStatements += 3;
  } else {
    missingFields.push('bankStatements');
  }

  // DSCR (2 points)
  if (profile.dscr?.dscrRatio && profile.dscr.dscrRatio > 0) {
    breakdown.dscr += 2;
  } else {
    missingFields.push('dscr');
  }

  // Calculate overall
  const overall = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    overall,
    breakdown,
    missingFields,
    lowQualityFields,
    warnings: profile.warnings || [],
  };
}



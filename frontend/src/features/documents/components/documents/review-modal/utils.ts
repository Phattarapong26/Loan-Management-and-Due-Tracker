/**
 * Utility functions for Document Review Modal
 */

import { ParsedBusinessProfile } from '../../../utils/parsers/excel-parser';
import { SectionCounts } from './types';

/**
 * Normalize profile data to ensure consistent structure
 */
export function normalizeProfile(data: ParsedBusinessProfile): ParsedBusinessProfile {
  return {
    ...data,
    companyInfo: data.companyInfo || { companyName: '' },
    shareholders: data.shareholders || [],
    loanSummary: data.loanSummary || { existingLoans: [], newLoans: [], totalExisting: 0, totalNew: 0, totalAll: 0 },
    financialStatements: data.financialStatements || [],
    balanceSheets: data.balanceSheets || [],
    vatRecords: data.vatRecords || [],
    creditBureauReports: data.creditBureauReports || [],
    bankStatements: (data.bankStatements || []).map(stmt => ({
      ...stmt,
      accountType: stmt.accountType || '',
      creditLimit: stmt.creditLimit || 0,
      monthlyTransactions: stmt.monthlyTransactions || []
    })),
    investmentStructure: data.investmentStructure || { totalInvestment: 0, ownerEquity: 0, otherLoans: 0, requestedLoan: 0, debtToEquityRatio: 0, investmentItems: [] },
    collaterals: data.collaterals || [],
    workingCapital: data.workingCapital || { accountsReceivable: 0, inventory: 0, accountsPayable: 0, totalNeeded: 0, existingCredit: 0, newCredit: 0, remaining: 0, assets: [], liabilities: [] },
    revenueProjection: data.revenueProjection || { projectionYear: 0, growthRate: 0, monthlyProjections: [], annualTotal: { totalRevenue: 0, totalCost: 0, totalProfit: 0 } },
    dscr: data.dscr || { customerName: '', analysisYear: 0, netOperatingIncome: 0, totalDebtService: 0, dscrRatio: 0, dscrStatus: '' },
    businessHistory: data.businessHistory || { establishmentYear: 0, founder: '', businessEvolution: '', majorMilestones: [], productsServices: [], targetMarket: '', mainCustomers: [], competitors: [] },
    suppliers: data.suppliers || [],
    customers: data.customers || [],
    approvalComments: data.approvalComments,
    recommendation: data.recommendation || '',
    matchConfidence: data.matchConfidence || 0,
    sourceFileName: data.sourceFileName || '',
    sheetsParsed: data.sheetsParsed || [],
    warnings: data.warnings || [],
    enhancedData: data.enhancedData,
  };
}

/**
 * Calculate section counts for badges
 */
export function calculateSectionCounts(profile: ParsedBusinessProfile): SectionCounts {
  const approvalCommentsCount = profile.approvalComments ? 
    Object.keys(profile.approvalComments).filter(key => 
      profile.approvalComments![key as keyof typeof profile.approvalComments]
    ).length : 0;

  return {
    companyInfo: profile.companyInfo?.companyName ? 1 : 0,
    shareholders: (profile.shareholders || []).length,
    loanSummary: ((profile.loanSummary?.existingLoans || []).length) + ((profile.loanSummary?.newLoans || []).length),
    financial: ((profile.financialStatements || []).length) + ((profile.balanceSheets || []).length),
    vatRecords: (profile.vatRecords || []).length,
    creditBureau: (profile.creditBureauReports || []).length,
    bankStatements: (profile.bankStatements || []).length,
    investment: (profile.investmentStructure?.totalInvestment || 0) > 0 ? 1 : 0,
    collateral: (profile.collaterals || []).length,
    workingCapital: (profile.workingCapital?.totalNeeded || 0) > 0 ? 1 : 0,
    revenueProjection: (profile.revenueProjection?.monthlyProjections || []).length,
    dscr: profile.dscr?.dscrRatio ? 1 : 0,
    businessHistory: profile.businessHistory?.establishmentYear ? 1 : 0,
    products: ((profile.suppliers || []).length) + ((profile.customers || []).length),
    approvalComments: approvalCommentsCount,
    recommendation: profile.recommendation ? 1 : 0,
    debug: 1,
  };
}

/**
 * Display value or "-" for empty values
 */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '' || value === 0) {
    return '-';
  }
  if (typeof value === 'number') {
    return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

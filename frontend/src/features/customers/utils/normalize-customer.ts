/**
 * Utility functions for normalizing customer data
 * Ensures consistent structure for extractedData
 */

import type { ParsedBusinessProfile } from '@/features/documents/utils/parsers/excel-parser';

/**
 * Convert value to string, handling Date objects
 */
function toStringValue(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]; // Return YYYY-MM-DD
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Format value for display, handling Date objects and numbers
 */
export function formatDisplayValue(value: any): string {
  if (value instanceof Date) {
    return value.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'number') {
    return value.toLocaleString('th-TH');
  }
  return String(value);
}

/**
 * Normalize extractedData to ensure all fields exist with default values
 */
export function normalizeExtractedData(data: any): ParsedBusinessProfile | undefined {
  if (!data) return undefined;

  return {
    companyInfo: {
      companyName: data.companyInfo?.companyName || '',
      registrationNumber: data.companyInfo?.registrationNumber || '',
      establishmentYear: data.companyInfo?.establishmentYear || 0,
      registeredCapital: data.companyInfo?.registeredCapital || 0,
      paidUpCapital: data.companyInfo?.paidUpCapital || 0,
      businessType: data.companyInfo?.businessType || '',
      address: data.companyInfo?.address || '',
      phoneNumber: data.companyInfo?.phoneNumber || '',
      email: data.companyInfo?.email || '',
      website: data.companyInfo?.website || '',
      description: data.companyInfo?.description || '',
      history: data.companyInfo?.history || '',
      experience: data.companyInfo?.experience || '',
      employeeCount: data.companyInfo?.employeeCount || 0,
      pumpCount: data.companyInfo?.pumpCount || 0,
      founder: data.companyInfo?.founder || '',
      ...data.companyInfo
    },
    shareholders: (data.shareholders || []).map((s: any) => ({
      ...s,
      name: toStringValue(s.name),
    })),
    loanSummary: {
      existingLoans: data.loanSummary?.existingLoans || [],
      newLoans: data.loanSummary?.newLoans || [],
      totalExisting: data.loanSummary?.totalExisting || 0,
      totalNew: data.loanSummary?.totalNew || 0,
      totalAll: data.loanSummary?.totalAll || 0,
      ...data.loanSummary
    },
    financialStatements: (data.financialStatements || []).map((stmt: any) => ({
      ...stmt,
      period: toStringValue(stmt.period),
    })),
    balanceSheets: (data.balanceSheets || []).map((bs: any) => ({
      ...bs,
      period: toStringValue(bs.period),
    })),
    vatRecords: (data.vatRecords || []).map((vat: any) => ({
      ...vat,
      period: toStringValue(vat.period),
    })),
    creditBureauReports: (data.creditBureauReports || []).map((report: any) => ({
      ...report,
      reportDate: toStringValue(report.reportDate),
    })),
    bankStatements: (data.bankStatements || []).map((stmt: any) => ({
      ...stmt,
      accountType: stmt.accountType || '',
      creditLimit: stmt.creditLimit || 0,
      monthlyTransactions: (stmt.monthlyTransactions || []).map((tx: any) => ({
        ...tx,
        month: toStringValue(tx.month),
      })),
    })),
    investmentStructure: {
      totalInvestment: data.investmentStructure?.totalInvestment || 0,
      ownerEquity: data.investmentStructure?.ownerEquity || 0,
      otherLoans: data.investmentStructure?.otherLoans || 0,
      requestedLoan: data.investmentStructure?.requestedLoan || 0,
      debtToEquityRatio: data.investmentStructure?.debtToEquityRatio || 0,
      investmentItems: data.investmentStructure?.investmentItems || [],
      ...data.investmentStructure
    },
    collaterals: (data.collaterals || []).map((col: any) => ({
      ...col,
      valuationDate: toStringValue(col.valuationDate),
    })),
    workingCapital: {
      accountsReceivable: data.workingCapital?.accountsReceivable || 0,
      inventory: data.workingCapital?.inventory || 0,
      accountsPayable: data.workingCapital?.accountsPayable || 0,
      totalNeeded: data.workingCapital?.totalNeeded || 0,
      existingCredit: data.workingCapital?.existingCredit || 0,
      newCredit: data.workingCapital?.newCredit || 0,
      remaining: data.workingCapital?.remaining || 0,
      assets: data.workingCapital?.assets || [],
      liabilities: data.workingCapital?.liabilities || [],
      ...data.workingCapital
    },
    revenueProjection: {
      projectionYear: data.revenueProjection?.projectionYear || 0,
      growthRate: data.revenueProjection?.growthRate || 0,
      monthlyProjections: data.revenueProjection?.monthlyProjections || [],
      annualTotal: {
        totalRevenue: data.revenueProjection?.annualTotal?.totalRevenue || 0,
        totalCost: data.revenueProjection?.annualTotal?.totalCost || 0,
        totalProfit: data.revenueProjection?.annualTotal?.totalProfit || 0,
        ...data.revenueProjection?.annualTotal
      },
      ...data.revenueProjection
    },
    dscr: {
      customerName: data.dscr?.customerName || '',
      analysisYear: data.dscr?.analysisYear || 0,
      netOperatingIncome: data.dscr?.netOperatingIncome || 0,
      totalDebtService: data.dscr?.totalDebtService || 0,
      dscrRatio: data.dscr?.dscrRatio || 0,
      dscrStatus: data.dscr?.dscrStatus || '',
      ...data.dscr
    },
    businessHistory: {
      establishmentYear: data.businessHistory?.establishmentYear || data.companyInfo?.establishmentYear || 0,
      founder: data.businessHistory?.founder || data.companyInfo?.founder || '',
      businessEvolution: data.businessHistory?.businessEvolution || '',
      majorMilestones: data.businessHistory?.majorMilestones || [],
      productsServices: data.businessHistory?.productsServices || [],
      targetMarket: data.businessHistory?.targetMarket || '',
      mainCustomers: data.businessHistory?.mainCustomers || [],
      competitors: data.businessHistory?.competitors || []
    },
    suppliers: data.suppliers || [],
    customers: data.customers || [],
    recommendation: data.recommendation || '',
    matchConfidence: data.matchConfidence || 0,
    sourceFileName: data.sourceFileName || '',
    sheetsParsed: data.sheetsParsed || [],
    warnings: data.warnings || [],
    enhancedData: data.enhancedData,
    processingStatus: data.processingStatus,
  };
}

/**
 * Sanitize Date objects in nested structures
 */
export function sanitizeDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeDates);
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeDates(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

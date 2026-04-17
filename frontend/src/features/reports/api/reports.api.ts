/**
 * Reports API - Report generation endpoints
 */

import { reportsApi } from '@/shared/lib/api-endpoints';

export interface BranchSummaryReport {
  branchId: string;
  branchName: string;
  totalLoans: number;
  activeLoans: number;
  totalAmount: number;
  collectionRate: number;
  nplRatio: number;
  dateFrom: string;
  dateTo: string;
}

export interface NPLReportItem {
  loanId: string;
  customerName: string;
  amount: number;
  daysOverdue: number;
  outstandingBalance: number;
  lastPaymentDate?: string;
  branchName: string;
}

export interface OfficerPerformanceItem {
  officerId: string;
  officerName: string;
  collected: number;
  target: number;
  collectionRate: number;
  loansManaged: number;
  branchName: string;
}

export interface GenerateReportParams {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Generate branch summary report
 */
export const generateBranchSummary = async (params?: GenerateReportParams) => {
  return reportsApi.generateBranchSummary(params);
};

/**
 * Generate NPL report
 */
export const generateNPLReport = async (params?: GenerateReportParams) => {
  return reportsApi.generateNPLReport(params);
};

/**
 * Generate officer performance report
 */
export const generateOfficerPerformance = async (params?: GenerateReportParams) => {
  return reportsApi.generateOfficerPerformance(params);
};

// Export all reports API functions
export const reportsApiService = {
  generateBranchSummary,
  generateNPLReport,
  generateOfficerPerformance,
};

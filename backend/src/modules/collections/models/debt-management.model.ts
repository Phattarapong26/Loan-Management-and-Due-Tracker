/**
 * Debt Management Models
 * Data models for debt management analytics and reporting
 */

import { z } from 'zod';

// Query schema for debt management summary
export const debtManagementQuerySchema = z.object({
  year: z.string().optional(),
  month: z.string().optional(),
  region: z.string().optional(),
  zone: z.string().optional(),
  branchId: z.string().optional(),
});

export type DebtManagementQuery = z.infer<typeof debtManagementQuerySchema>;

// Contract size distribution
export interface ContractSizeDistribution {
  small: number;  // 0-1M
  medium: number; // 1-3M
  large: number;  // 5-15M
}

// Loan type distribution
export interface LoanTypeDistribution {
  [productName: string]: number;
}

// Collateral type distribution
export interface CollateralTypeDistribution {
  land: number;
  machinery: number;
  vehicle: number;
  deposit: number;
  other: number;
}

// Interest rate comparison data point
export interface InterestRateDataPoint {
  month: string;
  actual: number;
  expected: number;
}

// Summary statistics
export interface DebtManagementSummary {
  totalLoans: number;
  totalOutstanding: number;
  performingCount: number;
  performingAmount: number;
  performingPercentage: number;
  overdueCount: number;
  overdueAmount: number;
  overduePercentage: number;
  nplCount: number;
  nplAmount: number;
  nplPercentage: number;
}

// Complete debt management response
export interface DebtManagementResponse {
  summary: DebtManagementSummary;
  contractSizeDistribution: ContractSizeDistribution;
  loanTypeDistribution: LoanTypeDistribution;
  collateralTypeDistribution: CollateralTypeDistribution;
  interestRateComparison: InterestRateDataPoint[];
}

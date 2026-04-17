/**
 * Business Profile Types
 * 
 * Type definitions for business profile data
 * These types mirror the ParsedBusinessProfile from frontend but are independent
 */

export interface BusinessProfileShareholder {
  name: string;
  sharePercentage: number;
  shareValue: number;
  hasSigningAuthority?: boolean;
  conditions?: string;
}

export interface BusinessProfileLoan {
  loanType: string;
  productName: string;
  amount: number;
  loanTerm?: string;
  interestRate?: string;
  collateral?: string;
  status?: string;
}

export interface BusinessProfileLoanSummary {
  existingLoans?: BusinessProfileLoan[];
  newLoans?: BusinessProfileLoan[];
}

export interface BusinessProfileCollateral {
  type: string;
  description: string;
  estimatedValue: number;
}

export interface BusinessProfileSupplier {
  name: string;
  address?: string;
  phone?: string;
  productType?: string;
  paymentTerms?: string;
  creditLimit?: number;
  contactDuration?: string;
}

export interface BusinessProfileCustomer {
  name: string;
  address?: string;
  phone?: string;
  productService?: string;
  paymentTerms?: string;
  salesProportion?: number;
  contactDuration?: string;
}

export interface BusinessProfileDSCR {
  analysisYear?: number;
  netOperatingIncome: number;
  totalDebtService: number;
  dscrRatio: number;
  dscrStatus?: string;
}

export interface BusinessProfileApprovalComment {
  marketingOfficer?: {
    name: string;
    comments: string;
    date?: string;
  };
  creditOfficer?: {
    name: string;
    comments: string;
    riskAssessment?: string;
    recommendation?: string;
    date?: string;
  };
  branchManager?: {
    name: string;
    comments: string;
    recommendation?: string;
    date?: string;
  };
  approver?: {
    name: string;
    position?: string;
    decision?: string;
    approvedAmount?: number;
    specialConditions?: string;
    approvalDate?: string;
  };
}

export interface BusinessProfileFinancialStatement {
  lineItem: string;
  year: string;
  amount: number;
  category: 'revenue' | 'cogs' | 'expense' | 'profit' | 'other' | 'balance-sheet';
}

export interface BusinessProfileBalanceSheet {
  year: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
}

export interface BusinessProfileVATRecord {
  period: string;
  companyName?: string;
  taxId?: string;
  salesAmount: number;
  salesTax?: number;
  purchaseAmount: number;
  purchaseTax?: number;
  taxWithheld: number;
}

export interface BusinessProfileCreditBureauReport {
  borrowerName: string;
  reportDate?: string;
  totalCreditLimit?: number;
  totalOutstanding?: number;
  nplAccounts: number;
  accounts?: any[];
}

export interface BusinessProfileBankStatement {
  bank: string;
  accountNumber: string;
  accountName?: string;
  monthlyTransactions?: Array<{
    month: string;
    withdrawalCount?: number;
    withdrawalAmount?: number;
    depositCount?: number;
    depositAmount?: number;
    balance?: number;
  }>;
}

/**
 * Main Business Profile Data Structure
 * This represents the parsed data from Excel files
 */
export interface ParsedBusinessProfile {
  sourceFileName: string;
  matchConfidence: number;
  sheetsParsed?: string[];
  warnings?: string[];
  
  // Business data
  shareholders?: BusinessProfileShareholder[];
  loanSummary?: BusinessProfileLoanSummary;
  collaterals?: BusinessProfileCollateral[];
  suppliers?: BusinessProfileSupplier[];
  customers?: BusinessProfileCustomer[];
  
  // Financial data
  financialStatements?: BusinessProfileFinancialStatement[];
  balanceSheets?: BusinessProfileBalanceSheet[];
  vatRecords?: BusinessProfileVATRecord[];
  creditBureauReports?: BusinessProfileCreditBureauReport[];
  bankStatements?: BusinessProfileBankStatement[];
  
  // Analysis
  dscr?: BusinessProfileDSCR;
  approvalComments?: BusinessProfileApprovalComment;
  
  // Enhanced data (JSON)
  enhancedData?: any;
  recommendation?: string;
}

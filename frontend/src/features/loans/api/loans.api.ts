/**
 * Loans API - Loan management endpoints
 */

import { loansApi } from '@/shared/lib/api-endpoints';

export type LoanStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'rejected' | 'npl';

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  outstandingBalance: number;
  status: LoanStatus;
  purpose: string;
  disbursementDate?: string;
  maturityDate?: string;
  branchId: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanData {
  customerId: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  purpose: string;
  disbursementDate?: string;
}

export interface ListLoansParams {
  page?: number;
  limit?: number;
  status?: LoanStatus;
  customerId?: string;
  branchId?: string;
}

/**
 * List loans
 */
export const listLoans = async (params?: ListLoansParams) => {
  return loansApi.list(params);
};

/**
 * Get loan by ID
 */
export const getLoanById = async (id: string) => {
  return loansApi.getById(id);
};

/**
 * Create loan
 */
export const createLoan = async (data: CreateLoanData) => {
  return loansApi.create(data);
};

/**
 * Get pending approvals
 */
export const getPendingApprovals = async () => {
  return loansApi.getPendingApprovals();
};

/**
 * Approve loan
 */
export const approveLoan = async (
  id: string, 
  data: { 
    disbursementDate?: string; 
    firstPaymentDate?: string;
    paymentDay?: number;
    notes?: string;
  }
) => {
  return loansApi.approve(id, data);
};

/**
 * Reject loan
 */
export const rejectLoan = async (id: string, reason: string) => {
  return loansApi.reject(id, { reason });
};

// Export all loans API functions
export const loansApiService = {
  listLoans,
  getLoanById,
  createLoan,
  getPendingApprovals,
  approveLoan,
  rejectLoan,
};

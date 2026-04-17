/**
 * Expenses API - Expense management endpoints
 */

import { expensesApi } from '@/shared/lib/api-endpoints';

export type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'reimbursed';
export type ExpenseCategory = 'travel' | 'office' | 'marketing' | 'utilities' | 'salary' | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
  receiptPath?: string;
  status: ExpenseStatus;
  branchId: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  reimbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseData {
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
  receiptPath?: string;
}

export interface UpdateExpenseData {
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  expenseDate?: string;
  receiptPath?: string;
}

export interface ListExpensesParams {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApproveExpenseData {
  notes?: string;
}

export interface RejectExpenseData {
  reason: string;
}

/**
 * List expenses
 */
export const listExpenses = async (params?: ListExpensesParams) => {
  return expensesApi.list(params);
};

/**
 * Get expense by ID
 */
export const getExpenseById = async (id: string) => {
  return expensesApi.getById(id);
};

/**
 * Create expense
 */
export const createExpense = async (data: CreateExpenseData) => {
  return expensesApi.create(data);
};

/**
 * Update expense
 */
export const updateExpense = async (id: string, data: UpdateExpenseData) => {
  return expensesApi.update(id, data);
};

/**
 * Approve expense
 */
export const approveExpense = async (id: string, data?: ApproveExpenseData) => {
  return expensesApi.approve(id, data);
};

/**
 * Reject expense
 */
export const rejectExpense = async (id: string, data: RejectExpenseData) => {
  return expensesApi.reject(id, data);
};

/**
 * Mark expense as reimbursed
 */
export const reimburseExpense = async (id: string) => {
  return expensesApi.reimburse(id);
};

// Export all expenses API functions
export const expensesApiService = {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
};

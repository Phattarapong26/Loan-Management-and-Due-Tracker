/**
 * Payments API - Payment management endpoints
 */

import { paymentsApi } from '@/shared/lib/api-endpoints';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'mobile_banking';

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  receiptNumber?: string;
  notes?: string;
  processedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentData {
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount?: number;
  receiptNumber?: string;
  notes?: string;
}

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  loanId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * List payments
 */
export const listPayments = async (params?: ListPaymentsParams) => {
  return paymentsApi.list(params);
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (id: string) => {
  return paymentsApi.getById(id);
};

/**
 * Create payment
 */
export const createPayment = async (data: CreatePaymentData) => {
  return paymentsApi.create(data);
};

/**
 * Get loan payment history
 */
export const getLoanPaymentHistory = async (loanId: string) => {
  return paymentsApi.getLoanHistory(loanId);
};

// Export all payments API functions
export const paymentsApiService = {
  listPayments,
  getPaymentById,
  createPayment,
  getLoanPaymentHistory,
};

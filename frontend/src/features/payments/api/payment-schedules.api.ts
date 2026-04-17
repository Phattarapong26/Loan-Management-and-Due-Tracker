/**
 * Payment Schedules API
 */

import { apiClient } from '@/shared/lib/api-client';

export interface PaymentSchedule {
  id: string;
  loanId: string;
  paymentNumber: number;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'UNPAID' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  paidAt?: string;
  loan?: {
    id: string;
    customer?: {
      id: string;
      businessName: string;
    };
  };
  payments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
  }>;
}

/**
 * Get payment schedules for a loan
 */
export const getByLoanId = async (loanId: string) => {
  return apiClient.get<{
    schedules: PaymentSchedule[];
    total: number;
    loan: {
      id: string;
      customerId: string;
      customerName: string;
      outstandingBalance: number;
    };
  }>(`/api/loans/${loanId}/payment-schedules`);
};

/**
 * Get overdue payment schedules for a customer
 */
export const getOverdueByCustomer = async (customerId: string) => {
  return apiClient.get<{
    schedules: PaymentSchedule[];
    total: number;
  }>(`/api/customers/${customerId}/payment-schedules/overdue`);
};

/**
 * Get upcoming payment schedules for a customer
 */
export const getUpcomingByCustomer = async (customerId: string) => {
  return apiClient.get<{
    schedules: PaymentSchedule[];
    total: number;
  }>(`/api/customers/${customerId}/payment-schedules/upcoming`);
};

/**
 * Get all unpaid payment schedules for a customer
 */
export const getUnpaidByCustomer = async (customerId: string) => {
  return apiClient.get<{
    schedules: PaymentSchedule[];
    total: number;
  }>(`/api/customers/${customerId}/payment-schedules/unpaid`);
};

export const paymentSchedulesApi = {
  getByLoanId,
  getOverdueByCustomer,
  getUpcomingByCustomer,
  getUnpaidByCustomer,
};

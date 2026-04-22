import { apiClient } from '@/shared/lib/api-client';

export interface Disbursement {
  id: string;
  loanId: string;
  disbursementNo: number;
  amount: number;
  purpose: string;
  requestedDate: string;
  status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  disbursedBy?: string;
  disbursedAt?: string;
  disbursementMethod?: string;
  referenceNo?: string;
  nextDisbursementDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  loan: {
    id: string;
    principal: number;
    totalDisbursed: number;
    remainingAmount: number;
    customer: {
      id: string;
      businessName: string;
      customerCode: string;
    };
    branch: {
      id: string;
      name: string;
      code: string;
    };
  };
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface DisbursementStats {
  pending: number;
  approved: number;
  disbursed: number;
  rejected: number;
  totalAmount: number;
  disbursedAmount: number;
  pendingAmount: number;
}

export const disbursementsApi = {
  // List disbursements
  list: async (params?: {
    page?: number;
    limit?: number;
    loanId?: string;
    customerId?: string;
    branchId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    return apiClient.get('/api/disbursements', params);
  },

  // Get disbursement by ID
  getById: async (id: string) => {
    return apiClient.get(`/api/disbursements/${id}`);
  },

  // Create disbursement
  create: async (data: {
    loanId: string;
    amount: number;
    purpose: string;
    requestedDate: string;
    nextDisbursementDate?: string;
    notes?: string;
  }) => {
    return apiClient.post('/api/disbursements', data);
  },

  // Update disbursement
  update: async (id: string, data: {
    amount?: number;
    purpose?: string;
    requestedDate?: string;
    nextDisbursementDate?: string;
    notes?: string;
    firstPaymentDate?: string;
    paymentDay?: number;
  }) => {
    return apiClient.patch(`/api/disbursements/${id}`, data);
  },

  // Approve disbursement
  approve: async (id: string, notes?: string) => {
    return apiClient.post(`/api/disbursements/${id}/approve`, { notes });
  },

  // Reject disbursement
  reject: async (id: string, reason: string) => {
    return apiClient.post(`/api/disbursements/${id}/reject`, { reason });
  },

  // Execute disbursement
  disburse: async (id: string, data: {
    disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
    referenceNo?: string; // Optional - backend will auto-generate if not provided
    notes?: string;
  }) => {
    return apiClient.post(`/api/disbursements/${id}/execute`, data);
  },

  // Cancel disbursement
  cancel: async (id: string) => {
    return apiClient.post(`/api/disbursements/${id}/cancel`, {});
  },

  // Delete disbursement
  delete: async (id: string) => {
    return apiClient.delete(`/api/disbursements/${id}`);
  },

  // Get statistics
  getStats: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
  }) => {
    return apiClient.get('/api/disbursements/stats', params);
  },

  // Get disbursements by loan
  getByLoan: async (loanId: string) => {
    return apiClient.get(`/api/loans/${loanId}/disbursements`);
  },

  // Get disbursement summary for loan
  getSummary: async (loanId: string) => {
    return apiClient.get(`/api/loans/${loanId}/disbursement-summary`);
  },
};

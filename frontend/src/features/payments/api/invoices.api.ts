import { apiClient } from '@/shared/lib/api-client';

export interface InvoiceData {
    accountNo: string;
    loanType: string;
    installmentNo: number;
    totalInstallments: number;
    billingDate: string;
    dueDate: string;
    customer: {
        name: string;
        address: string;
        city: string;
        email: string;
        phone: string;
    };
    breakdown: {
        principal: number;
        interest: number;
        fees: number;
        total: number;
    };
    summary: {
        remainingBalance: number;
        interestRate: string;
        paidInstallments: number;
        overdueAmount: number;
    };
    loan: {
        id: string;
        startDate: string;
        maturityDate: string;
        monthlyPayment: number;
    };
    payment?: {
        status: string;
        paidAt?: string;
        paidAmount?: number;
    };
}

export const invoicesApi = {
    /**
     * Get invoice by payment schedule ID
     */
    getByScheduleId: async (scheduleId: string): Promise<InvoiceData> => {
        const response = await apiClient.get(`/invoices/schedule/${scheduleId}`);
        return response.data.data;
    },

    /**
     * Get invoice by loan ID and installment number
     */
    getByInstallment: async (loanId: string, installmentNo: number): Promise<InvoiceData> => {
        const response = await apiClient.get(
            `/invoices/loan/${loanId}/installment?installmentNo=${installmentNo}`
        );
        return response.data.data;
    },

    /**
     * Get all invoices for a loan
     */
    getLoanInvoices: async (loanId: string): Promise<InvoiceData[]> => {
        const response = await apiClient.get(`/invoices/loan/${loanId}`);
        return response.data.data;
    },
};

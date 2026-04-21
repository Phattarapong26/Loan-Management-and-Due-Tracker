import { apiClient } from '@/shared/lib/api-client';

export interface InterestTier {
  id: string;
  type: 'FIXED' | 'VARIABLE';
  startYear: number;
  endYear: number | 'END';
  rate?: number; // สำหรับ FIXED
  formula?: string; // สำหรับ VARIABLE
  minRate?: number; // สำหรับ VARIABLE
  maxRate?: number; // สำหรับ VARIABLE
}

export interface LoanProduct {
  id: string;
  productCode: string;
  productName: string;
  productNameEn?: string;
  description?: string;
  purpose: string[];
  eligibility: string[];
  targetBusiness: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minYearsInBusiness?: number;
  minLoanAmount?: number;
  maxLoanAmount: number;
  totalProjectBudget?: number;
  interestRateType: 'FIXED' | 'VARIABLE' | 'MIXED' | 'TIERED';
  interestRateYear1_3?: number;
  interestRateYear4Plus?: number;
  interestRateFormula?: string;
  interestTiers?: InterestTier[];
  governmentSubsidy: boolean;
  subsidyDetails?: string;
  loanType: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'REVOLVING' | 'MIXED';
  maxTermMonths: number;
  gracePeriodMonths?: number;
  collateralRequired: boolean;
  collateralDetails?: string;
  guaranteeOptions: string[];
  benefits: string[];
  feeWaivers: string[];
  projectStartDate?: string;
  projectEndDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isPopular: boolean;
  displayOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanProductInput {
  productCode: string;
  productName: string;
  productNameEn?: string;
  description?: string;
  purpose?: string[];
  eligibility?: string[];
  targetBusiness?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minYearsInBusiness?: number;
  minLoanAmount?: number;
  maxLoanAmount: number;
  totalProjectBudget?: number;
  interestRateType: 'FIXED' | 'VARIABLE' | 'MIXED' | 'TIERED';
  interestRateYear1_3?: number;
  interestRateYear4Plus?: number;
  interestRateFormula?: string;
  interestTiers?: InterestTier[];
  governmentSubsidy?: boolean;
  subsidyDetails?: string;
  loanType: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'REVOLVING' | 'MIXED';
  maxTermMonths: number;
  gracePeriodMonths?: number;
  collateralRequired?: boolean;
  collateralDetails?: string;
  guaranteeOptions?: string[];
  benefits?: string[];
  feeWaivers?: string[];
  projectStartDate?: string;
  projectEndDate?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isPopular?: boolean;
  displayOrder?: number;
}

export type UpdateLoanProductInput = Partial<CreateLoanProductInput>;

export interface LoanProductStats {
  total: number;
  active: number;
  inactive: number;
  popular: number;
}

export interface Pagination {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export const loanProductsApi = {
  getAll: async (params?: {
    status?: string;
    isPopular?: boolean;
    search?: string;
  }): Promise<LoanProduct[]> => {
    const response = await apiClient.get<{ data: LoanProduct[]; pagination: Pagination }>('/api/loan-products', params);
    if (response.error) {
      console.error('API Error:', response.error);
      throw new Error(response.error.message);
    }
    // Backend returns { data: [], pagination: {} }, extract data array
    return response.data?.data || [];
  },

  getById: async (id: string): Promise<LoanProduct> => {
    const response = await apiClient.get<LoanProduct>(`/api/loan-products/${id}`);
    if (response.error) throw new Error(response.error.message);
    if (!response.data) throw new Error('Product not found');
    return response.data;
  },

  getStats: async (): Promise<LoanProductStats> => {
    const response = await apiClient.get<LoanProductStats>('/api/loan-products/stats');
    if (response.error) throw new Error(response.error.message);
    if (!response.data) throw new Error('Stats not found');
    return response.data;
  },

  create: async (data: CreateLoanProductInput): Promise<LoanProduct> => {
    const response = await apiClient.post<LoanProduct>('/api/loan-products', data);
    if (response.error) {
      console.error('[LoanProduct] Create error full response:', response.error);
      // Use technicalMessage if available for better debugging, fallback to message
      const msg = (response.error as any).technicalMessage || response.error.message;
      throw new Error(msg);
    }
    if (!response.data) throw new Error('Failed to create product');
    return response.data;
  },

  update: async (id: string, data: UpdateLoanProductInput): Promise<LoanProduct> => {
    const response = await apiClient.patch<LoanProduct>(`/api/loan-products/${id}`, data);
    if (response.error) throw new Error(response.error.message);
    if (!response.data) throw new Error('Failed to update product');
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await apiClient.delete<void>(`/api/loan-products/${id}`);
    if (response.error) throw new Error(response.error.message);
  },
};

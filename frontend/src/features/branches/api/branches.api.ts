/**
 * Branches API - Branch management endpoints
 */

import { branchesApi } from '@/shared/lib/api-endpoints';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchData {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
}

export interface UpdateBranchData {
  name?: string;
  address?: string;
  phone?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  status?: 'active' | 'inactive';
}

export interface ListBranchesParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface BranchStats {
  totalLoans: number;
  activeLoans: number;
  totalAmount: number;
  collectionRate: number;
  nplRatio: number;
}

/**
 * Get all branches (for dropdowns)
 */
export const getAllBranches = async () => {
  return branchesApi.getAll();
};

/**
 * List branches with pagination
 */
export const listBranches = async (params?: ListBranchesParams) => {
  return branchesApi.list(params);
};

/**
 * Get branch by ID
 */
export const getBranchById = async (id: string) => {
  return branchesApi.getById(id);
};

/**
 * Get branch with statistics
 */
export const getBranchWithStats = async (id: string) => {
  return branchesApi.getWithStats(id);
};

/**
 * Create new branch
 */
export const createBranch = async (data: CreateBranchData) => {
  return branchesApi.create(data);
};

/**
 * Update branch
 */
export const updateBranch = async (id: string, data: UpdateBranchData) => {
  return branchesApi.update(id, data);
};

// Export all branches API functions
export const branchesApiService = {
  getAllBranches,
  listBranches,
  getBranchById,
  getBranchWithStats,
  createBranch,
  updateBranch,
};

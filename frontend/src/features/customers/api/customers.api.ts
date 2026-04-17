/**
 * Customers API - Customer management endpoints
 */

import { customersApi } from '@/shared/lib/api-endpoints';

export type CustomerStatus = 'active' | 'inactive' | 'blacklisted';
export type CustomerType = 'individual' | 'business';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  idCard: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  customerType: CustomerType;
  businessName?: string;
  taxId?: string;
  status: CustomerStatus;
  creditScore?: number;
  totalLoans: number;
  activeLoans: number;
  outstandingAmount: number;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  idCard: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  customerType: CustomerType;
  businessName?: string;
  taxId?: string;
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  businessName?: string;
  taxId?: string;
  status?: CustomerStatus;
}

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
}

/**
 * List customers
 */
export const listCustomers = async (params?: ListCustomersParams) => {
  return customersApi.list(params);
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (id: string) => {
  return customersApi.getById(id);
};

/**
 * Create customer
 */
export const createCustomer = async (data: CreateCustomerData) => {
  return customersApi.create(data);
};

/**
 * Update customer
 */
export const updateCustomer = async (id: string, data: UpdateCustomerData) => {
  return customersApi.update(id, data);
};

// Export all customers API functions
export const customersApiService = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
};

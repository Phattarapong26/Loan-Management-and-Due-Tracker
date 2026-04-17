/**
 * Users API - User management endpoints
 */

import { usersApi } from '@/shared/lib/api-endpoints';

export type UserRole = 'admin' | 'branch_manager' | 'loan_officer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  branchId?: string;
  branchName?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  branchId?: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: UserRole;
  status?: UserStatus;
  branchId?: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  branchId?: string;
  search?: string;
}

export interface ResetPasswordData {
  newPassword: string;
  temporaryPassword?: boolean;
}

/**
 * List users
 */
export const listUsers = async (params?: ListUsersParams) => {
  return usersApi.list(params);
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string) => {
  return usersApi.getById(id);
};

/**
 * Create user
 */
export const createUser = async (data: CreateUserData) => {
  return usersApi.create(data);
};

/**
 * Update user
 */
export const updateUser = async (id: string, data: UpdateUserData) => {
  return usersApi.update(id, data);
};

/**
 * Reset user password
 */
export const resetPassword = async (id: string, data: ResetPasswordData) => {
  return usersApi.resetPassword(id, data);
};

/**
 * Toggle user status
 */
export const toggleUserStatus = async (id: string) => {
  return usersApi.toggleStatus(id);
};

// Export all users API functions
export const usersApiService = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  resetPassword,
  toggleUserStatus,
};

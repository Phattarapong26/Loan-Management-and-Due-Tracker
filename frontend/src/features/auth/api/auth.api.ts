/**
 * Auth API - Authentication and authorization endpoints
 */

import { authApi } from '@/shared/lib/api-endpoints';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId?: string;
}

/**
 * Login user
 */
export const login = async (credentials: LoginCredentials) => {
  return authApi.login(credentials.email, credentials.password);
};

/**
 * Register new user
 */
export const register = async (data: RegisterData) => {
  return authApi.register(data);
};

/**
 * Logout current user
 */
export const logout = async () => {
  return authApi.logout();
};

/**
 * Refresh access token
 */
export const refreshToken = async (refreshToken: string) => {
  return authApi.refresh(refreshToken);
};

/**
 * Get current user profile
 */
export const getCurrentUser = async () => {
  return authApi.me();
};

// Export all auth API functions
export const authApiService = {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
};

/**
 * LINE Audit API - LINE connection audit and management endpoints
 */

import { apiClient } from '@/shared/lib/api-client';

export interface LineAuditLog {
  id: string;
  userId?: string;
  customerId?: string;
  action: string;
  lineUserId?: string;
  previousLineUserId?: string;
  reason?: string;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  customer?: {
    id: string;
    businessName: string;
    customerCode: string;
  };
  performedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface LineStatus {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  customer?: {
    id: string;
    businessName: string;
    customerCode: string;
  };
  currentLineUserId?: string;
  lineActive?: boolean;
  lineLinkedAt?: string;
  auditLogs: LineAuditLog[];
}

export interface ListLineAuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  customerId?: string;
  action?: string;
  lineUserId?: string;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
}

export interface DisconnectLineUserData {
  reason: string;
  forceDisconnect?: boolean;
}

/**
 * List LINE audit logs
 */
export const listLineAuditLogs = async (params?: ListLineAuditLogsParams) => {
  return apiClient.get('/api/line/audit/logs', { params });
};

/**
 * Get user LINE status and audit logs
 */
export const getUserLineStatus = async (userId: string) => {
  return apiClient.get(`/api/line/audit/users/${userId}`);
};

/**
 * Get customer LINE status and audit logs
 */
export const getCustomerLineStatus = async (customerId: string) => {
  return apiClient.get(`/api/line/audit/customers/${customerId}`);
};

/**
 * Get audit logs by LINE User ID
 */
export const getLineUserAuditLogs = async (lineUserId: string) => {
  return apiClient.get(`/api/line/audit/line-users/${lineUserId}`);
};

/**
 * Disconnect user LINE account
 */
export const disconnectUserLineAccount = async (userId: string, data: DisconnectLineUserData) => {
  return apiClient.post(`/api/line/audit/users/${userId}/disconnect`, data);
};

/**
 * Disconnect customer LINE account
 */
export const disconnectCustomerLineAccount = async (customerId: string, data: DisconnectLineUserData) => {
  return apiClient.post(`/api/line/audit/customers/${customerId}/disconnect`, data);
};

// Export all LINE audit API functions
export const lineAuditApi = {
  listLineAuditLogs,
  getUserLineStatus,
  getCustomerLineStatus,
  getLineUserAuditLogs,
  disconnectUserLineAccount,
  disconnectCustomerLineAccount,
};
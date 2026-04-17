/**
 * LINE Integration API - LINE authentication and messaging
 */

import { lineApi } from '@/shared/lib/api-endpoints';
import { apiClient } from '@/shared/lib/api-client';

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LinkLineAccountData {
  userId: string;
  lineUserId: string;
  token?: string;
}

export interface SendDailyNotificationData {
  role: string;
  lineUserId: string;
  testMode?: boolean;
}

/**
 * Link LINE account to user
 */
export const linkLineAccount = async (data: LinkLineAccountData) => {
  return apiClient.post('/api/line/link', data);
};

/**
 * Unlink LINE account from user
 */
export const unlinkLineAccount = async (userId: string) => {
  return apiClient.post(`/api/line/unlink/${userId}`);
};

/**
 * Get LINE user profile
 */
export const getLineProfile = async (lineUserId: string) => {
  return apiClient.get<LineUserProfile>(`/api/line/profile/${lineUserId}`);
};

/**
 * Check if user has linked LINE account
 */
export const checkLineLinked = async (userId: string) => {
  return apiClient.get<{ linked: boolean; lineUserId?: string }>(`/api/line/check/${userId}`);
};

/**
 * Send daily notification via LINE
 */
export const sendDailyNotification = async (data: SendDailyNotificationData) => {
  return lineApi.sendDailyNotification(data);
};

/**
 * Send test message via LINE
 */
export const sendTestMessage = async (lineUserId: string, message: string) => {
  return apiClient.post('/api/line/test-message', { lineUserId, message });
};

/**
 * Get LINE configuration (OA ID, QR code URL, etc.)
 */
export const getLineConfig = async () => {
  return apiClient.get<{
    qrCodeUrl: string;
    addFriendUrl: string;
    lineOaId: string;
  }>('/api/line/config');
};

// Export all LINE API functions
export const lineApiService = {
  linkLineAccount,
  unlinkLineAccount,
  getLineProfile,
  checkLineLinked,
  sendDailyNotification,
  sendTestMessage,
  getLineConfig,
};

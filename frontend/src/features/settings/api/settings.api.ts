/**
 * Settings API - System and user settings endpoints
 */

import { apiClient } from '@/shared/lib/api-client';

export interface SystemSettings {
  id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: 'th' | 'en';
  notifications: {
    email: boolean;
    line: boolean;
    push: boolean;
  };
  dashboard: {
    defaultView: string;
    widgets: string[];
  };
}

/**
 * Get system settings
 */
export const getSystemSettings = async () => {
  return apiClient.get<SystemSettings[]>('/api/settings/system');
};

/**
 * Update system setting
 */
export const updateSystemSetting = async (key: string, value: any) => {
  return apiClient.patch(`/api/settings/system/${key}`, { value });
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (userId: string) => {
  return apiClient.get<UserPreferences>(`/api/settings/preferences/${userId}`);
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId: string, preferences: Partial<UserPreferences>) => {
  return apiClient.patch(`/api/settings/preferences/${userId}`, preferences);
};

// Export all settings API functions
export const settingsApiService = {
  getSystemSettings,
  updateSystemSetting,
  getUserPreferences,
  updateUserPreferences,
};

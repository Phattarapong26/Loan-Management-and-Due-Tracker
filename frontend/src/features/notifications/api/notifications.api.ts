/**
 * Notifications API - Notification management endpoints
 */

import { notificationsApi } from '@/shared/lib/api-endpoints';

export type NotificationType = 'payment' | 'approval' | 'npl' | 'document' | 'system' | 'reminder';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: NotificationType;
}

/**
 * List notifications
 */
export const listNotifications = async (params?: ListNotificationsParams) => {
  return notificationsApi.list(params);
};

/**
 * Create notification
 */
export const createNotification = async (data: CreateNotificationData) => {
  return notificationsApi.create(data);
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id: string) => {
  return notificationsApi.markAsRead(id);
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  return notificationsApi.markAllAsRead();
};

/**
 * Delete notification
 */
export const deleteNotification = async (id: string) => {
  return notificationsApi.delete(id);
};

/**
 * Get unread count
 */
export const getUnreadCount = async () => {
  return notificationsApi.getUnreadCount();
};

// Export all notifications API functions
export const notificationsApiService = {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};

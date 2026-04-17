import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationService } from '../services/notification.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { CreateNotificationInput, ListNotificationsQuery } from '../models/notification.model';

/**
 * Notification Controller - Request/Response ONLY
 */
export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    /**
     * Create notification
     */
    create = async (
        request: FastifyRequest<{ Body: CreateNotificationInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.notificationService.createNotification(
                request,
                request.body
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get user notifications with advanced filters
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListNotificationsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.getUserNotifications(
                request.user.userId,
                {
                    page: request.query.page || 1,
                    limit: request.query.limit || 20,
                    read: request.query.read,
                    type: request.query.type,
                    priority: request.query.priority,
                    search: request.query.search,
                    dateFrom: request.query.dateFrom,
                    dateTo: request.query.dateTo,
                    sortBy: request.query.sortBy,
                    sortOrder: request.query.sortOrder,
                    archived: request.query.archived,
                }
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to fetch notifications';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Mark notification as read
     */
    markAsRead = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.markAsRead(
                request.params.id,
                request.user.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to mark as read';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Mark all notifications as read
     */
    markAllAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.markAllAsRead(request.user.userId);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to mark all as read';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Archive notification
     */
    archive = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.archiveNotification(
                request.params.id,
                request.user.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to archive notification';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Restore notification
     */
    restore = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.restoreNotification(
                request.params.id,
                request.user.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to restore notification';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Delete notification
     */
    delete = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.deleteNotification(
                request.params.id,
                request.user.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to delete notification';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Get unread count
     */
    getUnreadCount = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.getUnreadCount(request.user.userId);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to get unread count';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Get available actions for notification
     */
    getAvailableActions = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            if (!request.user?.userId || !request.user?.role) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.getAvailableActions(
                request.params.id,
                request.user.userId,
                request.user.role
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to get available actions';
            return ResponseUtil.error(reply, errorMessage, 400);
        }
    };

    /**
     * Get single notification
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            if (!request.user?.userId) {
                return ResponseUtil.error(reply, 'User not authenticated', 401);
            }

            const result = await this.notificationService.getNotification(
                request.params.id,
                request.user.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Failed to get notification';
            const status = error.message === 'Notification not found' ? 404 : 403;
            return ResponseUtil.error(reply, errorMessage, status);
        }
    };
}

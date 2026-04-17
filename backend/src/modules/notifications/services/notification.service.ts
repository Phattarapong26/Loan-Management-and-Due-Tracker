import { FastifyRequest } from 'fastify';
import { NotificationRepository } from '../repositories/notification.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { CreateNotificationInput } from '../models/notification.model';
import { LineService } from '@line/services/core/line.service';

/**
 * Notification Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class NotificationService {
    private notificationRepository: NotificationRepository;
    private userRepository: UserRepository;
    private lineService: LineService;

    constructor() {
        this.notificationRepository = new NotificationRepository();
        this.userRepository = new UserRepository();
        this.lineService = new LineService();
    }

    /**
     * Create notification with audience validation and deduplication
     */
    async createNotification(_request: FastifyRequest, input: CreateNotificationInput) {
        // 1. Validate user exists
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // 2. Validate audience rules
        const audienceRule = await this.notificationRepository.getAudienceRule(input.type);
        if (audienceRule && !this.validateAudience(user.role, audienceRule)) {
            throw new Error(`User role ${user.role} not allowed for notification type ${input.type}`);
        }

        // 3. Create notification with deduplication
        const notification = await this.notificationRepository.createWithDedup({
            ...input,
            dedupWindow: input.dedupWindow || 24,
        });

        // 4. Send LINE notification if user has LINE ID
        if (user.lineUserId) {
            try {
                await this.sendLineNotification(user.lineUserId, notification);
            } catch (error) {
                console.error('Failed to send LINE notification:', error);
                // Don't throw - LINE notification failure shouldn't block notification creation
            }
        }

        return notification;
    }

    /**
     * Send LINE notification to user
     */
    private async sendLineNotification(lineUserId: string, notification: any) {
        const priorityEmoji = this.getPriorityEmoji(notification.priority);
        const typeEmoji = this.getTypeEmoji(notification.type);

        const message = {
            type: 'flex',
            altText: `${priorityEmoji} ${notification.title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${priorityEmoji} ${notification.title}`,
                            weight: 'bold',
                            size: 'lg',
                            color: this.getPriorityColor(notification.priority),
                            wrap: true,
                        },
                    ],
                    backgroundColor: '#F5F5F5',
                    paddingAll: '15px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${typeEmoji} ${notification.message}`,
                            size: 'md',
                            wrap: true,
                            color: '#333333',
                        },
                        {
                            type: 'text',
                            text: this.formatDate(notification.createdAt),
                            size: 'xs',
                            color: '#888888',
                            margin: 'md',
                        },
                    ],
                    paddingAll: '15px',
                },
                footer: notification.link ? {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: 'ดูรายละเอียด',
                                uri: `${process.env.FRONTEND_URL || 'https://app.example.com'}${notification.link}`,
                            },
                            style: 'primary',
                            color: '#1DB954',
                        },
                    ],
                    paddingAll: '10px',
                } : undefined,
            },
        };

        await this.lineService.pushMessage(lineUserId, [message]);
    }

    /**
     * Get emoji for priority level
     */
    private getPriorityEmoji(priority: string): string {
        switch (priority) {
            case 'URGENT':
                return '🚨';
            case 'HIGH':
                return '🔴';
            case 'MEDIUM':
                return '🟡';
            case 'LOW':
                return '🟢';
            default:
                return '📢';
        }
    }

    /**
     * Get emoji for notification type
     */
    private getTypeEmoji(type: string): string {
        switch (type) {
            case 'LOAN_APPROVAL_REQUEST':
                return '📋';
            case 'LOAN_APPROVED':
                return '✅';
            case 'LOAN_REJECTED':
                return '❌';
            case 'PAYMENT_REMINDER':
                return '⏰';
            case 'PAYMENT_OVERDUE':
                return '🔴';
            case 'NPL_ALERT':
                return '🚨';
            default:
                return '📢';
        }
    }

    /**
     * Get color for priority level
     */
    private getPriorityColor(priority: string): string {
        switch (priority) {
            case 'URGENT':
                return '#DC2626';
            case 'HIGH':
                return '#EA580C';
            case 'MEDIUM':
                return '#CA8A04';
            case 'LOW':
                return '#16A34A';
            default:
                return '#3B82F6';
        }
    }

    /**
     * Format date for display
     */
    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    }

    /**
     * Create notification for multiple users (bulk) with audience validation
     */
    async createBulkNotifications(_request: FastifyRequest, inputs: CreateNotificationInput[]) {
        // Validate all users exist
        const userIds = [...new Set(inputs.map((i) => i.userId))];
        const users = await Promise.all(
            userIds.map(userId => this.userRepository.findById(userId))
        );

        const userMap = new Map(users.filter(u => u).map(u => [u!.id, u!]));

        for (const userId of userIds) {
            if (!userMap.has(userId)) {
                throw new Error(`User ${userId} not found`);
            }
        }

        // Validate audience rules for each notification type
        const notificationTypes = [...new Set(inputs.map((i) => i.type))];
        for (const type of notificationTypes) {
            const audienceRule = await this.notificationRepository.getAudienceRule(type);
            if (audienceRule) {
                for (const user of userMap.values()) {
                    if (!this.validateAudience(user.role, audienceRule)) {
                        throw new Error(`User role ${user.role} not allowed for notification type ${type}`);
                    }
                }
            }
        }

        // Create notifications
        const result = await this.notificationRepository.createMany(inputs);

        // Send LINE notifications for each user (in parallel)
        const linePromises = inputs.map(async (input) => {
            const user = userMap.get(input.userId);
            if (user?.lineUserId) {
                try {
                    // Create a mock notification object for LINE message
                    const notification = {
                        userId: input.userId,
                        type: input.type,
                        title: input.title,
                        message: input.message,
                        link: input.link,
                        priority: input.priority || 'MEDIUM',
                        createdAt: new Date(),
                    };
                    await this.sendLineNotification(user.lineUserId, notification);
                } catch (error) {
                    console.error(`Failed to send LINE notification to ${user.lineUserId}:`, error);
                    // Don't throw - LINE notification failure shouldn't block notification creation
                }
            }
        });

        await Promise.allSettled(linePromises);

        return result;
    }

    /**
     * Get notifications for user with advanced filtering
     */
    async getUserNotifications(
        userId: string,
        params: {
            page: number;
            limit: number;
            read?: boolean;
            type?: string;
            priority?: string;
            search?: string;
            dateFrom?: string;
            dateTo?: string;
            sortBy?: 'date' | 'priority';
            sortOrder?: 'asc' | 'desc';
            archived?: boolean;
        }
    ) {
        const result = await this.notificationRepository.list({
            page: params.page,
            limit: params.limit,
            userId,
            read: params.read,
            type: params.type as any,
            priority: params.priority,
            search: params.search,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
            archived: params.archived,
        });

        return {
            notifications: result.notifications,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        // Check if notification exists and belongs to user
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized');
        }

        // Mark as read
        const updated = await this.notificationRepository.markAsRead(notificationId);

        return updated;
    }

    /**
     * Mark all notifications as read for user
     */
    async markAllAsRead(userId: string) {
        const result = await this.notificationRepository.markAllAsRead(userId);

        return result;
    }

    /**
     * Archive notification
     */
    async archiveNotification(notificationId: string, userId: string) {
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized');
        }

        return this.notificationRepository.archive(notificationId);
    }

    /**
     * Restore notification
     */
    async restoreNotification(notificationId: string, userId: string) {
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized');
        }

        return this.notificationRepository.restore(notificationId);
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId: string, userId: string) {
        // Check if notification exists and belongs to user
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized');
        }

        // Delete notification
        await this.notificationRepository.delete(notificationId);

        return { success: true };
    }

    /**
     * Get unread count for user
     */
    async getUnreadCount(userId: string) {
        const count = await this.notificationRepository.getUnreadCount(userId);

        return { count };
    }

    /**
     * Get notification by ID
     */
    async getNotification(notificationId: string, userId: string) {
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized');
        }

        return notification;
    }

    /**
     * Get available actions for notification
     */
    async getAvailableActions(notificationId: string, userId: string, userRole: string) {
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized');
        }

        // Get all actions for this notification type
        const allActions = await this.notificationRepository.getAvailableActions(notification.type);

        // Filter by user role and permissions
        const availableActions = allActions.filter(action => {
            const hasRole = action.requiredRoles.includes(userRole) || action.requiredRoles.includes('ALL');
            // TODO: Add permission checking when permission system is implemented
            return hasRole;
        });

        return { actions: availableActions };
    }

    /**
     * Validate if user role is allowed for notification type
     */
    private validateAudience(userRole: string, audienceRule: any): boolean {
        if (!audienceRule) return true;
        if (audienceRule.allowedRoles.includes('ALL')) return true;
        return audienceRule.allowedRoles.includes(userRole);
    }
}

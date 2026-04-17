import { PrismaClient, Notification, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';
import { CreateNotificationInput } from '../models/notification.model';

/**
 * Notification Repository - Database access ONLY
 * NO business logic allowed
 */
export class NotificationRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Create notification with deduplication
     */
    async createWithDedup(data: CreateNotificationInput & { dedupWindow?: number }): Promise<Notification> {
        // Check for existing notification if dedupKey provided
        if (data.dedupKey) {
            const dedupWindow = data.dedupWindow || 24; // Default 24 hours
            const existingNotification = await this.db.notification.findFirst({
                where: {
                    userId: data.userId,
                    type: data.type,
                    dedupKey: data.dedupKey,
                    createdAt: {
                        gte: new Date(Date.now() - dedupWindow * 60 * 60 * 1000)
                    }
                }
            });

            if (existingNotification) {
                console.log(`[Dedup] Prevented duplicate notification: ${data.dedupKey}`);
                return existingNotification;
            }
        }

        // Create new notification
        return this.db.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                metadata: data.metadata || undefined,
                priority: data.priority || 'MEDIUM',
                eventId: data.eventId,
                dedupKey: data.dedupKey,
                audienceRoles: data.audienceRoles || [],
                actionId: data.actionId,
                actionLabel: data.actionLabel,
            },
        });
    }

    /**
     * Create notification
     */
    async create(data: CreateNotificationInput): Promise<Notification> {
        return this.db.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                metadata: data.metadata || undefined,
                priority: data.priority || 'MEDIUM',
                eventId: data.eventId,
                dedupKey: data.dedupKey,
                audienceRoles: data.audienceRoles || [],
                actionId: data.actionId,
                actionLabel: data.actionLabel,
            },
        });
    }

    /**
     * Create multiple notifications (bulk)
     */
    async createMany(data: CreateNotificationInput[]): Promise<{ count: number }> {
        return this.db.notification.createMany({
            data: data.map((item) => ({
                userId: item.userId,
                type: item.type,
                title: item.title,
                message: item.message,
                link: item.link,
                metadata: item.metadata || undefined,
                priority: item.priority || 'MEDIUM',
                eventId: item.eventId,
                dedupKey: item.dedupKey,
                audienceRoles: item.audienceRoles || [],
                actionId: item.actionId,
                actionLabel: item.actionLabel,
            })),
        });
    }

    /**
     * Find notification by ID
     */
    async findById(id: string): Promise<Notification | null> {
        return this.db.notification.findUnique({
            where: { id },
        });
    }

    /**
     * List notifications with advanced filters
     */
    async list(params: {
        page: number;
        limit: number;
        userId: string;
        read?: boolean;
        type?: NotificationType;
        priority?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        sortBy?: 'date' | 'priority';
        sortOrder?: 'asc' | 'desc';
        archived?: boolean;
    }): Promise<{ notifications: Notification[]; total: number }> {
        const where: Prisma.NotificationWhereInput = {
            userId: params.userId,
            archived: params.archived ?? false,
        };

        if (params.read !== undefined) {
            where.read = params.read;
        }

        if (params.type) {
            where.type = params.type;
        }

        if (params.priority) {
            where.priority = params.priority;
        }

        if (params.search) {
            where.OR = [
                { title: { contains: params.search, mode: 'insensitive' } },
                { message: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params.dateFrom || params.dateTo) {
            where.createdAt = {};
            if (params.dateFrom) {
                where.createdAt.gte = new Date(params.dateFrom);
            }
            if (params.dateTo) {
                where.createdAt.lte = new Date(params.dateTo);
            }
        }

        const orderBy: Prisma.NotificationOrderByWithRelationInput = {};
        if (params.sortBy === 'priority') {
            orderBy.priority = params.sortOrder ?? 'desc';
        } else {
            orderBy.createdAt = params.sortOrder ?? 'desc';
        }

        const [notifications, total] = await Promise.all([
            this.db.notification.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy,
            }),
            this.db.notification.count({ where }),
        ]);

        return { notifications, total };
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id: string): Promise<Notification> {
        return this.db.notification.update({
            where: { id },
            data: {
                read: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Mark all notifications as read for user
     */
    async markAllAsRead(userId: string): Promise<{ count: number }> {
        return this.db.notification.updateMany({
            where: {
                userId,
                read: false,
            },
            data: {
                read: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Archive notification
     */
    async archive(id: string): Promise<Notification> {
        return this.db.notification.update({
            where: { id },
            data: {
                archived: true,
                archivedAt: new Date(),
            },
        });
    }

    /**
     * Restore notification
     */
    async restore(id: string): Promise<Notification> {
        return this.db.notification.update({
            where: { id },
            data: {
                archived: false,
                archivedAt: null,
            },
        });
    }

    /**
     * Delete notification
     */
    async delete(id: string): Promise<Notification> {
        return this.db.notification.delete({
            where: { id },
        });
    }

    /**
     * Get unread count for user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return this.db.notification.count({
            where: {
                userId,
                read: false,
                archived: false,
            },
        });
    }

    /**
     * Get audience rule for notification type
     */
    async getAudienceRule(notificationType: string): Promise<any> {
        return this.db.notificationAudienceRule.findUnique({
            where: { notificationType },
        });
    }

    /**
     * Get available actions for notification type
     */
    async getAvailableActions(notificationType: string): Promise<any[]> {
        return this.db.notificationAction.findMany({
            where: { notificationType },
        });
    }
}

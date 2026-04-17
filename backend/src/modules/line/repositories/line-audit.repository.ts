import { prisma } from '@config/database.config';
import { Prisma } from '@prisma/client';
import { CreateLineAuditLogInput, ListLineAuditLogsQuery } from '../models/line-audit.model';

/**
 * LINE Audit Log with relations
 */
export type LineAuditLogWithRelations = Prisma.LineAuditLogGetPayload<{
    include: {
        user: {
            select: {
                id: true;
                firstName: true;
                lastName: true;
                email: true;
            };
        };
        customer: {
            select: {
                id: true;
                businessName: true;
                customerCode: true;
            };
        };
        performedByUser: {
            select: {
                id: true;
                firstName: true;
                lastName: true;
                email: true;
                role: true;
            };
        };
    };
}>;

/**
 * LINE Audit Repository - Database access ONLY
 */
export class LineAuditRepository {
    /**
     * Create LINE audit log
     */
    async create(
        data: CreateLineAuditLogInput & {
            performedBy: string;
            ipAddress?: string;
            userAgent?: string;
        }
    ): Promise<LineAuditLogWithRelations> {
        return prisma.lineAuditLog.create({
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                    },
                },
                performedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }

    /**
     * List LINE audit logs with pagination and filters
     */
    async list(params: ListLineAuditLogsQuery): Promise<{
        logs: LineAuditLogWithRelations[];
        total: number;
    }> {
        const where: Prisma.LineAuditLogWhereInput = {};

        if (params.userId) {
            where.userId = params.userId;
        }

        if (params.customerId) {
            where.customerId = params.customerId;
        }

        if (params.action) {
            where.action = params.action;
        }

        if (params.lineUserId) {
            where.OR = [
                { lineUserId: { contains: params.lineUserId } },
                { previousLineUserId: { contains: params.lineUserId } },
            ];
        }

        if (params.performedBy) {
            where.performedBy = params.performedBy;
        }

        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) {
                where.createdAt.gte = params.startDate;
            }
            if (params.endDate) {
                where.createdAt.lte = params.endDate;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.lineAuditLog.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            businessName: true,
                            customerCode: true,
                        },
                    },
                    performedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            }),
            prisma.lineAuditLog.count({ where }),
        ]);

        return { logs, total };
    }

    /**
     * Get LINE audit logs for specific user
     */
    async getByUserId(userId: string): Promise<LineAuditLogWithRelations[]> {
        return prisma.lineAuditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                    },
                },
                performedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }

    /**
     * Get LINE audit logs for specific customer
     */
    async getByCustomerId(customerId: string): Promise<LineAuditLogWithRelations[]> {
        return prisma.lineAuditLog.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                    },
                },
                performedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }

    /**
     * Get LINE audit logs by LINE User ID
     */
    async getByLineUserId(lineUserId: string): Promise<LineAuditLogWithRelations[]> {
        return prisma.lineAuditLog.findMany({
            where: {
                OR: [
                    { lineUserId },
                    { previousLineUserId: lineUserId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                    },
                },
                performedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }
}
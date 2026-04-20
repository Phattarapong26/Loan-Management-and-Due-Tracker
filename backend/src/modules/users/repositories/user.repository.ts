import { prisma } from '@config/database.config';
import { User, UserRole, UserStatus, Prisma } from '@prisma/client';

/**
 * User with branch relation included
 */
export type UserWithBranch = Prisma.UserGetPayload<{
    include: {
        branch: {
            select: {
                id: true;
                code: true;
                name: true;
            };
        };
    };
}>;

/**
 * User Repository - Database access ONLY
 * NO business logic allowed
 */
export class UserRepository {
    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<UserWithBranch | null> {
        return prisma.user.findUnique({
            where: { email },
            include: {
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<UserWithBranch | null> {
        return prisma.user.findUnique({
            where: { id },
            include: {
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Find multiple users by IDs
     */
    async findManyByIds(ids: string[]): Promise<Array<{ id: string; firstName: string; lastName: string }>> {
        return prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, firstName: true, lastName: true },
        });
    }

    /**
     * Create new user
     */
    async create(data: {
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string;
        nationalId?: string;
        role?: UserRole;
        branchId?: string;
    }): Promise<UserWithBranch> {
        const { branchId, ...userData } = data;
        return prisma.user.create({
            data: {
                ...userData,
                ...(branchId && { branch: { connect: { id: branchId } } }),
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Update user
     */
    async update(
        id: string,
        data: Partial<{
            email: string;
            passwordHash: string;
            firstName: string;
            lastName: string;
            phoneNumber: string;
            nationalId: string;
            role: UserRole;
            status: UserStatus;
            branchId: string | null;
            lastLoginAt: Date;
            mustChangePassword: boolean;
            passwordChangedAt: Date;
        }>
    ): Promise<UserWithBranch> {
        return prisma.user.update({
            where: { id },
            data,
            include: {
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<User> {
        return prisma.user.delete({
            where: { id },
        });
    }

    /**
     * Update last login
     */
    async updateLastLogin(id: string): Promise<User> {
        return prisma.user.update({
            where: { id },
            data: {
                lastLoginAt: new Date(),
            },
        });
    }

    /**
     * List users with pagination and filters
     */
    async list(params: {
        page: number;
        limit: number;
        role?: UserRole;
        status?: UserStatus;
        branchId?: string;
        search?: string;
    }): Promise<{ users: UserWithBranch[]; total: number }> {
        const where: Prisma.UserWhereInput = {};

        if (params.role) {
            where.role = params.role;
        }

        if (params.status) {
            where.status = params.status;
        }

        if (params.branchId) {
            where.branchId = params.branchId;
        }

        if (params.search) {
            where.OR = [
                { firstName: { contains: params.search, mode: 'insensitive' } },
                { lastName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    branch: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total };
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
        const user = await prisma.user.findFirst({
            where: {
                email,
                ...(excludeUserId && { id: { not: excludeUserId } }),
            },
        });

        return !!user;
    }

    /**
     * Find users by branch and roles (for notifications)
     */
    async findByBranchAndRoles(branchId: string, roles: string[]): Promise<UserWithBranch[]> {
        const userRoles = roles.map(role => {
            const roleMap: Record<string, UserRole> = {
                'loan_officer': 'OFFICER',
                'branch_manager': 'MANAGER',
                'admin': 'ADMIN',
            };
            return roleMap[role] || 'OFFICER';
        });

        return prisma.user.findMany({
            where: {
                branchId,
                role: { in: userRoles },
                status: 'ACTIVE',
                lineUserId: { not: null },
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Find all staff (for admin notifications - all branches)
     */
    async findAllStaff(): Promise<UserWithBranch[]> {
        return prisma.user.findMany({
            where: {
                role: { in: ['OFFICER', 'MANAGER', 'ADMIN'] },
                status: 'ACTIVE',
                lineUserId: { not: null },
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Find active LINE users by role (for notification scheduler)
     */
    async findActiveLineUsers(role: string): Promise<Array<{ id: string; lineUserId: string | null }>> {
        return prisma.user.findMany({
            where: {
                role: role as any,
                status: 'ACTIVE',
                lineUserId: { not: null },
                lineActive: true,
                lineNotificationsEnabled: true,
            },
            select: { id: true, lineUserId: true },
        });
    }

    /**
     * Find active users by role (with or without LINE, for in-app notifications)
     */
    async findActiveByRole(role: string): Promise<Array<{ id: string; lineUserId: string | null; lineActive: boolean; lineNotificationsEnabled: boolean }>> {
        return prisma.user.findMany({
            where: { role: role as any, status: 'ACTIVE' },
            select: { id: true, lineUserId: true, lineActive: true, lineNotificationsEnabled: true },
        });
    }

    /**
     * Find user LINE info by ID (for NPL notifications)
     */
    async findLineInfoById(id: string): Promise<{ lineUserId: string | null; lineActive: boolean | null } | null> {
        return prisma.user.findUnique({
            where: { id },
            select: { lineUserId: true, lineActive: true },
        });
    }

    /**
     * Mark LINE user as inactive (blocked bot)
     */
    async markLineInactive(lineUserId: string): Promise<void> {
        await prisma.user.updateMany({
            where: { lineUserId },
            data: { lineActive: false },
        });
    }

    /**
     * Find all active LINE users (for rich menu sync)
     */
    async findAllActiveLineUsers(): Promise<Array<{ id: string; lineUserId: string; role: string }>> {
        return prisma.user.findMany({
            where: { lineUserId: { not: null }, lineActive: true },
            select: { id: true, lineUserId: true, role: true },
        }) as any;
    }
}


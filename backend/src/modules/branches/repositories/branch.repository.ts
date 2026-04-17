import { PrismaClient, Branch, BranchStatus, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';
import { CreateBranchInput, UpdateBranchInput } from '../models/branch.model';

/**
 * Branch Repository - Database access ONLY
 * NO business logic allowed
 */
export class BranchRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find branch by ID
     */
    async findById(id: string): Promise<Branch | null> {
        return this.db.branch.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        loans: true,
                    },
                },
            },
        });
    }

    /**
     * Find branch by code
     */
    async findByCode(code: string): Promise<Branch | null> {
        return this.db.branch.findUnique({
            where: { code },
        });
    }

    /**
     * Create branch
     */
    async create(data: CreateBranchInput & { status?: BranchStatus }): Promise<Branch> {
        return this.db.branch.create({
            data: {
                code: data.code.toUpperCase(),
                name: data.name,
                address: data.address,
                phone: data.phone,
                province: data.province,
                district: data.district,
                subdistrict: data.subdistrict,
                postalCode: data.postalCode,
                status: data.status || 'ACTIVE',
            },
        });
    }

    /**
     * Update branch
     */
    async update(id: string, data: UpdateBranchInput): Promise<Branch> {
        return this.db.branch.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete branch
     */
    async delete(id: string): Promise<Branch> {
        return this.db.branch.delete({
            where: { id },
        });
    }

    /**
     * List branches with pagination and filters
     */
    async list(params: {
        page: number;
        limit: number;
        status?: BranchStatus;
        search?: string;
    }): Promise<{ branches: any[]; total: number; page: number; limit: number; totalPages: number }> {
        const where: Prisma.BranchWhereInput = {};

        if (params.status) {
            where.status = params.status;
        }

        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search.toUpperCase(), mode: 'insensitive' } },
                { address: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [branches, total] = await Promise.all([
            this.db.branch.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { code: 'asc' },
                include: {
                    users: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                            status: true,
                            _count: {
                                select: {
                                    customers: true,
                                },
                            },
                        },
                    },
                    loans: {
                        select: {
                            id: true,
                            status: true,
                            outstandingBalance: true,
                        },
                    },
                    _count: {
                        select: {
                            users: true,
                            customers: true,
                            loans: true,
                        },
                    },
                },
            }),
            this.db.branch.count({ where }),
        ]);

        const totalPages = Math.ceil(total / params.limit);

        return {
            branches,
            total,
            page: params.page,
            limit: params.limit,
            totalPages
        };
    }

    /**
     * Get branch statistics
     */
    async getBranchStatistics(branchId: string) {
        const branch = await this.db.branch.findUnique({
            where: { id: branchId },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        status: true,
                        _count: {
                            select: {
                                customers: true,
                                createdLoans: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        loans: true,
                    },
                },
            },
        });

        if (!branch) {
            return null;
        }

        // Portfolio loans count and outstanding balance (exposure)
        const portfolioLoans = await this.db.loan.aggregate({
            where: {
                branchId,
                status: {
                    in: ['DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED'],
                },
            },
            _count: true,
            _sum: {
                outstandingBalance: true,
                principal: true,
            },
        });

        const activeLoans = await this.db.loan.count({
            where: {
                branchId,
                status: { in: ['DISBURSED', 'ACTIVE'] },
            },
        });

        // Get NPL loans (DPD >= 30 or status = NPL/DEFAULTED)
        const nplLoans = await this.db.loan.count({
            where: {
                branchId,
                OR: [
                    { status: 'NPL' },
                    { status: 'DEFAULTED' },
                    {
                        overdueDays: {
                            gte: 30,
                        },
                    },
                ],
            },
        });

        // Calculate NPL ratio
        const totalLoans = portfolioLoans._count || 0;
        const nplRatio = totalLoans > 0 ? (nplLoans / totalLoans) * 100 : 0;

        // Calculate collection rate (simplified - you may want to adjust this)
        const collectionRate = 85; // Placeholder - implement actual calculation

        const officerCount = await this.db.user.count({
            where: {
                branchId,
                role: 'OFFICER',
                status: 'ACTIVE',
            },
        });

        return {
            branch,
            stats: {
                officerCount,
                activeLoans,
                totalOutstanding: Number(portfolioLoans._sum?.outstandingBalance || 0),
                totalAmount: Number(portfolioLoans._sum?.principal || 0),
                nplRatio: Number(nplRatio.toFixed(2)),
                totalCustomers: (branch as any)._count?.customers || 0,
                collectionRate: Number(collectionRate.toFixed(2)),
            },
        };
    }

    /**
     * Get branch employees (officers and managers)
     */
    async getBranchEmployees(branchId: string) {
        return this.db.user.findMany({
            where: {
                branchId,
                role: {
                    in: ['OFFICER', 'MANAGER'],
                },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                role: true,
                status: true,
                createdAt: true,
                _count: {
                    select: {
                        customers: true,
                        createdLoans: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' },
                { firstName: 'asc' },
            ],
        });
    }
}

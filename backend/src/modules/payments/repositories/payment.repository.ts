import { PrismaClient, Payment, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Payment Repository - Database access ONLY
 */
export class PaymentRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Create payment
     */
    async create(data: {
        loanId: string;
        paymentScheduleId?: string;
        amount: number;
        paymentDate: Date;
        paymentMethod: 'CASH' | 'TRANSFER' | 'CHEQUE' | 'OTHER';
        paymentType: 'EARLY' | 'ON_TIME' | 'LATE';
        interestSaved?: number;
        penaltyAmount?: number;
        notes?: string;
        reference?: string;
        createdBy: string;
    }): Promise<Payment> {
        return this.db.payment.create({
            data: {
                ...data,
            },
        });
    }

    /**
     * Find payment by ID
     */
    async findById(id: string): Promise<Payment | null> {
        return this.db.payment.findUnique({
            where: { id },
            include: {
                loan: {
                    include: {
                        customer: true,
                    },
                },
            },
        });
    }

    /**
     * List payments with pagination
     */
    async list(params: {
        loanId?: string;
        page: number;
        limit: number;
        paymentType?: 'EARLY' | 'ON_TIME' | 'LATE';
        startDate?: Date;
        endDate?: Date;
    }): Promise<{ payments: Payment[]; total: number }> {
        const where: Prisma.PaymentWhereInput = {};

        if (params.loanId) {
            // Handle comma-separated loan IDs
            const loanIds = params.loanId.includes(',')
                ? params.loanId.split(',').map(id => id.trim())
                : [params.loanId];

            where.loanId = loanIds.length === 1 ? loanIds[0] : { in: loanIds };
        }

        if (params.paymentType) {
            where.paymentType = params.paymentType;
        }

        if (params.startDate || params.endDate) {
            where.paymentDate = {};
            if (params.startDate) {
                where.paymentDate.gte = params.startDate;
            }
            if (params.endDate) {
                where.paymentDate.lte = params.endDate;
            }
        }

        const [payments, total] = await Promise.all([
            this.db.payment.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { paymentDate: 'desc' },
                include: {
                    loan: {
                        select: {
                            id: true,
                            customerId: true,
                            customer: {
                                select: {
                                    id: true,
                                    businessName: true,
                                },
                            },
                        },
                    },
                    paymentSchedule: {
                        select: {
                            id: true,
                            paymentNumber: true,
                        },
                    },
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            branch: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.db.payment.count({ where }),
        ]);

        return { payments, total };
    }

    /**
     * Get total paid amount for loan
     */
    async getTotalPaid(loanId: string): Promise<number> {
        const result = await this.db.payment.aggregate({
            where: { loanId },
            _sum: {
                amount: true,
            },
        });

        return Number(result._sum.amount || 0);
    }

    /**
     * Get payment history for loan
     */
    async getLoanHistory(loanId: string): Promise<Payment[]> {
        return this.db.payment.findMany({
            where: { loanId },
            orderBy: { paymentDate: 'desc' },
        });
    }

    /**
     * Get payment statistics
     */
    async getStats(params: {
        startDate?: Date;
        endDate?: Date;
        branchId?: string;
    }): Promise<{ totalCollected: number; count: number }> {
        const where: Prisma.PaymentWhereInput = {};

        if (params.startDate || params.endDate) {
            where.paymentDate = {};
            if (params.startDate) where.paymentDate.gte = params.startDate;
            if (params.endDate) where.paymentDate.lte = params.endDate;
        }

        if (params.branchId) {
            where.loan = {
                customer: {
                    branchId: params.branchId,
                },
            };
        }

        const [aggregation, count] = await Promise.all([
            this.db.payment.aggregate({
                where,
                _sum: {
                    amount: true,
                },
            }),
            this.db.payment.count({ where }),
        ]);

        return {
            totalCollected: Number(aggregation._sum.amount || 0),
            count,
        };
    }
}

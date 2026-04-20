import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Invoice Security Repository - Database access ONLY
 * Handles invoice access logs and rate limiting
 */
export class InvoiceSecurityRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find payment schedule with loan and customer national ID
     */
    async findScheduleWithCustomerNationalId(paymentScheduleId: string): Promise<any | null> {
        return (this.db as any).paymentSchedule.findUnique({
            where: { id: paymentScheduleId },
            include: {
                loan: {
                    include: {
                        customer: { select: { thaiId: true } },
                    },
                },
            },
        });
    }

    /**
     * Find loan with customer national ID
     */
    async findLoanWithCustomerNationalId(loanId: string): Promise<any | null> {
        return (this.db as any).loan.findUnique({
            where: { id: loanId },
            include: {
                customer: { select: { id: true, thaiId: true } },
            },
        });
    }

    /**
     * Create an invoice access log entry
     */
    async createAccessLog(data: {
        resourceId: string;
        customerId: string;
        success: boolean;
        attemptedAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
    }): Promise<void> {
        await (this.db as any).invoiceAccessLog.create({ data });
    }

    /**
     * Get access history for a resource
     */
    async findAccessHistory(resourceId: string, limit: number): Promise<any[]> {
        return (this.db as any).invoiceAccessLog.findMany({
            where: { resourceId },
            orderBy: { attemptedAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Count failed access attempts within a time window
     */
    async countFailedAttempts(resourceId: string, since: Date): Promise<number> {
        return (this.db as any).invoiceAccessLog.count({
            where: { resourceId, success: false, attemptedAt: { gte: since } },
        });
    }
}

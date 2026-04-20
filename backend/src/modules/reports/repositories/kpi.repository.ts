import { prisma } from '@config/database.config';

/**
 * KPI Repository - Database access for KPI calculations
 */
export class KPIRepository {
    async getBranchName(branchId: string): Promise<string | null> {
        const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } });
        return branch?.name ?? null;
    }

    async countLoansByBranch(branchId: string, statuses: string[]): Promise<number> {
        return prisma.loan.count({ where: { customer: { branchId }, status: { in: statuses as any } } });
    }

    async aggregateLoansByBranch(branchId: string, statuses: string[], dateRange?: { gte: Date; lte: Date }): Promise<{ sum: number; count: number }> {
        const result = await prisma.loan.aggregate({
            where: {
                customer: { branchId },
                status: { in: statuses as any },
                ...(dateRange ? { createdAt: dateRange } : {}),
            },
            _sum: { principal: true, outstandingBalance: true },
            _count: true,
        });
        return { sum: Number(result._sum.principal || 0), count: result._count };
    }

    async aggregatePaymentsByBranch(branchId: string, dateRange: { gte: Date; lte: Date }): Promise<number> {
        const result = await prisma.payment.aggregate({
            where: { loan: { customer: { branchId } }, paymentDate: dateRange },
            _sum: { amount: true },
        });
        return Number(result._sum.amount || 0);
    }

    async aggregateSchedulesByBranch(branchId: string, dateRange: { gte: Date; lte: Date }): Promise<number> {
        const result = await prisma.paymentSchedule.aggregate({
            where: { loan: { customer: { branchId } }, paymentDate: dateRange },
            _sum: { totalPayment: true },
        });
        return Number(result._sum.totalPayment || 0);
    }

    async findNPLLoansByBranch(branchId: string, ninetyDaysAgo: Date): Promise<any[]> {
        return prisma.loan.findMany({
            where: {
                customer: { branchId },
                status: 'NPL',
                paymentSchedule: { some: { paymentDate: { lt: ninetyDaysAgo }, status: 'UNPAID' } },
            },
            select: { id: true, outstandingBalance: true, paymentSchedule: { where: { status: 'UNPAID', paymentDate: { lt: ninetyDaysAgo } }, orderBy: { paymentDate: 'asc' }, take: 1 } },
        });
    }

    async countActiveCustomersByBranch(branchId: string): Promise<number> {
        return prisma.customer.count({
            where: { branchId, loans: { some: { status: { in: ['ACTIVE', 'NPL'] } } } },
        });
    }

    async findRecentPaymentsByBranch(branchId: string, since: Date, limit: number): Promise<any[]> {
        return prisma.payment.findMany({
            where: { loan: { customer: { branchId } }, paymentDate: { gte: since } },
            include: { loan: { include: { customer: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
            orderBy: { paymentDate: 'desc' },
            take: limit,
        });
    }

    async findRecentDisbursementsByBranch(branchId: string, since: Date, limit: number): Promise<any[]> {
        return prisma.loanDisbursement.findMany({
            where: { loan: { customer: { branchId } }, disbursedAt: { gte: since } },
            include: { loan: { include: { customer: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
            orderBy: { disbursedAt: 'desc' },
            take: limit,
        });
    }

    async findActiveCustomersWithLoans(branchId: string, limit: number): Promise<any[]> {
        return prisma.customer.findMany({
            where: { branchId, loans: { some: { status: { in: ['ACTIVE', 'NPL'] } } } },
            include: {
                user: { select: { firstName: true, lastName: true, phoneNumber: true } },
                loans: { where: { status: { in: ['ACTIVE', 'NPL'] } }, select: { id: true, principal: true, outstandingBalance: true, status: true } },
            },
            take: limit,
        });
    }
}

import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';
import type { Prisma } from '@prisma/client';

/**
 * Dashboard Repository - Database access ONLY for dashboard queries
 */
export class DashboardRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    // ─── Loan queries ─────────────────────────────────────────────────────────

    async findLoans(params: {
        where: Prisma.LoanWhereInput;
        include?: any;
        orderBy?: any;
        take?: number;
    }): Promise<any[]> {
        return this.db.loan.findMany(params);
    }

    async countLoans(where: Prisma.LoanWhereInput): Promise<number> {
        return this.db.loan.count({ where });
    }

    async aggregateLoanBalance(where: Prisma.LoanWhereInput): Promise<any> {
        return this.db.loan.aggregate({ where, _sum: { outstandingBalance: true } });
    }

    async groupLoansByStatus(where: Prisma.LoanWhereInput): Promise<Array<{ status: any; _count: { _all: number } }>> {
        return this.db.loan.groupBy({ by: ['status'], where, _count: { _all: true } });
    }

    // ─── Payment queries ──────────────────────────────────────────────────────

    async findPayments(params: {
        where: Prisma.PaymentWhereInput;
        include?: any;
        orderBy?: any;
        take?: number;
    }): Promise<any[]> {
        return this.db.payment.findMany(params);
    }

    async countPayments(where: Prisma.PaymentWhereInput): Promise<number> {
        return this.db.payment.count({ where });
    }

    // ─── Payment schedule queries ─────────────────────────────────────────────

    async countPaymentSchedules(where: Prisma.PaymentScheduleWhereInput): Promise<number> {
        return this.db.paymentSchedule.count({ where });
    }

    async aggregatePaymentSchedules(where: Prisma.PaymentScheduleWhereInput): Promise<number> {
        const result = await this.db.paymentSchedule.aggregate({ where, _sum: { totalPayment: true } });
        return Number(result._sum.totalPayment || 0);
    }

    async aggregatePayments(where: Prisma.PaymentWhereInput): Promise<number> {
        const result = await this.db.payment.aggregate({ where, _sum: { amount: true } });
        return Number(result._sum.amount || 0);
    }

    // ─── Contact log queries ──────────────────────────────────────────────────

    async findContactLogs(params: {
        where: Prisma.ContactLogWhereInput;
        include?: any;
        orderBy?: any;
        take?: number;
    }): Promise<any[]> {
        return this.db.contactLog.findMany(params);
    }

    // ─── User queries ─────────────────────────────────────────────────────────

    async findUserRole(userId: string): Promise<{ role: string } | null> {
        return this.db.user.findUnique({ where: { id: userId }, select: { role: true } });
    }

    async findOfficers(params: {
        where: Prisma.UserWhereInput;
        select: any;
    }): Promise<any[]> {
        return this.db.user.findMany(params);
    }

    // ─── System config ────────────────────────────────────────────────────────

    async findSystemConfig(key: string): Promise<{ value: string } | null> {
        return this.db.systemConfig.findUnique({ where: { key } });
    }

    // ─── Session / security queries ───────────────────────────────────────────

    async countActiveSessions(): Promise<number> {
        const sessions = await this.db.session.findMany({
            where: { isValid: true, expiresAt: { gt: new Date() } },
            select: { userId: true },
            distinct: ['userId'],
        });
        return sessions.length;
    }

    async countSecurityEvents(where: Prisma.SecurityEventWhereInput): Promise<number> {
        return (this.db as any).securityEvent.count({ where });
    }

    // ─── Data volume queries ──────────────────────────────────────────────────

    async countAllLoans(): Promise<number> { return this.db.loan.count(); }
    async countAllPayments(): Promise<number> { return this.db.payment.count(); }
    async countAllCustomers(): Promise<number> { return this.db.customer.count(); }
    async countAllDocuments(): Promise<number> { return this.db.document.count(); }
    async countAllUsers(): Promise<number> { return this.db.user.count(); }

    async countLoansCreatedAfter(date: Date): Promise<number> {
        return this.db.loan.count({ where: { createdAt: { gte: date } } });
    }

    async countPaymentsCreatedAfter(date: Date): Promise<number> {
        return this.db.payment.count({ where: { createdAt: { gte: date } } });
    }
}

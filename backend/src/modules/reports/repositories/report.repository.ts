import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';
import type { Prisma } from '@prisma/client';

/**
 * Report Repository - Database access ONLY for report queries
 */
export class ReportRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    // ─── Loan queries ────────────────────────────────────────────────────────

    async countLoans(where: Prisma.LoanWhereInput): Promise<number> {
        return this.db.loan.count({ where });
    }

    async aggregateLoanBalance(where: Prisma.LoanWhereInput): Promise<number> {
        const result = await this.db.loan.aggregate({ where, _sum: { outstandingBalance: true } });
        return Number(result._sum.outstandingBalance || 0);
    }

    async findLoans(params: {
        where: Prisma.LoanWhereInput;
        include: any;
        orderBy?: any;
        take?: number;
    }): Promise<any[]> {
        return this.db.loan.findMany(params);
    }

    async groupLoansByStatus(where: Prisma.LoanWhereInput): Promise<Array<{ status: any; _count: { _all: number } }>> {
        return this.db.loan.groupBy({
            by: ['status'],
            where,
            _count: { _all: true },
        });
    }

    // ─── Disbursement queries ─────────────────────────────────────────────────

    async aggregateDisbursements(where: Prisma.LoanDisbursementWhereInput): Promise<number> {
        const result = await this.db.loanDisbursement.aggregate({ where, _sum: { amount: true } });
        return Number(result._sum.amount || 0);
    }

    // ─── Payment queries ──────────────────────────────────────────────────────

    async aggregatePayments(where: Prisma.PaymentWhereInput): Promise<number> {
        const result = await this.db.payment.aggregate({ where, _sum: { amount: true } });
        return Number(result._sum.amount || 0);
    }

    async findPayments(params: {
        where: Prisma.PaymentWhereInput;
        include: any;
        orderBy?: any;
        take?: number;
    }): Promise<any[]> {
        return this.db.payment.findMany(params);
    }

    // ─── Payment schedule queries ─────────────────────────────────────────────

    async aggregatePaymentSchedules(where: Prisma.PaymentScheduleWhereInput): Promise<number> {
        const result = await this.db.paymentSchedule.aggregate({ where, _sum: { totalPayment: true } });
        return Number(result._sum.totalPayment || 0);
    }

    // ─── User queries ─────────────────────────────────────────────────────────

    async findOfficers(params: {
        where: Prisma.UserWhereInput;
        select: any;
    }): Promise<any[]> {
        return this.db.user.findMany(params);
    }
}

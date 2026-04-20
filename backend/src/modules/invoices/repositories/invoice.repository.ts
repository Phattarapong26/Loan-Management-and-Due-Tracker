import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Invoice Repository - Database access ONLY
 */
export class InvoiceRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find the most recent invoice for a payment schedule
     */
    async findLatestByScheduleId(paymentScheduleId: string): Promise<any | null> {
        return (this.db as any).invoice.findFirst({
            where: { paymentScheduleId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create a new invoice record
     */
    async create(data: {
        paymentScheduleId: string;
        loanId: string;
        customerId: string;
        invoiceNumber: string;
        invoiceDate: Date;
        dueDate: Date;
        invoiceData: any;
        status: string;
        sentAt?: Date | null;
        sentVia?: string | null;
        generatedBy: string;
    }): Promise<any> {
        return (this.db as any).invoice.create({ data });
    }

    /**
     * Update invoice status
     */
    async updateStatus(id: string, status: string, extra?: { viewedAt?: Date }): Promise<void> {
        await (this.db as any).invoice.update({
            where: { id },
            data: { status, ...extra },
        });
    }

    /**
     * Find all invoices for a payment schedule (audit trail)
     */
    async findAllByScheduleId(paymentScheduleId: string): Promise<any[]> {
        return (this.db as any).invoice.findMany({
            where: { paymentScheduleId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find payment schedule with full loan/customer/product include
     */
    async findScheduleWithDetails(paymentScheduleId: string): Promise<any | null> {
        return this.db.paymentSchedule.findUnique({
            where: { id: paymentScheduleId },
            include: {
                loan: {
                    include: {
                        customer: { include: { branch: true } },
                        loanProduct: true,
                    },
                },
            },
        });
    }

    /**
     * Find payment schedule with just loan include
     */
    async findScheduleWithLoan(paymentScheduleId: string): Promise<any | null> {
        return this.db.paymentSchedule.findUnique({
            where: { id: paymentScheduleId },
            include: { loan: true },
        });
    }

    /**
     * Find first payment schedule for a loan by payment number
     */
    async findScheduleByLoanAndNumber(loanId: string, paymentNumber: number): Promise<any | null> {
        return this.db.paymentSchedule.findFirst({
            where: { loanId, paymentNumber },
        });
    }

    /**
     * Find all payment schedules for a loan
     */
    async findSchedulesByLoanId(loanId: string): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: { loanId },
            orderBy: { paymentNumber: 'asc' },
        });
    }

    /**
     * Count paid schedules for a loan
     */
    async countPaidSchedules(loanId: string): Promise<number> {
        return this.db.paymentSchedule.count({ where: { loanId, status: 'PAID' } });
    }

    /**
     * Find overdue schedules for a loan
     */
    async findOverdueSchedules(loanId: string): Promise<any[]> {
        return this.db.paymentSchedule.findMany({ where: { loanId, status: 'OVERDUE' } });
    }

    /**
     * Find payments for a schedule (latest first)
     */
    async findPaymentsByScheduleId(paymentScheduleId: string, take?: number): Promise<any[]> {
        return this.db.payment.findMany({
            where: { paymentScheduleId } as any,
            orderBy: { paymentDate: 'desc' },
            ...(take ? { take } : {}),
        });
    }

    /**
     * Find branch by ID (for invoice number generation)
     */
    async findBranchById(branchId: string): Promise<{ code: string } | null> {
        return this.db.branch.findUnique({
            where: { id: branchId },
            select: { code: true },
        });
    }
}

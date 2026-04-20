import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Next Payment Invoice Repository - Database access ONLY
 */
export class NextPaymentInvoiceRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find existing invoice for a payment schedule (excluding SUPERSEDED)
     */
    async findActiveByScheduleId(paymentScheduleId: string): Promise<any | null> {
        return (this.db as any).nextPaymentInvoice.findFirst({
            where: {
                paymentScheduleId,
                status: { not: 'SUPERSEDED' },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find invoice by ID
     */
    async findById(id: string): Promise<any | null> {
        return (this.db as any).nextPaymentInvoice.findUnique({ where: { id } });
    }

    /**
     * Find invoice by ID with loan/customer include
     */
    async findByIdWithLoan(id: string): Promise<any | null> {
        return (this.db as any).nextPaymentInvoice.findUnique({
            where: { id },
            include: {
                loan: { include: { customer: true } },
            },
        });
    }

    /**
     * Find first invoice for a schedule (latest, for payment update)
     */
    async findLatestByScheduleId(paymentScheduleId: string): Promise<any | null> {
        return (this.db as any).nextPaymentInvoice.findFirst({
            where: { paymentScheduleId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find invoices for a loan (all statuses)
     */
    async findAllByLoanId(loanId: string): Promise<any[]> {
        return (this.db as any).nextPaymentInvoice.findMany({
            where: { loanId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find invoices for a loan (excluding SUPERSEDED)
     */
    async findActiveByLoanId(loanId: string): Promise<any[]> {
        return (this.db as any).nextPaymentInvoice.findMany({
            where: { loanId, status: { not: 'SUPERSEDED' } },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find pending/sent invoice for a schedule (not SUPERSEDED)
     */
    async findPendingByScheduleId(paymentScheduleId: string): Promise<any | null> {
        return (this.db as any).nextPaymentInvoice.findFirst({
            where: {
                paymentScheduleId,
                status: { in: ['PENDING', 'SENT'], not: 'SUPERSEDED' as any },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create a new next payment invoice
     */
    async create(data: {
        invoiceNumber: string;
        loanId: string;
        customerId: string;
        paymentScheduleId: string;
        invoiceData: any;
        status: string;
        generatedBy: string;
        validUntil: Date;
    }): Promise<any> {
        return (this.db as any).nextPaymentInvoice.create({ data });
    }

    /**
     * Mark invoice as SUPERSEDED
     */
    async markAsSuperseded(id: string): Promise<void> {
        await (this.db as any).nextPaymentInvoice.update({
            where: { id },
            data: { status: 'SUPERSEDED', updatedAt: new Date() },
        });
    }

    /**
     * Update invoice after payment
     */
    async updateAfterPayment(id: string, data: {
        status: string;
        paidAt: Date;
        paidAmount: number;
        paymentMethod: string;
        receiptNumber: string;
    }): Promise<void> {
        await (this.db as any).nextPaymentInvoice.update({ where: { id }, data });
    }

    /**
     * Update invoice status (sent, etc.)
     */
    async updateStatus(id: string, data: {
        status: string;
        sentAt?: Date;
        sentVia?: string;
        sentBy?: string;
    }): Promise<void> {
        await (this.db as any).nextPaymentInvoice.update({ where: { id }, data });
    }

    /**
     * Find loan with customer and branch
     */
    async findLoanWithCustomerAndBranch(loanId: string): Promise<any | null> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            include: {
                customer: { include: { branch: true } },
            },
        });
    }

    /**
     * Find payments for a schedule
     */
    async findPaymentsByScheduleId(paymentScheduleId: string, take?: number): Promise<any[]> {
        return this.db.payment.findMany({
            where: { paymentScheduleId } as any,
            orderBy: { paymentDate: 'desc' },
            ...(take ? { take } : {}),
        });
    }

    /**
     * Find branch by ID
     */
    async findBranchById(branchId: string): Promise<{ id: string; code: string } | null> {
        return this.db.branch.findUnique({
            where: { id: branchId },
            select: { id: true, code: true },
        });
    }
}

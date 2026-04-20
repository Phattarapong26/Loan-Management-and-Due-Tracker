import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Payment Receipt Repository - Database access ONLY
 */
export class PaymentReceiptRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find payment with full loan/customer/schedule include
     */
    async findPaymentWithDetails(paymentId: string): Promise<any | null> {
        return this.db.payment.findUnique({
            where: { id: paymentId },
            include: {
                loan: {
                    include: {
                        customer: { include: { branch: true } },
                    },
                },
                paymentSchedule: true,
            },
        });
    }

    /**
     * Find existing receipt for a payment
     */
    async findReceiptByPaymentId(paymentId: string): Promise<any | null> {
        return this.db.paymentReceipt.findFirst({ where: { paymentId } });
    }

    /**
     * Find receipt by ID
     */
    async findReceiptById(id: string): Promise<any | null> {
        return this.db.paymentReceipt.findUnique({ where: { id } });
    }

    /**
     * Find receipt by ID with customer and payment includes
     */
    async findReceiptByIdWithIncludes(id: string): Promise<any | null> {
        return this.db.paymentReceipt.findUnique({
            where: { id },
            include: { customer: true, payment: true },
        });
    }

    /**
     * Find receipt by receipt number
     */
    async findReceiptByNumber(receiptNumber: string): Promise<any | null> {
        return this.db.paymentReceipt.findUnique({ where: { receiptNumber } });
    }

    /**
     * Find all receipts for a loan
     */
    async findReceiptsByLoanId(loanId: string): Promise<any[]> {
        return this.db.paymentReceipt.findMany({
            where: { loanId },
            orderBy: { issuedAt: 'desc' },
        });
    }

    /**
     * Create a new receipt
     */
    async createReceipt(data: {
        receiptNumber: string;
        paymentId: string;
        loanId: string;
        customerId: string;
        invoiceId?: string;
        amount: number;
        paymentDate: Date;
        paymentMethod: string;
        receiptData: any;
        status: string;
        issuedBy: string;
        issuedAt: Date;
    }): Promise<any> {
        return this.db.paymentReceipt.create({ data });
    }

    /**
     * Update receipt (sent status, pdf url, etc.)
     */
    async updateReceipt(id: string, data: {
        sentAt?: Date;
        sentVia?: string;
        receiptData?: any;
    }): Promise<void> {
        await this.db.paymentReceipt.update({ where: { id }, data });
    }

    /**
     * Find customer with LINE user info
     */
    async findCustomerWithLine(customerId: string): Promise<any | null> {
        return this.db.customer.findUnique({
            where: { id: customerId },
            include: { user: true },
        });
    }

    /**
     * Find loan statistics data
     */
    async findLoanForStatistics(loanId: string): Promise<{
        principal: any;
        outstandingBalance: any;
        termMonths: number;
    } | null> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            select: { principal: true, outstandingBalance: true, termMonths: true },
        });
    }

    /**
     * Find all payments for a loan (for statistics)
     */
    async findPaymentsByLoanId(loanId: string): Promise<Array<{ amount: any }>> {
        return this.db.payment.findMany({
            where: { loanId },
            select: { amount: true },
        });
    }

    /**
     * Count paid schedules for a loan
     */
    async countPaidSchedules(loanId: string): Promise<number> {
        return this.db.paymentSchedule.count({ where: { loanId, status: 'PAID' } });
    }
}

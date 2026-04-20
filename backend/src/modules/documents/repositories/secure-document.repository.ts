import { prisma } from '@config/database.config';

/**
 * Secure Document Repository - Database access ONLY
 */
export class SecureDocumentRepository {
    async createToken(data: {
        token: string;
        documentType: string;
        documentId: string;
        customerId: string;
        expiresAt: Date;
    }): Promise<void> {
        await prisma.secureDocumentToken.create({
            data: { ...data, accessCount: 0 },
        });
    }

    async findToken(token: string): Promise<any> {
        return prisma.secureDocumentToken.findUnique({
            where: { token },
            include: { customer: true },
        });
    }

    async incrementAccessCount(token: string): Promise<void> {
        await prisma.secureDocumentToken.update({
            where: { token },
            data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
        });
    }

    async deleteExpiredTokens(): Promise<number> {
        const result = await prisma.secureDocumentToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        return result.count;
    }

    async logAccessAttempt(token: string, success: boolean, reason?: string): Promise<void> {
        await prisma.documentAccessLog.create({
            data: { token, success, reason, accessedAt: new Date() },
        });
    }

    async findReceipt(receiptId: string): Promise<any> {
        return prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
    }

    async updateReceiptData(receiptId: string, receiptData: any): Promise<void> {
        await prisma.paymentReceipt.update({
            where: { id: receiptId },
            data: { receiptData },
        });
    }

    async findInvoiceById(invoiceId: string): Promise<any> {
        return prisma.nextPaymentInvoice.findUnique({ where: { id: invoiceId } });
    }

    async findInvoiceByScheduleId(scheduleId: string): Promise<any> {
        return prisma.nextPaymentInvoice.findFirst({
            where: { paymentScheduleId: scheduleId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findPaymentScheduleWithLoan(scheduleId: string): Promise<any> {
        return prisma.paymentSchedule.findUnique({
            where: { id: scheduleId },
            include: { loan: { include: { customer: true } } },
        });
    }

    async updateInvoiceData(invoiceId: string, invoiceData: any): Promise<void> {
        await prisma.nextPaymentInvoice.update({
            where: { id: invoiceId },
            data: { invoiceData },
        });
    }

    async findLoanById(loanId: string): Promise<any> {
        return prisma.loan.findUnique({ where: { id: loanId } });
    }
}

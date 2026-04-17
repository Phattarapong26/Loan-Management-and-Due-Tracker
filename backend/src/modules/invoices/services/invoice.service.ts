import { logger } from '@utils/common/logger.util';
import { prisma } from '@config/database.config';
import { ReferenceNumberService } from './reference-number.service';
import { formatThaiDate } from '@utils/common/thai-language.util';

export interface InvoiceData {
    accountNo: string;
    loanType: string;
    installmentNo: number;
    totalInstallments: number;
    billingDate: string;
    dueDate: string;
    customer: {
        name: string;
        address: string;
        city: string;
        email: string;
        phone: string;
    };
    breakdown: {
        principal: number;
        interest: number;
        fees: number;
        total: number;
    };
    summary: {
        remainingBalance: number;
        interestRate: string;
        paidInstallments: number;
        overdueAmount: number;
    };
    loan: {
        id: string;
        startDate: string;
        maturityDate: string;
        monthlyPayment: number;
    };
    payment?: {
        status: string;
        paidAt?: string;
        paidAmount?: number;
    };
}

export class InvoiceService {
    /**
     * Get or generate invoice data for a specific payment schedule
     * Uses hybrid approach: check for pre-generated invoice first, then generate on-demand
     */
    async getInvoiceData(paymentScheduleId: string, forceRegenerate = false): Promise<InvoiceData> {
        try {
            // Check for pre-generated invoice first (unless force regenerate)
            if (!forceRegenerate) {
                const existingInvoice = await (prisma as any).invoice.findFirst({
                    where: { paymentScheduleId },
                    orderBy: { createdAt: 'desc' },
                });

                if (existingInvoice) {
                    logger.info({ paymentScheduleId }, 'Using pre-generated invoice');
                    return existingInvoice.invoiceData as InvoiceData;
                }
            }

            // Generate invoice on-demand
            logger.info({ paymentScheduleId, forceRegenerate }, 'Generating invoice on-demand');
            return await this.generateInvoiceData(paymentScheduleId);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice data');
            throw error;
        }
    }

    /**
     * Generate invoice data from payment schedule
     * This is the core logic for creating invoice data
     */
    private async generateInvoiceData(paymentScheduleId: string): Promise<InvoiceData> {
        try {
            console.log('🔍 Starting generateInvoiceData for paymentScheduleId:', paymentScheduleId);
            
            const schedule = await prisma.paymentSchedule.findUnique({
                where: { id: paymentScheduleId },
                include: {
                    loan: {
                        include: {
                            customer: {
                                include: {
                                    branch: true,
                                },
                            },
                            loanProduct: true,
                        },
                    },
                },
            });

            if (!schedule) {
                throw new Error('Payment schedule not found');
            }

            console.log('🔍 Schedule data retrieved:', {
                scheduleId: schedule.id,
                paymentNumber: schedule.paymentNumber,
                paymentDate: schedule.paymentDate,
                paymentDateType: typeof schedule.paymentDate,
                createdAt: schedule.createdAt,
                createdAtType: typeof schedule.createdAt,
            });

            // Fetch payments separately
            const payments = await prisma.payment.findMany({
                where: { paymentScheduleId } as any,
                orderBy: { paymentDate: 'desc' },
                take: 1,
            });

            const loan = (schedule as any).loan;
            const customer = loan.customer;

            // Count paid installments
            const paidCount = await prisma.paymentSchedule.count({
                where: {
                    loanId: loan.id,
                    status: 'PAID',
                },
            });

            // Calculate overdue amount
            const overdueSchedules = await prisma.paymentSchedule.findMany({
                where: {
                    loanId: loan.id,
                    status: 'OVERDUE',
                },
            });

            const overdueAmount = overdueSchedules.reduce(
                (sum, s) => sum + Number(s.totalPayment),
                0
            );

            // Format dates - ป้องกัน undefined/null
            const billingDate = schedule.createdAt 
                ? formatThaiDate(schedule.createdAt, 'd MMM yyyy')
                : formatThaiDate(new Date(), 'd MMM yyyy'); // ใช้วันที่ปัจจุบันถ้าไม่มีข้อมูล
            
            const dueDate = schedule.paymentDate 
                ? formatThaiDate(schedule.paymentDate, 'd MMM yyyy')
                : formatThaiDate(new Date(), 'd MMM yyyy'); // ใช้วันที่ปัจจุบันถ้าไม่มีข้อมูล

            // Get payment info if exists
            const payment = payments[0];

            const invoiceData: InvoiceData = {
                accountNo: this.formatAccountNumber(loan.id),
                loanType: loan.loanProduct?.productName || 'สินเชื่อ SME',
                installmentNo: schedule.paymentNumber || 1, // ป้องกัน undefined
                totalInstallments: loan.termMonths || 12, // ป้องกัน undefined
                billingDate,
                dueDate,
                customer: {
                    name: customer.businessName,
                    address: customer.address || '-',
                    city: customer.branch?.name || '-',
                    email: customer.email || '-',
                    phone: customer.phone,
                },
                breakdown: {
                    principal: Number(schedule.principalAmount),
                    interest: Number(schedule.interestAmount),
                    fees: 0, // Add fees logic if needed
                    total: Number(schedule.totalPayment),
                },
                summary: {
                    remainingBalance: Number(loan.outstandingBalance),
                    interestRate: `${Number(loan.interestRate).toFixed(2)}% p.a.`,
                    paidInstallments: paidCount,
                    overdueAmount,
                },
                loan: {
                    id: loan.id,
                    startDate: loan.startDate ? formatThaiDate(loan.startDate, 'd MMM yyyy') : '-',
                    maturityDate: loan.maturityDate ? formatThaiDate(loan.maturityDate, 'd MMM yyyy') : '-',
                    monthlyPayment: Number(loan.monthlyPayment || 0),
                },
                payment: payment
                    ? {
                        status: schedule.status,
                        paidAt: formatThaiDate(payment.paymentDate, 'd MMM yyyy'),
                        paidAmount: Number(payment.amount),
                    }
                    : undefined,
            };

            // เพิ่ม logging เพื่อ debug
            console.log('📋 Generated invoice data:', {
                accountNo: invoiceData.accountNo,
                billingDate: invoiceData.billingDate,
                dueDate: invoiceData.dueDate,
                installmentNo: invoiceData.installmentNo,
                totalInstallments: invoiceData.totalInstallments,
                customerName: invoiceData.customer.name,
                scheduleCreatedAt: schedule.createdAt,
                schedulePaymentDate: schedule.paymentDate,
                schedulePaymentNumber: schedule.paymentNumber,
                loanTermMonths: loan.termMonths,
            });

            return invoiceData;
        } catch (error) {
            logger.error({ error }, 'Error generating invoice data');
            throw error;
        }
    }

    /**
     * Pre-generate and save invoice for a payment schedule
     * Used when sending invoice to customer or for audit trail
     */
    async saveInvoice(
        paymentScheduleId: string,
        generatedBy: string,
        sendVia?: string
    ): Promise<{ invoiceId: string; invoiceNumber: string; data: InvoiceData }> {
        try {
            // Generate invoice data
            const invoiceData = await this.generateInvoiceData(paymentScheduleId);

            // Get payment schedule for metadata
            const schedule = await prisma.paymentSchedule.findUnique({
                where: { id: paymentScheduleId },
                include: { loan: true },
            });

            if (!schedule) {
                throw new Error('Payment schedule not found');
            }

            // Generate invoice number using branch ID from loan
            const invoiceNumber = await this.generateInvoiceNumber((schedule.loan as any).branchId);

            // Determine status
            const now = new Date();
            const dueDate = schedule.paymentDate;
            let status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' = 'DRAFT';

            if (sendVia) {
                status = 'SENT';
            }
            if (schedule.status === 'PAID') {
                status = 'PAID';
            } else if (now > dueDate) {
                status = 'OVERDUE';
            }

            // Save invoice
            const invoice = await (prisma as any).invoice.create({
                data: {
                    paymentScheduleId,
                    loanId: schedule.loanId,
                    customerId: (schedule.loan as any).customerId,
                    invoiceNumber,
                    invoiceDate: now,
                    dueDate: schedule.paymentDate,
                    invoiceData: invoiceData as any,
                    status,
                    sentAt: sendVia ? now : null,
                    sentVia: sendVia || null,
                    generatedBy,
                },
            });

            logger.info(
                {
                    invoiceId: invoice.id,
                    invoiceNumber,
                    paymentScheduleId,
                    status,
                },
                'Invoice saved successfully'
            );

            return {
                invoiceId: invoice.id,
                invoiceNumber,
                data: invoiceData,
            };
        } catch (error) {
            logger.error({ error, paymentScheduleId }, 'Error saving invoice');
            throw error;
        }
    }

    /**
     * Generate unique invoice number using new reference number system
     * Format: INV-[สาขา(4ตัว)]-[ปีพ.ศ.(2ตัว)]-[เดือน(2ตัว)]-[ลำดับที่(5ตัว)]
     * Example: INV-BKK1-67-03-00123
     */

    private async generateInvoiceNumber(branchId: string): Promise<string> {
        // Get branch code first
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { code: true }
        });

        if (!branch) {
            throw new Error(`Branch not found: ${branchId}`);
        }

        const referenceService = new ReferenceNumberService();
        return await referenceService.generateInvoiceNumber(branch.code);
    }

    /**
     * Mark invoice as viewed by customer
     */
    async markAsViewed(invoiceId: string): Promise<void> {
        await (prisma as any).invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'VIEWED',
                viewedAt: new Date(),
            },
        });
    }

    /**
     * Get all invoices for a payment schedule (audit trail)
     */
    async getInvoiceHistory(paymentScheduleId: string) {
        return await (prisma as any).invoice.findMany({
            where: { paymentScheduleId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get invoice by loan ID and installment number
     */
    async getInvoiceByInstallment(loanId: string, installmentNo: number): Promise<InvoiceData> {
        try {
            const schedule = await prisma.paymentSchedule.findFirst({
                where: {
                    loanId,
                    paymentNumber: installmentNo,
                },
            });

            if (!schedule) {
                throw new Error('Payment schedule not found');
            }

            return this.getInvoiceData(schedule.id);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice by installment');
            throw error;
        }
    }

    /**
     * Get all invoices for a loan
     */
    async getLoanInvoices(loanId: string): Promise<InvoiceData[]> {
        try {
            const schedules = await prisma.paymentSchedule.findMany({
                where: { loanId },
                orderBy: { paymentNumber: 'asc' },
            });

            const invoices = await Promise.all(
                schedules.map((schedule) => this.getInvoiceData(schedule.id))
            );

            return invoices;
        } catch (error) {
            logger.error({ error }, 'Error getting loan invoices');
            throw error;
        }
    }

    /**
     * Format account number from loan ID
     */
    private formatAccountNumber(loanId: string): string {
        // Take first 8 chars of UUID and format as XXX-X-XXXXX-X
        const shortId = loanId.replace(/-/g, '').substring(0, 10);
        return `${shortId.substring(0, 3)}-${shortId.substring(3, 4)}-${shortId.substring(4, 9)}-${shortId.substring(9, 10)}`;
    }
}

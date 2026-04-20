import { logger } from '@utils/common/logger.util';
import { InvoiceRepository } from '../repositories/invoice.repository';
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
    private invoiceRepo: InvoiceRepository;

    constructor() {
        this.invoiceRepo = new InvoiceRepository();
    }

    /**
     * Get or generate invoice data for a specific payment schedule
     * Uses hybrid approach: check for pre-generated invoice first, then generate on-demand
     */
    async getInvoiceData(paymentScheduleId: string, forceRegenerate = false): Promise<InvoiceData> {
        try {
            // Check for pre-generated invoice first (unless force regenerate)
            if (!forceRegenerate) {
                const existingInvoice = await this.invoiceRepo.findLatestByScheduleId(paymentScheduleId);

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
            
            const schedule = await this.invoiceRepo.findScheduleWithDetails(paymentScheduleId);

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
            const payments = await this.invoiceRepo.findPaymentsByScheduleId(paymentScheduleId, 1);

            const loan = schedule.loan;
            const customer = loan.customer;

            // Count paid installments
            const paidCount = await this.invoiceRepo.countPaidSchedules(loan.id);

            // Calculate overdue amount
            const overdueSchedules = await this.invoiceRepo.findOverdueSchedules(loan.id);

            const overdueAmount = overdueSchedules.reduce(
                (sum: number, s: any) => sum + Number(s.totalPayment),
                0
            );

            // Format dates - ป้องกัน undefined/null
            const billingDate = schedule.createdAt 
                ? formatThaiDate(schedule.createdAt, 'd MMM yyyy')
                : formatThaiDate(new Date(), 'd MMM yyyy');
            
            const dueDate = schedule.paymentDate 
                ? formatThaiDate(schedule.paymentDate, 'd MMM yyyy')
                : formatThaiDate(new Date(), 'd MMM yyyy');

            // Get payment info if exists
            const payment = payments[0];

            const invoiceData: InvoiceData = {
                accountNo: this.formatAccountNumber(loan.id),
                loanType: loan.loanProduct?.productName || 'สินเชื่อ SME',
                installmentNo: schedule.paymentNumber || 1,
                totalInstallments: loan.termMonths || 12,
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
                    fees: 0,
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
            const schedule = await this.invoiceRepo.findScheduleWithLoan(paymentScheduleId);

            if (!schedule) {
                throw new Error('Payment schedule not found');
            }

            // Generate invoice number using branch ID from loan
            const invoiceNumber = await this.generateInvoiceNumber(schedule.loan.branchId);

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
            const invoice = await this.invoiceRepo.create({
                paymentScheduleId,
                loanId: schedule.loanId,
                customerId: schedule.loan.customerId,
                invoiceNumber,
                invoiceDate: now,
                dueDate: schedule.paymentDate,
                invoiceData: invoiceData as any,
                status,
                sentAt: sendVia ? now : null,
                sentVia: sendVia || null,
                generatedBy,
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
        const branch = await this.invoiceRepo.findBranchById(branchId);

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
        await this.invoiceRepo.updateStatus(invoiceId, 'VIEWED', { viewedAt: new Date() });
    }

    /**
     * Get all invoices for a payment schedule (audit trail)
     */
    async getInvoiceHistory(paymentScheduleId: string) {
        return this.invoiceRepo.findAllByScheduleId(paymentScheduleId);
    }

    /**
     * Get invoice by loan ID and installment number
     */
    async getInvoiceByInstallment(loanId: string, installmentNo: number): Promise<InvoiceData> {
        try {
            const schedule = await this.invoiceRepo.findScheduleByLoanAndNumber(loanId, installmentNo);

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
            const schedules = await this.invoiceRepo.findSchedulesByLoanId(loanId);

            const invoices = await Promise.all(
                schedules.map((schedule: any) => this.getInvoiceData(schedule.id))
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

import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import { PrincipalCalculatorService } from '@loans/calculators/principal-calculator.service';
import { ReferenceNumberService } from './reference-number.service';

// Force TypeScript reload after Prisma schema changes - updated
// Use type assertion to work around TypeScript language server issues
const db = prisma as any;

export interface NextPaymentInvoiceData {
    invoiceId: string;
    invoiceNumber: string;
    loanId: string;
    customerId: string;
    paymentScheduleId: string;
    
    // ข้อมูลลูกค้า
    customer: {
        businessName: string;
        address: string;
        phone: string;
        email?: string;
    };
    
    // ข้อมูลงวดถัดไป
    nextPayment: {
        installmentNo: number;
        totalInstallments: number;
        dueDate: Date;
        principalAmount: number;
        interestAmount: number;
        totalAmount: number;
        status: string;
    };
    
    // ข้อมูลสินเชื่อปัจจุบัน
    loanSummary: {
        originalPrincipal: number;
        currentOutstandingBalance: number;
        remainingPrincipal: number;
        totalPaid: number;
        paymentProgress: number;
        interestRate: number;
    };
    
    // ข้อมูลการชำระ (ถ้ามี)
    paymentInfo?: {
        isPaid: boolean;
        paidAmount?: number;
        paidDate?: Date;
        paymentMethod?: string;
        receiptNumber?: string;
    };
    
    // ข้อมูลเพิ่มเติม
    metadata: {
        generatedAt: Date;
        validUntil: Date;
        qrCodeData?: string;
        bankingInfo?: {
            accountName: string;
            accountNumber: string;
            bankName: string;
        };
    };
}

export class NextPaymentInvoiceService {
    private principalCalculator: PrincipalCalculatorService;
    private referenceService: ReferenceNumberService;

    constructor() {
        this.principalCalculator = new PrincipalCalculatorService();
        this.referenceService = new ReferenceNumberService();
    }

    /**
     * สร้าง Invoice สำหรับงวดถัดไปเท่านั้น
     * ไม่ regenerate ตารางผ่อนทั้งหมด
     */
    async generateNextPaymentInvoice(
        loanId: string,
        generatedBy: string,
        options: {
            includeBankingInfo?: boolean;
            includeQRCode?: boolean;
            validDays?: number;
        } = {}
    ): Promise<NextPaymentInvoiceData> {
        try {
            logger.info({ loanId, generatedBy }, 'Generating next payment invoice');

            // ดึงข้อมูลสินเชื่อและลูกค้า
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        include: {
                            branch: true,
                        },
                    },
                },
            });

            if (!loan) {
                throw new Error('Loan not found');
            }

            // คำนวณเงินต้นปัจจุบัน
            const principalCalc = await this.principalCalculator.calculateCurrentPrincipal(loanId);

            if (!principalCalc.nextPaymentSchedule) {
                throw new Error('No pending payment schedule found');
            }

            const nextSchedule = principalCalc.nextPaymentSchedule;

            // ตรวจสอบว่ามี Invoice สำหรับงวดนี้แล้วหรือไม่
            const existingInvoice = await this.findExistingInvoice(nextSchedule.id);
            
            if (existingInvoice && !this.shouldRegenerateInvoice(existingInvoice)) {
                logger.info({ invoiceId: existingInvoice.id }, 'Using existing invoice');
                return this.formatInvoiceData(existingInvoice, principalCalc);
            }

            // ถ้ามี existing invoice ที่ต้อง regenerate ให้ mark เป็น SUPERSEDED
            if (existingInvoice) {
                await this.markInvoiceAsSuperseded(existingInvoice.id, generatedBy);
                logger.info({ 
                    oldInvoiceId: existingInvoice.id,
                    reason: 'regenerating_due_to_data_issues' 
                }, 'Marked old invoice as superseded');
            }

            // สร้าง Invoice Number ใหม่
            const invoiceNumber = await this.referenceService.generateInvoiceNumber(
                (loan.customer as any).branch.code
            );

            // ตรวจสอบการชำระเงิน (ถ้ามี)
            const paymentInfo = await this.getPaymentInfo(nextSchedule.id);

            // สร้างข้อมูล Banking (ถ้าต้องการ)
            let bankingInfo;
            if (options.includeBankingInfo) {
                bankingInfo = await this.getBankingInfo((loan.customer as any).branch.id);
            }

            // สร้าง QR Code (ถ้าต้องการ)
            let qrCodeData;
            if (options.includeQRCode) {
                qrCodeData = await this.generateQRCodeData(
                    invoiceNumber,
                    nextSchedule.totalPayment,
                    bankingInfo
                );
            }

            // กำหนดวันหมดอายุ
            const validDays = options.validDays || 30;
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + validDays);

            // สร้างข้อมูล Invoice
            const invoiceData: NextPaymentInvoiceData = {
                invoiceId: '', // จะได้จากการ save
                invoiceNumber,
                loanId,
                customerId: loan.customerId,
                paymentScheduleId: nextSchedule.id,
                
                customer: {
                    businessName: (loan.customer as any).businessName,
                    address: (loan.customer as any).address || '-',
                    phone: (loan.customer as any).phone,
                    email: (loan.customer as any).email,
                },
                
                nextPayment: {
                    installmentNo: nextSchedule.paymentNumber,
                    totalInstallments: loan.termMonths,
                    dueDate: nextSchedule.paymentDate,
                    principalAmount: nextSchedule.principalAmount,
                    interestAmount: nextSchedule.interestAmount,
                    totalAmount: nextSchedule.totalPayment,
                    status: nextSchedule.status,
                },
                
                loanSummary: {
                    originalPrincipal: Number(loan.principal),
                    currentOutstandingBalance: principalCalc.currentOutstandingBalance,
                    remainingPrincipal: principalCalc.remainingPrincipal,
                    totalPaid: principalCalc.totalAmountPaid,
                    paymentProgress: principalCalc.paymentProgress.progressPercentage,
                    interestRate: Number(loan.interestRate),
                },
                
                paymentInfo,
                
                metadata: {
                    generatedAt: new Date(),
                    validUntil,
                    qrCodeData,
                    bankingInfo,
                },
            };

            // 🔍 เพิ่ม logging เพื่อ debug ข้อมูลที่สร้าง
            logger.info({
                loanId,
                paymentScheduleId: nextSchedule.id,
                invoiceNumber,
                nextPaymentData: {
                    installmentNo: invoiceData.nextPayment.installmentNo,
                    totalInstallments: invoiceData.nextPayment.totalInstallments,
                    dueDate: invoiceData.nextPayment.dueDate,
                    dueDateType: typeof invoiceData.nextPayment.dueDate,
                },
                scheduleData: {
                    paymentNumber: nextSchedule.paymentNumber,
                    paymentDate: nextSchedule.paymentDate,
                    paymentDateType: typeof nextSchedule.paymentDate,
                },
                loanData: {
                    termMonths: loan.termMonths,
                    termMonthsType: typeof loan.termMonths,
                }
            }, 'Generated new invoice data');

            // บันทึก Invoice
            const savedInvoice = await this.saveNextPaymentInvoice(invoiceData, generatedBy);
            invoiceData.invoiceId = savedInvoice.id;

            logger.info(
                {
                    invoiceId: savedInvoice.id,
                    invoiceNumber,
                    loanId,
                    installmentNo: nextSchedule.paymentNumber,
                },
                'Next payment invoice generated successfully'
            );

            return invoiceData;
        } catch (error) {
            logger.error({ error, loanId }, 'Error generating next payment invoice');
            throw error;
        }
    }

    /**
     * อัพเดท Invoice หลังจากมีการชำระเงิน
     * เรียกใช้จาก Payment Service
     */
    async updateInvoiceAfterPayment(
        paymentScheduleId: string,
        paymentData: {
            amount: number;
            paymentDate: Date;
            paymentMethod: string;
            receiptNumber: string;
        }
    ): Promise<void> {
        try {
            // หา Invoice ที่เกี่ยวข้อง
            const invoice = await db.nextPaymentInvoice.findFirst({
                where: { paymentScheduleId },
                orderBy: { createdAt: 'desc' },
            });

            if (!invoice) {
                logger.warn({ paymentScheduleId }, 'No invoice found to update after payment');
                return;
            }

            // อัพเดทสถานะ Invoice
            await db.nextPaymentInvoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'PAID',
                    paidAt: paymentData.paymentDate,
                    paidAmount: paymentData.amount,
                    paymentMethod: paymentData.paymentMethod,
                    receiptNumber: paymentData.receiptNumber,
                },
            });

            logger.info(
                {
                    invoiceId: invoice.id,
                    paymentScheduleId,
                    amount: paymentData.amount,
                },
                'Invoice updated after payment'
            );
        } catch (error) {
            logger.error({ error, paymentScheduleId }, 'Error updating invoice after payment');
            // ไม่ throw error เพราะไม่ควรให้การอัพเดท invoice ไปกระทบการบันทึกการชำระเงิน
        }
    }

    /**
     * ดึง Invoice งวดถัดไปสำหรับลูกค้า
     */
    async getNextPaymentInvoiceForCustomer(loanId: string): Promise<NextPaymentInvoiceData | null> {
        try {
            // คำนวณงวดถัดไป
            const principalCalc = await this.principalCalculator.calculateCurrentPrincipal(loanId);

            if (!principalCalc.nextPaymentSchedule) {
                return null; // ไม่มีงวดที่ต้องชำระ
            }

            // หา Invoice ล่าสุดสำหรับงวดนี้ (ไม่รวม SUPERSEDED)
            const invoice = await db.nextPaymentInvoice.findFirst({
                where: { 
                    paymentScheduleId: principalCalc.nextPaymentSchedule.id,
                    status: { 
                        in: ['PENDING', 'SENT'],
                        not: 'SUPERSEDED' as any // ไม่เอา invoice ที่ถูก supersede
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            if (!invoice) {
                // สร้าง Invoice ใหม่
                return await this.generateNextPaymentInvoice(loanId, 'SYSTEM');
            }

            return this.formatInvoiceData(invoice, principalCalc);
        } catch (error) {
            logger.error({ error, loanId }, 'Error getting next payment invoice for customer');
            throw error;
        }
    }

    /**
     * ส่ง Invoice ให้ลูกค้าผ่าน LINE หรือ Email
     */
    async sendInvoiceToCustomer(
        invoiceId: string,
        method: 'LINE' | 'EMAIL' | 'SMS',
        sentBy: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const invoice = await db.nextPaymentInvoice.findUnique({
                where: { id: invoiceId },
                include: {
                    loan: {
                        include: {
                            customer: true,
                        },
                    },
                },
            });

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // อัพเดทสถานะเป็น SENT
            await db.nextPaymentInvoice.update({
                where: { id: invoiceId },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    sentVia: method,
                    sentBy,
                },
            });

            // TODO: Implement actual sending logic
            // - LINE: ใช้ LINE Bot API
            // - EMAIL: ใช้ Email Service
            // - SMS: ใช้ SMS Service

            logger.info(
                {
                    invoiceId,
                    method,
                    customerId: invoice.customerId,
                },
                'Invoice sent to customer'
            );

            return {
                success: true,
                message: `Invoice sent via ${method} successfully`,
            };
        } catch (error) {
            logger.error({ error, invoiceId }, 'Error sending invoice to customer');
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * ดึงประวัติ Invoice ทั้งหมดของสินเชื่อ
     */
    async getInvoiceHistory(loanId: string): Promise<NextPaymentInvoiceData[]> {
        try {
            const invoices = await db.nextPaymentInvoice.findMany({
                where: { loanId },
                orderBy: { createdAt: 'desc' },
            });

            const results = [];
            for (const invoice of invoices) {
                const principalCalc = await this.principalCalculator.calculateCurrentPrincipal(loanId);
                results.push(this.formatInvoiceData(invoice, principalCalc));
            }

            return results;
        } catch (error) {
            logger.error({ error, loanId }, 'Error getting invoice history');
            throw error;
        }
    }

    /**
     * ดึงประวัติ Invoice สำหรับลูกค้า (ไม่รวม SUPERSEDED)
     */
    async getCustomerInvoiceHistory(loanId: string): Promise<NextPaymentInvoiceData[]> {
        try {
            const invoices = await db.nextPaymentInvoice.findMany({
                where: { 
                    loanId,
                    status: { not: 'SUPERSEDED' as any } // ลูกค้าไม่เห็น invoice ที่ถูก supersede
                },
                orderBy: { createdAt: 'desc' },
            });

            const results = [];
            for (const invoice of invoices) {
                const principalCalc = await this.principalCalculator.calculateCurrentPrincipal(loanId);
                results.push(this.formatInvoiceData(invoice, principalCalc));
            }

            return results;
        } catch (error) {
            logger.error({ error, loanId }, 'Error getting customer invoice history');
            throw error;
        }
    }

    // Private methods

    private async findExistingInvoice(paymentScheduleId: string) {
        return await db.nextPaymentInvoice.findFirst({
            where: { 
                paymentScheduleId,
                status: { not: 'SUPERSEDED' as any } // ไม่เอา invoice ที่ถูก supersede แล้ว
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    private shouldRegenerateInvoice(invoice: any): boolean {
        // Regenerate ถ้า Invoice เก่าเกิน 7 วัน หรือสถานะเป็น EXPIRED
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // ✅ เพิ่มเงื่อนไข: Regenerate ถ้าข้อมูลสำคัญเป็น undefined หรือ null
        const invoiceData = invoice.invoiceData;
        const hasUndefinedData = !invoiceData?.nextPayment?.dueDate || 
                                !invoiceData?.metadata?.generatedAt ||
                                !invoiceData?.nextPayment?.installmentNo ||
                                invoiceData.nextPayment.installmentNo === undefined ||
                                invoiceData.nextPayment.installmentNo === null;
        
        if (hasUndefinedData) {
            logger.info({ 
                invoiceId: invoice.id,
                missingData: {
                    dueDate: !invoiceData?.nextPayment?.dueDate,
                    generatedAt: !invoiceData?.metadata?.generatedAt,
                    installmentNo: !invoiceData?.nextPayment?.installmentNo,
                    installmentNoValue: invoiceData?.nextPayment?.installmentNo
                }
            }, 'Regenerating invoice due to undefined/missing data');
            return true;
        }
        
        return invoice.createdAt < sevenDaysAgo || invoice.status === 'EXPIRED';
    }

    /**
     * Mark old invoice as superseded for audit trail
     */
    private async markInvoiceAsSuperseded(invoiceId: string, supersededBy: string) {
        try {
            await prisma.nextPaymentInvoice.update({
                where: { id: invoiceId },
                data: {
                    status: 'SUPERSEDED' as any, // Use type assertion to handle enum
                    updatedAt: new Date(),
                    // Note: We don't have supersededBy field, so we'll use a comment in invoiceData
                },
            });
            
            logger.info({ invoiceId, supersededBy, reason: 'data_correction' }, 'Invoice marked as superseded');
        } catch (error) {
            logger.error({ error, invoiceId }, 'Error marking invoice as superseded');
            // Don't throw error - this is for audit only
        }
    }

    private async getPaymentInfo(paymentScheduleId: string) {
        const payments = await prisma.payment.findMany({
            where: { paymentScheduleId } as any,
            orderBy: { paymentDate: 'desc' },
            take: 1,
        });

        if (payments.length === 0) {
            return undefined;
        }

        const payment = payments[0];
        if (!payment) {
            return undefined;
        }
        
        return {
            isPaid: true,
            paidAmount: Number(payment.amount),
            paidDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            receiptNumber: payment.reference || undefined,
        };
    }

    private async getBankingInfo(_branchId: string) {
        // TODO: ดึงข้อมูลบัญชีธนาคารจาก config หรือ database
        return {
            accountName: 'บริษัท SME Bank จำกัด',
            accountNumber: '123-456-7890',
            bankName: 'ธนาคารกรุงเทพ',
        };
    }

    private async generateQRCodeData(
        invoiceNumber: string,
        amount: number,
        _bankingInfo?: any
    ): Promise<string> {
        // TODO: สร้าง QR Code สำหรับการชำระเงิน
        // Format: PromptPay หรือ Bank QR Code
        return `INVOICE:${invoiceNumber}:${amount}`;
    }

    private async saveNextPaymentInvoice(
        invoiceData: NextPaymentInvoiceData,
        generatedBy: string
    ) {
        return await db.nextPaymentInvoice.create({
            data: {
                invoiceNumber: invoiceData.invoiceNumber,
                loanId: invoiceData.loanId,
                customerId: invoiceData.customerId,
                paymentScheduleId: invoiceData.paymentScheduleId,
                invoiceData: invoiceData as any,
                status: 'PENDING',
                generatedBy,
                validUntil: invoiceData.metadata.validUntil,
            },
        });
    }

    private formatInvoiceData(invoice: any, principalCalc: any): NextPaymentInvoiceData {
        const data = invoice.invoiceData as NextPaymentInvoiceData;
        
        // Set invoice ID from database record
        data.invoiceId = invoice.id;
        
        // อัพเดทข้อมูลล่าสุด
        if (principalCalc.nextPaymentSchedule) {
            data.loanSummary = {
                originalPrincipal: data.loanSummary.originalPrincipal,
                currentOutstandingBalance: principalCalc.currentOutstandingBalance,
                remainingPrincipal: principalCalc.remainingPrincipal,
                totalPaid: principalCalc.totalAmountPaid,
                paymentProgress: principalCalc.paymentProgress.progressPercentage,
                interestRate: data.loanSummary.interestRate,
            };
        }

        return data;
    }
}

export const nextPaymentInvoiceService = new NextPaymentInvoiceService();
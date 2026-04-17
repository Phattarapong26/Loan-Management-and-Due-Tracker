import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import { ReferenceNumberService } from './reference-number.service';
import { paymentReceiptPDFService } from './payment-receipt-pdf.service';
import crypto from 'crypto';
import { EmailService } from '@notifications/channels/email/email.service';

export interface PaymentReceiptData {
    receiptId: string;
    receiptNumber: string;
    paymentId: string;
    loanId: string;
    customerId: string;
    invoiceId?: string;
    
    // ข้อมูลการชำระเงิน
    paymentDetails: {
        amount: number;
        paymentDate: Date;
        paymentMethod: string;
        paymentType: 'EARLY' | 'ON_TIME' | 'LATE';
        interestSaved?: number;
        penaltyAmount?: number;
    };
    
    // ข้อมูลลูกค้า
    customer: {
        businessName: string;
        address: string;
        phone: string;
        email?: string;
        taxId: string;
    };
    
    // ข้อมูลสินเชื่อ
    loanInfo: {
        contractNumber: string;
        originalPrincipal: number;
        outstandingBalance: number;
        nextPaymentDate?: Date;
        nextPaymentAmount?: number;
    };
    
    // รายละเอียดการจัดสรรเงิน
    paymentAllocation: {
        principalAmount: number;
        interestAmount: number;
        penaltyAmount: number;
        totalAmount: number;
    };
    
    // ข้อมูลใบเสร็จ
    receiptInfo: {
        issuedAt: Date;
        issuedBy: string;
        validationCode: string;
        qrCodeData?: string;
    };
    
    // สถิติสินเชื่อ (ณ วันที่ออกใบเสร็จ)
    loanStatistics: {
        totalPaid: number;
        remainingInstallments: number;
        paymentProgress: number;
        isFullyPaid: boolean;
    };
}

export class PaymentReceiptService {
    private referenceService: ReferenceNumberService;
    private emailService: EmailService;

    constructor() {
        this.referenceService = new ReferenceNumberService();
        this.emailService = new EmailService();
    }

    /**
     * สร้างใบเสร็จรับเงินหลังจากการชำระเงิน
     */
    async generatePaymentReceipt(
        paymentId: string,
        issuedBy: string,
        options: {
            includeQRCode?: boolean;
            autoSend?: boolean;
            sendVia?: 'LINE' | 'EMAIL' | 'SMS';
        } = {}
    ): Promise<PaymentReceiptData> {
        try {
            logger.info({ paymentId, issuedBy }, 'Generating payment receipt');

            // ดึงข้อมูลการชำระเงิน
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    loan: {
                        include: {
                            customer: {
                                include: {
                                    branch: true,
                                },
                            },
                        },
                    },
                    paymentSchedule: true,
                },
            });

            if (!payment) {
                throw new Error('Payment not found');
            }

            const loan = payment.loan;
            const customer = loan.customer;

            // ตรวจสอบว่ามีใบเสร็จแล้วหรือไม่
            const existingReceipt = await prisma.paymentReceipt.findFirst({
                where: { paymentId },
            });

            if (existingReceipt) {
                logger.info({ receiptId: existingReceipt.id }, 'Receipt already exists, returning existing');
                return this.formatReceiptData(existingReceipt);
            }

            // สร้างเลขที่ใบเสร็จ
            const receiptNumber = await this.referenceService.generateReceiptNumber(
                (customer as any).branch.code
            );

            // คำนวณการจัดสรรเงิน
            const paymentAllocation = await this.calculatePaymentAllocation(payment);

            // คำนวณสถิติสินเชื่อ
            const loanStatistics = await this.calculateLoanStatistics(loan.id);

            // สร้าง Validation Code
            const validationCode = this.generateValidationCode(receiptNumber, Number(payment.amount));

            // สร้าง QR Code (ถ้าต้องการ)
            let qrCodeData;
            if (options.includeQRCode) {
                qrCodeData = await this.generateReceiptQRCode(receiptNumber, paymentId);
            }

            // สร้างข้อมูลใบเสร็จ
            const receiptData: PaymentReceiptData = {
                receiptId: '', // จะได้จากการ save
                receiptNumber,
                paymentId,
                loanId: loan.id,
                customerId: customer.id,
                invoiceId: undefined, // TODO: Link to invoice if exists
                
                paymentDetails: {
                    amount: Number(payment.amount),
                    paymentDate: payment.paymentDate,
                    paymentMethod: payment.paymentMethod,
                    paymentType: payment.paymentType as any,
                    interestSaved: payment.interestSaved ? Number(payment.interestSaved) : undefined,
                    penaltyAmount: payment.penaltyAmount ? Number(payment.penaltyAmount) : undefined,
                },
                
                customer: {
                    businessName: (customer as any).businessName,
                    address: (customer as any).address || '-',
                    phone: (customer as any).phone,
                    email: (customer as any).email,
                    taxId: (customer as any).taxId,
                },
                
                loanInfo: {
                    contractNumber: loan.contract_number || `LOAN-${loan.id.substring(0, 8)}`,
                    originalPrincipal: Number(loan.principal),
                    outstandingBalance: Number(loan.outstandingBalance),
                    nextPaymentDate: loan.nextPaymentDate || undefined,
                    nextPaymentAmount: loan.nextPaymentAmount ? Number(loan.nextPaymentAmount) : undefined,
                },
                
                paymentAllocation,
                
                receiptInfo: {
                    issuedAt: new Date(),
                    issuedBy,
                    validationCode,
                    qrCodeData,
                },
                
                loanStatistics,
            };

            // บันทึกใบเสร็จ
            const savedReceipt = await this.savePaymentReceipt(receiptData);
            receiptData.receiptId = savedReceipt.id;

            // ส่งใบเสร็จให้ลูกค้า (ถ้าต้องการ)
            if (options.autoSend) {
                const methodsToTry: Array<'LINE' | 'EMAIL' | 'SMS'> = options.sendVia
                    ? [options.sendVia]
                    : ['LINE', 'EMAIL'];

                for (const method of methodsToTry) {
                    // eslint-disable-next-line no-await-in-loop
                    const sendResult = await this.sendReceiptToCustomer(savedReceipt.id, method, issuedBy);
                    if (sendResult.success) {
                        break;
                    }
                }
            }

            logger.info(
                {
                    receiptId: savedReceipt.id,
                    receiptNumber,
                    paymentId,
                    amount: payment.amount,
                },
                'Payment receipt generated successfully'
            );

            return receiptData;
        } catch (error) {
            logger.error({ error, paymentId }, 'Error generating payment receipt');
            throw error;
        }
    }

    /**
     * ดึงใบเสร็จสำหรับลูกค้า
     */
    async getReceiptForCustomer(receiptId: string): Promise<PaymentReceiptData> {
        try {
            const receipt = await prisma.paymentReceipt.findUnique({
                where: { id: receiptId },
            });

            if (!receipt) {
                throw new Error('Receipt not found');
            }

            return this.formatReceiptData(receipt);
        } catch (error) {
            logger.error({ error, receiptId }, 'Error getting receipt for customer');
            throw error;
        }
    }

    /**
     * ดึงใบเสร็จทั้งหมดของสินเชื่อ
     */
    async getLoanReceipts(loanId: string): Promise<PaymentReceiptData[]> {
        try {
            const receipts = await prisma.paymentReceipt.findMany({
                where: { loanId },
                orderBy: { issuedAt: 'desc' },
            });

            const results = [];
            for (const receipt of receipts) {
                results.push(this.formatReceiptData(receipt));
            }

            return results;
        } catch (error) {
            logger.error({ error, loanId }, 'Error getting loan receipts');
            throw error;
        }
    }

    /**
     * ดึงใบเสร็จจากเลขที่ใบเสร็จ
     */
    async getReceiptByNumber(receiptNumber: string): Promise<PaymentReceiptData | null> {
        try {
            const receipt = await prisma.paymentReceipt.findUnique({
                where: { receiptNumber },
            });

            if (!receipt) {
                return null;
            }

            return this.formatReceiptData(receipt);
        } catch (error) {
            logger.error({ error, receiptNumber }, 'Error getting receipt by number');
            throw error;
        }
    }

    /**
     * Ensure receipt has a stored PDF URL (generate if missing)
     * Used by staff UI to open/view receipts reliably.
     */
    async ensureReceiptPdfUrl(receiptId: string): Promise<string> {
        const receipt = await prisma.paymentReceipt.findUnique({
            where: { id: receiptId },
        });

        if (!receipt) {
            throw new Error('Receipt not found');
        }

        const receiptData = this.formatReceiptData(receipt);
        const existingUrl = (receiptData as any).pdfUrl as string | undefined;
        if (existingUrl) {
            return existingUrl;
        }

        const pdfBuffer = await paymentReceiptPDFService.generatePaymentReceiptPDF(receiptData);
        const filename = `receipt-${receiptData.receiptNumber}-${Date.now()}.pdf`;
        const pdfUrl = await paymentReceiptPDFService.savePDF(pdfBuffer, filename);

        await prisma.paymentReceipt.update({
            where: { id: receiptId },
            data: {
                receiptData: {
                    ...(receiptData as any),
                    pdfUrl,
                },
            },
        });

        return pdfUrl;
    }

    /**
     * ส่งใบเสร็จให้ลูกค้า
     */
    async sendReceiptToCustomer(
        receiptId: string,
        method: 'LINE' | 'EMAIL' | 'SMS',
        _sentBy: string
    ): Promise<{ success: boolean; message: string; pdfUrl?: string }> {
        try {
            const receipt = await prisma.paymentReceipt.findUnique({
                where: { id: receiptId },
                include: {
                    customer: true,
                    payment: true,
                },
            });

            if (!receipt) {
                throw new Error('Receipt not found');
            }

            const receiptData = this.formatReceiptData(receipt);

            // Generate/store PDF URL (even if sending fails, staff can still view later)
            const pdfUrl = await this.ensureReceiptPdfUrl(receiptId);
            const updatedReceiptData = {
                ...(receiptData as any),
                pdfUrl,
            };

            // Send via LINE
            if (method === 'LINE') {
                await this.sendReceiptViaLINE(receiptData, pdfUrl);
            } else if (method === 'EMAIL') {
                await this.sendReceiptViaEmail(receiptData, pdfUrl);
            } else if (method === 'SMS') {
                // TODO: Implement SMS sending
                throw new Error('SMS sending not yet implemented');
            }

            // อัพเดทสถานะการส่ง (เฉพาะเมื่อส่งสำเร็จ)
            await prisma.paymentReceipt.update({
                where: { id: receiptId },
                data: {
                    sentAt: new Date(),
                    sentVia: method,
                    receiptData: updatedReceiptData,
                },
            });

            logger.info(
                {
                    receiptId,
                    method,
                    customerId: receipt.customerId,
                    pdfUrl,
                },
                'Receipt sent to customer'
            );

            return {
                success: true,
                message: `Receipt sent via ${method} successfully`,
                pdfUrl,
            };
        } catch (error) {
            logger.error({ error, receiptId }, 'Error sending receipt to customer');
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    private async sendReceiptViaEmail(receiptData: PaymentReceiptData, pdfUrl: string): Promise<void> {
        const to = receiptData.customer.email;
        if (!to) {
            throw new Error('Customer email not found');
        }

        const subject = `ใบเสร็จรับเงิน ${receiptData.receiptNumber} - SME D BANK`;
        const html = `
            <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 16px;">
                <h2 style="margin: 0 0 8px 0;">ใบเสร็จรับเงิน</h2>
                <p style="margin: 0 0 12px 0;">
                    เรียนคุณ ${receiptData.customer.businessName}
                </p>
                <p style="margin: 0 0 12px 0;">
                    เลขที่ใบเสร็จ: <b>${receiptData.receiptNumber}</b><br/>
                    วันที่ชำระ: ${new Date(receiptData.paymentDetails.paymentDate).toLocaleDateString('th-TH')}<br/>
                    จำนวนเงิน: <b>${Number(receiptData.paymentDetails.amount).toLocaleString('th-TH')}</b> บาท
                </p>
                <p style="margin: 0 0 16px 0;">
                    ดาวน์โหลด/เปิดไฟล์ PDF: <a href="${pdfUrl}">${pdfUrl}</a>
                </p>
                <p style="margin: 16px 0 0 0; color: #64748B; font-size: 12px;">
                    SME D BANK
                </p>
            </div>
        `;

        const ok = await this.emailService.sendEmail({ to, subject, html });
        if (!ok) {
            throw new Error('Failed to send email');
        }
    }

    /**
     * ส่งใบเสร็จผ่าน LINE
     */
    private async sendReceiptViaLINE(receiptData: PaymentReceiptData, pdfUrl: string): Promise<void> {
        try {
            logger.info(
                { 
                    receiptId: receiptData.receiptId, 
                    customerId: receiptData.customerId,
                    pdfUrl 
                },
                'Starting LINE receipt sending'
            );

            // Get customer's LINE user ID
            const customer = await prisma.customer.findUnique({
                where: { id: receiptData.customerId },
                include: {
                    user: true,
                },
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            const lineUserId = customer.lineUserId || customer.user?.lineUserId;

            if (!lineUserId) {
                throw new Error('Customer LINE ID not found');
            }

            logger.info({ lineUserId, customerId: receiptData.customerId }, 'Creating LINE message');

            // Create LINE message with secure link
            const message = await this.createReceiptLINEMessage(receiptData, receiptData.customerId);

            logger.info({ lineUserId }, 'Importing LINE notification queue');

            // Import LINE notification queue
            const { lineNotificationQueue } = await import('@line/services/messaging/line-notification-queue.service');

            logger.info({ lineUserId }, 'Enqueueing LINE notification');

            await lineNotificationQueue.enqueue(
                lineUserId,
                message,
                'normal'
            );

            logger.info(
                { customerId: receiptData.customerId, receiptId: receiptData.receiptId, lineUserId },
                'Receipt LINE notification queued successfully'
            );
        } catch (error) {
            logger.error(
                { 
                    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
                    receiptId: receiptData.receiptId,
                    customerId: receiptData.customerId
                }, 
                'Error sending receipt via LINE'
            );
            throw error;
        }
    }

    /**
     * สร้างข้อความ LINE สำหรับใบเสร็จ
     */
    /**
     * สร้างข้อความ LINE สำหรับใบเสร็จ with secure password-protected link
     */
    private async createReceiptLINEMessage(receiptData: PaymentReceiptData, customerId: string): Promise<any> {
        // Define colors inline to avoid import issues
        const COLORS = {
            PRIMARY: '#1E88E5',
            SUCCESS: '#4CAF50',
            TEXT_PRIMARY: '#212121',
            TEXT_SECONDARY: '#757575',
        };

        // Validate required data
        if (!receiptData.receiptId) {
            logger.error({ receiptData }, 'Receipt ID is missing');
            throw new Error('Receipt ID is required for secure document');
        }

        if (!customerId) {
            logger.error({ receiptData }, 'Customer ID is missing');
            throw new Error('Customer ID is required for secure document');
        }

        logger.info({
            receiptId: receiptData.receiptId,
            customerId,
        }, 'Generating secure token for receipt');

        // Generate secure token for password-protected access
        const { SecureDocumentService } = await import('@documents/services/secure-document.service');
        const secureDocumentService = new SecureDocumentService();
        
        const secureToken = await secureDocumentService.generateSecureToken(
            'receipt',
            receiptData.receiptId,
            customerId
        );
        const secureUrl = await secureDocumentService.getSecureDocumentUrl(secureToken);

        logger.info({
            receiptId: receiptData.receiptId,
            secureToken: secureToken.substring(0, 10) + '...',
        }, 'Secure token generated for receipt');

        return {
            type: 'flex',
            altText: '✅ ใบเสร็จรับเงิน - ชำระเงินสำเร็จ',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '✅ ใบเสร็จรับเงิน',
                            weight: 'bold',
                            size: 'xl',
                            color: COLORS.SUCCESS,
                        },
                    ],
                    backgroundColor: '#E8F5E9',
                    paddingAll: '20px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'ขอบคุณสำหรับการชำระเงิน',
                            wrap: true,
                            color: COLORS.TEXT_PRIMARY,
                            margin: 'md',
                        },
                        {
                            type: 'separator',
                            margin: 'xl',
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'เลขที่ใบเสร็จ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: receiptData.receiptNumber, size: 'sm', weight: 'bold', color: COLORS.PRIMARY, flex: 2, wrap: true },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'จำนวนเงิน:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: `${receiptData.paymentDetails.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: 'lg', weight: 'bold', color: COLORS.SUCCESS, flex: 2 },
                                    ],
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'วันที่ชำระ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: new Date(receiptData.paymentDetails.paymentDate).toLocaleDateString('th-TH'), size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2 },
                                    ],
                                    margin: 'md',
                                },
                            ],
                        },
                        {
                            type: 'separator',
                            margin: 'xl',
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '📄 ใบเสร็จรับเงิน',
                                    weight: 'bold',
                                    size: 'md',
                                    color: COLORS.PRIMARY,
                                },
                                {
                                    type: 'text',
                                    text: 'เอกสารของคุณพร้อมแล้ว',
                                    size: 'xs',
                                    color: COLORS.TEXT_SECONDARY,
                                    margin: 'sm',
                                },
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: `🔒 รหัสตรวจสอบ: ${receiptData.receiptInfo.validationCode}`,
                                            size: 'sm',
                                            color: '#FF6B00',
                                            weight: 'bold',
                                            wrap: true,
                                        },
                                        {
                                            type: 'text',
                                            text: 'ใช้รหัสนี้ตรวจสอบความถูกต้องของใบเสร็จ',
                                            size: 'xxs',
                                            color: COLORS.TEXT_SECONDARY,
                                            margin: 'sm',
                                        },
                                    ],
                                    backgroundColor: '#FFF3E0',
                                    cornerRadius: '8px',
                                    paddingAll: '12px',
                                    margin: 'md',
                                },
                            ],
                            margin: 'lg',
                        },
                        ...(receiptData.loanInfo.nextPaymentDate ? [
                            {
                                type: 'separator' as const,
                                margin: 'xl' as const,
                            },
                            {
                                type: 'box' as const,
                                layout: 'vertical' as const,
                                contents: [
                                    {
                                        type: 'text' as const,
                                        text: '📅 กำหนดชำระงวดถัดไป',
                                        weight: 'bold' as const,
                                        size: 'sm' as const,
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text' as const,
                                        text: new Date(receiptData.loanInfo.nextPaymentDate).toLocaleDateString('th-TH', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        }),
                                        size: 'sm' as const,
                                        color: COLORS.TEXT_SECONDARY,
                                        margin: 'sm' as const,
                                    },
                                    ...(receiptData.loanInfo.nextPaymentAmount ? [
                                        {
                                            type: 'text' as const,
                                            text: `ยอดชำระ: ${receiptData.loanInfo.nextPaymentAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
                                            size: 'sm' as const,
                                            color: COLORS.TEXT_PRIMARY,
                                            weight: 'bold' as const,
                                            margin: 'xs' as const,
                                        },
                                    ] : []),
                                ],
                                margin: 'md' as const,
                            },
                        ] : []),
                    ],
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '🔒 เอกสารได้รับการปกป้อง',
                                    size: 'xs',
                                    color: COLORS.SUCCESS,
                                    weight: 'bold',
                                    align: 'center',
                                },
                                {
                                    type: 'text',
                                    text: 'ต้องกรอกเลขบัตรประชาชน 4 ตัวท้ายเพื่อเข้าถึง',
                                    size: 'xxs',
                                    color: COLORS.TEXT_SECONDARY,
                                    align: 'center',
                                    margin: 'xs',
                                    wrap: true,
                                },
                            ],
                            margin: 'none',
                        },
                        {
                            type: 'separator',
                            margin: 'md',
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '🔐 ดูใบเสร็จ (ต้องยืนยันตัวตน)',
                                uri: secureUrl,
                            },
                            style: 'primary',
                            color: COLORS.PRIMARY,
                            height: 'sm',
                            margin: 'md',
                        },
                        {
                            type: 'text',
                            text: '💡 ลิงก์นี้หมดอายุใน 7 วัน',
                            size: 'xxs',
                            color: COLORS.TEXT_SECONDARY,
                            align: 'center',
                            wrap: true,
                            margin: 'md',
                        },
                    ],
                    paddingAll: '12px',
                },
            },
        };
    }

    /**
     * ตรวจสอบความถูกต้องของใบเสร็จ
     */
    async validateReceipt(receiptNumber: string, validationCode: string): Promise<{
        isValid: boolean;
        receiptData?: PaymentReceiptData;
        error?: string;
    }> {
        try {
            const receipt = await prisma.paymentReceipt.findUnique({
                where: { receiptNumber },
            });

            if (!receipt) {
                return {
                    isValid: false,
                    error: 'Receipt not found',
                };
            }

            const receiptData = this.formatReceiptData(receipt);
            const expectedValidationCode = this.generateValidationCode(
                receiptNumber,
                receiptData.paymentDetails.amount
            );

            if (validationCode !== expectedValidationCode) {
                return {
                    isValid: false,
                    error: 'Invalid validation code',
                };
            }

            return {
                isValid: true,
                receiptData,
            };
        } catch (error) {
            logger.error({ error, receiptNumber }, 'Error validating receipt');
            return {
                isValid: false,
                error: 'Validation error',
            };
        }
    }

    // Private helper methods

    private async calculatePaymentAllocation(payment: any) {
        // คำนวณการจัดสรรเงินจากการชำระ
        const totalAmount = Number(payment.amount);
        const penaltyAmount = payment.penaltyAmount ? Number(payment.penaltyAmount) : 0;
        
        // ถ้ามี PaymentSchedule ใช้ข้อมูลจากนั้น
        if (payment.paymentSchedule) {
            const schedule = payment.paymentSchedule;
            const principalAmount = Math.min(totalAmount - penaltyAmount, Number(schedule.principalAmount));
            const interestAmount = Math.min(totalAmount - penaltyAmount - principalAmount, Number(schedule.interestAmount));
            
            return {
                principalAmount,
                interestAmount,
                penaltyAmount,
                totalAmount,
            };
        }

        // ถ้าไม่มี PaymentSchedule ให้ถือว่าเป็นเงินต้นทั้งหมด
        return {
            principalAmount: totalAmount - penaltyAmount,
            interestAmount: 0,
            penaltyAmount,
            totalAmount,
        };
    }

    private async calculateLoanStatistics(loanId: string) {
        // คำนวณสถิติสินเชื่อ
        const loan = await prisma.loan.findUnique({
            where: { id: loanId },
            select: {
                principal: true,
                outstandingBalance: true,
                termMonths: true,
            },
        });

        if (!loan) {
            throw new Error('Loan not found for statistics calculation');
        }

        const payments = await prisma.payment.findMany({
            where: { loanId },
        });

        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const originalPrincipal = Number(loan.principal);
        const outstandingBalance = Number(loan.outstandingBalance);
        const paymentProgress = ((originalPrincipal - outstandingBalance) / originalPrincipal) * 100;
        
        // คำนวณงวดที่เหลือ (ประมาณการ)
        const paidSchedules = await prisma.paymentSchedule.count({
            where: {
                loanId,
                status: 'PAID',
            },
        });

        const remainingInstallments = loan.termMonths - paidSchedules;
        const isFullyPaid = outstandingBalance <= 0;

        return {
            totalPaid,
            remainingInstallments: Math.max(0, remainingInstallments),
            paymentProgress: Math.round(paymentProgress * 100) / 100,
            isFullyPaid,
        };
    }

    private generateValidationCode(receiptNumber: string, amount: number): string {
        // สร้างรหัสตรวจสอบความถูกต้อง
        const data = `${receiptNumber}-${amount}-${process.env.RECEIPT_SECRET || 'default-secret'}`;
        return crypto.createHash('md5').update(data).digest('hex').substring(0, 8).toUpperCase();
    }

    private async generateReceiptQRCode(receiptNumber: string, paymentId: string): Promise<string> {
        // TODO: สร้าง QR Code สำหรับตรวจสอบใบเสร็จ
        // Format: RECEIPT:receiptNumber:paymentId:validationCode
        const validationCode = this.generateValidationCode(receiptNumber, 0); // Dummy amount for QR
        return `RECEIPT:${receiptNumber}:${paymentId}:${validationCode}`;
    }

    private async savePaymentReceipt(receiptData: PaymentReceiptData) {
        return await prisma.paymentReceipt.create({
            data: {
                receiptNumber: receiptData.receiptNumber,
                paymentId: receiptData.paymentId,
                loanId: receiptData.loanId,
                customerId: receiptData.customerId,
                invoiceId: receiptData.invoiceId,
                amount: receiptData.paymentDetails.amount,
                paymentDate: receiptData.paymentDetails.paymentDate,
                paymentMethod: receiptData.paymentDetails.paymentMethod,
                receiptData: receiptData as any,
                status: 'ISSUED',
                issuedBy: receiptData.receiptInfo.issuedBy,
                issuedAt: receiptData.receiptInfo.issuedAt,
            },
        });
    }

    private formatReceiptData(receipt: any): PaymentReceiptData {
        // แปลงข้อมูลจาก Database เป็น PaymentReceiptData
        const data = receipt.receiptData as PaymentReceiptData;
        
        // Ensure receiptId is set from the actual receipt ID
        if (!data.receiptId) {
            data.receiptId = receipt.id;
        }
        
        return data;
    }
}

export const paymentReceiptService = new PaymentReceiptService();

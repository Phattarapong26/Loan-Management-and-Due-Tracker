/**
 * LINE Invoice Service
 * 
 * Purpose: Send invoice messages to customers via LINE
 * Features:
 * - Generate invoice URL for customer
 * - Send invoice as Flex Message
 * - Track invoice views
 */

import { InvoiceService } from '@invoices/services/invoice.service';
import { PDFGenerationService } from '@documents/services/pdf-generation.service';
import { LineFileUploadService } from '@line/services/files/line-file-upload.service';
import { SecureDocumentService } from '@documents/services/secure-document.service';
import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import { env } from '@config/env.config';
import fs from 'fs/promises';

export class LineInvoiceService {
    private invoiceService: InvoiceService;
    private pdfService: PDFGenerationService;
    private fileUploadService: LineFileUploadService;
    private secureDocumentService: SecureDocumentService;
    private baseUrl: string;

    constructor() {
        this.invoiceService = new InvoiceService();
        this.pdfService = new PDFGenerationService();
        this.fileUploadService = new LineFileUploadService();
        this.secureDocumentService = new SecureDocumentService();
        this.baseUrl = env.FRONTEND_URL || 'http://localhost:5173';
    }

    /**
     * Get invoice URL for customer to view in browser
     */
    getInvoiceUrl(paymentScheduleId: string): string {
        return `${this.baseUrl}/invoice/${paymentScheduleId}`;
    }

    /**
     * Create invoice message for LINE with secure document link
     * Returns a Flex Message with invoice preview and password-protected link
     */
    async createInvoiceMessage(paymentScheduleId: string, lineUserId: string): Promise<any> {
        try {
            // Get invoice data
            const invoiceData = await this.invoiceService.getInvoiceData(paymentScheduleId);
            
            // Get payment schedule for additional info
            const schedule = await prisma.paymentSchedule.findUnique({
                where: { id: paymentScheduleId },
                include: {
                    loan: {
                        include: {
                            customer: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!schedule) {
                throw new Error('Payment schedule not found');
            }

            // Check if customer owns this loan (via LINE User ID)
            const loan = schedule.loan as any;
            if (loan.customer.user?.lineUserId !== lineUserId) {
                throw new Error('Unauthorized access to invoice');
            }

            // Generate secure token for password-protected access
            const secureToken = await this.secureDocumentService.generateSecureToken(
                'invoice',
                paymentScheduleId,
                loan.customer.id
            );
            const secureUrl = await this.secureDocumentService.getSecureDocumentUrl(secureToken);
            
            // Determine status color
            const statusColor = schedule.status === 'PAID' ? '#00AA5B' : 
                               schedule.status === 'OVERDUE' ? '#FF6B6B' : '#FFA500';
            
            const statusText = schedule.status === 'PAID' ? '✅ ชำระแล้ว' :
                              schedule.status === 'OVERDUE' ? '⚠️ เกินกำหนด' : '📋 รอชำระ';

            return {
                type: 'flex',
                altText: `ใบแจ้งหนี้งวดที่ ${invoiceData.installmentNo}/${invoiceData.totalInstallments}`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🧾 ใบแจ้งหนี้',
                                weight: 'bold',
                                size: 'xl',
                                color: '#FFFFFF',
                            },
                            {
                                type: 'text',
                                text: `งวดที่ ${invoiceData.installmentNo}/${invoiceData.totalInstallments}`,
                                size: 'sm',
                                color: '#FFFFFF',
                                margin: 'sm',
                            },
                        ],
                        backgroundColor: '#00AA5B',
                        paddingAll: '20px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            // Status
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'สถานะ:',
                                        size: 'sm',
                                        color: '#666666',
                                        flex: 0,
                                    },
                                    {
                                        type: 'text',
                                        text: statusText,
                                        size: 'sm',
                                        weight: 'bold',
                                        color: statusColor,
                                        align: 'end',
                                    },
                                ],
                                margin: 'none',
                            },
                            { type: 'separator', margin: 'lg' },
                            // Account Number
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'เลขที่บัญชี:',
                                        size: 'sm',
                                        color: '#666666',
                                        flex: 0,
                                    },
                                    {
                                        type: 'text',
                                        text: invoiceData.accountNo,
                                        size: 'sm',
                                        weight: 'bold',
                                        align: 'end',
                                    },
                                ],
                                margin: 'lg',
                            },
                            // Due Date
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'กำหนดชำระ:',
                                        size: 'sm',
                                        color: '#666666',
                                        flex: 0,
                                    },
                                    {
                                        type: 'text',
                                        text: invoiceData.dueDate,
                                        size: 'sm',
                                        weight: 'bold',
                                        color: schedule.status === 'OVERDUE' ? '#FF6B6B' : '#333333',
                                        align: 'end',
                                    },
                                ],
                                margin: 'md',
                            },
                            { type: 'separator', margin: 'lg' },
                            // Breakdown
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'รายละเอียดการชำระ',
                                        size: 'sm',
                                        weight: 'bold',
                                        color: '#00AA5B',
                                        margin: 'none',
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'เงินต้น',
                                                size: 'sm',
                                                color: '#666666',
                                            },
                                            {
                                                type: 'text',
                                                text: `฿${invoiceData.breakdown.principal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                                                size: 'sm',
                                                color: '#00AA5B',
                                                weight: 'bold',
                                                align: 'end',
                                            },
                                        ],
                                        margin: 'md',
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ดอกเบี้ย',
                                                size: 'sm',
                                                color: '#666666',
                                            },
                                            {
                                                type: 'text',
                                                text: `฿${invoiceData.breakdown.interest.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                                                size: 'sm',
                                                color: '#00AA5B',
                                                weight: 'bold',
                                                align: 'end',
                                            },
                                        ],
                                        margin: 'sm',
                                    },
                                    ...(invoiceData.breakdown.fees > 0 ? [{
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ค่าธรรมเนียม',
                                                size: 'sm',
                                                color: '#666666',
                                            },
                                            {
                                                type: 'text',
                                                text: `฿${invoiceData.breakdown.fees.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                                                size: 'sm',
                                                color: '#00AA5B',
                                                weight: 'bold',
                                                align: 'end',
                                            },
                                        ],
                                        margin: 'sm',
                                    }] : []),
                                ],
                                margin: 'lg',
                            },
                            { type: 'separator', margin: 'lg' },
                            // Total
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'ยอดชำระสุทธิ',
                                        size: 'md',
                                        weight: 'bold',
                                        color: '#333333',
                                    },
                                    {
                                        type: 'text',
                                        text: `฿${invoiceData.breakdown.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                                        size: 'xl',
                                        weight: 'bold',
                                        color: '#00AA5B',
                                        align: 'end',
                                    },
                                ],
                                margin: 'lg',
                            },
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
                                        color: '#00AA5B',
                                        weight: 'bold',
                                        align: 'center',
                                    },
                                    {
                                        type: 'text',
                                        text: 'ต้องกรอกเลขบัตรประชาชน 4 ตัวท้ายเพื่อเข้าถึง',
                                        size: 'xxs',
                                        color: '#666666',
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
                                    label: '🔐 ดูใบแจ้งหนี้ (ต้องยืนยันตัวตน)',
                                    uri: secureUrl,
                                },
                                style: 'primary',
                                color: '#00AA5B',
                                margin: 'md',
                            },
                            {
                                type: 'text',
                                text: '💡 ลิงก์นี้หมดอายุใน 7 วัน',
                                size: 'xxs',
                                color: '#999999',
                                align: 'center',
                                margin: 'md',
                                wrap: true,
                            },
                        ],
                        paddingAll: '15px',
                    },
                },
            };
        } catch (error) {
            logger.error({ error, paymentScheduleId }, 'Error creating invoice message');
            throw error;
        }
    }

    /**
     * Get all unpaid invoices for a customer
     * Shows upcoming invoices (within 30 days) and overdue invoices
     */
    async getUnpaidInvoices(lineUserId: string): Promise<any[]> {
        try {
            // Get user from LINE User ID
            const user = await prisma.user.findFirst({
                where: { lineUserId },
            });

            if (!user) {
                return [];
            }

            // Get customer for this user
            const customer = await prisma.customer.findFirst({
                where: { userId: user.id },
            });

            if (!customer) {
                return [];
            }

            // Calculate date range (30 days from now)
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);

            // Get unpaid payment schedules (including upcoming within 30 days)
            const schedules = await prisma.paymentSchedule.findMany({
                where: {
                    loan: {
                        customerId: customer.id,
                        status: {
                            in: ['ACTIVE', 'APPROVED', 'DISBURSED'],
                        },
                    },
                    status: {
                        not: 'PAID',
                    },
                    paymentDate: {
                        lte: thirtyDaysFromNow,
                    },
                },
                include: {
                    loan: true,
                },
                orderBy: {
                    paymentDate: 'asc',
                },
                take: 10,
            });

            return schedules;
        } catch (error) {
            logger.error({ error, lineUserId }, 'Error getting unpaid invoices');
            throw error;
        }
    }

    /**
     * Create invoice list message for LINE with secure password-protected links
     */
    async createInvoiceListMessage(lineUserId: string): Promise<any[]> {
            try {
                // Get customer ID from LINE user ID
                const user = await prisma.user.findFirst({
                    where: { lineUserId },
                    include: {
                        customers: {
                            select: { id: true },
                            take: 1,
                        },
                    },
                });

                if (!user || !user.customers || user.customers.length === 0) {
                    throw new Error('Customer not found for LINE user');
                }

                const customerId = user.customers[0]!.id;

                // Get only invoices that have been created (not just payment schedules)
                const invoices = await prisma.nextPaymentInvoice.findMany({
                    where: {
                        customerId,
                        status: 'PENDING', // Only unpaid invoices
                    },
                    include: {
                        loan: {
                            select: {
                                id: true,
                                principal: true,
                                termMonths: true,
                                contract_number: true,
                            },
                        },
                        paymentSchedule: {
                            select: {
                                paymentNumber: true,
                                paymentDate: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: {
                        validUntil: 'asc',
                    },
                });

                if (invoices.length === 0) {
                    return [
                        {
                            type: 'flex',
                            altText: 'ใบแจ้งหนี้',
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { type: 'text', text: '📋 ใบแจ้งหนี้', weight: 'bold', size: 'xl', color: '#FFFFFF' },
                                    ],
                                    paddingAll: '20px',
                                    backgroundColor: '#00AA5B',
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { 
                                            type: 'text', 
                                            text: '✅ ไม่มีใบแจ้งหนี้ที่ต้องชำระในขณะนี้', 
                                            size: 'sm', 
                                            color: '#666666', 
                                            align: 'center',
                                            wrap: true,
                                        },
                                        {
                                            type: 'text',
                                            text: 'ใบแจ้งหนี้จะถูกสร้างอัตโนมัติ 7 วันก่อนครบกำหนดชำระ',
                                            size: 'xs',
                                            color: '#999999',
                                            align: 'center',
                                            wrap: true,
                                            margin: 'md',
                                        },
                                        {
                                            type: 'text',
                                            text: '💡 หรือคุณสามารถขอใบแจ้งหนี้ล่วงหน้าได้จากเมนู "กำหนดชำระ"',
                                            size: 'xs',
                                            color: '#00AA5B',
                                            align: 'center',
                                            wrap: true,
                                            margin: 'md',
                                        },
                                    ],
                                    paddingAll: '20px',
                                },
                            },
                        },
                    ];
                }

                const bubbles = await Promise.all(
                    invoices.map(async (invoice) => {
                        const invoiceData = (invoice as any).invoiceData;

                        // Generate secure token for password-protected access
                        const secureToken = await this.secureDocumentService.generateSecureToken(
                            'invoice',
                            invoice.id,
                            customerId
                        );
                        const secureUrl = await this.secureDocumentService.getSecureDocumentUrl(secureToken);

                        // Get loan info
                        const loan = invoice.loan as any;
                        const loanAmount = loan.principal ? Number(loan.principal).toLocaleString('th-TH', { maximumFractionDigits: 0 }) : '';

                        // Determine status based on payment date and current status
                        const now = new Date();
                        const dueDate = new Date(invoice.paymentSchedule.paymentDate);
                        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                        let statusColor: string;
                        let statusText: string;

                        if (invoice.status === 'PAID') {
                            statusColor = '#00AA5B';
                            statusText = '✅ ชำระแล้ว';
                        } else if (invoice.paymentSchedule.status === 'OVERDUE' || daysUntilDue < 0) {
                            statusColor = '#FF6B6B';
                            statusText = `⚠️ เกินกำหนด ${Math.abs(daysUntilDue)} วัน`;
                        } else if (daysUntilDue <= 7) {
                            statusColor = '#FFA500';
                            statusText = `⏰ ครบใน ${daysUntilDue} วัน`;
                        } else {
                            statusColor = '#00AA5B';
                            statusText = `📅 ครบใน ${daysUntilDue} วัน`;
                        }

                        return {
                            type: 'bubble',
                            size: 'micro',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: invoice.invoiceNumber,
                                        weight: 'bold',
                                        size: 'xs',
                                        color: '#FFFFFF',
                                    },
                                    {
                                        type: 'text',
                                        text: `งวดที่ ${invoice.paymentSchedule.paymentNumber}/${loan.termMonths || '?'}`,
                                        weight: 'bold',
                                        size: 'sm',
                                        color: '#FFFFFF',
                                        margin: 'xs',
                                    },
                                ],
                                backgroundColor: statusColor,
                                paddingAll: '13px',
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: statusText,
                                        size: 'xs',
                                        color: statusColor,
                                        weight: 'bold',
                                    },
                                    {
                                        type: 'text',
                                        text: `ครบกำหนด: ${dueDate.toLocaleDateString('th-TH')}`,
                                        size: 'xs',
                                        color: '#666666',
                                        margin: 'sm',
                                    },
                                    {
                                        type: 'text',
                                        text: `฿${Number(invoice.paidAmount || invoiceData?.nextPayment?.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                                        size: 'xl',
                                        weight: 'bold',
                                        color: '#00AA5B',
                                        margin: 'md',
                                    },
                                    {
                                        type: 'text',
                                        text: loan.contract_number || `สินเชื่อ ฿${loanAmount}`,
                                        size: 'xxs',
                                        color: '#999999',
                                        margin: 'sm',
                                    },
                                ],
                                paddingAll: '13px',
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
                                                text: '🔒 ต้องยืนยันตัวตน',
                                                size: 'xxs',
                                                color: '#00AA5B',
                                                weight: 'bold',
                                                align: 'center',
                                            },
                                        ],
                                        margin: 'none',
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'uri',
                                            label: '🔐 ดูใบแจ้งหนี้',
                                            uri: secureUrl,
                                        },
                                        style: 'primary',
                                        color: '#00AA5B',
                                        height: 'sm',
                                        margin: 'sm',
                                    },
                                ],
                                paddingAll: '10px',
                            },
                        };
                    })
                );

                // Count unique loans
                const uniqueLoans = new Set(invoices.map(i => i.loan.id)).size;
                const headerText = uniqueLoans > 1 
                    ? `📋 คุณมีใบแจ้งหนี้ ${invoices.length} งวด จาก ${uniqueLoans} สินเชื่อ`
                    : `📋 คุณมีใบแจ้งหนี้ ${invoices.length} งวด`;

                return [
                    {
                        type: 'text',
                        text: headerText,
                    },
                    {
                        type: 'flex',
                        altText: `ใบแจ้งหนี้ค้างชำระ ${invoices.length} รายการ`,
                        contents: {
                            type: 'carousel',
                            contents: bubbles,
                        },
                    },
                ];
            } catch (error) {
                logger.error({ error, lineUserId }, 'Error creating invoice list message');
                throw error;
            }
        }

    /**
     * Generate and send invoice PDF to LINE user
     * 
     * @param paymentScheduleId - Payment schedule ID
     * @param lineUserId - LINE User ID
     * @returns Success status
     */
    async sendInvoicePDF(paymentScheduleId: string, lineUserId: string): Promise<boolean> {
        let pdfPath: string | null = null;

        try {
            logger.info({ paymentScheduleId, lineUserId }, 'Starting PDF invoice generation');

            // Get invoice data
            const invoiceData = await this.invoiceService.getInvoiceData(paymentScheduleId);

            // Verify user owns this invoice
            const schedule = await prisma.paymentSchedule.findUnique({
                where: { id: paymentScheduleId },
                include: {
                    loan: {
                        include: {
                            customer: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!schedule) {
                throw new Error('Payment schedule not found');
            }

            const loan = schedule.loan as any;
            if (loan.customer.user?.lineUserId !== lineUserId) {
                throw new Error('Unauthorized access to invoice');
            }

            // Generate PDF
            pdfPath = await this.pdfService.generateInvoicePDF(invoiceData, paymentScheduleId);

            // Send PDF to user
            const filename = `invoice-${invoiceData.accountNo}-${invoiceData.installmentNo}.pdf`;
            await this.fileUploadService.sendPDFToUser(lineUserId, pdfPath, filename);

            logger.info({ paymentScheduleId, lineUserId }, 'PDF invoice sent successfully');
            return true;
        } catch (error) {
            logger.error({ error, paymentScheduleId, lineUserId }, 'Error sending PDF invoice');
            
            // Send error message to user
            await this.fileUploadService.sendErrorMessage(lineUserId);
            
            return false;
        } finally {
            // Cleanup temporary PDF file
            if (pdfPath) {
                try {
                    await fs.unlink(pdfPath);
                    logger.info({ pdfPath }, 'Cleaned up temporary PDF file');
                } catch (error) {
                    logger.error({ error, pdfPath }, 'Error cleaning up temporary PDF file');
                }
            }
        }
    }

    /**
     * Send multiple invoice PDFs to LINE user
     * 
     * @param paymentScheduleIds - Array of payment schedule IDs
     * @param lineUserId - LINE User ID
     * @returns Success status
     */
    async sendMultipleInvoicePDFs(paymentScheduleIds: string[], lineUserId: string): Promise<boolean> {
        try {
            logger.info({ count: paymentScheduleIds.length, lineUserId }, 'Sending multiple PDF invoices');

            // Send each PDF
            for (const scheduleId of paymentScheduleIds) {
                await this.sendInvoicePDF(scheduleId, lineUserId);
            }

            return true;
        } catch (error) {
            logger.error({ error, lineUserId }, 'Error sending multiple PDF invoices');
            return false;
        }
    }
}

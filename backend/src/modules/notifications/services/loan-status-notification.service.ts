/**
 * Loan Status Notification Service
 * 
 * Purpose: Send LINE notifications when loan status changes
 * - Loan approved
 * - Loan rejected
 * - Loan disbursed
 * - Payment received
 */

import { LoanRepository } from '@loans/repositories/loan.repository';
import { logger } from '@utils/common/logger.util';
import { lineNotificationQueue } from '@line/services/messaging/line-notification-queue.service';
import { COLORS } from '@line/messages/theme';

export class LoanStatusNotificationService {
    private loanRepository: LoanRepository;

    constructor() {
        this.loanRepository = new LoanRepository();
    }

    async notifyLoanApproved(loanId: string): Promise<void> {
        try {
            const loan = await this.loanRepository.findWithCustomerAndLine(loanId);

            if (!loan) { logger.warn({ loanId }, 'Loan not found for notification'); return; }

            const lineUserId = loan.customer.lineUserId || loan.customer.user?.lineUserId;
            if (!lineUserId) {
                logger.info({ loanId, customerId: loan.customerId }, 'Customer has no LINE account linked');
                return;
            }

            const message = this.createLoanApprovedMessage(loan);
            await lineNotificationQueue.enqueue(lineUserId, message, 'high');
            logger.info({ loanId, customerId: loan.customerId }, 'Loan approval notification queued');
        } catch (error) {
            logger.error({ loanId, error }, 'Failed to queue loan approval notification');
        }
    }

    async notifyLoanRejected(loanId: string, reason?: string): Promise<void> {
        try {
            const loan = await this.loanRepository.findWithCustomerAndLine(loanId);
            if (!loan) { logger.warn({ loanId }, 'Loan not found for notification'); return; }

            const lineUserId = loan.customer.lineUserId || loan.customer.user?.lineUserId;
            if (!lineUserId) { logger.info({ loanId }, 'Customer has no LINE account linked'); return; }

            const message = this.createLoanRejectedMessage(loan, reason);
            await lineNotificationQueue.enqueue(lineUserId, message, 'high');
            logger.info({ loanId }, 'Loan rejection notification queued');
        } catch (error) {
            logger.error({ loanId, error }, 'Failed to queue loan rejection notification');
        }
    }

    async notifyLoanDisbursed(loanId: string, amount: number, referenceNo?: string): Promise<void> {
        try {
            const loan = await this.loanRepository.findWithCustomerAndLine(loanId);
            if (!loan) { logger.warn({ loanId }, 'Loan not found for notification'); return; }

            const lineUserId = loan.customer.lineUserId || loan.customer.user?.lineUserId;
            if (!lineUserId) { logger.info({ loanId }, 'Customer has no LINE account linked'); return; }

            const message = this.createLoanDisbursedMessage(loan, amount, referenceNo);
            await lineNotificationQueue.enqueue(lineUserId, message, 'high');
            logger.info({ loanId, amount, referenceNo }, 'Loan disbursement notification queued');
        } catch (error) {
            logger.error({ loanId, error }, 'Failed to queue loan disbursement notification');
        }
    }

    async notifyLoanDisbursedWithPDF(loanId: string, amount: number, referenceNo: string, pdfUrl: string, password: string): Promise<void> {
        try {
            const loan = await this.loanRepository.findWithCustomerAndLine(loanId);
            if (!loan) { logger.warn({ loanId }, 'Loan not found for notification'); return; }

            const lineUserId = loan.customer.lineUserId || loan.customer.user?.lineUserId;
            if (!lineUserId) { logger.info({ loanId }, 'Customer has no LINE account linked'); return; }

            const message = await this.createLoanDisbursedMessageWithPDF(loan, amount, referenceNo, pdfUrl, password);
            await lineNotificationQueue.enqueue(lineUserId, message, 'high');
            logger.info({ loanId, amount, referenceNo, pdfUrl }, 'Loan disbursement notification with PDF queued');
        } catch (error) {
            logger.error({ loanId, error }, 'Failed to queue loan disbursement notification with PDF');
        }
    }

    async notifyPaymentReceived(paymentId: string): Promise<void> {
        try {
            const payment = await this.loanRepository.findPaymentWithLoan(paymentId);
            if (!payment) { logger.warn({ paymentId }, 'Payment not found for notification'); return; }

            const lineUserId = payment.loan.customer.lineUserId || payment.loan.customer.user?.lineUserId;
            if (!lineUserId) { logger.info({ paymentId }, 'Customer has no LINE account linked'); return; }

            const message = this.createPaymentReceivedMessage(payment);
            await lineNotificationQueue.enqueue(lineUserId, message, 'normal');
            logger.info({ paymentId }, 'Payment received notification queued');
        } catch (error) {
            logger.error({ paymentId, error }, 'Failed to queue payment received notification');
        }
    }

    /**
     * Create loan approved message
     */
    private createLoanApprovedMessage(loan: any): any {
        return {
            type: 'flex',
            altText: '✅ สินเชื่อของคุณได้รับการอนุมัติแล้ว',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '✅ อนุมัติสินเชื่อ',
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
                            text: 'ยินดีด้วย! สินเชื่อของคุณได้รับการอนุมัติแล้ว',
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
                                        { type: 'text', text: 'ผลิตภัณฑ์:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: loan.loanProduct?.productName || 'สินเชื่อ SME', size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2, wrap: true },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'วงเงินอนุมัติ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: `${Number(loan.principal).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: 'md', weight: 'bold', color: COLORS.SUCCESS, flex: 2 },
                                    ],
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'อัตราดอกเบี้ย:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: `${Number(loan.interestRate).toFixed(2)}% ต่อปี`, size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2 },
                                    ],
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ระยะเวลา:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: `${loan.termMonths} เดือน`, size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2 },
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
                            type: 'text',
                            text: '📋 ขั้นตอนถัดไป',
                            weight: 'bold',
                            size: 'md',
                            margin: 'xl',
                            color: COLORS.TEXT_PRIMARY,
                        },
                        {
                            type: 'text',
                            text: 'เจ้าหน้าที่จะติดต่อกลับเพื่อดำเนินการเบิกจ่ายเงินกู้ภายใน 1-2 วันทำการ',
                            wrap: true,
                            size: 'sm',
                            color: COLORS.TEXT_SECONDARY,
                            margin: 'md',
                        },
                    ],
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💬 หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่',
                            size: 'xs',
                            color: COLORS.TEXT_SECONDARY,
                            align: 'center',
                        },
                    ],
                    paddingAll: '12px',
                },
            },
        };
    }

    /**
     * Create loan rejected message
     */
    private createLoanRejectedMessage(_loan: any, reason?: string): any {
        return {
            type: 'flex',
            altText: '❌ สินเชื่อของคุณไม่ได้รับการอนุมัติ',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '❌ ไม่อนุมัติสินเชื่อ',
                            weight: 'bold',
                            size: 'xl',
                            color: COLORS.DANGER,
                        },
                    ],
                    backgroundColor: '#FFEBEE',
                    paddingAll: '20px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'ขออภัย สินเชื่อของคุณไม่ได้รับการอนุมัติในครั้งนี้',
                            wrap: true,
                            color: COLORS.TEXT_PRIMARY,
                            margin: 'md',
                        },
                        ...(reason ? [
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
                                        text: 'เหตุผล:',
                                        weight: 'bold' as const,
                                        size: 'sm' as const,
                                        color: COLORS.TEXT_PRIMARY,
                                        margin: 'lg' as const,
                                    },
                                    {
                                        type: 'text' as const,
                                        text: reason,
                                        wrap: true,
                                        size: 'sm' as const,
                                        color: COLORS.TEXT_SECONDARY,
                                        margin: 'md' as const,
                                    },
                                ],
                            },
                        ] : []),
                        {
                            type: 'separator',
                            margin: 'xl',
                        },
                        {
                            type: 'text',
                            text: '💡 คำแนะนำ',
                            weight: 'bold',
                            size: 'md',
                            margin: 'xl',
                            color: COLORS.TEXT_PRIMARY,
                        },
                        {
                            type: 'text',
                            text: 'คุณสามารถปรับปรุงเอกสารและยื่นคำขอใหม่ได้ หรือติดต่อเจ้าหน้าที่เพื่อขอคำปรึกษา',
                            wrap: true,
                            size: 'sm',
                            color: COLORS.TEXT_SECONDARY,
                            margin: 'md',
                        },
                    ],
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💬 ติดต่อเจ้าหน้าที่เพื่อขอคำปรึกษา',
                            size: 'xs',
                            color: COLORS.TEXT_SECONDARY,
                            align: 'center',
                        },
                    ],
                    paddingAll: '12px',
                },
            },
        };
    }

    /**
     * Create loan disbursed message
     */
    private createLoanDisbursedMessage(loan: any, amount: number, referenceNo?: string): any {
        return {
            type: 'flex',
            altText: '💰 เบิกจ่ายเงินกู้สำเร็จ',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💰 เบิกจ่ายเงินกู้',
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
                            text: 'เงินกู้ได้รับการเบิกจ่ายเรียบร้อยแล้ว',
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
                                        { type: 'text', text: 'จำนวนเงิน:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: 'lg', weight: 'bold', color: COLORS.SUCCESS, flex: 2 },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'วันที่เบิกจ่าย:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: new Date().toLocaleDateString('th-TH'), size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2 },
                                    ],
                                    margin: 'md',
                                },
                                ...(referenceNo ? [
                                    {
                                        type: 'box' as const,
                                        layout: 'horizontal' as const,
                                        contents: [
                                            { type: 'text' as const, text: 'เลขที่อ้างอิง:', size: 'sm' as const, color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { type: 'text' as const, text: referenceNo, size: 'sm' as const, weight: 'bold' as const, color: COLORS.PRIMARY, flex: 2, wrap: true },
                                        ],
                                        margin: 'md' as const,
                                    },
                                ] : []),
                            ],
                        },
                        {
                            type: 'separator',
                            margin: 'xl',
                        },
                        {
                            type: 'text',
                            text: '📅 กำหนดชำระงวดแรก',
                            weight: 'bold',
                            size: 'md',
                            margin: 'xl',
                            color: COLORS.TEXT_PRIMARY,
                        },
                        {
                            type: 'text',
                            text: loan.firstPaymentDate 
                                ? new Date(loan.firstPaymentDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                                : 'จะแจ้งให้ทราบภายหลัง',
                            wrap: true,
                            size: 'sm',
                            color: COLORS.TEXT_SECONDARY,
                            margin: 'md',
                        },
                    ],
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: referenceNo ? '📋 กรุณาเก็บเลขที่อ้างอิงไว้สำหรับการติดตาม' : '💬 ขอบคุณที่ใช้บริการ',
                            size: 'xs',
                            color: COLORS.TEXT_SECONDARY,
                            align: 'center',
                            wrap: true,
                        },
                    ],
                    paddingAll: '12px',
                },
            },
        };
    }

    /**
     * Create loan disbursed message with PDF and secure password-protected link
     */
    private async createLoanDisbursedMessageWithPDF(
        loan: any,
        amount: number,
        referenceNo: string,
        _pdfUrl: string,
        password: string
    ): Promise<any> {
        // Generate secure token for password-protected access
        const { SecureDocumentService } = await import('@documents/services/secure-document.service');
        const secureDocumentService = new SecureDocumentService();
        
        const secureToken = await secureDocumentService.generateSecureToken(
            'contract',
            loan.id,
            loan.customerId
        );
        const secureUrl = await secureDocumentService.getSecureDocumentUrl(secureToken);

        return {
            type: 'flex',
            altText: '💰 เบิกจ่ายเงินกู้สำเร็จ - ดาวน์โหลดหนังสือแจ้งการเบิกจ่าย',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💰 เบิกจ่ายเงินกู้สำเร็จ',
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
                            text: 'เงินกู้ได้รับการเบิกจ่ายเรียบร้อยแล้ว',
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
                                        { type: 'text', text: 'จำนวนเงิน:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: 'lg', weight: 'bold', color: COLORS.SUCCESS, flex: 2 },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'เลขที่อ้างอิง:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: referenceNo, size: 'sm', weight: 'bold', color: COLORS.PRIMARY, flex: 2, wrap: true },
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
                                    text: '📄 หนังสือแจ้งการเบิกจ่ายเงินกู้',
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
                                            text: `🔒 รหัสเปิดไฟล์: ${password}`,
                                            size: 'sm',
                                            color: '#FF6B00',
                                            weight: 'bold',
                                            wrap: true,
                                        },
                                        {
                                            type: 'text',
                                            text: 'กรุณาเก็บรหัสนี้ไว้เป็นความลับ',
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
                                label: '🔐 ดูเอกสาร (ต้องยืนยันตัวตน)',
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
     * Create payment received message
     */
    private createPaymentReceivedMessage(payment: any): any {
        return {
            type: 'flex',
            altText: '✅ รับชำระเงินเรียบร้อยแล้ว',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '✅ รับชำระเงิน',
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
                                        { type: 'text', text: 'จำนวนเงิน:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: `${Number(payment.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: 'lg', weight: 'bold', color: COLORS.SUCCESS, flex: 2 },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'วันที่ชำระ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: new Date(payment.paymentDate).toLocaleDateString('th-TH'), size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2 },
                                    ],
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'เลขที่อ้างอิง:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { type: 'text', text: payment.reference || '-', size: 'sm', color: COLORS.TEXT_PRIMARY, flex: 2 },
                                    ],
                                    margin: 'md',
                                },
                            ],
                        },
                    ],
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💬 ขอบคุณที่ชำระตรงเวลา',
                            size: 'xs',
                            color: COLORS.TEXT_SECONDARY,
                            align: 'center',
                        },
                    ],
                    paddingAll: '12px',
                },
            },
        };
    }
}

export const loanStatusNotification = new LoanStatusNotificationService();

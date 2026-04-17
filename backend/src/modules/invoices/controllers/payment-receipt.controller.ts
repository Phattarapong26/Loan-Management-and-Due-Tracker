import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentReceiptService } from '../services/payment-receipt.service';
import { InvoiceSecurityService } from '../services/invoice-security.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { logger } from '@utils/common/logger.util';

export class PaymentReceiptController {
    private receiptService: PaymentReceiptService;
    private securityService: InvoiceSecurityService;

    constructor() {
        this.receiptService = new PaymentReceiptService();
        this.securityService = new InvoiceSecurityService();
    }

    /**
     * ตรวจสอบรหัสผ่าน (เลขบัตรประชาชน) ก่อนเปิดใบเสร็จ
     */
    verifyReceiptAccess = async (
        request: FastifyRequest<{
            Params: { receiptId: string };
            Body: { nationalId: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { receiptId } = request.params;
            const { nationalId } = request.body;

            if (!nationalId) {
                return ResponseUtil.error(reply, 'กรุณากรอกเลขบัตรประชาชน', 400);
            }

            // ดึงข้อมูล receipt เพื่อหา customerId
            const receipt = await this.receiptService.getReceiptForCustomer(receiptId);
            if (!receipt) {
                return ResponseUtil.error(reply, 'ไม่พบใบเสร็จ', 404);
            }

            // ตรวจสอบ rate limit
            const rateLimit = await this.securityService.checkRateLimit(receiptId);
            if (!rateLimit.allowed) {
                return ResponseUtil.error(
                    reply,
                    `คุณพยายามเข้าถึงหลายครั้งเกินไป กรุณารอ ${Math.ceil(
                        (rateLimit.resetAt.getTime() - Date.now()) / 60000
                    )} นาที`,
                    429
                );
            }

            // ตรวจสอบเลขบัตรประชาชนผ่าน loanId
            const isValid = await this.securityService.verifyNationalIdForLoan(
                receipt.loanId,
                nationalId
            );

            if (!isValid) {
                logger.warn(
                    { receiptId },
                    'Invalid national ID attempt for receipt access'
                );
                return ResponseUtil.error(
                    reply,
                    `เลขบัตรประชาชนไม่ถูกต้อง (เหลือ ${rateLimit.remainingAttempts - 1} ครั้ง)`,
                    401
                );
            }

            return ResponseUtil.success(reply, {
                verified: true,
                receipt,
                message: 'ยืนยันตัวตนสำเร็จ',
            });
        } catch (error) {
            logger.error({ error }, 'Error verifying receipt access');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบ',
                500
            );
        }
    };

    /**
     * ตรวจสอบรหัสผ่านสำหรับดูใบเสร็จทั้งหมดของ loan
     */
    verifyLoanReceiptsAccess = async (
        request: FastifyRequest<{
            Params: { loanId: string };
            Body: { nationalId: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { loanId } = request.params;
            const { nationalId } = request.body;

            if (!nationalId) {
                return ResponseUtil.error(reply, 'กรุณากรอกเลขบัตรประชาชน', 400);
            }

            // ตรวจสอบ rate limit
            const rateLimit = await this.securityService.checkRateLimit(loanId);
            if (!rateLimit.allowed) {
                return ResponseUtil.error(
                    reply,
                    `คุณพยายามเข้าถึงหลายครั้งเกินไป กรุณารอ ${Math.ceil(
                        (rateLimit.resetAt.getTime() - Date.now()) / 60000
                    )} นาที`,
                    429
                );
            }

            // ตรวจสอบเลขบัตรประชาชน
            const isValid = await this.securityService.verifyNationalIdForLoan(
                loanId,
                nationalId
            );

            if (!isValid) {
                logger.warn({ loanId }, 'Invalid national ID attempt for loan receipts access');
                return ResponseUtil.error(
                    reply,
                    `เลขบัตรประชาชนไม่ถูกต้อง (เหลือ ${rateLimit.remainingAttempts - 1} ครั้ง)`,
                    401
                );
            }

            // ดึงข้อมูลใบเสร็จทั้งหมด
            const receipts = await this.receiptService.getLoanReceipts(loanId);

            return ResponseUtil.success(reply, {
                verified: true,
                receipts,
                message: 'ยืนยันตัวตนสำเร็จ',
            });
        } catch (error) {
            logger.error({ error }, 'Error verifying loan receipts access');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบ',
                500
            );
        }
    };

    /**
     * ตรวจสอบรหัสผ่านด้วยเลขที่ใบเสร็จ
     */
    verifyReceiptByNumber = async (
        request: FastifyRequest<{
            Params: { receiptNumber: string };
            Body: { nationalId: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { receiptNumber } = request.params;
            const { nationalId } = request.body;

            if (!nationalId) {
                return ResponseUtil.error(reply, 'กรุณากรอกเลขบัตรประชาชน', 400);
            }

            // ตรวจสอบ rate limit
            const rateLimit = await this.securityService.checkRateLimit(receiptNumber);
            if (!rateLimit.allowed) {
                return ResponseUtil.error(
                    reply,
                    `คุณพยายามเข้าถึงหลายครั้งเกินไป กรุณารอ ${Math.ceil(
                        (rateLimit.resetAt.getTime() - Date.now()) / 60000
                    )} นาที`,
                    429
                );
            }

            // ค้นหาใบเสร็จจากเลขที่
            const receipt = await this.receiptService.getReceiptByNumber(receiptNumber);
            if (!receipt) {
                return ResponseUtil.error(reply, 'ไม่พบใบเสร็จ', 404);
            }

            // ตรวจสอบเลขบัตรประชาชน
            const isValid = await this.securityService.verifyNationalIdForLoan(
                receipt.loanId,
                nationalId
            );

            if (!isValid) {
                logger.warn(
                    { receiptNumber },
                    'Invalid national ID attempt for receipt access by number'
                );
                return ResponseUtil.error(
                    reply,
                    `เลขบัตรประชาชนไม่ถูกต้อง (เหลือ ${rateLimit.remainingAttempts - 1} ครั้ง)`,
                    401
                );
            }

            return ResponseUtil.success(reply, {
                verified: true,
                receipt,
                message: 'ยืนยันตัวตนสำเร็จ',
            });
        } catch (error) {
            logger.error({ error }, 'Error verifying receipt by number');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบ',
                500
            );
        }
    };

    /**
     * ดึงประวัติการเข้าถึงใบเสร็จ (สำหรับ admin)
     */
    getReceiptAccessHistory = async (
        request: FastifyRequest<{
            Params: { receiptId: string };
            Querystring: { limit?: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { receiptId } = request.params;
            const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

            const history = await this.securityService.getAccessHistory(
                receiptId,
                limit
            );

            return ResponseUtil.success(reply, history);
        } catch (error) {
            logger.error({ error }, 'Error getting receipt access history');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get access history',
                500
            );
        }
    };

    /**
     * สร้างใบเสร็จ (สำหรับ staff)
     */
    generateReceipt = async (
        request: FastifyRequest<{
            Params: { paymentId: string };
            Body: {
                includeQRCode?: boolean;
                autoSend?: boolean;
                sendVia?: 'LINE' | 'EMAIL' | 'SMS';
            };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { paymentId } = request.params;
            const { includeQRCode, autoSend, sendVia } = request.body;
            const user = (request as any).user;

            const receipt = await this.receiptService.generatePaymentReceipt(
                paymentId,
                user?.id || 'SYSTEM',
                {
                    includeQRCode,
                    autoSend,
                    sendVia,
                }
            );

            return ResponseUtil.success(reply, receipt);
        } catch (error) {
            logger.error({ error }, 'Error generating receipt');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to generate receipt',
                500
            );
        }
    };

    /**
     * ดึงใบเสร็จทั้งหมดของ loan (สำหรับ staff)
     */
    getLoanReceipts = async (
        request: FastifyRequest<{ Params: { loanId: string } }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { loanId } = request.params;

            const receipts = await this.receiptService.getLoanReceipts(loanId);

            return ResponseUtil.success(reply, receipts);
        } catch (error) {
            logger.error({ error }, 'Error getting loan receipts');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get loan receipts',
                500
            );
        }
    };

    /**
     * Get (or generate) receipt PDF URL (for staff)
     */
    getReceiptPdfUrl = async (
        request: FastifyRequest<{ Params: { receiptId: string } }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { receiptId } = request.params;
            const pdfUrl = await this.receiptService.ensureReceiptPdfUrl(receiptId);
            return ResponseUtil.success(reply, { pdfUrl });
        } catch (error) {
            logger.error({ error }, 'Error getting receipt PDF URL');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get receipt PDF URL',
                500
            );
        }
    };
}

export const paymentReceiptController = new PaymentReceiptController();

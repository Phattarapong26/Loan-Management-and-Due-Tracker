import { FastifyRequest, FastifyReply } from 'fastify';
import { InvoiceService } from '../services/invoice.service';
import { InvoiceSecurityService } from '../services/invoice-security.service';
import { PDFCacheService } from '../services/pdf-cache.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { logger } from '@utils/common/logger.util';

export class InvoiceController {
    private invoiceService: InvoiceService;
    private securityService: InvoiceSecurityService;

    constructor() {
        this.invoiceService = new InvoiceService();
        this.securityService = new InvoiceSecurityService();
    }

    /**
     * Get invoice data for a specific payment schedule
     * Query params: ?save=true to pre-generate and save
     */
    getInvoice = async (
        request: FastifyRequest<{ 
            Params: { paymentScheduleId: string };
            Querystring: { save?: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { paymentScheduleId } = request.params;
            const shouldSave = request.query.save === 'true';

            let invoice;
            if (shouldSave) {
                // Pre-generate and save invoice
                const user = (request as any).user;
                const result = await this.invoiceService.saveInvoice(
                    paymentScheduleId,
                    user?.id || 'SYSTEM'
                );
                invoice = result.data;
            } else {
                // Get or generate on-demand
                invoice = await this.invoiceService.getInvoiceData(paymentScheduleId);
            }

            return ResponseUtil.success(reply, invoice);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get invoice',
                500
            );
        }
    };

    /**
     * Get invoice data by loan ID and installment number
     */
    getInvoiceByInstallment = async (
        request: FastifyRequest<{
            Params: { loanId: string };
            Querystring: { installmentNo: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { loanId } = request.params;
            const { installmentNo } = request.query;

            if (!installmentNo) {
                return ResponseUtil.error(reply, 'Installment number is required', 400);
            }

            const invoice = await this.invoiceService.getInvoiceByInstallment(
                loanId,
                parseInt(installmentNo, 10)
            );

            return ResponseUtil.success(reply, invoice);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice by installment');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get invoice',
                500
            );
        }
    };

    /**
     * Get all invoices for a loan
     */
    getLoanInvoices = async (
        request: FastifyRequest<{ Params: { loanId: string } }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { loanId } = request.params;

            const invoices = await this.invoiceService.getLoanInvoices(loanId);

            return ResponseUtil.success(reply, invoices);
        } catch (error) {
            logger.error({ error }, 'Error getting loan invoices');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get loan invoices',
                500
            );
        }
    };

    /**
     * Pre-generate and save invoice
     */
    saveInvoice = async (
        request: FastifyRequest<{ 
            Params: { paymentScheduleId: string };
            Body: { sendVia?: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { paymentScheduleId } = request.params;
            const { sendVia } = request.body;
            const user = (request as any).user;

            const result = await this.invoiceService.saveInvoice(
                paymentScheduleId,
                user?.id || 'SYSTEM',
                sendVia
            );

            return ResponseUtil.success(reply, result);
        } catch (error) {
            logger.error({ error }, 'Error saving invoice');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to save invoice',
                500
            );
        }
    };

    /**
     * Mark invoice as viewed
     */
    markAsViewed = async (
        request: FastifyRequest<{ Params: { invoiceId: string } }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { invoiceId } = request.params;

            await this.invoiceService.markAsViewed(invoiceId);

            return ResponseUtil.success(reply, { message: 'Invoice marked as viewed' });
        } catch (error) {
            logger.error({ error }, 'Error marking invoice as viewed');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to mark invoice as viewed',
                500
            );
        }
    };

    /**
     * Get invoice history for audit trail
     */
    getInvoiceHistory = async (
        request: FastifyRequest<{ Params: { paymentScheduleId: string } }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { paymentScheduleId } = request.params;

            const history = await this.invoiceService.getInvoiceHistory(paymentScheduleId);

            return ResponseUtil.success(reply, history);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice history');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get invoice history',
                500
            );
        }
    };

    /**
     * ตรวจสอบรหัสผ่าน (เลขบัตรประชาชน) ก่อนเปิด Invoice
     */
    verifyInvoiceAccess = async (
        request: FastifyRequest<{
            Params: { paymentScheduleId: string };
            Body: { nationalId: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { paymentScheduleId } = request.params;
            const { nationalId } = request.body;

            if (!nationalId) {
                return ResponseUtil.error(reply, 'กรุณากรอกเลขบัตรประชาชน', 400);
            }

            // ตรวจสอบ rate limit
            const rateLimit = await this.securityService.checkRateLimit(paymentScheduleId);
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
            const isValid = await this.securityService.verifyNationalId(
                paymentScheduleId,
                nationalId
            );

            if (!isValid) {
                logger.warn(
                    { paymentScheduleId },
                    'Invalid national ID attempt for invoice access'
                );
                return ResponseUtil.error(
                    reply,
                    `เลขบัตรประชาชนไม่ถูกต้อง (เหลือ ${rateLimit.remainingAttempts - 1} ครั้ง)`,
                    401
                );
            }

            // ดึงข้อมูล invoice
            const invoice = await this.invoiceService.getInvoiceData(paymentScheduleId);

            return ResponseUtil.success(reply, {
                verified: true,
                invoice,
                message: 'ยืนยันตัวตนสำเร็จ',
            });
        } catch (error) {
            logger.error({ error }, 'Error verifying invoice access');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบ',
                500
            );
        }
    };

    /**
     * ตรวจสอบรหัสผ่านสำหรับ loan (ดู invoice ทั้งหมดของ loan)
     */
    verifyLoanInvoiceAccess = async (
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
                logger.warn({ loanId }, 'Invalid national ID attempt for loan invoice access');
                return ResponseUtil.error(
                    reply,
                    `เลขบัตรประชาชนไม่ถูกต้อง (เหลือ ${rateLimit.remainingAttempts - 1} ครั้ง)`,
                    401
                );
            }

            // ดึงข้อมูล invoices ทั้งหมด
            const invoices = await this.invoiceService.getLoanInvoices(loanId);

            return ResponseUtil.success(reply, {
                verified: true,
                invoices,
                message: 'ยืนยันตัวตนสำเร็จ',
            });
        } catch (error) {
            logger.error({ error }, 'Error verifying loan invoice access');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบ',
                500
            );
        }
    };

    /**
     * ดึงประวัติการเข้าถึง Invoice (สำหรับ admin)
     */
    getInvoiceAccessHistory = async (
        request: FastifyRequest<{
            Params: { paymentScheduleId: string };
            Querystring: { limit?: string };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { paymentScheduleId } = request.params;
            const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

            const history = await this.securityService.getAccessHistory(
                paymentScheduleId,
                limit
            );

            return ResponseUtil.success(reply, history);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice access history');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get access history',
                500
            );
        }
    };

    /**
     * ดู PDF Cache Statistics (สำหรับ admin)
     */
    getPDFCacheStats = async (
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const stats = PDFCacheService.getCacheStats();
            
            return ResponseUtil.success(reply, {
                ...stats,
                message: 'PDF cache statistics retrieved successfully'
            });
        } catch (error) {
            logger.error({ error }, 'Error getting PDF cache stats');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to get cache stats',
                500
            );
        }
    };

    /**
     * ล้าง PDF Cache (สำหรับ admin)
     */
    clearPDFCache = async (
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            PDFCacheService.clearCache();
            
            return ResponseUtil.success(reply, {
                message: 'PDF cache cleared successfully'
            });
        } catch (error) {
            logger.error({ error }, 'Error clearing PDF cache');
            return ResponseUtil.error(
                reply,
                error instanceof Error ? error.message : 'Failed to clear cache',
                500
            );
        }
    };
}

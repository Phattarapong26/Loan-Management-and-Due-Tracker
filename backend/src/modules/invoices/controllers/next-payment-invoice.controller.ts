import { FastifyRequest, FastifyReply } from 'fastify';
import { NextPaymentInvoiceService } from '../services/next-payment-invoice.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { logger } from '@utils/common/logger.util';

export class NextPaymentInvoiceController {
    private nextPaymentInvoiceService: NextPaymentInvoiceService;

    constructor() {
        this.nextPaymentInvoiceService = new NextPaymentInvoiceService();
    }

    /**
     * สร้าง Invoice สำหรับงวดถัดไป
     * POST /api/loans/:loanId/next-payment-invoice
     */
    async generateNextPaymentInvoice(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };
            const user = request.user;
            const options = request.body as {
                includeBankingInfo?: boolean;
                includeQRCode?: boolean;
                validDays?: number;
            };

            if (!user?.userId) {
                return ResponseUtil.unauthorized(reply, 'User not authenticated');
            }

            logger.info({ loanId, userId: user.userId }, 'Generating next payment invoice');

            const result = await this.nextPaymentInvoiceService.generateNextPaymentInvoice(
                loanId,
                user.userId,
                options
            );

            return ResponseUtil.success(reply, result);
        } catch (error) {
            logger.error({ error }, 'Error generating next payment invoice');
            return ResponseUtil.error(reply, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * ดึง Invoice งวดถัดไปสำหรับลูกค้า
     * GET /api/loans/:loanId/next-payment-invoice
     */
    async getNextPaymentInvoiceForCustomer(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };

            logger.info({ loanId }, 'Getting next payment invoice for customer');

            const result = await this.nextPaymentInvoiceService.getNextPaymentInvoiceForCustomer(loanId);

            if (!result) {
                return ResponseUtil.success(reply, null);
            }

            return ResponseUtil.success(reply, result);
        } catch (error) {
            logger.error({ error }, 'Error getting next payment invoice for customer');
            return ResponseUtil.error(reply, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * ส่ง Invoice ให้ลูกค้า
     * POST /api/invoices/:invoiceId/send
     */
    async sendInvoiceToCustomer(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { invoiceId } = request.params as { invoiceId: string };
            const { method } = request.body as { method: 'LINE' | 'EMAIL' | 'SMS' };
            const user = request.user;

            if (!user?.userId) {
                return ResponseUtil.unauthorized(reply, 'User not authenticated');
            }

            if (!method || !['LINE', 'EMAIL', 'SMS'].includes(method)) {
                return ResponseUtil.badRequest(reply, 'Valid sending method is required (LINE, EMAIL, or SMS)');
            }

            logger.info({ invoiceId, method, userId: user.userId }, 'Sending invoice to customer');

            const result = await this.nextPaymentInvoiceService.sendInvoiceToCustomer(
                invoiceId,
                method,
                user.userId
            );

            if (result.success) {
                return ResponseUtil.success(reply, result);
            } else {
                return ResponseUtil.error(reply, result.message);
            }
        } catch (error) {
            logger.error({ error }, 'Error sending invoice to customer');
            return ResponseUtil.error(reply, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * ดึงประวัติ Invoice ทั้งหมดของสินเชื่อ
     * GET /api/loans/:loanId/invoice-history
     */
    async getInvoiceHistory(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };

            logger.info({ loanId }, 'Getting invoice history');

            const results = await this.nextPaymentInvoiceService.getInvoiceHistory(loanId);

            return ResponseUtil.success(reply, results);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice history');
            return ResponseUtil.error(reply, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * ดึงข้อมูล Invoice สำหรับ LINE Bot หรือ Customer Portal
     * GET /api/customer-portal/loans/:loanId/current-invoice
     */
    async getCurrentInvoiceForPortal(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };

            logger.info({ loanId }, 'Getting current invoice for customer portal');

            const result = await this.nextPaymentInvoiceService.getNextPaymentInvoiceForCustomer(loanId);

            if (!result) {
                return ResponseUtil.success(reply, {
                    hasInvoice: false,
                    message: 'ไม่มีงวดที่ต้องชำระในขณะนี้',
                }, 200);
            }

            // Format data สำหรับ Customer Portal
            const portalData = {
                hasInvoice: true,
                invoice: {
                    invoiceNumber: result.invoiceNumber,
                    installmentNo: result.nextPayment.installmentNo,
                    totalInstallments: result.nextPayment.totalInstallments,
                    dueDate: result.nextPayment.dueDate,
                    amount: result.nextPayment.totalAmount,
                    principalAmount: result.nextPayment.principalAmount,
                    interestAmount: result.nextPayment.interestAmount,
                    status: result.nextPayment.status,
                    qrCode: result.metadata.qrCodeData,
                    bankingInfo: result.metadata.bankingInfo,
                },
                loanSummary: {
                    outstandingBalance: result.loanSummary.currentOutstandingBalance,
                    paymentProgress: result.loanSummary.paymentProgress,
                    totalPaid: result.loanSummary.totalPaid,
                },
                paymentInfo: result.paymentInfo,
            };

            return ResponseUtil.success(reply, portalData);
        } catch (error) {
            logger.error({ error }, 'Error getting current invoice for portal');
            return ResponseUtil.error(reply, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Webhook สำหรับอัพเดท Invoice หลังการชำระเงิน
     * POST /api/webhooks/payment-completed
     */
    async handlePaymentCompleted(request: FastifyRequest, reply: FastifyReply) {
        try {
            const {
                paymentScheduleId,
                amount,
                paymentDate,
                paymentMethod,
                receiptNumber,
            } = request.body as {
                paymentScheduleId: string;
                amount: number;
                paymentDate: string;
                paymentMethod: string;
                receiptNumber: string;
            };

            logger.info({ paymentScheduleId, amount }, 'Handling payment completed webhook');

            await this.nextPaymentInvoiceService.updateInvoiceAfterPayment(paymentScheduleId, {
                amount,
                paymentDate: new Date(paymentDate),
                paymentMethod,
                receiptNumber,
            });

            return ResponseUtil.success(reply, { updated: true });
        } catch (error) {
            logger.error({ error }, 'Error handling payment completed webhook');
            return ResponseUtil.error(reply, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * ดึงสถิติ Invoice สำหรับ Dashboard
     * GET /api/dashboard/invoice-stats
     */
    async getInvoiceStats(request: FastifyRequest, reply: FastifyReply) {
        try {
            const user = request.user;
            const { period } = request.query as { period?: 'today' | 'week' | 'month' };

            logger.info({ userId: user?.userId, period }, 'Getting invoice statistics');

            // TODO: Implement invoice statistics
            // This would include:
            // - Total invoices generated
            // - Invoices sent vs pending
            // - Payment completion rate
            // - Average time to payment
            // - Overdue invoices

            const mockStats = {
                totalInvoices: 0,
                sentInvoices: 0,
                paidInvoices: 0,
                overdueInvoices: 0,
                averagePaymentTime: 0,
                paymentCompletionRate: 0,
            };

            return ResponseUtil.success(reply, mockStats);
        } catch (error) {
            logger.error({ error }, 'Error getting invoice statistics');
            return ResponseUtil.error(reply, error instanceof Error ? error.message : 'Unknown error');
        }
    }
}

export const nextPaymentInvoiceController = new NextPaymentInvoiceController();
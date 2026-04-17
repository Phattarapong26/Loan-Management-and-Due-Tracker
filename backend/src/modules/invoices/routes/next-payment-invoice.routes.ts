import { FastifyInstance } from 'fastify';
import { nextPaymentInvoiceController } from '../controllers/next-payment-invoice.controller';
import { authenticate, authorize } from '@middlewares/security/auth.middleware';

export async function nextPaymentInvoiceRoutes(fastify: FastifyInstance) {
    // Apply authentication to all routes
    fastify.addHook('preHandler', authenticate);

    /**
     * สร้าง Invoice สำหรับงวดถัดไป
     */
    fastify.post('/loans/:loanId/next-payment-invoice', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            tags: ['Next Payment Invoice'],
            summary: 'Generate next payment invoice for a loan',
            params: {
                type: 'object',
                properties: {
                    loanId: { type: 'string', format: 'uuid' },
                },
                required: ['loanId'],
            },
            body: {
                type: 'object',
                properties: {
                    includeBankingInfo: { type: 'boolean', default: true },
                    includeQRCode: { type: 'boolean', default: true },
                    validDays: { type: 'number', minimum: 1, maximum: 90, default: 30 },
                },
            },
        },
    }, nextPaymentInvoiceController.generateNextPaymentInvoice.bind(nextPaymentInvoiceController));

    /**
     * ดึง Invoice งวดถัดไปสำหรับลูกค้า
     */
    fastify.get('/loans/:loanId/next-payment-invoice', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            tags: ['Next Payment Invoice'],
            summary: 'Get next payment invoice for customer',
            params: {
                type: 'object',
                properties: {
                    loanId: { type: 'string', format: 'uuid' },
                },
                required: ['loanId'],
            },
        },
    }, nextPaymentInvoiceController.getNextPaymentInvoiceForCustomer.bind(nextPaymentInvoiceController));

    /**
     * ส่ง Invoice ให้ลูกค้า
     */
    fastify.post('/invoices/:invoiceId/send', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            tags: ['Next Payment Invoice'],
            summary: 'Send invoice to customer',
            params: {
                type: 'object',
                properties: {
                    invoiceId: { type: 'string', format: 'uuid' },
                },
                required: ['invoiceId'],
            },
            body: {
                type: 'object',
                properties: {
                    method: { 
                        type: 'string', 
                        enum: ['LINE', 'EMAIL', 'SMS'],
                        description: 'Method to send the invoice',
                    },
                },
                required: ['method'],
            },
        },
    }, nextPaymentInvoiceController.sendInvoiceToCustomer.bind(nextPaymentInvoiceController));

    /**
     * ดึงประวัติ Invoice ทั้งหมดของสินเชื่อ
     */
    fastify.get('/loans/:loanId/invoice-history', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            tags: ['Next Payment Invoice'],
            summary: 'Get invoice history for a loan',
            params: {
                type: 'object',
                properties: {
                    loanId: { type: 'string', format: 'uuid' },
                },
                required: ['loanId'],
            },
        },
    }, nextPaymentInvoiceController.getInvoiceHistory.bind(nextPaymentInvoiceController));

    /**
     * ดึงข้อมูล Invoice สำหรับ LINE Bot หรือ Customer Portal
     */
    fastify.get('/customer-portal/loans/:loanId/current-invoice', {
        schema: {
            tags: ['Customer Portal'],
            summary: 'Get current invoice for customer portal',
            params: {
                type: 'object',
                properties: {
                    loanId: { type: 'string', format: 'uuid' },
                },
                required: ['loanId'],
            },
        },
    }, nextPaymentInvoiceController.getCurrentInvoiceForPortal.bind(nextPaymentInvoiceController));

    /**
     * Webhook สำหรับอัพเดท Invoice หลังการชำระเงิน
     */
    fastify.post('/webhooks/payment-completed', {
        schema: {
            tags: ['Webhooks'],
            summary: 'Handle payment completed webhook',
            body: {
                type: 'object',
                properties: {
                    paymentScheduleId: { type: 'string', format: 'uuid' },
                    amount: { type: 'number', minimum: 0.01 },
                    paymentDate: { type: 'string', format: 'date-time' },
                    paymentMethod: { type: 'string' },
                    receiptNumber: { type: 'string' },
                },
                required: ['paymentScheduleId', 'amount', 'paymentDate', 'paymentMethod', 'receiptNumber'],
            },
        },
    }, nextPaymentInvoiceController.handlePaymentCompleted.bind(nextPaymentInvoiceController));

    /**
     * ดึงสถิติ Invoice สำหรับ Dashboard
     */
    fastify.get('/dashboard/invoice-stats', {
        preHandler: [authorize('MANAGER', 'ADMIN')],
        schema: {
            tags: ['Dashboard'],
            summary: 'Get invoice statistics for dashboard',
            querystring: {
                type: 'object',
                properties: {
                    period: { 
                        type: 'string', 
                        enum: ['today', 'week', 'month'],
                        default: 'month',
                    },
                },
            },
        },
    }, nextPaymentInvoiceController.getInvoiceStats.bind(nextPaymentInvoiceController));
}
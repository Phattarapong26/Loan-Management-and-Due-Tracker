import { FastifyInstance } from 'fastify';
import { principalCalculatorController } from './controllers/principal-calculator.controller';
import { authenticate, authorize } from '@middlewares/security/auth.middleware';

export async function principalCalculatorRoutes(fastify: FastifyInstance) {
    // Apply authentication to all routes
    fastify.addHook('preHandler', authenticate);

    /**
     * คำนวณเงินต้นปัจจุบันของสินเชื่อ
     */
    fastify.get('/loans/:loanId/principal-calculation', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            tags: ['Principal Calculator'],
            summary: 'Calculate current principal for a loan',
            params: {
                type: 'object',
                properties: {
                    loanId: { type: 'string', format: 'uuid' },
                },
                required: ['loanId'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                loanId: { type: 'string' },
                                currentOutstandingBalance: { type: 'number' },
                                totalPrincipalPaid: { type: 'number' },
                                totalInterestPaid: { type: 'number' },
                                totalPenaltiesPaid: { type: 'number' },
                                totalAmountPaid: { type: 'number' },
                                remainingPrincipal: { type: 'number' },
                                nextPaymentSchedule: {
                                    type: 'object',
                                    nullable: true,
                                    properties: {
                                        id: { type: 'string' },
                                        paymentNumber: { type: 'number' },
                                        paymentDate: { type: 'string', format: 'date-time' },
                                        principalAmount: { type: 'number' },
                                        interestAmount: { type: 'number' },
                                        totalPayment: { type: 'number' },
                                        status: { type: 'string' },
                                    },
                                },
                                paymentProgress: {
                                    type: 'object',
                                    properties: {
                                        completedInstallments: { type: 'number' },
                                        totalInstallments: { type: 'number' },
                                        progressPercentage: { type: 'number' },
                                    },
                                },
                                earlyPaymentBenefit: {
                                    type: 'object',
                                    nullable: true,
                                    properties: {
                                        potentialInterestSaved: { type: 'number' },
                                        daysEarly: { type: 'number' },
                                    },
                                },
                            },
                        },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, principalCalculatorController.calculateCurrentPrincipal.bind(principalCalculatorController));

    /**
     * จำลองผลกระทบของการชำระเงิน
     */
    fastify.post('/loans/:loanId/simulate-payment', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
        schema: {
            tags: ['Principal Calculator'],
            summary: 'Simulate payment impact on principal',
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
                    paymentAmount: { type: 'number', minimum: 0.01 },
                    paymentDate: { type: 'string', format: 'date-time' },
                },
                required: ['paymentAmount'],
            },
        },
    }, principalCalculatorController.simulatePaymentImpact.bind(principalCalculatorController));

    /**
     * คำนวณเงินต้นสำหรับหลายสินเชื่อพร้อมกัน
     */
    fastify.post('/loans/bulk-principal-calculation', {
        preHandler: [authorize('MANAGER', 'ADMIN')],
        schema: {
            tags: ['Principal Calculator'],
            summary: 'Calculate principal for multiple loans',
            body: {
                type: 'object',
                properties: {
                    loanIds: {
                        type: 'array',
                        items: { type: 'string', format: 'uuid' },
                        minItems: 1,
                        maxItems: 50,
                    },
                },
                required: ['loanIds'],
            },
        },
    }, principalCalculatorController.calculateMultiplePrincipals.bind(principalCalculatorController));

    /**
     * สรุปสถิติเงินต้นรวม
     */
    fastify.get('/principal-summary', {
        preHandler: [authorize('MANAGER', 'ADMIN')],
        schema: {
            tags: ['Principal Calculator'],
            summary: 'Get principal summary statistics',
            querystring: {
                type: 'object',
                properties: {
                    branchId: { type: 'string', format: 'uuid' },
                },
            },
        },
    }, principalCalculatorController.getPrincipalSummary.bind(principalCalculatorController));

    /**
     * ดึงข้อมูลเงินต้นแบบ real-time สำหรับ dashboard
     */
    fastify.get('/dashboard/principal-overview', {
        preHandler: [authorize('OFFICER', 'MANAGER', 'ADMIN')],
    }, principalCalculatorController.getPrincipalOverview.bind(principalCalculatorController));
}
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrincipalCalculatorService } from '@loans/calculators/principal-calculator.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { logger } from '@utils/common/logger.util';

export class PrincipalCalculatorController {
    private principalCalculatorService: PrincipalCalculatorService;

    constructor() {
        this.principalCalculatorService = new PrincipalCalculatorService();
    }

    /**
     * คำนวณเงินต้นปัจจุบันของสินเชื่อ
     * GET /api/loans/:loanId/principal-calculation
     */
    async calculateCurrentPrincipal(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };

            logger.info({ loanId }, 'Calculating current principal');

            const result = await this.principalCalculatorService.calculateCurrentPrincipal(loanId);

            return ResponseUtil.success(reply, result);
        } catch (error) {
            logger.error({ error }, 'Error calculating current principal');
            return ResponseUtil.error(reply, 'ไม่สามารถคำนวณเงินต้นปัจจุบันได้ กรุณาลองใหม่อีกครั้ง', 500, 'CALCULATION_ERROR');
        }
    }

    /**
     * จำลองผลกระทบของการชำระเงิน
     * POST /api/loans/:loanId/simulate-payment
     */
    async simulatePaymentImpact(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId } = request.params as { loanId: string };
            const { paymentAmount, paymentDate } = request.body as {
                paymentAmount: number;
                paymentDate?: string;
            };

            if (!paymentAmount || paymentAmount <= 0) {
                return ResponseUtil.badRequest(reply, 'Payment amount is required and must be greater than 0');
            }

            logger.info({ loanId, paymentAmount }, 'Simulating payment impact');

            const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
            const result = await this.principalCalculatorService.simulatePaymentImpact(
                loanId,
                paymentAmount,
                paymentDateObj
            );

            return ResponseUtil.success(reply, result);
        } catch (error) {
            logger.error({ error }, 'Error simulating payment impact');
            return ResponseUtil.error(reply, 'ไม่สามารถจำลองผลกระทบการชำระเงินได้ กรุณาลองใหม่อีกครั้ง', 500, 'SIMULATION_ERROR');
        }
    }

    /**
     * คำนวณเงินต้นสำหรับหลายสินเชื่อพร้อมกัน
     * POST /api/loans/bulk-principal-calculation
     */
    async calculateMultiplePrincipals(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanIds } = request.body as { loanIds: string[] };

            if (!loanIds || !Array.isArray(loanIds) || loanIds.length === 0) {
                return ResponseUtil.badRequest(reply, 'Loan IDs array is required');
            }

            if (loanIds.length > 50) {
                return ResponseUtil.badRequest(reply, 'Maximum 50 loans can be calculated at once');
            }

            logger.info({ loanCount: loanIds.length }, 'Calculating multiple principals');

            const results = await this.principalCalculatorService.calculateMultiplePrincipals(loanIds);

            return ResponseUtil.success(reply, results);
        } catch (error) {
            logger.error({ error }, 'Error calculating multiple principals');
            return ResponseUtil.error(reply, 'ไม่สามารถคำนวณเงินต้นหลายรายการพร้อมกันได้ กรุณาลองใหม่อีกครั้ง', 500, 'BULK_CALCULATION_ERROR');
        }
    }

    /**
     * สรุปสถิติเงินต้นรวม
     * GET /api/principal-summary
     */
    async getPrincipalSummary(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { branchId } = request.query as { branchId?: string };

            logger.info({ branchId }, 'Getting principal summary');

            const result = await this.principalCalculatorService.getPrincipalSummary(branchId);

            return ResponseUtil.success(reply, result);
        } catch (error) {
            logger.error({ error }, 'Error getting principal summary');
            return ResponseUtil.error(reply, 'ไม่สามารถดึงข้อมูลสรุปเงินต้นได้ กรุณาลองใหม่อีกครั้ง', 500, 'SUMMARY_ERROR');
        }
    }

    /**
     * ดึงข้อมูลเงินต้นแบบ real-time สำหรับ dashboard
     * GET /api/dashboard/principal-overview
     */
    async getPrincipalOverview(request: FastifyRequest, reply: FastifyReply) {
        try {
            const user = request.user;
            const branchId = user?.role === 'ADMIN' ? undefined : user?.branchId;

            logger.info({ branchId, userId: user?.userId }, 'Getting principal overview for dashboard');

            const summary = await this.principalCalculatorService.getPrincipalSummary(branchId);

            // เพิ่มข้อมูลเพิ่มเติมสำหรับ dashboard
            const overview = {
                ...summary,
                principalUtilizationRate: summary.totalOriginalPrincipal > 0 
                    ? (summary.totalPrincipalPaid / summary.totalOriginalPrincipal) * 100 
                    : 0,
                averageOutstandingPerLoan: summary.activeLoansCount > 0 
                    ? summary.totalOutstandingBalance / summary.activeLoansCount 
                    : 0,
                collectionEfficiency: summary.totalOriginalPrincipal > 0 
                    ? (summary.totalPrincipalPaid / summary.totalOriginalPrincipal) * 100 
                    : 0,
            };

            return ResponseUtil.success(reply, overview);
        } catch (error) {
            logger.error({ error }, 'Error getting principal overview');
            return ResponseUtil.error(reply, 'ไม่สามารถดึงข้อมูลภาพรวมเงินต้นได้ กรุณาลองใหม่อีกครั้ง', 500, 'OVERVIEW_ERROR');
        }
    }
}

export const principalCalculatorController = new PrincipalCalculatorController();
import { FastifyRequest, FastifyReply } from 'fastify';
import { DynamicPenaltyService } from '../services/dynamic-penalty.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { prisma } from '@config/database.config';

/**
 * Penalty Controller
 * Handles penalty calculations and previews
 */
export class PenaltyController {
    private penaltyService: DynamicPenaltyService;

    constructor() {
        this.penaltyService = new DynamicPenaltyService();
    }

    /**
     * Get penalty preview for a loan
     * GET /api/loans/:loanId/penalty-preview?overdueDays=X
     */
    getPenaltyPreview = async (
        request: FastifyRequest<{
            Params: { loanId: string };
            Querystring: { overdueDays?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { loanId } = request.params;
            const overdueDays = parseInt(request.query.overdueDays || '0');

            // Get loan details
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                select: {
                    id: true,
                    outstandingBalance: true,
                    customer: {
                        select: {
                            businessName: true,
                        },
                    },
                },
            });

            if (!loan) {
                return ResponseUtil.error(reply, 'ไม่พบสินเชื่อที่ต้องการ', 404, 'NOT_FOUND');
            }

            const outstandingBalance = Number(loan.outstandingBalance || 0);

            // Calculate penalty
            const penaltyResult = await this.penaltyService.calculatePenaltyForLoan(
                loanId,
                outstandingBalance,
                overdueDays
            );

            return ResponseUtil.success(reply, {
                loanId,
                customerName: loan.customer.businessName,
                outstandingBalance,
                overdueDays,
                penaltyAmount: penaltyResult.penaltyAmount,
                penaltyDetails: penaltyResult.penaltyDetails,
                calculation: penaltyResult.calculation,
                breakdown: {
                    dailyRate: `${penaltyResult.penaltyDetails.penaltyRate}% per day`,
                    annualRate: `${penaltyResult.penaltyDetails.maxAnnualRate}% per year (capped)`,
                    daysApplied: overdueDays,
                    baseCalculation: `${outstandingBalance.toLocaleString()} × ${penaltyResult.penaltyDetails.penaltyRate}% × ${overdueDays} days`,
                    basePenalty: penaltyResult.calculation.baseAmount,
                    cappedPenalty: penaltyResult.calculation.cappedAmount,
                    collectionFee: penaltyResult.calculation.collectionFee,
                    totalPenalty: penaltyResult.penaltyAmount,
                },
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถคำนวณค่าปรับได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
        }
    };

    /**
     * Get penalty rate for a loan
     * GET /api/loans/:loanId/penalty-rate?overdueDays=X
     */
    getPenaltyRate = async (
        request: FastifyRequest<{
            Params: { loanId: string };
            Querystring: { overdueDays?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { loanId } = request.params;
            const overdueDays = parseInt(request.query.overdueDays || '0');

            const penaltyRate = await this.penaltyService.getPenaltyRateForLoan(loanId, overdueDays);

            return ResponseUtil.success(reply, penaltyRate);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถโหลดอัตราค่าปรับได้', 500, 'LOAD_ERROR');
        }
    };

    /**
     * Get penalty rules for a loan product
     * GET /api/loan-products/:productId/penalty-rules
     */
    getPenaltyRules = async (
        request: FastifyRequest<{
            Params: { productId: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { productId } = request.params;
            const rules = await this.penaltyService.getPenaltyRulesForProduct(productId);
            return ResponseUtil.success(reply, { rules, total: rules.length });
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถโหลดกฎการคำนวณค่าปรับได้', 500, 'LOAD_ERROR');
        }
    };
}

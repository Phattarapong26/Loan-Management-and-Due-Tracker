import { FastifyRequest, FastifyReply } from 'fastify';
import { interestRateService } from '@loans/calculators/interest-rate.service';
import { ResponseUtil } from '@utils/formatting/response.util';

export class InterestRateController {
  /**
   * Get current interest rates
   */
  getCurrentRates = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rates = await interestRateService.getAllRates();
      return ResponseUtil.success(reply, rates);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message, 500);
    }
  };

  /**
   * Update MLR rate (Admin only)
   */
  updateMLR = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rate } = request.body as { rate: number };
      const userId = (request as any).user?.userId; // Fix: use userId instead of id

      console.log('[Update MLR] Request:', { rate, userId, body: request.body });

      if (!userId) {
        console.log('[Update MLR] No userId found');
        return ResponseUtil.unauthorized(reply);
      }

      if (typeof rate !== 'number' || isNaN(rate)) {
        console.log('[Update MLR] Invalid rate:', { rate, type: typeof rate });
        return ResponseUtil.error(reply, 'Invalid rate value', 400);
      }

      await interestRateService.updateMLR(rate, userId);
      
      return ResponseUtil.success(reply, {
        message: 'MLR updated successfully and notifications sent',
        rate,
      });
    } catch (error: any) {
      console.error('[Update MLR] Error:', error);
      return ResponseUtil.error(reply, error.message, 400);
    }
  };

  /**
   * Update MRR rate (Admin only)
   */
  updateMRR = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rate } = request.body as { rate: number };
      const userId = (request as any).user?.userId; // Fix: use userId instead of id

      console.log('[Update MRR] Request:', { rate, userId, body: request.body });

      if (!userId) {
        console.log('[Update MRR] No userId found');
        return ResponseUtil.unauthorized(reply);
      }

      if (typeof rate !== 'number' || isNaN(rate)) {
        console.log('[Update MRR] Invalid rate:', { rate, type: typeof rate });
        return ResponseUtil.error(reply, 'Invalid rate value', 400);
      }

      await interestRateService.updateMRR(rate, userId);
      
      return ResponseUtil.success(reply, {
        message: 'MRR updated successfully and notifications sent',
        rate,
      });
    } catch (error: any) {
      console.error('[Update MRR] Error:', error);
      return ResponseUtil.error(reply, error.message, 400);
    }
  };

  /**
   * Calculate rate from formula (for preview)
   */
  calculateFromFormula = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { formula } = request.body as { formula: string };
      
      if (!formula) {
        return ResponseUtil.error(reply, 'Formula is required', 400);
      }

      const rate = await interestRateService.calculateRateFromFormula(formula);
      
      return ResponseUtil.success(reply, {
        formula,
        calculatedRate: rate,
      });
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message, 400);
    }
  };

  /**
   * Get rate change history
   */
  getRateHistory = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit } = request.query as { limit?: string };
      const history = await interestRateService.getRateHistory(
        limit ? parseInt(limit) : 10
      );
      
      return ResponseUtil.success(reply, history);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message, 500);
    }
  };
}

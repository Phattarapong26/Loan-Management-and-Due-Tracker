import { FastifyRequest, FastifyReply } from 'fastify';
import { ProductBudgetService } from '../services/product-budget.service';
import { OptimisticLockError, InsufficientBudgetError } from '@/core/utils/optimistic-locking.util';
import { ResponseUtil } from '@utils/formatting/response.util';

/**
 * Product Budget Controller
 * 
 * NOW USING SAFE SERVICES - Protected against race conditions
 */
export class ProductBudgetController {
  private service: ProductBudgetService;

  constructor() {
    this.service = new ProductBudgetService();
  }

  /**
   * Get all budgets for a product
   */
  getAllBudgetsByProduct = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as any;
      const budgets = await this.service.getAllBudgetsByProduct(productId);

      return ResponseUtil.success(reply, budgets);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch budgets', 500);
    }
  };

  /**
   * Get budget for specific period
   */
  getBudgetByPeriod = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as any;
      const { fiscalYear, quarter } = request.query as any;

      if (!fiscalYear) {
        return ResponseUtil.error(reply, 'Fiscal year is required', 400);
      }

      const budget = await this.service.getBudgetByProduct(
        productId,
        parseInt(fiscalYear),
        quarter ? parseInt(quarter) : undefined
      );

      // Return null instead of 404 when budget doesn't exist
      // This is expected behavior - not all products have budgets yet
      return ResponseUtil.success(reply, budget || null);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch budget', 500);
    }
  };

  /**
   * Batch get budgets for multiple products (more efficient than N+1 queries)
   */
  getBudgetsBatch = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productIds, fiscalYear, quarter } = request.body as any;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return ResponseUtil.error(reply, 'Product IDs array is required', 400);
      }

      if (!fiscalYear) {
        return ResponseUtil.error(reply, 'Fiscal year is required', 400);
      }

      const budgets = await this.service.getBudgetsBatch(
        productIds,
        parseInt(fiscalYear),
        quarter ? parseInt(quarter) : undefined
      );

      // Return object with productId as key for easy lookup
      return ResponseUtil.success(reply, budgets);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch budgets', 500);
    }
  };

  /**
   * Create new budget (Race-condition safe)
   */
  createBudget = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseUtil.unauthorized(reply, 'User not authenticated');
      }

      const {
        productId,
        fiscalYear,
        quarter,
        totalBudgetAmount,
        warningThreshold,
        criticalThreshold,
        budgetOwner,
        notes,
      } = request.body as any;

      // Debug logging
      console.log('[Create Budget] Request body:', JSON.stringify(request.body, null, 2));
      console.log('[Create Budget] Parsed values:', {
        productId,
        fiscalYear,
        quarter,
        totalBudgetAmount,
        warningThreshold,
        criticalThreshold,
      });

      if (!productId || !fiscalYear || !totalBudgetAmount) {
        console.error('[Create Budget] Missing required fields:', {
          hasProductId: !!productId,
          hasFiscalYear: !!fiscalYear,
          hasTotalBudgetAmount: !!totalBudgetAmount,
        });
        return ResponseUtil.error(reply, 'Missing required fields', 400);
      }

      const budget = await this.service.createBudget({
        productId,
        fiscalYear: parseInt(fiscalYear),
        quarter: quarter ? parseInt(quarter) : undefined,
        totalBudgetAmount: parseFloat(totalBudgetAmount),
        warningThreshold: warningThreshold ? parseFloat(warningThreshold) : undefined,
        criticalThreshold: criticalThreshold ? parseFloat(criticalThreshold) : undefined,
        budgetOwner,
        notes,
        createdBy: userId,
      });

      console.log('[Create Budget] Success:', budget.id);
      return ResponseUtil.success(reply, budget, 201);
    } catch (error: any) {
      console.error('[Create Budget] Error:', error);
      
      // Handle optimistic lock conflicts
      if (error instanceof OptimisticLockError) {
        return ResponseUtil.error(
          reply,
          'Concurrent modification detected. Please try again.',
          409
        );
      }
      
      return ResponseUtil.error(reply, error.message || 'Failed to create budget', 400);
    }
  };

  /**
   * Add more budget to existing budget (Race-condition safe)
   */
  addBudget = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseUtil.unauthorized(reply, 'User not authenticated');
      }

      const { budgetId } = request.params as any;
      const { additionalAmount } = request.body as any;

      if (!additionalAmount || additionalAmount <= 0) {
        return ResponseUtil.error(reply, 'Invalid additional amount', 400);
      }

      const budget = await this.service.addBudget(
        budgetId,
        parseFloat(additionalAmount),
        userId
      );

      return ResponseUtil.success(reply, budget);
    } catch (error: any) {
      // Handle optimistic lock conflicts
      if (error instanceof OptimisticLockError) {
        return ResponseUtil.error(
          reply,
          'Concurrent modification detected. Please try again.',
          409
        );
      }
      
      return ResponseUtil.error(reply, error.message || 'Failed to add budget', 400);
    }
  };

  /**
   * Check budget availability (Race-condition safe)
   */
  checkAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as any;
      const { loanAmount, fiscalYear, quarter } = request.query as any;

      if (!loanAmount) {
        return ResponseUtil.error(reply, 'Loan amount is required', 400);
      }

      const result = await this.service.checkBudgetAvailability(
        productId,
        parseFloat(loanAmount),
        fiscalYear ? parseInt(fiscalYear) : undefined,
        quarter ? parseInt(quarter) : undefined
      );

      return ResponseUtil.success(reply, result);
    } catch (error: any) {
      // Handle insufficient budget
      if (error instanceof InsufficientBudgetError) {
        return ResponseUtil.error(
          reply,
          `Insufficient budget. Requested: ${error.requestedAmount}, Available: ${error.availableAmount}`,
          400
        );
      }
      
      return ResponseUtil.error(reply, error.message || 'Failed to check availability', 500);
    }
  };

  /**
   * Get budget statistics
   */
  getBudgetStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.query as any;

      const stats = await this.service.getBudgetStats(productId);

      return ResponseUtil.success(reply, stats);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch statistics', 500);
    }
  };

  /**
   * Get budget consumption history
   */
  getConsumptionHistory = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { budgetId } = request.params as any;

      const history = await this.service.getBudgetConsumptionHistory(budgetId);

      return ResponseUtil.success(reply, history);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch history', 500);
    }
  };
}

import { Prisma } from '@prisma/client';
import {
  commitBudgetWithRetry,
} from './product-budget-safe.service';
import { budgetCache } from '@/core/cache/cache.service';
import { ProductBudgetRepository } from '../repositories/product-budget.repository';
import { LoanProductRepository } from '@loans/repositories/loan-product.repository';

export class ProductBudgetService {
  private budgetRepo: ProductBudgetRepository;
  private loanProductRepo: LoanProductRepository;

  constructor() {
    this.budgetRepo = new ProductBudgetRepository();
    this.loanProductRepo = new LoanProductRepository();
  }

  /**
   * Get budget for a specific product and fiscal year
   */
  async getBudgetByProduct(
    productId: string,
    fiscalYear: number,
    quarter?: number,
    tx?: Prisma.TransactionClient
  ) {
    return this.budgetRepo.findByProduct(productId, fiscalYear, quarter, tx);
  }

  /**
   * Batch get budgets for multiple products (efficient single query)
   * OPTIMIZED: Removed unnecessary includes, select only required fields
   * CACHED: Uses Redis cache with 5-minute TTL
   */
  async getBudgetsBatch(
    productIds: string[],
    fiscalYear: number,
    quarter?: number
  ): Promise<Record<string, any>> {
    // Generate cache key
    const cacheKey = `batch:${productIds.sort().join(',')}:${fiscalYear}:${quarter || 'annual'}`;
    
    // Try to get from cache first
    return budgetCache.getOrSet(cacheKey, async () => {
      const budgets = await this.budgetRepo.findManyByProducts(productIds, fiscalYear, quarter);

      // Convert array to object with productId as key for easy lookup
      const budgetMap: Record<string, any> = {};
      for (const budget of budgets) {
        budgetMap[budget.product_id] = budget;
      }

      // Fill in null for products without budgets
      for (const productId of productIds) {
        if (!budgetMap[productId]) {
          budgetMap[productId] = null;
        }
      }

      return budgetMap;
    }, 300); // 5 minutes TTL
  }

  /**
   * Get all budgets for a product
   */
  async getAllBudgetsByProduct(productId: string) {
    return this.budgetRepo.findAllByProduct(productId);
  }

  /**
   * Create new budget for a product
   * CACHE: Invalidates budget cache after creation
   */
  async createBudget(data: {
    productId: string;
    fiscalYear: number;
    quarter?: number;
    totalBudgetAmount: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    budgetOwner?: string;
    notes?: string;
    createdBy: string;
  }) {
    // Get product details
    const product = await this.loanProductRepo.findById(data.productId);

    if (!product) {
      throw new Error('Loan product not found');
    }

    // Check if budget already exists
    const existing = await this.budgetRepo.findExisting(data.productId, data.fiscalYear, data.quarter);

    if (existing) {
      throw new Error('Budget already exists for this period');
    }

    const budget = await this.budgetRepo.create({
      product_id: data.productId,
      product_code: product.productCode,
      product_name: product.productName,
      fiscal_year: data.fiscalYear,
      quarter: data.quarter,
      total_budget_amount: data.totalBudgetAmount,
      available_amount: data.totalBudgetAmount,
      committed_amount: 0,
      disbursed_amount: 0,
      pending_amount: 0,
      utilization_rate: 0,
      warning_threshold: data.warningThreshold || 80,
      critical_threshold: data.criticalThreshold || 95,
      budget_status: 'ACTIVE',
      budget_owner: data.budgetOwner,
      notes: data.notes,
      created_by: data.createdBy,
    });

    // Invalidate cache
    await budgetCache.invalidate(`*${data.productId}*`);

    return budget;
  }

  /**
   * Update budget amount (add more budget)
   */
  async addBudget(
    budgetId: string,
    additionalAmount: number,
    _updatedBy: string
  ) {
    const budget = await this.budgetRepo.findById(budgetId);

    if (!budget) {
      throw new Error('Budget not found');
    }

    const newTotalBudget = Number(budget.total_budget_amount) + additionalAmount;
    const newAvailableAmount = Number(budget.available_amount || 0) + additionalAmount;
    // Calculate utilization rate including both disbursed and committed amounts
    const totalUsed = Number(budget.disbursed_amount || 0) + Number(budget.committed_amount || 0);
    const utilizationRate = parseFloat(((totalUsed / newTotalBudget) * 100).toFixed(2));

    return this.budgetRepo.update(budgetId, {
      total_budget_amount: newTotalBudget,
      available_amount: newAvailableAmount,
      utilization_rate: utilizationRate,
      updated_at: new Date(),
    });
  }

  /**
   * Check if budget is available for a loan amount
   */
  async checkBudgetAvailability(
    productId: string,
    loanAmount: number,
    fiscalYear?: number,
    quarter?: number,
    tx?: Prisma.TransactionClient
  ): Promise<{
    available: boolean;
    budget: any;
    message: string;
  }> {
    // Use current fiscal year if not provided
    const currentYear = fiscalYear || new Date().getFullYear();
    const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);

    // Try to find budget for specific quarter first
    let budget = await this.getBudgetByProduct(productId, currentYear, currentQuarter, tx);

    // If no quarterly budget, try annual budget
    if (!budget) {
      budget = await this.getBudgetByProduct(productId, currentYear, undefined, tx);
    }

    if (!budget) {
      return {
        available: false,
        budget: null,
        message: `ไม่พบงบประมาณสำหรับผลิตภัณฑ์นี้ในปีงบประมาณ ${currentYear}`,
      };
    }

    if (budget.budget_status !== 'ACTIVE') {
      return {
        available: false,
        budget,
        message: 'งบประมาณนี้ไม่ได้เปิดใช้งาน',
      };
    }

    const availableAmount = Number(budget.available_amount || 0);

    if (availableAmount < loanAmount) {
      return {
        available: false,
        budget,
        message: `งบประมาณไม่เพียงพอ (เหลือ ${availableAmount.toLocaleString()} บาท ต้องการ ${loanAmount.toLocaleString()} บาท)`,
      };
    }

    // Check if adding this loan would exceed warning threshold
    const newUtilization = ((Number(budget.disbursed_amount || 0) + loanAmount) / Number(budget.total_budget_amount)) * 100;
    const warningThreshold = Number(budget.warning_threshold || 80);
    const criticalThreshold = Number(budget.critical_threshold || 95);

    let message = 'งบประมาณเพียงพอ';
    if (newUtilization >= criticalThreshold) {
      message = `⚠️ งบประมาณใกล้หมด (จะใช้ไป ${newUtilization.toFixed(2)}%)`;
    } else if (newUtilization >= warningThreshold) {
      message = `⚡ งบประมาณเหลือน้อย (จะใช้ไป ${newUtilization.toFixed(2)}%)`;
    }

    return {
      available: true,
      budget,
      message,
    };
  }

  /**
   * Reserve budget when loan is approved (but not yet disbursed)
   * NOW USING SAFE SERVICE with optimistic locking
   */
  async reserveBudget(
    productId: string,
    loanId: string,
    loanAmount: number,
    branchId: string,
    fiscalYear?: number,
    quarter?: number,
    tx?: Prisma.TransactionClient,
    processedBy?: string
  ) {
    console.log('[Budget Service] reserveBudget called (using safe service):', {
      productId,
      loanId,
      loanAmount,
      branchId,
      fiscalYear,
      quarter,
    });

    const currentYear = fiscalYear || new Date().getFullYear();
    const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);

    // Find budget
    let budget = await this.getBudgetByProduct(productId, currentYear, currentQuarter, tx);
    if (!budget) {
      budget = await this.getBudgetByProduct(productId, currentYear, undefined, tx);
    }

    if (!budget) {
      console.error('[Budget Service] Budget not found for product:', productId);
      throw new Error('Budget not found');
    }

    // Use safe service with optimistic locking and retry
    const result = await commitBudgetWithRetry({
      productBudgetId: budget.id,
      loanId,
      branchId,
      requestedAmount: loanAmount,
      approvedAmount: loanAmount,
      processedBy,
    });

    console.log('[Budget Service] Budget committed successfully:', {
      previousAvailable: result.previousAvailable,
      newAvailable: result.newAvailable,
    });

    return result.budget;
  }

  /**
   * Convert reserved budget to disbursed when loan is actually disbursed
   */
  async disburseBudget(
    productId: string,
    loanId: string,
    disbursedAmount: number,
    _branchId?: string,
    fiscalYear?: number,
    quarter?: number
  ) {
    const currentYear = fiscalYear || new Date().getFullYear();
    const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);

    // Find budget
    let budget = await this.getBudgetByProduct(productId, currentYear, currentQuarter);
    if (!budget) {
      budget = await this.getBudgetByProduct(productId, currentYear);
    }

    if (!budget) {
      throw new Error('Budget not found');
    }

    // Update budget amounts
    const newCommittedAmount = Number(budget.committed_amount || 0) - disbursedAmount;
    const newDisbursedAmount = Number(budget.disbursed_amount || 0) + disbursedAmount;
    // Calculate utilization rate including both disbursed and remaining committed amounts
    const totalUsed = newDisbursedAmount + Math.max(0, newCommittedAmount);
    const utilizationRate = parseFloat(((totalUsed / Number(budget.total_budget_amount)) * 100).toFixed(2));

    await this.budgetRepo.update(budget.id, {
      committed_amount: Math.max(0, newCommittedAmount),
      disbursed_amount: newDisbursedAmount,
      utilization_rate: utilizationRate,
      updated_at: new Date(),
    });

    await this.budgetRepo.updateConsumptionToDisbursed(budget.id, loanId, disbursedAmount);

    return budget;
  }

  /**
   * Release budget when loan is rejected or cancelled
   */
  async releaseBudget(
    productId: string,
    loanId: string,
    amount: number,
    _branchId?: string,
    fiscalYear?: number,
    quarter?: number
  ) {
    const currentYear = fiscalYear || new Date().getFullYear();
    const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);

    // Find budget
    let budget = await this.getBudgetByProduct(productId, currentYear, currentQuarter);
    if (!budget) {
      budget = await this.getBudgetByProduct(productId, currentYear);
    }

    if (!budget) {
      throw new Error('Budget not found');
    }

    // Update budget amounts
    const newCommittedAmount = Number(budget.committed_amount || 0) - amount;
    const newAvailableAmount = Number(budget.available_amount || 0) + amount;
    // Calculate utilization rate including both disbursed and remaining committed amounts
    const totalUsed = Number(budget.disbursed_amount || 0) + Math.max(0, newCommittedAmount);
    const utilizationRate = parseFloat(((totalUsed / Number(budget.total_budget_amount)) * 100).toFixed(2));

    await this.budgetRepo.update(budget.id, {
      committed_amount: Math.max(0, newCommittedAmount),
      available_amount: newAvailableAmount,
      utilization_rate: utilizationRate,
      updated_at: new Date(),
    });

    await this.budgetRepo.updateConsumptionToReleased(budget.id, loanId, amount);

    return budget;
  }

  /**
   * Get budget statistics
   */
  async getBudgetStats(productId?: string) {
    const budgets = await this.budgetRepo.findAll(productId);

    const stats = {
      totalBudgets: budgets.length,
      activeBudgets: budgets.filter(b => b.budget_status === 'ACTIVE').length,
      totalBudgetAmount: budgets.reduce((sum, b) => sum + Number(b.total_budget_amount), 0),
      totalDisbursed: budgets.reduce((sum, b) => sum + Number(b.disbursed_amount || 0), 0),
      totalCommitted: budgets.reduce((sum, b) => sum + Number(b.committed_amount || 0), 0),
      totalAvailable: budgets.reduce((sum, b) => sum + Number(b.available_amount || 0), 0),
      averageUtilization: budgets.length > 0
        ? budgets.reduce((sum, b) => sum + Number(b.utilization_rate || 0), 0) / budgets.length
        : 0,
      budgetsNearWarning: budgets.filter(b =>
        Number(b.utilization_rate || 0) >= Number(b.warning_threshold || 80) &&
        Number(b.utilization_rate || 0) < Number(b.critical_threshold || 95)
      ).length,
      budgetsNearCritical: budgets.filter(b =>
        Number(b.utilization_rate || 0) >= Number(b.critical_threshold || 95)
      ).length,
    };

    return stats;
  }

  /**
   * Get budget consumption history
   */
  async getBudgetConsumptionHistory(budgetId: string) {
    return this.budgetRepo.findConsumptionHistory(budgetId);
  }
}

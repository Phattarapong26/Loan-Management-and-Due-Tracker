import { prisma } from '@config/database.config';
import { Prisma } from '@prisma/client';
import {
  commitBudgetWithRetry,
} from './product-budget-safe.service';
import { budgetCache } from '@/core/cache/cache.service';

export class ProductBudgetService {
  /**
   * Get budget for a specific product and fiscal year
   */
  async getBudgetByProduct(
    productId: string,
    fiscalYear: number,
    quarter?: number,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    const where: any = {
      product_id: productId,
      fiscal_year: fiscalYear,
    };

    if (quarter) {
      where.quarter = quarter;
    }

    return db.product_budgets.findFirst({
      where,
      include: {
        loan_products: true,
        users_product_budgets_budget_ownerTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
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
      const where: any = {
        product_id: { in: productIds },
        fiscal_year: fiscalYear,
      };

      if (quarter) {
        where.quarter = quarter;
      }

      // PERFORMANCE: Select only required fields, no includes
      const budgets = await prisma.product_budgets.findMany({
        where,
        select: {
          id: true,
          product_id: true,
          product_code: true,
          product_name: true,
          fiscal_year: true,
          quarter: true,
          total_budget_amount: true,
          available_amount: true,
          committed_amount: true,
          disbursed_amount: true,
          pending_amount: true,
          utilization_rate: true,
          warning_threshold: true,
          critical_threshold: true,
          budget_status: true,
          created_at: true,
          updated_at: true,
        },
      });

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
    return prisma.product_budgets.findMany({
      where: {
        product_id: productId,
      },
      include: {
        loan_products: true,
        users_product_budgets_budget_ownerTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { fiscal_year: 'desc' },
        { quarter: 'asc' },
      ],
    });
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
    const product = await prisma.loanProduct.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Loan product not found');
    }

    // Check if budget already exists
    const existing = await prisma.product_budgets.findFirst({
      where: {
        product_id: data.productId,
        fiscal_year: data.fiscalYear,
        quarter: data.quarter || null,
      },
    });

    if (existing) {
      throw new Error('Budget already exists for this period');
    }

    const budget = await prisma.product_budgets.create({
      data: {
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
      },
      include: {
        loan_products: true,
      },
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
    const budget = await prisma.product_budgets.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    const newTotalBudget = Number(budget.total_budget_amount) + additionalAmount;
    const newAvailableAmount = Number(budget.available_amount || 0) + additionalAmount;
    // Calculate utilization rate including both disbursed and committed amounts
    const totalUsed = Number(budget.disbursed_amount || 0) + Number(budget.committed_amount || 0);
    const utilizationRate = ((totalUsed / newTotalBudget) * 100).toFixed(2);

    return prisma.product_budgets.update({
      where: { id: budgetId },
      data: {
        total_budget_amount: newTotalBudget,
        available_amount: newAvailableAmount,
        utilization_rate: parseFloat(utilizationRate),
        updated_at: new Date(),
      },
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
    _branchId?: string, // Although not strictly needed for update, interface might need it if we create new records later
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
    const utilizationRate = ((totalUsed / Number(budget.total_budget_amount)) * 100).toFixed(2);

    await prisma.product_budgets.update({
      where: { id: budget.id },
      data: {
        committed_amount: Math.max(0, newCommittedAmount),
        disbursed_amount: newDisbursedAmount,
        utilization_rate: parseFloat(utilizationRate),
        updated_at: new Date(),
      },
    });

    // Update budget consumption record
    await prisma.budget_consumption.updateMany({
      where: {
        product_budget_id: budget.id, // Fixed field name
        loan_id: loanId,
        consumption_type: 'COMMITMENT',
        status: 'COMMITTED',
      },
      data: {
        consumption_type: 'DISBURSEMENT',
        status: 'DISBURSED',
        updated_at: new Date(), // Fixed field name and type
        disbursed_amount: disbursedAmount, // Also record the disbursed amount
      },
    });

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
    const utilizationRate = ((totalUsed / Number(budget.total_budget_amount)) * 100).toFixed(2);

    await prisma.product_budgets.update({
      where: { id: budget.id },
      data: {
        committed_amount: Math.max(0, newCommittedAmount),
        available_amount: newAvailableAmount,
        utilization_rate: parseFloat(utilizationRate),
        updated_at: new Date(),
      },
    });

    // Update budget consumption record
    await prisma.budget_consumption.updateMany({
      where: {
        product_budget_id: budget.id, // Fixed field name
        loan_id: loanId,
        status: 'COMMITTED',
      },
      data: {
        status: 'RELEASED',
        released_at: new Date(),
        updated_at: new Date(), // Added updated_at
        released_amount: amount, // Record released amount
      },
    });

    return budget;
  }

  /**
   * Get budget statistics
   */
  async getBudgetStats(productId?: string) {
    const where: any = {};
    if (productId) {
      where.product_id = productId;
    }

    const budgets = await prisma.product_budgets.findMany({
      where,
      include: {
        loan_products: true,
      },
    });

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
    return prisma.budget_consumption.findMany({
      where: {
        product_budget_id: budgetId, // Fixed field name
      },
      include: {
        loans: {
          include: {
            customer: {
              select: {
                customerCode: true,
                businessName: true,
              },
            },
          },
        },
        branches: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        consumption_date: 'desc',
      },
    });
  }
}

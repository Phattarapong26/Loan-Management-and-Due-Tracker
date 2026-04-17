/**
 * SAFE Product Budget Service with Optimistic Locking
 * 
 * This service prevents budget overcommitment through:
 * 1. Optimistic Locking
 * 2. SELECT FOR UPDATE
 * 3. Database Constraints
 * 4. Atomic Operations
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  updateWithOptimisticLock,
  OptimisticLockError,
} from '../../../core/utils/optimistic-locking.util';

const prisma = new PrismaClient();

export interface CommitBudgetInput {
  productBudgetId: string;
  loanId: string;
  branchId: string;
  requestedAmount: number;
  approvedAmount: number;
  processedBy?: string;
}

export interface CommitBudgetResult {
  budgetConsumption: any;
  budget: any;
  previousAvailable: number;
  newAvailable: number;
}

export class InsufficientBudgetError extends Error {
  constructor(
    public readonly requested: number,
    public readonly available: number
  ) {
    super(
      `Insufficient budget. Requested: ${requested}, Available: ${available}`
    );
    this.name = 'InsufficientBudgetError';
  }
}

/**
 * Commit budget with optimistic locking (SAFE VERSION)
 * 
 * Prevents budget overcommitment by:
 * 1. Locking budget row with SELECT FOR UPDATE
 * 2. Checking available amount
 * 3. Using optimistic locking
 * 4. Atomic update
 */
export async function commitBudgetSafe(
  input: CommitBudgetInput
): Promise<CommitBudgetResult> {
  return await prisma.$transaction(
    async (tx) => {
      // 1. Lock budget row with SELECT FOR UPDATE
      const budgetRows = await tx.$queryRaw<any[]>`
        SELECT * FROM product_budgets 
        WHERE id = ${input.productBudgetId}
        FOR UPDATE
      `;

      if (!budgetRows || budgetRows.length === 0) {
        throw new Error(`Budget not found: ${input.productBudgetId}`);
      }

      const currentBudget = budgetRows[0];
      const availableAmount = parseFloat(currentBudget.available_amount || '0');
      const committedAmount = parseFloat(currentBudget.committed_amount || '0');

      // 2. Check if enough budget available
      if (input.approvedAmount > availableAmount) {
        throw new InsufficientBudgetError(input.approvedAmount, availableAmount);
      }

      // 3. Calculate new amounts
      const newAvailable = availableAmount - input.approvedAmount;
      const newCommitted = committedAmount + input.approvedAmount;

      // 4. Update budget with optimistic lock
      const updatedBudget = await updateWithOptimisticLock(
        tx.product_budgets,
        input.productBudgetId,
        currentBudget.version,
        {
          available_amount: newAvailable,
          committed_amount: newCommitted,
          utilization_rate: (newCommitted / parseFloat(currentBudget.total_budget_amount)) * 100,
        }
      );

      // 5. Create or update budget consumption record
      // First check if record exists to handle the unique constraint properly
      const existingConsumption = await tx.budget_consumption.findFirst({
        where: {
          loan_id: input.loanId,
          consumption_type: 'COMMITMENT'
        }
      });

      let budgetConsumption;
      if (existingConsumption) {
        // Update existing record
        budgetConsumption = await tx.budget_consumption.update({
          where: { id: existingConsumption.id },
          data: {
            product_budget_id: input.productBudgetId,
            branch_id: input.branchId,
            requested_amount: input.requestedAmount,
            approved_amount: input.approvedAmount,
            consumption_date: new Date(),
            status: 'COMMITTED',
            processed_by: input.processedBy,
          }
        });
      } else {
        // Create new record
        budgetConsumption = await tx.budget_consumption.create({
          data: {
            product_budget_id: input.productBudgetId,
            loan_id: input.loanId,
            branch_id: input.branchId,
            requested_amount: input.requestedAmount,
            approved_amount: input.approvedAmount,
            consumption_type: 'COMMITMENT',
            consumption_date: new Date(),
            status: 'COMMITTED',
            processed_by: input.processedBy,
          }
        });
      }

      return {
        budgetConsumption,
        budget: updatedBudget,
        previousAvailable: availableAmount,
        newAvailable,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

/**
 * Commit budget with automatic retry
 */
export async function commitBudgetWithRetry(
  input: CommitBudgetInput,
  maxRetries: number = 3
): Promise<CommitBudgetResult> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      return await commitBudgetSafe(input);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on insufficient budget
      if (error instanceof InsufficientBudgetError) {
        throw error;
      }

      // Retry on optimistic lock errors or serialization failures
      if (
        error instanceof OptimisticLockError ||
        (error as any).code === 'P2034' ||
        (error as any).message?.includes('could not serialize')
      ) {
        attempt++;

        if (attempt >= maxRetries) {
          throw new Error(
            `Budget commitment failed after ${maxRetries} attempts. ` +
            `This may be due to high concurrent load. Please try again.`
          );
        }

        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );

        continue;
      }

      // Don't retry on other errors
      throw error;
    }
  }

  throw lastError || new Error('Unexpected error in commitBudgetWithRetry');
}

/**
 * Release committed budget (e.g., when loan is rejected)
 */
export async function releaseBudgetSafe(
  budgetConsumptionId: string,
  releasedBy?: string
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // 1. Get budget consumption
      const consumption = await tx.budget_consumption.findUnique({
        where: { id: budgetConsumptionId },
      });

      if (!consumption) {
        throw new Error(`Budget consumption not found: ${budgetConsumptionId}`);
      }

      if (consumption.status === 'RELEASED') {
        return; // Already released
      }

      // 2. Lock budget row
      const budgetRows = await tx.$queryRaw<any[]>`
        SELECT * FROM product_budgets 
        WHERE id = ${consumption.product_budget_id}
        FOR UPDATE
      `;

      if (!budgetRows || budgetRows.length === 0) {
        throw new Error(`Budget not found: ${consumption.product_budget_id}`);
      }

      const currentBudget = budgetRows[0];
      const approvedAmount = parseFloat(consumption.approved_amount.toString());
      const availableAmount = parseFloat(currentBudget.available_amount || '0');
      const committedAmount = parseFloat(currentBudget.committed_amount || '0');

      // 3. Calculate new amounts
      const newAvailable = availableAmount + approvedAmount;
      const newCommitted = Math.max(0, committedAmount - approvedAmount);

      // 4. Update budget
      await updateWithOptimisticLock(
        tx.product_budgets,
        consumption.product_budget_id,
        currentBudget.version,
        {
          available_amount: newAvailable,
          committed_amount: newCommitted,
          utilization_rate: (newCommitted / parseFloat(currentBudget.total_budget_amount)) * 100,
        }
      );

      // 5. Update consumption record
      await tx.budget_consumption.update({
        where: { id: budgetConsumptionId },
        data: {
          status: 'RELEASED',
          released_amount: approvedAmount,
          released_at: new Date(),
          released_by: releasedBy,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

/**
 * Check budget availability before committing
 */
export async function checkBudgetAvailability(
  productBudgetId: string,
  requestedAmount: number
): Promise<{
  available: boolean;
  availableAmount: number;
  requestedAmount: number;
  utilizationRate: number;
}> {
  const budget = await prisma.product_budgets.findUnique({
    where: { id: productBudgetId },
  });

  if (!budget) {
    throw new Error(`Budget not found: ${productBudgetId}`);
  }

  const availableAmount = budget.available_amount?.toNumber() || 0;
  const totalBudget = budget.total_budget_amount.toNumber();
  const committedAmount = budget.committed_amount?.toNumber() || 0;

  return {
    available: availableAmount >= requestedAmount,
    availableAmount,
    requestedAmount,
    utilizationRate: (committedAmount / totalBudget) * 100,
  };
}

/**
 * Get budget status with lock (for display purposes)
 */
export async function getBudgetStatus(productBudgetId: string) {
  const budget = await prisma.product_budgets.findUnique({
    where: { id: productBudgetId },
    include: {
      budget_consumption: {
        where: {
          status: { in: ['COMMITTED', 'ACTIVE'] },
        },
      },
    },
  });

  if (!budget) {
    throw new Error(`Budget not found: ${productBudgetId}`);
  }

  const totalBudget = budget.total_budget_amount.toNumber();
  const committedAmount = budget.committed_amount?.toNumber() || 0;
  const disbursedAmount = budget.disbursed_amount?.toNumber() || 0;
  const availableAmount = budget.available_amount?.toNumber() || 0;
  const utilizationRate = (committedAmount / totalBudget) * 100;

  return {
    id: budget.id,
    productCode: budget.product_code,
    productName: budget.product_name,
    fiscalYear: budget.fiscal_year,
    quarter: budget.quarter,
    totalBudget,
    committedAmount,
    disbursedAmount,
    availableAmount,
    utilizationRate,
    status: budget.budget_status,
    warningThreshold: budget.warning_threshold?.toNumber() || 80,
    criticalThreshold: budget.critical_threshold?.toNumber() || 95,
    isWarning: utilizationRate >= (budget.warning_threshold?.toNumber() || 80),
    isCritical: utilizationRate >= (budget.critical_threshold?.toNumber() || 95),
    activeConsumptions: budget.budget_consumption.length,
  };
}

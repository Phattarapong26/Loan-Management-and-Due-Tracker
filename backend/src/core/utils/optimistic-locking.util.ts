/**
 * Optimistic Locking Utilities
 * 
 * Purpose: Provide helper functions for optimistic locking pattern
 * Usage: Prevent race conditions in concurrent updates
 * 
 * @example
 * ```typescript
 * const result = await updateWithOptimisticLock(
 *   prisma.loan,
 *   loanId,
 *   currentVersion,
 *   { outstandingBalance: newBalance }
 * );
 * ```
 */

import { PrismaClient } from '@prisma/client';
import { OPTIMISTIC_LOCKING } from '../config/constants';

export class OptimisticLockError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly expectedVersion: number
  ) {
    super(
      `Optimistic lock failed for ${entityType} ${entityId}. ` +
      `Expected version ${expectedVersion} but entity was modified by another transaction. ` +
      `Please retry the operation.`
    );
    this.name = 'OptimisticLockError';
  }
}

export class InsufficientBudgetError extends Error {
  constructor(
    public readonly requestedAmount: number,
    public readonly availableAmount: number
  ) {
    super(
      `Insufficient budget. Requested: ${requestedAmount}, Available: ${availableAmount}`
    );
    this.name = 'InsufficientBudgetError';
  }
}

interface VersionedEntity {
  id: string;
  version: number;
}

/**
 * Update entity with optimistic locking
 * 
 * @param model - Prisma model (e.g., prisma.loan)
 * @param id - Entity ID
 * @param currentVersion - Current version number
 * @param data - Data to update
 * @returns Updated entity
 * @throws OptimisticLockError if version mismatch
 */
export async function updateWithOptimisticLock<T extends VersionedEntity>(
  model: any,
  id: string,
  currentVersion: number,
  data: any
): Promise<T> {
  // Use updateMany to check version atomically
  const result = await model.updateMany({
    where: {
      id,
      version: currentVersion,
    },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    // Check if entity exists
    const entity = await model.findUnique({ where: { id } });
    
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }
    
    // Version mismatch - concurrent modification detected
    throw new OptimisticLockError(
      model.name || 'Unknown',
      id,
      currentVersion
    );
  }

  // Fetch and return updated entity
  return await model.findUnique({ where: { id } });
}

/**
 * Update entity with retry on optimistic lock failure
 * 
 * @param model - Prisma model
 * @param id - Entity ID
 * @param updateFn - Function that returns update data given current entity
 * @param maxRetries - Maximum number of retries (default: from constants)
 * @returns Updated entity
 */
export async function updateWithRetry<T extends VersionedEntity>(
  model: any,
  id: string,
  updateFn: (current: T) => any | Promise<any>,
  maxRetries: number = OPTIMISTIC_LOCKING.MAX_RETRY_ATTEMPTS
): Promise<T> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Fetch current entity
      const current = await model.findUnique({ where: { id } });
      
      if (!current) {
        throw new Error(`Entity not found: ${id}`);
      }
      
      // Calculate update data
      const updateData = await updateFn(current);
      
      // Attempt update with optimistic lock
      return await updateWithOptimisticLock(
        model,
        id,
        current.version,
        updateData
      );
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw new Error(
            `Failed to update after ${maxRetries} attempts due to concurrent modifications. ` +
            `Please try again later.`
          );
        }
        
        // Exponential backoff: 2^attempt * base_delay
        // Example: attempt 1 = 200ms, attempt 2 = 400ms, attempt 3 = 800ms
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * OPTIMISTIC_LOCKING.RETRY_BASE_DELAY_MS)
        );
        
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Unexpected error in updateWithRetry');
}

/**
 * Execute transaction with optimistic locking
 * 
 * @param prisma - Prisma client
 * @param fn - Transaction function
 * @param options - Transaction options
 */
export async function transactionWithOptimisticLock<T>(
  prisma: PrismaClient,
  fn: (tx: any) => Promise<T>,
  options?: {
    maxRetries?: number;
    isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
  }
): Promise<T> {
  const maxRetries = options?.maxRetries || OPTIMISTIC_LOCKING.MAX_RETRY_ATTEMPTS;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: options?.isolationLevel || 'RepeatableRead',
      });
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw new Error(
            `Transaction failed after ${maxRetries} attempts due to concurrent modifications.`
          );
        }
        
        // Exponential backoff: 2^attempt * base_delay
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * OPTIMISTIC_LOCKING.RETRY_BASE_DELAY_MS)
        );
        
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Unexpected error in transactionWithOptimisticLock');
}

/**
 * Generate idempotency key
 * 
 * @param prefix - Key prefix (e.g., 'payment', 'disbursement')
 * @param uniqueId - Unique identifier (e.g., loanId + timestamp)
 * @returns Idempotency key
 */
export function generateIdempotencyKey(prefix: string, uniqueId: string): string {
  return `${prefix}:${uniqueId}:${Date.now()}`;
}

/**
 * Check if operation was already processed (idempotency check)
 * 
 * @param model - Prisma model
 * @param idempotencyKey - Idempotency key
 * @returns Existing entity if found, null otherwise
 */
export async function checkIdempotency<T>(
  model: any,
  idempotencyKey: string
): Promise<T | null> {
  return await model.findUnique({
    where: { idempotencyKey },
  });
}

/**
 * Execute operation with idempotency
 * 
 * @param model - Prisma model
 * @param idempotencyKey - Idempotency key
 * @param createFn - Function to create entity if not exists
 * @returns Entity (existing or newly created)
 */
export async function executeWithIdempotency<T>(
  model: any,
  idempotencyKey: string,
  createFn: () => Promise<any>
): Promise<T> {
  // Check if already processed
  const existing = await checkIdempotency<T>(model, idempotencyKey);
  
  if (existing) {
    return existing;
  }
  
  // Execute operation
  try {
    const data = await createFn();
    return await model.create({
      data: {
        ...data,
        idempotencyKey,
      },
    });
  } catch (error: any) {
    // Handle unique constraint violation (race condition)
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotency_key')) {
      // Another request created it, fetch and return
      const existing = await checkIdempotency<T>(model, idempotencyKey);
      if (existing) {
        return existing;
      }
    }
    
    throw error;
  }
}

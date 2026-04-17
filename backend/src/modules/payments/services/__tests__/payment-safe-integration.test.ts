/**
 * Payment Safe Service Integration Test
 * 
 * Tests to verify that payment-safe.service is properly integrated
 * and provides the expected benefits over the old queue-based approach
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { processPaymentWithRetry, validatePayment } from '../payment-safe.service';
import { PaymentService } from '../payment.service';

const prisma = new PrismaClient();
const paymentService = new PaymentService();

describe('Payment Safe Service Integration', () => {
  let testLoanId: string;
  let testBranchId: string;
  let testUserId: string;
  let testPaymentScheduleId: string;

  beforeAll(async () => {
    // Setup test data
    // Note: This assumes test database is already seeded
    const loan = await prisma.loan.findFirst({
      where: {
        status: 'ACTIVE',
        outstandingBalance: { gt: 0 },
      },
      include: {
        paymentSchedules: {
          where: { status: 'UNPAID' },
          take: 1,
        },
      },
    });

    if (!loan) {
      throw new Error('No active loan found for testing');
    }

    testLoanId = loan.id;
    testBranchId = loan.branchId;
    testUserId = loan.officerId;
    testPaymentScheduleId = loan.paymentSchedules[0]?.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Idempotency Protection', () => {
    it('should prevent duplicate payments with same idempotency key', async () => {
      const idempotencyKey = `test-${Date.now()}`;
      const paymentInput = {
        loanId: testLoanId,
        amount: 1000,
        paymentMethod: 'CASH',
        paymentType: 'ON_TIME' as const,
        paymentScheduleId: testPaymentScheduleId,
        notes: 'Test payment for idempotency',
        createdBy: testUserId,
        idempotencyKey,
      };

      // First payment should succeed
      const result1 = await processPaymentWithRetry(paymentInput);
      expect(result1.isIdempotent).toBe(false);
      expect(result1.payment).toBeDefined();

      // Second payment with same key should return existing payment
      const result2 = await processPaymentWithRetry(paymentInput);
      expect(result2.isIdempotent).toBe(true);
      expect(result2.payment.id).toBe(result1.payment.id);
    });
  });

  describe('2. Payment Service Integration', () => {
    it('should use safe service through payment service', async () => {
      const mockRequest = {} as any;
      const paymentInput = {
        loanId: testLoanId,
        amount: 500,
        paymentMethod: 'TRANSFER',
        paymentScheduleId: testPaymentScheduleId,
        notes: 'Test payment through service',
      };

      const result = await paymentService.recordPayment(
        mockRequest,
        paymentInput,
        testBranchId,
        testUserId
      );

      expect(result.payment).toBeDefined();
      expect(result.loan).toBeDefined();
      expect(result.newOutstandingBalance).toBeDefined();
      expect(result.isIdempotent).toBeDefined();
    });
  });

  describe('3. Validation', () => {
    it('should validate payment before processing', async () => {
      const validation = await validatePayment({
        loanId: testLoanId,
        amount: 100,
        paymentMethod: 'CASH',
        paymentType: 'ON_TIME',
        createdBy: testUserId,
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid payment amount', async () => {
      const validation = await validatePayment({
        loanId: testLoanId,
        amount: -100, // Invalid negative amount
        paymentMethod: 'CASH',
        paymentType: 'ON_TIME',
        createdBy: testUserId,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('4. Complete Business Logic', () => {
    it('should calculate payment breakdown correctly', async () => {
      const loan = await prisma.loan.findUnique({
        where: { id: testLoanId },
        include: {
          paymentSchedules: {
            where: { status: 'UNPAID' },
            take: 1,
          },
        },
      });

      if (!loan || !loan.paymentSchedules[0]) {
        throw new Error('Test loan not found');
      }

      const schedule = loan.paymentSchedules[0];
      const paymentAmount = schedule.totalPayment.toNumber();

      const result = await processPaymentWithRetry({
        loanId: testLoanId,
        amount: paymentAmount,
        paymentMethod: 'CASH',
        paymentType: 'ON_TIME',
        paymentScheduleId: schedule.id,
        createdBy: testUserId,
      });

      expect(result.payment).toBeDefined();
      expect(result.payment.amount).toBe(paymentAmount);
      expect(result.newBalance).toBeLessThan(result.previousBalance);
    });
  });

  describe('5. Performance Metrics', () => {
    it('should complete payment within reasonable time', async () => {
      const startTime = Date.now();

      await processPaymentWithRetry({
        loanId: testLoanId,
        amount: 100,
        paymentMethod: 'CASH',
        paymentType: 'ON_TIME',
        createdBy: testUserId,
      });

      const duration = Date.now() - startTime;

      // Should complete within 3 seconds (SLOW_TRANSACTION_THRESHOLD_MS)
      expect(duration).toBeLessThan(3000);
    });
  });
});

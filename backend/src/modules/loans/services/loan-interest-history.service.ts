/**
 * Loan Interest History Service
 * 
 * Tracks interest rate changes and calculations for loans
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateInterestHistoryInput {
  loanId: string;
  paymentNumber: number;
  outstandingBalance: number;
  appliedRate: number;
  tierName?: string;
  gracePeriodDays?: number;
  interestAmount: number;
  effectiveDate: Date;
}

export interface InterestHistory {
  id: string;
  loanId: string;
  paymentNumber: number;
  outstandingBalance: any;
  appliedRate: any;
  tierName: string | null;
  gracePeriodDays: number;
  interestAmount: any;
  calculatedAt: Date;
  effectiveDate: Date;
  loan: any;
}

export class LoanInterestHistoryService {
  /**
   * Create interest history record
   */
  async createInterestHistory(data: CreateInterestHistoryInput): Promise<InterestHistory> {
    const history = await prisma.loanInterestHistory.create({
      data: {
        loanId: data.loanId,
        paymentNumber: data.paymentNumber,
        outstandingBalance: data.outstandingBalance,
        appliedRate: data.appliedRate,
        tierName: data.tierName,
        gracePeriodDays: data.gracePeriodDays || 0,
        interestAmount: data.interestAmount,
        effectiveDate: data.effectiveDate,
        calculatedAt: new Date(),
      },
      include: {
        loan: {
          select: {
            id: true,
            principal: true,
            interestRate: true,
            status: true,
            customer: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    return history as InterestHistory;
  }

  /**
   * Get interest history by loan ID
   */
  async getInterestHistoryByLoanId(loanId: string): Promise<InterestHistory[]> {
    const history = await prisma.loanInterestHistory.findMany({
      where: { loanId },
      include: {
        loan: {
          select: {
            id: true,
            principal: true,
            interestRate: true,
            status: true,
            customer: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: [{ effectiveDate: 'desc' }, { paymentNumber: 'desc' }],
    });

    return history as InterestHistory[];
  }

  /**
   * Get interest history by ID
   */
  async getInterestHistoryById(historyId: string): Promise<InterestHistory | null> {
    const history = await prisma.loanInterestHistory.findUnique({
      where: { id: historyId },
      include: {
        loan: {
          select: {
            id: true,
            principal: true,
            interestRate: true,
            status: true,
            customer: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    return history as InterestHistory | null;
  }

  /**
   * Get interest history by payment number
   */
  async getInterestHistoryByPaymentNumber(
    loanId: string,
    paymentNumber: number
  ): Promise<InterestHistory | null> {
    const history = await prisma.loanInterestHistory.findFirst({
      where: {
        loanId,
        paymentNumber,
      },
      include: {
        loan: {
          select: {
            id: true,
            principal: true,
            interestRate: true,
            status: true,
            customer: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    return history as InterestHistory | null;
  }

  /**
   * Get interest history within date range
   */
  async getInterestHistoryByDateRange(
    loanId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InterestHistory[]> {
    const history = await prisma.loanInterestHistory.findMany({
      where: {
        loanId,
        effectiveDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        loan: {
          select: {
            id: true,
            principal: true,
            interestRate: true,
            status: true,
            customer: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { effectiveDate: 'asc' },
    });

    return history as InterestHistory[];
  }

  /**
   * Get all interest history with filters
   */
  async getInterestHistory(filters?: {
    loanId?: string;
    customerId?: string;
    tierName?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<InterestHistory[]> {
    const where: any = {};

    if (filters?.loanId) {
      where.loanId = filters.loanId;
    }

    if (filters?.customerId) {
      where.loan = {
        customerId: filters.customerId,
      };
    }

    if (filters?.tierName) {
      where.tierName = filters.tierName;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.effectiveDate = {};
      if (filters.dateFrom) {
        where.effectiveDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.effectiveDate.lte = filters.dateTo;
      }
    }

    const history = await prisma.loanInterestHistory.findMany({
      where,
      include: {
        loan: {
          select: {
            id: true,
            principal: true,
            interestRate: true,
            status: true,
            customer: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
      take: filters?.limit || 100,
    });

    return history as InterestHistory[];
  }

  /**
   * Calculate total interest for loan
   */
  async calculateTotalInterest(loanId: string): Promise<{
    totalInterest: number;
    recordCount: number;
    averageRate: number;
    minRate: number;
    maxRate: number;
  }> {
    const history = await prisma.loanInterestHistory.findMany({
      where: { loanId },
      select: {
        interestAmount: true,
        appliedRate: true,
      },
    });

    if (history.length === 0) {
      return {
        totalInterest: 0,
        recordCount: 0,
        averageRate: 0,
        minRate: 0,
        maxRate: 0,
      };
    }

    const totalInterest = history.reduce(
      (sum, record) => sum + parseFloat(record.interestAmount.toString()),
      0
    );

    const rates = history.map((record) => parseFloat(record.appliedRate.toString()));
    const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    return {
      totalInterest,
      recordCount: history.length,
      averageRate,
      minRate,
      maxRate,
    };
  }

  /**
   * Get interest rate changes for loan
   */
  async getInterestRateChanges(loanId: string): Promise<
    Array<{
      effectiveDate: Date;
      oldRate: number | null;
      newRate: number;
      change: number | null;
      paymentNumber: number;
    }>
  > {
    const history = await prisma.loanInterestHistory.findMany({
      where: { loanId },
      select: {
        effectiveDate: true,
        appliedRate: true,
        paymentNumber: true,
      },
      orderBy: { effectiveDate: 'asc' },
    });

    const changes: Array<{
      effectiveDate: Date;
      oldRate: number | null;
      newRate: number;
      change: number | null;
      paymentNumber: number;
    }> = [];

    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      if (!current) continue;
      
      const previous = i > 0 ? history[i - 1] : null;

      const newRate = parseFloat(current.appliedRate.toString());
      const oldRate = previous ? parseFloat(previous.appliedRate.toString()) : null;
      const change = oldRate !== null ? newRate - oldRate : null;

      // Only include if rate changed
      if (change === null || Math.abs(change) > 0.0001) {
        changes.push({
          effectiveDate: current.effectiveDate,
          oldRate,
          newRate,
          change,
          paymentNumber: current.paymentNumber,
        });
      }
    }

    return changes;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalRecords: number;
    totalLoans: number;
    totalInterestCalculated: number;
    averageInterestRate: number;
    recordsByTier: Record<string, number>;
  }> {
    const [totalRecords, uniqueLoans, allRecords] = await Promise.all([
      prisma.loanInterestHistory.count(),
      prisma.loanInterestHistory.findMany({
        select: { loanId: true },
        distinct: ['loanId'],
      }),
      prisma.loanInterestHistory.findMany({
        select: {
          interestAmount: true,
          appliedRate: true,
          tierName: true,
        },
      }),
    ]);

    const totalInterestCalculated = allRecords.reduce(
      (sum, record) => sum + parseFloat(record.interestAmount.toString()),
      0
    );

    const rates = allRecords.map((record) => parseFloat(record.appliedRate.toString()));
    const averageInterestRate = rates.length > 0 
      ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length 
      : 0;

    // Count by tier
    const recordsByTier: Record<string, number> = {};
    allRecords.forEach((record) => {
      const tier = record.tierName || 'N/A';
      recordsByTier[tier] = (recordsByTier[tier] || 0) + 1;
    });

    return {
      totalRecords,
      totalLoans: uniqueLoans.length,
      totalInterestCalculated,
      averageInterestRate,
      recordsByTier,
    };
  }

  /**
   * Delete interest history record
   */
  async deleteInterestHistory(historyId: string): Promise<void> {
    await prisma.loanInterestHistory.delete({
      where: { id: historyId },
    });
  }

  /**
   * Bulk create interest history
   */
  async bulkCreateInterestHistory(records: CreateInterestHistoryInput[]): Promise<number> {
    const result = await prisma.loanInterestHistory.createMany({
      data: records.map((record) => ({
        loanId: record.loanId,
        paymentNumber: record.paymentNumber,
        outstandingBalance: record.outstandingBalance,
        appliedRate: record.appliedRate,
        tierName: record.tierName,
        gracePeriodDays: record.gracePeriodDays || 0,
        interestAmount: record.interestAmount,
        effectiveDate: record.effectiveDate,
        calculatedAt: new Date(),
      })),
    });

    return result.count;
  }
}

export const loanInterestHistoryService = new LoanInterestHistoryService();

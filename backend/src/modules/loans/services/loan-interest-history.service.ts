/**
 * Loan Interest History Service
 * 
 * Tracks interest rate changes and calculations for loans
 */

import { LoanInterestHistoryRepository } from '../repositories/loan-interest-history.repository';

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
  private repository: LoanInterestHistoryRepository;

  constructor() {
    this.repository = new LoanInterestHistoryRepository();
  }

  /**
   * Create interest history record
   */
  async createInterestHistory(data: CreateInterestHistoryInput): Promise<InterestHistory> {
    return this.repository.create(data);
  }

  /**
   * Get interest history by loan ID
   */
  async getInterestHistoryByLoanId(loanId: string): Promise<InterestHistory[]> {
    return this.repository.findManyByLoanId(loanId);
  }

  /**
   * Get interest history by ID
   */
  async getInterestHistoryById(historyId: string): Promise<InterestHistory | null> {
    return this.repository.findById(historyId);
  }

  /**
   * Get interest history by payment number
   */
  async getInterestHistoryByPaymentNumber(
    loanId: string,
    paymentNumber: number
  ): Promise<InterestHistory | null> {
    return this.repository.findFirst(loanId, paymentNumber);
  }

  /**
   * Get interest history within date range
   */
  async getInterestHistoryByDateRange(
    loanId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InterestHistory[]> {
    return this.repository.findManyByDateRange(loanId, startDate, endDate);
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
      where.loan = { customerId: filters.customerId };
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

    return this.repository.findMany(where, filters?.limit);
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
    const history = await this.repository.findManyForInterestCalc(loanId);

    if (history.length === 0) {
      return { totalInterest: 0, recordCount: 0, averageRate: 0, minRate: 0, maxRate: 0 };
    }

    const totalInterest = history.reduce(
      (sum, record) => sum + parseFloat(record.interestAmount.toString()),
      0
    );

    const rates = history.map((record) => parseFloat(record.appliedRate.toString()));
    const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    return { totalInterest, recordCount: history.length, averageRate, minRate, maxRate };
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
    const history = await this.repository.findManyForRates(loanId);

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
      this.repository.count(),
      this.repository.findDistinctLoanIds(),
      this.repository.findManyForStats(),
    ]);

    const totalInterestCalculated = allRecords.reduce(
      (sum, record) => sum + parseFloat(record.interestAmount.toString()),
      0
    );

    const rates = allRecords.map((record) => parseFloat(record.appliedRate.toString()));
    const averageInterestRate =
      rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;

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
    await this.repository.delete(historyId);
  }

  /**
   * Bulk create interest history
   */
  async bulkCreateInterestHistory(records: CreateInterestHistoryInput[]): Promise<number> {
    return this.repository.createMany(records);
  }
}

export const loanInterestHistoryService = new LoanInterestHistoryService();

import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';
import { CreateInterestHistoryInput, InterestHistory } from '../services/loan-interest-history.service';

const loanInclude = {
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
};

/**
 * Loan Interest History Repository - Database access ONLY
 * No business logic, just Prisma queries
 */
export class LoanInterestHistoryRepository {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  async create(data: CreateInterestHistoryInput): Promise<InterestHistory> {
    return this.db.loanInterestHistory.create({
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
      include: loanInclude,
    }) as unknown as InterestHistory;
  }

  async findManyByLoanId(loanId: string): Promise<InterestHistory[]> {
    return this.db.loanInterestHistory.findMany({
      where: { loanId },
      include: loanInclude,
      orderBy: [{ effectiveDate: 'desc' }, { paymentNumber: 'desc' }],
    }) as unknown as InterestHistory[];
  }

  async findById(historyId: string): Promise<InterestHistory | null> {
    return this.db.loanInterestHistory.findUnique({
      where: { id: historyId },
      include: loanInclude,
    }) as unknown as InterestHistory | null;
  }

  async findFirst(loanId: string, paymentNumber: number): Promise<InterestHistory | null> {
    return this.db.loanInterestHistory.findFirst({
      where: { loanId, paymentNumber },
      include: loanInclude,
    }) as unknown as InterestHistory | null;
  }

  async findManyByDateRange(loanId: string, startDate: Date, endDate: Date): Promise<InterestHistory[]> {
    return this.db.loanInterestHistory.findMany({
      where: {
        loanId,
        effectiveDate: { gte: startDate, lte: endDate },
      },
      include: loanInclude,
      orderBy: { effectiveDate: 'asc' },
    }) as unknown as InterestHistory[];
  }

  async findMany(where: any, take?: number): Promise<InterestHistory[]> {
    return this.db.loanInterestHistory.findMany({
      where,
      include: loanInclude,
      orderBy: { effectiveDate: 'desc' },
      take: take || 100,
    }) as unknown as InterestHistory[];
  }

  async findManyForStats(): Promise<Array<{ interestAmount: any; appliedRate: any; tierName: string | null }>> {
    return this.db.loanInterestHistory.findMany({
      select: { interestAmount: true, appliedRate: true, tierName: true },
    });
  }

  async findManyForRates(loanId: string): Promise<Array<{ effectiveDate: Date; appliedRate: any; paymentNumber: number }>> {
    return this.db.loanInterestHistory.findMany({
      where: { loanId },
      select: { effectiveDate: true, appliedRate: true, paymentNumber: true },
      orderBy: { effectiveDate: 'asc' },
    });
  }

  async findManyForInterestCalc(loanId: string): Promise<Array<{ interestAmount: any; appliedRate: any }>> {
    return this.db.loanInterestHistory.findMany({
      where: { loanId },
      select: { interestAmount: true, appliedRate: true },
    });
  }

  async count(): Promise<number> {
    return this.db.loanInterestHistory.count();
  }

  async findDistinctLoanIds(): Promise<Array<{ loanId: string }>> {
    return this.db.loanInterestHistory.findMany({
      select: { loanId: true },
      distinct: ['loanId'],
    });
  }

  async delete(historyId: string): Promise<void> {
    await this.db.loanInterestHistory.delete({ where: { id: historyId } });
  }

  async createMany(records: CreateInterestHistoryInput[]): Promise<number> {
    const result = await this.db.loanInterestHistory.createMany({
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

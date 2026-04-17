/**
 * Credit Line Service
 * 
 * Manages credit lines for customers
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCreditLineInput {
  customerId: string;
  creditLineNumber: string;
  approvedLimit: number;
  interestRate: number;
  startDate: Date;
  expiryDate: Date;
  reviewDate?: Date;
  createdBy: string;
}

export interface UpdateCreditLineInput {
  approvedLimit?: number;
  currentBalance?: number;
  availableBalance?: number;
  utilizationRate?: number;
  interestRate?: number;
  expiryDate?: Date;
  reviewDate?: Date;
  status?: string;
}

export interface CreditLine {
  id: string;
  customer_id: string;
  credit_line_number: string;
  approved_limit: any;
  current_balance: any;
  available_balance: any;
  utilization_rate: any;
  interest_rate: any;
  start_date: Date;
  expiry_date: Date;
  review_date: Date | null;
  status: string | null;
  created_by: string;
  created_at: Date | null;
  updated_at: Date | null;
  customers: any;
  users: any;
  credit_line_drawdowns: any[];
}

export class CreditLineService {
  /**
   * Create credit line
   */
  async createCreditLine(data: CreateCreditLineInput): Promise<CreditLine> {
    const creditLine = await prisma.credit_lines.create({
      data: {
        customer_id: data.customerId,
        credit_line_number: data.creditLineNumber,
        approved_limit: data.approvedLimit,
        current_balance: 0,
        available_balance: data.approvedLimit,
        utilization_rate: 0,
        interest_rate: data.interestRate,
        start_date: data.startDate,
        expiry_date: data.expiryDate,
        review_date: data.reviewDate,
        status: 'ACTIVE',
        created_by: data.createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        customers: {
          select: {
            id: true,
            businessName: true,
            taxId: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        credit_line_drawdowns: true,
      },
    });

    return creditLine as CreditLine;
  }

  /**
   * Get credit line by ID
   */
  async getCreditLineById(creditLineId: string): Promise<CreditLine | null> {
    const creditLine = await prisma.credit_lines.findUnique({
      where: { id: creditLineId },
      include: {
        customers: {
          select: {
            id: true,
            businessName: true,
            taxId: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        credit_line_drawdowns: {
          orderBy: { drawdown_date: 'desc' },
        },
      },
    });

    return creditLine as CreditLine | null;
  }

  /**
   * Get credit lines by customer ID
   */
  async getCreditLinesByCustomerId(customerId: string): Promise<CreditLine[]> {
    const creditLines = await prisma.credit_lines.findMany({
      where: { customer_id: customerId },
      include: {
        customers: {
          select: {
            id: true,
            businessName: true,
            taxId: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        credit_line_drawdowns: {
          orderBy: { drawdown_date: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return creditLines as CreditLine[];
  }

  /**
   * Get all credit lines with filters
   */
  async getCreditLines(filters?: {
    customerId?: string;
    status?: string;
    expiringBefore?: Date;
    limit?: number;
  }): Promise<CreditLine[]> {
    const where: any = {};

    if (filters?.customerId) {
      where.customer_id = filters.customerId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.expiringBefore) {
      where.expiry_date = {
        lte: filters.expiringBefore,
      };
    }

    const creditLines = await prisma.credit_lines.findMany({
      where,
      include: {
        customers: {
          select: {
            id: true,
            businessName: true,
            taxId: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        credit_line_drawdowns: {
          orderBy: { drawdown_date: 'desc' },
          take: 5,
        },
      },
      orderBy: { created_at: 'desc' },
      take: filters?.limit || 100,
    });

    return creditLines as CreditLine[];
  }

  /**
   * Update credit line
   */
  async updateCreditLine(creditLineId: string, data: UpdateCreditLineInput): Promise<CreditLine> {
    const creditLine = await prisma.credit_lines.update({
      where: { id: creditLineId },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: {
        customers: {
          select: {
            id: true,
            businessName: true,
            taxId: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        credit_line_drawdowns: {
          orderBy: { drawdown_date: 'desc' },
        },
      },
    });

    return creditLine as CreditLine;
  }

  /**
   * Update credit line balance after drawdown
   */
  async updateBalanceAfterDrawdown(
    creditLineId: string,
    drawdownAmount: number
  ): Promise<CreditLine> {
    const creditLine = await prisma.credit_lines.findUnique({
      where: { id: creditLineId },
    });

    if (!creditLine) {
      throw new Error('Credit line not found');
    }

    const currentBalance = parseFloat(creditLine.current_balance?.toString() || '0');
    const approvedLimit = parseFloat(creditLine.approved_limit.toString());
    const newBalance = currentBalance + drawdownAmount;
    const newAvailableBalance = approvedLimit - newBalance;
    const newUtilizationRate = (newBalance / approvedLimit) * 100;

    return this.updateCreditLine(creditLineId, {
      currentBalance: newBalance,
      availableBalance: newAvailableBalance,
      utilizationRate: newUtilizationRate / 100,
    });
  }

  /**
   * Get expiring credit lines
   */
  async getExpiringCreditLines(daysAhead: number = 30): Promise<CreditLine[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);

    return this.getCreditLines({
      status: 'ACTIVE',
      expiringBefore: expiryDate,
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalCreditLines: number;
    activeCreditLines: number;
    totalApprovedLimit: number;
    totalCurrentBalance: number;
    totalAvailableBalance: number;
    averageUtilizationRate: number;
    expiringIn30Days: number;
  }> {
    const [
      totalCreditLines,
      activeCreditLines,
      allCreditLines,
      expiringIn30Days,
    ] = await Promise.all([
      prisma.credit_lines.count(),
      prisma.credit_lines.count({ where: { status: 'ACTIVE' } }),
      prisma.credit_lines.findMany({
        select: {
          approved_limit: true,
          current_balance: true,
          available_balance: true,
          utilization_rate: true,
        },
      }),
      this.getExpiringCreditLines(30),
    ]);

    const totalApprovedLimit = allCreditLines.reduce(
      (sum, cl) => sum + parseFloat(cl.approved_limit.toString()),
      0
    );
    const totalCurrentBalance = allCreditLines.reduce(
      (sum, cl) => sum + parseFloat((cl.current_balance || 0).toString()),
      0
    );
    const totalAvailableBalance = allCreditLines.reduce(
      (sum, cl) => sum + parseFloat((cl.available_balance || 0).toString()),
      0
    );

    const utilizationRates = allCreditLines
      .map((cl) => parseFloat((cl.utilization_rate || 0).toString()))
      .filter((rate) => rate > 0);
    const averageUtilizationRate =
      utilizationRates.length > 0
        ? utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length
        : 0;

    return {
      totalCreditLines,
      activeCreditLines,
      totalApprovedLimit,
      totalCurrentBalance,
      totalAvailableBalance,
      averageUtilizationRate,
      expiringIn30Days: expiringIn30Days.length,
    };
  }

  /**
   * Suspend credit line
   */
  async suspendCreditLine(creditLineId: string): Promise<CreditLine> {
    return this.updateCreditLine(creditLineId, { status: 'SUSPENDED' });
  }

  /**
   * Activate credit line
   */
  async activateCreditLine(creditLineId: string): Promise<CreditLine> {
    return this.updateCreditLine(creditLineId, { status: 'ACTIVE' });
  }

  /**
   * Close credit line
   */
  async closeCreditLine(creditLineId: string): Promise<CreditLine> {
    return this.updateCreditLine(creditLineId, { status: 'CLOSED' });
  }

  /**
   * Delete credit line
   */
  async deleteCreditLine(creditLineId: string): Promise<void> {
    await prisma.credit_lines.delete({
      where: { id: creditLineId },
    });
  }
}

export const creditLineService = new CreditLineService();

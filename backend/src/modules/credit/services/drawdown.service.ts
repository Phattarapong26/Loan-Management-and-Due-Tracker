/**
 * Credit Line Drawdown Service
 * 
 * Manages drawdowns from credit lines
 */

import { PrismaClient } from '@prisma/client';
import { creditLineService } from './credit-line.service';

const prisma = new PrismaClient();

export interface CreateDrawdownInput {
  creditLineId: string;
  drawdownNumber: string;
  amount: number;
  purpose: string;
  drawdownDate: Date;
  maturityDate: Date;
  interestRate: number;
  createdBy: string;
}

export interface UpdateDrawdownInput {
  amount?: number;
  purpose?: string;
  maturityDate?: Date;
  interestRate?: number;
  status?: string;
}

export interface Drawdown {
  id: string;
  credit_line_id: string;
  drawdown_number: string;
  amount: any;
  purpose: string;
  drawdown_date: Date;
  maturity_date: Date;
  interest_rate: any;
  status: string | null;
  created_by: string;
  created_at: Date | null;
  credit_lines: any;
  users: any;
}

export class DrawdownService {
  /**
   * Create drawdown
   */
  async createDrawdown(data: CreateDrawdownInput): Promise<Drawdown> {
    // Check credit line availability
    const creditLine = await prisma.credit_lines.findUnique({
      where: { id: data.creditLineId },
    });

    if (!creditLine) {
      throw new Error('Credit line not found');
    }

    if (creditLine.status !== 'ACTIVE') {
      throw new Error('Credit line is not active');
    }

    const availableBalance = parseFloat((creditLine.available_balance || 0).toString());
    if (data.amount > availableBalance) {
      throw new Error(
        `Insufficient credit limit. Available: ${availableBalance}, Requested: ${data.amount}`
      );
    }

    // Create drawdown
    const drawdown = await prisma.credit_line_drawdowns.create({
      data: {
        credit_line_id: data.creditLineId,
        drawdown_number: data.drawdownNumber,
        amount: data.amount,
        purpose: data.purpose,
        drawdown_date: data.drawdownDate,
        maturity_date: data.maturityDate,
        interest_rate: data.interestRate,
        status: 'ACTIVE',
        created_by: data.createdBy,
        created_at: new Date(),
      },
      include: {
        credit_lines: {
          select: {
            id: true,
            credit_line_number: true,
            approved_limit: true,
            available_balance: true,
            customers: {
              select: {
                id: true,
                businessName: true,
              },
            },
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
      },
    });

    // Update credit line balance
    await creditLineService.updateBalanceAfterDrawdown(data.creditLineId, data.amount);

    return drawdown as Drawdown;
  }

  /**
   * Get drawdown by ID
   */
  async getDrawdownById(drawdownId: string): Promise<Drawdown | null> {
    const drawdown = await prisma.credit_line_drawdowns.findUnique({
      where: { id: drawdownId },
      include: {
        credit_lines: {
          select: {
            id: true,
            credit_line_number: true,
            approved_limit: true,
            available_balance: true,
            customers: {
              select: {
                id: true,
                businessName: true,
              },
            },
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
      },
    });

    return drawdown as Drawdown | null;
  }

  /**
   * Get drawdowns by credit line ID
   */
  async getDrawdownsByCreditLineId(creditLineId: string): Promise<Drawdown[]> {
    const drawdowns = await prisma.credit_line_drawdowns.findMany({
      where: { credit_line_id: creditLineId },
      include: {
        credit_lines: {
          select: {
            id: true,
            credit_line_number: true,
            approved_limit: true,
            available_balance: true,
            customers: {
              select: {
                id: true,
                businessName: true,
              },
            },
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
      },
      orderBy: { drawdown_date: 'desc' },
    });

    return drawdowns as Drawdown[];
  }

  /**
   * Get all drawdowns with filters
   */
  async getDrawdowns(filters?: {
    creditLineId?: string;
    customerId?: string;
    status?: string;
    maturingBefore?: Date;
    limit?: number;
  }): Promise<Drawdown[]> {
    const where: any = {};

    if (filters?.creditLineId) {
      where.credit_line_id = filters.creditLineId;
    }

    if (filters?.customerId) {
      where.credit_lines = {
        customer_id: filters.customerId,
      };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.maturingBefore) {
      where.maturity_date = {
        lte: filters.maturingBefore,
      };
    }

    const drawdowns = await prisma.credit_line_drawdowns.findMany({
      where,
      include: {
        credit_lines: {
          select: {
            id: true,
            credit_line_number: true,
            approved_limit: true,
            available_balance: true,
            customers: {
              select: {
                id: true,
                businessName: true,
              },
            },
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
      },
      orderBy: { drawdown_date: 'desc' },
      take: filters?.limit || 100,
    });

    return drawdowns as Drawdown[];
  }

  /**
   * Update drawdown
   */
  async updateDrawdown(drawdownId: string, data: UpdateDrawdownInput): Promise<Drawdown> {
    const drawdown = await prisma.credit_line_drawdowns.update({
      where: { id: drawdownId },
      data,
      include: {
        credit_lines: {
          select: {
            id: true,
            credit_line_number: true,
            approved_limit: true,
            available_balance: true,
            customers: {
              select: {
                id: true,
                businessName: true,
              },
            },
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
      },
    });

    return drawdown as Drawdown;
  }

  /**
   * Get maturing drawdowns
   */
  async getMaturingDrawdowns(daysAhead: number = 30): Promise<Drawdown[]> {
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + daysAhead);

    return this.getDrawdowns({
      status: 'ACTIVE',
      maturingBefore: maturityDate,
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalDrawdowns: number;
    activeDrawdowns: number;
    totalAmount: number;
    averageAmount: number;
    maturingIn30Days: number;
  }> {
    const [totalDrawdowns, activeDrawdowns, allDrawdowns, maturingIn30Days] = await Promise.all([
      prisma.credit_line_drawdowns.count(),
      prisma.credit_line_drawdowns.count({ where: { status: 'ACTIVE' } }),
      prisma.credit_line_drawdowns.findMany({
        select: {
          amount: true,
        },
      }),
      this.getMaturingDrawdowns(30),
    ]);

    const totalAmount = allDrawdowns.reduce(
      (sum, d) => sum + parseFloat(d.amount.toString()),
      0
    );
    const averageAmount = totalDrawdowns > 0 ? totalAmount / totalDrawdowns : 0;

    return {
      totalDrawdowns,
      activeDrawdowns,
      totalAmount,
      averageAmount,
      maturingIn30Days: maturingIn30Days.length,
    };
  }

  /**
   * Repay drawdown
   */
  async repayDrawdown(drawdownId: string): Promise<Drawdown> {
    const drawdown = await this.getDrawdownById(drawdownId);
    if (!drawdown) {
      throw new Error('Drawdown not found');
    }

    // Update drawdown status
    const updatedDrawdown = await this.updateDrawdown(drawdownId, { status: 'REPAID' });

    // Update credit line balance (reduce current balance)
    const amount = parseFloat(drawdown.amount.toString());
    const creditLine = await prisma.credit_lines.findUnique({
      where: { id: drawdown.credit_line_id },
    });

    if (creditLine) {
      const currentBalance = parseFloat((creditLine.current_balance || 0).toString());
      const approvedLimit = parseFloat(creditLine.approved_limit.toString());
      const newBalance = Math.max(0, currentBalance - amount);
      const newAvailableBalance = approvedLimit - newBalance;
      const newUtilizationRate = approvedLimit > 0 ? (newBalance / approvedLimit) * 100 : 0;

      await creditLineService.updateCreditLine(drawdown.credit_line_id, {
        currentBalance: newBalance,
        availableBalance: newAvailableBalance,
        utilizationRate: newUtilizationRate / 100,
      });
    }

    return updatedDrawdown;
  }

  /**
   * Cancel drawdown
   */
  async cancelDrawdown(drawdownId: string): Promise<Drawdown> {
    const drawdown = await this.getDrawdownById(drawdownId);
    if (!drawdown) {
      throw new Error('Drawdown not found');
    }

    // Update drawdown status
    const updatedDrawdown = await this.updateDrawdown(drawdownId, { status: 'CANCELLED' });

    // Restore credit line balance
    const amount = parseFloat(drawdown.amount.toString());
    const creditLine = await prisma.credit_lines.findUnique({
      where: { id: drawdown.credit_line_id },
    });

    if (creditLine) {
      const currentBalance = parseFloat((creditLine.current_balance || 0).toString());
      const approvedLimit = parseFloat(creditLine.approved_limit.toString());
      const newBalance = Math.max(0, currentBalance - amount);
      const newAvailableBalance = approvedLimit - newBalance;
      const newUtilizationRate = approvedLimit > 0 ? (newBalance / approvedLimit) * 100 : 0;

      await creditLineService.updateCreditLine(drawdown.credit_line_id, {
        currentBalance: newBalance,
        availableBalance: newAvailableBalance,
        utilizationRate: newUtilizationRate / 100,
      });
    }

    return updatedDrawdown;
  }

  /**
   * Delete drawdown
   */
  async deleteDrawdown(drawdownId: string): Promise<void> {
    await prisma.credit_line_drawdowns.delete({
      where: { id: drawdownId },
    });
  }
}

export const drawdownService = new DrawdownService();

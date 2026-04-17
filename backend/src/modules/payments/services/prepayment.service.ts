// @ts-nocheck
/**
 * Principal Prepayment Service
 * 
 * Manages principal prepayments and recalculations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreatePrepaymentInput {
  loanId: string;
  paymentScheduleId?: string;
  amount: number;
  prepaymentDate: Date;
  interestSaved?: number;
  newMonthlyPayment?: number;
  newMaturityDate?: Date;
  penaltyAmount?: number;
  processedBy?: string;
}

export interface UpdatePrepaymentInput {
  amount?: number;
  prepaymentDate?: Date;
  interestSaved?: number;
  newMonthlyPayment?: number;
  newMaturityDate?: Date;
  penaltyAmount?: number;
}

export interface Prepayment {
  id: string;
  loan_id: string;
  payment_schedule_id: string | null;
  amount: any;
  prepayment_date: Date;
  interest_saved: any;
  new_monthly_payment: any;
  new_maturity_date: Date | null;
  penalty_amount: any;
  processed_by: string | null;
  processed_at: Date | null;
  created_at: Date | null;
  loans: any;
  payment_schedules: any;
  users: any;
}

export class PrepaymentService {
  /**
   * Create prepayment record
   */
  async createPrepayment(data: CreatePrepaymentInput): Promise<Prepayment> {
    const prepayment = await prisma.principal_prepayments.create({
      data: {
        loan_id: data.loanId,
        payment_schedule_id: data.paymentScheduleId,
        amount: data.amount,
        prepayment_date: data.prepaymentDate,
        interest_saved: data.interestSaved || 0,
        new_monthly_payment: data.newMonthlyPayment,
        new_maturity_date: data.newMaturityDate,
        penalty_amount: data.penaltyAmount || 0,
        processed_by: data.processedBy,
        processed_at: data.processedBy ? new Date() : null,
        created_at: new Date(),
      },
      include: {
        loans: {
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
        payment_schedules: {
          select: {
            id: true,
            paymentNumber: true,
            dueDate: true,
            principalAmount: true,
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

    return prepayment as Prepayment;
  }

  /**
   * Get prepayment by ID
   */
  async getPrepaymentById(prepaymentId: string): Promise<Prepayment | null> {
    const prepayment = await prisma.principal_prepayments.findUnique({
      where: { id: prepaymentId },
      include: {
        loans: {
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
        payment_schedules: {
          select: {
            id: true,
            paymentNumber: true,
            dueDate: true,
            principalAmount: true,
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

    return prepayment as Prepayment | null;
  }

  /**
   * Get prepayments by loan ID
   */
  async getPrepaymentsByLoanId(loanId: string): Promise<Prepayment[]> {
    const prepayments = await prisma.principal_prepayments.findMany({
      where: { loan_id: loanId },
      include: {
        loans: {
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
        payment_schedules: {
          select: {
            id: true,
            paymentNumber: true,
            dueDate: true,
            principalAmount: true,
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
      orderBy: { prepayment_date: 'desc' },
    });

    return prepayments as Prepayment[];
  }

  /**
   * Get all prepayments with filters
   */
  async getPrepayments(filters?: {
    loanId?: string;
    customerId?: string;
    processedBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<Prepayment[]> {
    const where: any = {};

    if (filters?.loanId) {
      where.loan_id = filters.loanId;
    }

    if (filters?.customerId) {
      where.loans = {
        customerId: filters.customerId,
      };
    }

    if (filters?.processedBy) {
      where.processed_by = filters.processedBy;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.prepayment_date = {};
      if (filters.dateFrom) {
        where.prepayment_date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.prepayment_date.lte = filters.dateTo;
      }
    }

    const prepayments = await prisma.principal_prepayments.findMany({
      where,
      include: {
        loans: {
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
        payment_schedules: {
          select: {
            id: true,
            paymentNumber: true,
            dueDate: true,
            principalAmount: true,
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
      orderBy: { prepayment_date: 'desc' },
      take: filters?.limit || 100,
    });

    return prepayments as Prepayment[];
  }

  /**
   * Update prepayment
   */
  async updatePrepayment(prepaymentId: string, data: UpdatePrepaymentInput): Promise<Prepayment> {
    const prepayment = await prisma.principal_prepayments.update({
      where: { id: prepaymentId },
      data,
      include: {
        loans: {
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
        payment_schedules: {
          select: {
            id: true,
            paymentNumber: true,
            dueDate: true,
            principalAmount: true,
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

    return prepayment as Prepayment;
  }

  /**
   * Process prepayment
   */
  async processPrepayment(prepaymentId: string, processedBy: string): Promise<Prepayment> {
    return this.updatePrepayment(prepaymentId, {});
  }

  /**
   * Calculate total prepayments for loan
   */
  async calculateTotalPrepayments(loanId: string): Promise<{
    totalAmount: number;
    totalInterestSaved: number;
    totalPenalty: number;
    netSavings: number;
    prepaymentCount: number;
  }> {
    const prepayments = await prisma.principal_prepayments.findMany({
      where: { loan_id: loanId },
      select: {
        amount: true,
        interest_saved: true,
        penalty_amount: true,
      },
    });

    const totalAmount = prepayments.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    );
    const totalInterestSaved = prepayments.reduce(
      (sum, p) => sum + parseFloat((p.interest_saved || 0).toString()),
      0
    );
    const totalPenalty = prepayments.reduce(
      (sum, p) => sum + parseFloat((p.penalty_amount || 0).toString()),
      0
    );

    return {
      totalAmount,
      totalInterestSaved,
      totalPenalty,
      netSavings: totalInterestSaved - totalPenalty,
      prepaymentCount: prepayments.length,
    };
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalPrepayments: number;
    totalAmount: number;
    totalInterestSaved: number;
    totalPenalty: number;
    averagePrepaymentAmount: number;
    uniqueLoans: number;
  }> {
    const [totalPrepayments, uniqueLoans, allPrepayments] = await Promise.all([
      prisma.principal_prepayments.count(),
      prisma.principal_prepayments.findMany({
        select: { loan_id: true },
        distinct: ['loan_id'],
      }),
      prisma.principal_prepayments.findMany({
        select: {
          amount: true,
          interest_saved: true,
          penalty_amount: true,
        },
      }),
    ]);

    const totalAmount = allPrepayments.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    );
    const totalInterestSaved = allPrepayments.reduce(
      (sum, p) => sum + parseFloat((p.interest_saved || 0).toString()),
      0
    );
    const totalPenalty = allPrepayments.reduce(
      (sum, p) => sum + parseFloat((p.penalty_amount || 0).toString()),
      0
    );

    return {
      totalPrepayments,
      totalAmount,
      totalInterestSaved,
      totalPenalty,
      averagePrepaymentAmount: totalPrepayments > 0 ? totalAmount / totalPrepayments : 0,
      uniqueLoans: uniqueLoans.length,
    };
  }

  /**
   * Delete prepayment
   */
  async deletePrepayment(prepaymentId: string): Promise<void> {
    await prisma.principal_prepayments.delete({
      where: { id: prepaymentId },
    });
  }

  /**
   * Calculate prepayment impact
   * Helper method to calculate the impact of a prepayment
   */
  calculatePrepaymentImpact(
    loanPrincipal: number,
    remainingBalance: number,
    prepaymentAmount: number,
    interestRate: number,
    remainingMonths: number
  ): {
    newBalance: number;
    interestSaved: number;
    newMonthlyPayment: number;
    monthsSaved: number;
  } {
    // Calculate new balance
    const newBalance = remainingBalance - prepaymentAmount;

    // Calculate monthly interest rate
    const monthlyRate = interestRate / 12;

    // Calculate old monthly payment
    const oldMonthlyPayment =
      (remainingBalance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
      (Math.pow(1 + monthlyRate, remainingMonths) - 1);

    // Calculate new monthly payment with same term
    const newMonthlyPayment =
      (newBalance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
      (Math.pow(1 + monthlyRate, remainingMonths) - 1);

    // Calculate total interest saved
    const oldTotalPayment = oldMonthlyPayment * remainingMonths;
    const newTotalPayment = newMonthlyPayment * remainingMonths;
    const interestSaved = oldTotalPayment - newTotalPayment - prepaymentAmount;

    // Calculate months saved if keeping same monthly payment
    let monthsSaved = 0;
    if (newMonthlyPayment > 0) {
      monthsSaved = Math.max(
        0,
        remainingMonths -
          Math.log(1 - (newBalance * monthlyRate) / oldMonthlyPayment) /
            Math.log(1 + monthlyRate)
      );
    }

    return {
      newBalance,
      interestSaved: Math.max(0, interestSaved),
      newMonthlyPayment,
      monthsSaved: Math.round(monthsSaved),
    };
  }
}

export const prepaymentService = new PrepaymentService();

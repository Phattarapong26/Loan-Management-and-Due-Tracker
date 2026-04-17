import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Debt Management Repository - Database access ONLY
 * NO business logic allowed
 */
export class DebtManagementRepository {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  /**
   * Get all active loans with filters
   */
  async getActiveLoans(filters: {
    branchId?: string;
    year?: string;
    month?: string;
  }) {
    const where: Prisma.LoanWhereInput = {
      status: { in: ['ACTIVE', 'DISBURSED', 'NPL', 'DEFAULTED'] },
    };

    if (filters.branchId && filters.branchId !== 'all') {
      where.branchId = filters.branchId;
    }

    console.log('[Debt Management Repository] Query where:', JSON.stringify(where, null, 2));

    const loans = await this.db.loan.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        loanProduct: {
          select: {
            id: true,
            productName: true,
            productCode: true,
          },
        },
      },
    });

    console.log('[Debt Management Repository] Found loans:', loans.length);

    // Calculate overdueDays for each loan using separate query
    const today = new Date();
    const loansWithOverdueDays = [];
    
    for (const loan of loans) {
      try {
        let overdueDays = 0;
        
        // Get overdue payment schedules for this loan
        const overdueSchedules = await this.db.paymentSchedule.findMany({
          where: {
            loanId: loan.id,
            status: 'OVERDUE',
            paymentDate: {
              lt: today,
            },
          },
          orderBy: {
            paymentDate: 'asc',
          },
          take: 1, // Get only the earliest overdue
        });
        
        if (overdueSchedules.length > 0) {
          const earliestOverdue = overdueSchedules[0];
          const overdueDateMs = today.getTime() - new Date(earliestOverdue.paymentDate).getTime();
          overdueDays = Math.floor(overdueDateMs / (1000 * 60 * 60 * 24));
        }
        
        loansWithOverdueDays.push({
          ...loan,
          overdueDays,
        });
      } catch (error) {
        console.error('[Debt Management Repository] Error processing loan:', loan.id, error);
        // Include loan with 0 overdue days if there's an error
        loansWithOverdueDays.push({
          ...loan,
          overdueDays: 0,
        });
      }
    }

    console.log('[Debt Management Repository] Processed loans:', loansWithOverdueDays.length);
    return loansWithOverdueDays;
  }

  /**
   * Get payment history for interest rate comparison
   */
  async getPaymentHistory(year: number) {
    return this.db.payment.findMany({
      where: {
        paymentDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31),
        },
      },
      include: {
        loan: {
          select: {
            interestRate: true,
            principal: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'asc',
      },
    });
  }
}

export const debtManagementRepository = new DebtManagementRepository();

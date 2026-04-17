/**
 * Debt Management Service
 * Business logic for debt management analytics and reporting
 */

import { logger } from '@utils/common/logger.util';
import {
  DebtManagementQuery,
  DebtManagementResponse,
  ContractSizeDistribution,
  LoanTypeDistribution,
  CollateralTypeDistribution,
  InterestRateDataPoint,
  DebtManagementSummary,
} from '../models/debt-management.model';
import { debtManagementRepository } from '../repositories/debt-management.repository';

export class DebtManagementService {
  /**
   * Get comprehensive debt management summary
   */
  async getDebtManagementSummary(query: DebtManagementQuery): Promise<DebtManagementResponse> {
    try {
      const { year, month, branchId } = query;
      // Note: region and zone filters not yet implemented in repository

      console.log('[Debt Management Service] Query:', { year, month, branchId });

      // Get all active loans with their schedules using repository
      const loans = await debtManagementRepository.getActiveLoans({
        branchId,
        year,
        month,
      });

      console.log('[Debt Management Service] Retrieved loans:', loans.length);

      // Calculate all statistics
      const summary = this.calculateSummary(loans);
      console.log('[Debt Management Service] Summary:', summary);

      const contractSizeDistribution = this.calculateContractSizeDistribution(loans);
      const loanTypeDistribution = this.calculateLoanTypeDistribution(loans);
      const collateralTypeDistribution = await this.calculateCollateralTypeDistribution(loans);
      const interestRateComparison = await this.calculateInterestRateComparison(year);

      return {
        summary,
        contractSizeDistribution,
        loanTypeDistribution,
        collateralTypeDistribution,
        interestRateComparison,
      };
    } catch (error) {
      logger.error({ error }, 'Error in getDebtManagementSummary');
      throw error;
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(loans: any[]): DebtManagementSummary {
    const totalLoans = loans.length;
    let nplCount = 0;
    let overdueCount = 0;
    let performingCount = 0;

    loans.forEach((loan) => {
      if (loan.overdueDays >= 30) {
        nplCount++;
      } else if (loan.overdueDays > 0) {
        overdueCount++;
      } else {
        performingCount++;
      }
    });

    const totalOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstandingBalance), 0);
    const performingAmount = loans
      .filter((l) => l.overdueDays === 0)
      .reduce((sum, loan) => sum + Number(loan.outstandingBalance), 0);
    const overdueAmount = loans
      .filter((l) => l.overdueDays > 0 && l.overdueDays < 30)
      .reduce((sum, loan) => sum + Number(loan.outstandingBalance), 0);
    const nplAmount = loans
      .filter((l) => l.overdueDays >= 30)
      .reduce((sum, loan) => sum + Number(loan.outstandingBalance), 0);

    return {
      totalLoans,
      totalOutstanding,
      performingCount,
      performingAmount,
      performingPercentage: totalLoans > 0 ? (performingCount / totalLoans) * 100 : 0,
      overdueCount,
      overdueAmount,
      overduePercentage: totalLoans > 0 ? (overdueCount / totalLoans) * 100 : 0,
      nplCount,
      nplAmount,
      nplPercentage: totalLoans > 0 ? (nplCount / totalLoans) * 100 : 0,
    };
  }

  /**
   * Calculate contract size distribution
   */
  private calculateContractSizeDistribution(loans: any[]): ContractSizeDistribution {
    const distribution: ContractSizeDistribution = {
      small: 0,
      medium: 0,
      large: 0,
    };

    loans.forEach((loan) => {
      const principal = Number(loan.principal);

      if (principal <= 1000000) {
        distribution.small++;
      } else if (principal <= 3000000) {
        distribution.medium++;
      } else {
        distribution.large++;
      }
    });

    return distribution;
  }

  /**
   * Calculate loan type distribution
   */
  private calculateLoanTypeDistribution(loans: any[]): LoanTypeDistribution {
    const distribution: LoanTypeDistribution = {};

    loans.forEach((loan) => {
      const productName = loan.loanProduct?.productName || 'อื่นๆ';
      distribution[productName] = (distribution[productName] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculate collateral type distribution
   * TODO: Implement when collateral table is available
   */
  private async calculateCollateralTypeDistribution(loans: any[]): Promise<CollateralTypeDistribution> {
    // Mock data for now - would need to query collateral table
    const total = loans.length;
    return {
      land: Math.floor(total * 0.4),
      machinery: Math.floor(total * 0.27),
      vehicle: Math.floor(total * 0.2),
      deposit: Math.floor(total * 0.1),
      other: Math.floor(total * 0.03),
    };
  }

  /**
   * Calculate interest rate comparison
   */
  private async calculateInterestRateComparison(year?: string): Promise<InterestRateDataPoint[]> {
    try {
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      // Get payment history for the year using repository
      const payments = await debtManagementRepository.getPaymentHistory(targetYear);

      // Group by month and calculate actual vs expected interest
      const monthlyData: Record<
        string,
        { actual: number; expected: number; count: number }
      > = {};
      const monthNames = [
        'ม.ค.',
        'ก.พ.',
        'มี.ค.',
        'เม.ย.',
        'พ.ค.',
        'มิ.ย.',
        'ก.ค.',
        'ส.ค.',
        'ก.ย.',
        'ต.ค.',
        'พ.ย.',
        'ธ.ค.',
      ];

      // Initialize all months
      monthNames.forEach((month) => {
        monthlyData[month] = { actual: 0, expected: 0, count: 0 };
      });

      payments.forEach((payment) => {
        const monthIndex = payment.paymentDate.getMonth();
        const monthKey = monthNames[monthIndex];

        if (!monthKey) return; // Skip if month is invalid

        // Calculate interest from payment amount (assuming 30% is interest)
        const interestPaid = Number(payment.amount || 0) * 0.3;
        const expectedInterest = Number(payment.loan?.interestRate || 0);

        const monthData = monthlyData[monthKey];
        if (monthData) {
          monthData.actual += interestPaid;
          monthData.expected += expectedInterest;
          monthData.count++;
        }
      });

      // Calculate averages and return first 6 months
      const result = monthNames.slice(0, 6).map((month) => {
        const data = monthlyData[month];
        if (!data) {
          return { month, actual: 0, expected: 0 };
        }
        return {
          month,
          actual: data.count > 0 ? data.actual / data.count / 1000 : 0, // Convert to percentage-like scale
          expected: data.count > 0 ? data.expected / data.count / 10 : 0,
        };
      });

      return result;
    } catch (error) {
      logger.error({ error }, 'Error calculating interest rate comparison');
      // Return mock data if calculation fails
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'];
      return months.map((month) => ({
        month,
        actual: 2.8 + Math.random() * 0.4,
        expected: 3.2 + Math.random() * 0.3,
      }));
    }
  }

  /**
   * Get contract size distribution details
   */
  async getContractSizeDistribution(query: DebtManagementQuery) {
    const { branchId, year, month } = query;

    const loans = await debtManagementRepository.getActiveLoans({
      branchId,
      year,
      month,
    });

    const distribution = {
      ranges: [
        { label: '0-1 ล้านบาท', min: 0, max: 1000000, count: 0, totalAmount: 0 },
        { label: '1-3 ล้านบาท', min: 1000000, max: 3000000, count: 0, totalAmount: 0 },
        { label: '5-15 ล้านบาท', min: 3000000, max: 15000000, count: 0, totalAmount: 0 },
      ],
    };

    loans.forEach((loan) => {
      const principal = Number(loan.principal);
      const outstanding = Number(loan.outstandingBalance);

      distribution.ranges.forEach((range) => {
        if (principal > range.min && principal <= range.max) {
          range.count++;
          range.totalAmount += outstanding;
        }
      });
    });

    return distribution;
  }

  /**
   * Get loan type distribution details
   */
  async getLoanTypeDistribution(query: DebtManagementQuery) {
    const { branchId, year, month } = query;

    const loans = await debtManagementRepository.getActiveLoans({
      branchId,
      year,
      month,
    });

    const distribution: Record<string, { count: number; totalAmount: number }> = {};

    loans.forEach((loan) => {
      const productName = loan.loanProduct?.productName || 'อื่นๆ';

      if (!distribution[productName]) {
        distribution[productName] = { count: 0, totalAmount: 0 };
      }

      distribution[productName].count++;
      distribution[productName].totalAmount += Number(loan.outstandingBalance);
    });

    return distribution;
  }
}

export const debtManagementService = new DebtManagementService();

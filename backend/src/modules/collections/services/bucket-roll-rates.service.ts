/**
 * Bucket Roll Rates Service
 * 
 * Purpose: Analyze portfolio quality and predict NPL risk
 * - Calculate roll rates between aging buckets
 * - Track flow from Current to NPL
 * - Predict future NPL based on historical patterns
 * 
 * Aging Buckets:
 * - CURRENT: 0 days overdue
 * - DPD_1_30: 1-30 days past due
 * - DPD_31_60: 31-60 days past due
 * - DPD_61_90: 61-90 days past due
 * - NPL: 90+ days past due (Non-Performing Loan)
 */

import { AgingAnalysisRepository } from '../repositories/aging-analysis.repository';
import { logger } from '@utils/common/logger.util';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface BucketDistribution {
    bucket: string;
    count: number;
    totalAmount: number;
    percentage: number;
}

export interface RollRate {
    fromBucket: string;
    toBucket: string;
    count: number;
    rollRate: number; // Percentage
    avgAmount: number;
}

export interface BucketRollRatesAnalysis {
    asOfDate: Date;
    distribution: BucketDistribution[];
    rollRates: RollRate[];
    summary: {
        totalLoans: number;
        totalOverdue: number;
        nplCount: number;
        nplRate: number;
        rollToNPLRate: number; // Predicted NPL rate based on roll rates
    };
    trends: {
        month: string;
        distribution: BucketDistribution[];
    }[];
}

export class BucketRollRatesService {
    private agingAnalysisRepository: AgingAnalysisRepository;

    constructor() {
        this.agingAnalysisRepository = new AgingAnalysisRepository();
    }

    /**
     * Get comprehensive bucket roll rates analysis
     */
    async getBucketRollRatesAnalysis(branchId?: string): Promise<BucketRollRatesAnalysis> {
        try {
            const today = new Date();
            const currentMonth = startOfMonth(today);
            const previousMonth = startOfMonth(subMonths(today, 1));

            // Get current distribution
            const currentDistribution = await this.getBucketDistribution(currentMonth, endOfMonth(today), branchId);

            // Calculate roll rates
            const rollRates = await this.calculateRollRates(previousMonth, currentMonth, branchId);

            // Get historical trends (last 6 months)
            const trends = await this.getHistoricalTrends(6, branchId);

            // Calculate summary metrics
            const totalLoans = currentDistribution.reduce((sum, b) => sum + b.count, 0);
            const nplBucket = currentDistribution.find((b) => b.bucket === 'NPL');
            const nplCount = nplBucket?.count || 0;
            const nplRate = totalLoans > 0 ? (nplCount / totalLoans) * 100 : 0;

            // Calculate predicted NPL rate based on roll rates
            const rollToNPLRate = this.calculatePredictedNPLRate(rollRates, currentDistribution);

            const totalOverdue = currentDistribution
                .filter((b) => b.bucket !== 'CURRENT')
                .reduce((sum, b) => sum + b.count, 0);

            return {
                asOfDate: today,
                distribution: currentDistribution,
                rollRates,
                summary: {
                    totalLoans,
                    totalOverdue,
                    nplCount,
                    nplRate,
                    rollToNPLRate,
                },
                trends,
            };
        } catch (error) {
            logger.error({ error, branchId }, 'Error getting bucket roll rates analysis');
            throw error;
        }
    }

    /**
     * Get bucket distribution for a specific period
     */
    private async getBucketDistribution(
        startDate: Date,
        endDate: Date,
        branchId?: string
    ): Promise<BucketDistribution[]> {
        const where: any = {
            created_at: {
                gte: startDate,
                lte: endDate,
            },
            status: 'ACTIVE',
        };

        if (branchId) {
            where.branch_id = branchId;
        }

        const agingRecords = await this.agingAnalysisRepository.findByBranchAndDate(branchId, startDate);

        // Group by bucket
        const bucketMap = new Map<string, { count: number; totalAmount: number }>();
        
        agingRecords.forEach((record) => {
            const bucket = record.aging_bucket;
            const amount = Number(record.total_overdue || 0);
            
            if (!bucketMap.has(bucket)) {
                bucketMap.set(bucket, { count: 0, totalAmount: 0 });
            }
            
            const current = bucketMap.get(bucket)!;
            current.count += 1;
            current.totalAmount += amount;
        });

        // Convert to array and calculate percentages
        const totalCount = agingRecords.length;
        const distribution: BucketDistribution[] = [];

        // Ensure all buckets are represented
        const allBuckets = ['CURRENT', 'DPD_1_30', 'DPD_31_60', 'DPD_61_90', 'NPL'];
        
        allBuckets.forEach((bucket) => {
            const data = bucketMap.get(bucket) || { count: 0, totalAmount: 0 };
            distribution.push({
                bucket,
                count: data.count,
                totalAmount: data.totalAmount,
                percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
            });
        });

        return distribution;
    }

    /**
     * Calculate roll rates between periods
     */
    private async calculateRollRates(
        previousMonth: Date,
        currentMonth: Date,
        branchId?: string
    ): Promise<RollRate[]> {
        // Get loans from previous month
        const previousWhere: any = {
            created_at: {
                gte: previousMonth,
                lte: endOfMonth(previousMonth),
            },
            status: 'ACTIVE',
        };
        
        if (branchId) {
            previousWhere.branch_id = branchId;
        }

        const previousRecords = await this.agingAnalysisRepository.findByBranchAndDate(branchId, previousMonth);

        // Get current month records for the same loans
        const loanIds = previousRecords.map((r) => r.loan_id);
        
        const currentWhere: any = {
            loan_id: { in: loanIds },
            created_at: {
                gte: currentMonth,
                lte: endOfMonth(currentMonth),
            },
            status: 'ACTIVE',
        };

        const currentRecords = await this.agingAnalysisRepository.findByBranchAndDate(branchId, currentMonth);

        // Create map for current records
        const currentMap = new Map(currentRecords.map((r) => [r.loan_id, r]));

        // Calculate transitions
        const transitions = new Map<string, { count: number; totalAmount: number }>();

        previousRecords.forEach((prev) => {
            const current = currentMap.get(prev.loan_id);
            if (current) {
                const key = `${prev.aging_bucket}->${current.aging_bucket}`;
                if (!transitions.has(key)) {
                    transitions.set(key, { count: 0, totalAmount: 0 });
                }
                const trans = transitions.get(key)!;
                trans.count += 1;
                trans.totalAmount += Number(current.total_overdue || 0);
            }
        });

        // Calculate roll rates
        const rollRates: RollRate[] = [];
        const bucketCounts = new Map<string, number>();

        // Count loans in each bucket in previous month
        previousRecords.forEach((r) => {
            bucketCounts.set(r.aging_bucket, (bucketCounts.get(r.aging_bucket) || 0) + 1);
        });

        // Convert transitions to roll rates
        transitions.forEach((data, key) => {
            const [fromBucket, toBucket] = key.split('->');
            
            // Skip if bucket names are invalid
            if (!fromBucket || !toBucket) return;
            
            const fromCount = bucketCounts.get(fromBucket) || 0;
            const rollRate = fromCount > 0 ? (data.count / fromCount) * 100 : 0;
            const avgAmount = data.count > 0 ? data.totalAmount / data.count : 0;

            rollRates.push({
                fromBucket,
                toBucket,
                count: data.count,
                rollRate,
                avgAmount,
            });
        });

        return rollRates.sort((a, b) => b.rollRate - a.rollRate);
    }

    /**
     * Get historical trends
     */
    private async getHistoricalTrends(
        months: number,
        branchId?: string
    ): Promise<{ month: string; distribution: BucketDistribution[] }[]> {
        const trends: { month: string; distribution: BucketDistribution[] }[] = [];
        const today = new Date();

        for (let i = 0; i < months; i++) {
            const monthDate = subMonths(today, i);
            const startDate = startOfMonth(monthDate);
            const endDate = endOfMonth(monthDate);

            const distribution = await this.getBucketDistribution(startDate, endDate, branchId);

            trends.push({
                month: format(monthDate, 'MMM yyyy'),
                distribution,
            });
        }

        return trends.reverse(); // Oldest first
    }

    /**
     * Calculate predicted NPL rate based on roll rates
     */
    private calculatePredictedNPLRate(
        rollRates: RollRate[],
        currentDistribution: BucketDistribution[]
    ): number {
        // Find roll rates to NPL from each bucket
        const rollToNPL = rollRates.filter((r) => r.toBucket === 'NPL');

        let predictedNPL = 0;
        const totalLoans = currentDistribution.reduce((sum, b) => sum + b.count, 0);

        rollToNPL.forEach((roll) => {
            const bucket = currentDistribution.find((b) => b.bucket === roll.fromBucket);
            if (bucket) {
                // Predicted NPL = Current count in bucket × Roll rate to NPL
                predictedNPL += bucket.count * (roll.rollRate / 100);
            }
        });

        return totalLoans > 0 ? (predictedNPL / totalLoans) * 100 : 0;
    }

    /**
     * Get bucket name in Thai
     */
    getBucketNameTH(bucket: string): string {
        const names: Record<string, string> = {
            CURRENT: 'ปกติ',
            DPD_1_30: 'ค้าง 1-30 วัน',
            DPD_31_60: 'ค้าง 31-60 วัน',
            DPD_61_90: 'ค้าง 61-90 วัน',
            NPL: 'NPL (90+ วัน)',
        };
        return names[bucket] || bucket;
    }
}

export const bucketRollRatesService = new BucketRollRatesService();

/**
 * Bucket Roll Rates Service (Real-time from Payment Schedules)
 * 
 * Purpose: Analyze portfolio quality and predict NPL risk using real-time data
 * - Calculate roll rates between aging buckets from payment schedules
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

import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import {
    subMonths,
    format,
    differenceInDays,
    endOfWeek,
    subWeeks,
    endOfMonth,
} from 'date-fns';

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
    interval: 'week' | 'month';
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
        month: string; // legacy label used by frontend (period label)
        asOfDate: Date;
        distribution: BucketDistribution[];
        metrics?: {
            rollForwardRate: number;
            rollBackRate: number;
            stayedRate: number;
            rollToNPLRate: number;
            nplRate: number;
        };
    }[];
}

/**
 * Determine aging bucket based on days overdue
 */
function getAgingBucket(daysOverdue: number): string {
    if (daysOverdue <= 0) return 'CURRENT';
    if (daysOverdue <= 30) return 'DPD_1_30';
    if (daysOverdue <= 60) return 'DPD_31_60';
    if (daysOverdue <= 90) return 'DPD_61_90';
    return 'NPL';
}

export class BucketRollRatesRealtimeService {
    /**
     * Get comprehensive bucket roll rates analysis from payment schedules
     */
    async getBucketRollRatesAnalysis(
        branchId?: string,
        opts?: { interval?: 'week' | 'month'; points?: number; officerId?: string; productId?: string }
    ): Promise<BucketRollRatesAnalysis> {
        try {
            const today = new Date();
            const interval = opts?.interval || 'month';
            const points = Math.max(3, Math.min(12, opts?.points ?? (interval === 'week' ? 8 : 6)));

            const trends = await this.getHistoricalTrends(points, interval, branchId, opts?.officerId, opts?.productId);
            const currentPoint = trends[trends.length - 1];
            const prevPoint = trends[trends.length - 2];

            const currentDistribution = currentPoint?.distribution || [];

            // Calculate roll rates between the latest two periods using loan-level buckets (source of truth)
            const rollRates = prevPoint && currentPoint
                ? await this.calculateRollRatesBetweenDates(prevPoint.asOfDate, currentPoint.asOfDate, branchId, opts?.officerId, opts?.productId)
                : [];

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
                interval,
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
     * Get bucket distribution from payment schedules
     */
    private async getBucketDistributionFromSchedules(
        asOfDate: Date,
        branchId?: string
    ): Promise<BucketDistribution[]> {
        const { distribution } = await this.getLoanBucketsAsOf(asOfDate, branchId);
        return distribution;
    }

    private async getLoanBucketsAsOf(
        asOfDate: Date,
        branchId?: string,
        officerId?: string,
        productId?: string
    ): Promise<{
        loanBuckets: Map<string, { bucket: string; amount: number }>;
        distribution: BucketDistribution[];
    }> {
        // Build where clause for branch filtering
        const branchWhere = branchId ? { branchId } : {};
        const and: any[] = [];
        if (productId) and.push({ loanProductId: productId });
        if (officerId) {
            and.push({
                OR: [{ officerId }, { customer: { createdBy: officerId } }],
            });
        }

        // Get all active portfolio loans (not just schedules that are due)
        // Keep status definition consistent with "Active Contracts" / Payments screens:
        // ACTIVE, DISBURSED, DEFAULTED, NPL
        const activeLoans = await prisma.loan.findMany({
            where: {
                ...branchWhere,
                status: {
                    in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'],
                },
                ...(and.length > 0 ? { AND: and } : {}),
            },
            select: {
                id: true,
            },
        });

        const activeLoanIds = activeLoans.map(l => l.id);

        // Get unpaid schedules for active loans (including future dates for proper counting)
        const schedules = await prisma.paymentSchedule.findMany({
            where: {
                loanId: {
                    in: activeLoanIds,
                },
                status: {
                    in: ['UNPAID', 'PARTIAL', 'OVERDUE'],
                },
            },
            select: {
                id: true,
                paymentDate: true,
                totalPayment: true,
                loanId: true,
            },
        });

        // Earliest unpaid schedule per loan (source of truth for "next due" and DPD)
        const loanEarliestSchedule = new Map<string, { paymentDate: Date; amount: number }>();
        
        schedules.forEach((schedule: any) => {
            const existing = loanEarliestSchedule.get(schedule.loanId);
            if (!existing || new Date(schedule.paymentDate) < new Date(existing.paymentDate)) {
                loanEarliestSchedule.set(schedule.loanId, {
                    paymentDate: new Date(schedule.paymentDate),
                    amount: Number(schedule.totalPayment || 0),
                });
            }
        });

        const loanBuckets = new Map<string, { bucket: string; amount: number }>();

        for (const loanId of activeLoanIds) {
            const earliest = loanEarliestSchedule.get(loanId);
            if (!earliest) {
                loanBuckets.set(loanId, { bucket: 'CURRENT', amount: 0 });
                continue;
            }
            const daysOverdue = differenceInDays(asOfDate, earliest.paymentDate);
            const bucket = getAgingBucket(daysOverdue);
            loanBuckets.set(loanId, { bucket, amount: earliest.amount });
        }

        // Categorize loans by bucket based on earliest unpaid schedule
        const bucketMap = new Map<string, { loanIds: Set<string>; totalAmount: number }>();

        loanBuckets.forEach((data, loanId) => {
            if (!bucketMap.has(data.bucket)) {
                bucketMap.set(data.bucket, { loanIds: new Set(), totalAmount: 0 });
            }
            const current = bucketMap.get(data.bucket)!;
            current.loanIds.add(loanId);
            current.totalAmount += data.amount;
        });

        // Convert to array and calculate percentages
        const totalCount = activeLoanIds.length; // Use total active loans, not schedules
        const distribution: BucketDistribution[] = [];

        // Ensure all buckets are represented
        const allBuckets = ['CURRENT', 'DPD_1_30', 'DPD_31_60', 'DPD_61_90', 'NPL'];
        
        allBuckets.forEach((bucket) => {
            const data = bucketMap.get(bucket) || { loanIds: new Set(), totalAmount: 0 };
            distribution.push({
                bucket,
                count: data.loanIds.size,
                totalAmount: data.totalAmount,
                percentage: totalCount > 0 ? (data.loanIds.size / totalCount) * 100 : 0,
            });
        });

        return { loanBuckets, distribution };
    }

    /**
     * Calculate roll rates between two as-of dates (loan-level buckets)
     */
    private async calculateRollRatesBetweenDates(
        previousAsOf: Date,
        currentAsOf: Date,
        branchId?: string,
        officerId?: string,
        productId?: string
    ): Promise<RollRate[]> {
        const { loanBuckets: previousBuckets } = await this.getLoanBucketsAsOf(previousAsOf, branchId, officerId, productId);
        const { loanBuckets: currentBuckets } = await this.getLoanBucketsAsOf(currentAsOf, branchId, officerId, productId);

        const loanIds = Array.from(new Set([...previousBuckets.keys(), ...currentBuckets.keys()]));

        // Calculate transitions
        const transitions = new Map<string, { count: number; totalAmount: number }>();

        for (const loanId of loanIds) {
            const prevBucket = previousBuckets.get(loanId)?.bucket || 'CURRENT';
            const current = currentBuckets.get(loanId) || { bucket: 'CURRENT', amount: 0 };
            const key = `${prevBucket}->${current.bucket}`;
            if (!transitions.has(key)) {
                transitions.set(key, { count: 0, totalAmount: 0 });
            }
            const trans = transitions.get(key)!;
            trans.count += 1;
            trans.totalAmount += current.amount;
        }

        // Calculate roll rates
        const rollRates: RollRate[] = [];
        const bucketCounts = new Map<string, number>();

        // Count loans in each bucket in previous month
        loanIds.forEach((loanId) => {
            const bucket = previousBuckets.get(loanId)?.bucket || 'CURRENT';
            bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
        });

        // Convert transitions to roll rates
        transitions.forEach((data, key) => {
            const parts = key.split('->');
            if (parts.length === 2) {
                const fromBucket = parts[0] || '';
                const toBucket = parts[1] || '';
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
            }
        });

        return rollRates.sort((a, b) => b.rollRate - a.rollRate);
    }

    /**
     * Get historical trends
     */
    private async getHistoricalTrends(
        months: number,
        interval: 'week' | 'month',
        branchId?: string,
        officerId?: string,
        productId?: string
    ): Promise<BucketRollRatesAnalysis['trends']> {
        const trends: BucketRollRatesAnalysis['trends'] = [];
        const today = new Date();

        const asOfDates: Date[] = [];
        for (let i = months - 1; i >= 0; i--) {
            if (interval === 'week') {
                asOfDates.push(endOfWeek(subWeeks(today, i), { weekStartsOn: 1 }));
            } else {
                asOfDates.push(endOfMonth(subMonths(today, i)));
            }
        }

        const bucketRank: Record<string, number> = {
            CURRENT: 0,
            DPD_1_30: 1,
            DPD_31_60: 2,
            DPD_61_90: 3,
            NPL: 4,
        };

        let prevBuckets: Map<string, { bucket: string; amount: number }> | null = null;
        let prevAsOfDate: Date | null = null;

        for (const asOfDate of asOfDates) {
            const { loanBuckets, distribution } = await this.getLoanBucketsAsOf(asOfDate, branchId, officerId, productId);

            const totalLoans = distribution.reduce((sum, b) => sum + b.count, 0);
            const nplCount = distribution.find((b) => b.bucket === 'NPL')?.count || 0;
            const nplRate = totalLoans > 0 ? (nplCount / totalLoans) * 100 : 0;

            let metrics: BucketRollRatesAnalysis['trends'][number]['metrics'] | undefined = undefined;
            if (prevBuckets && prevAsOfDate) {
                const rollRates = this.calculateRollRatesFromBucketMaps(prevBuckets, loanBuckets);
                const rollToNPLRate = this.calculatePredictedNPLRate(rollRates, distribution);

                const loanIds = Array.from(new Set([...prevBuckets.keys(), ...loanBuckets.keys()]));
                let forward = 0;
                let back = 0;
                let stayed = 0;
                for (const loanId of loanIds) {
                    const prevB = prevBuckets.get(loanId)?.bucket || 'CURRENT';
                    const currB = loanBuckets.get(loanId)?.bucket || 'CURRENT';
                    const prevR = bucketRank[prevB] ?? 0;
                    const currR = bucketRank[currB] ?? 0;
                    if (currR > prevR) forward += 1;
                    else if (currR < prevR) back += 1;
                    else stayed += 1;
                }
                const denom = loanIds.length || 1;
                metrics = {
                    rollForwardRate: (forward / denom) * 100,
                    rollBackRate: (back / denom) * 100,
                    stayedRate: (stayed / denom) * 100,
                    rollToNPLRate,
                    nplRate,
                };
            }

            const label =
                interval === 'week'
                    ? `W${format(asOfDate, 'II')} ${format(asOfDate, 'yyyy')}`
                    : format(asOfDate, 'MMM yyyy');

            trends.push({
                month: label,
                asOfDate,
                distribution,
                metrics,
            });

            prevBuckets = loanBuckets;
            prevAsOfDate = asOfDate;
        }

        return trends;
    }

    private calculateRollRatesFromBucketMaps(
        previousBuckets: Map<string, { bucket: string; amount: number }>,
        currentBuckets: Map<string, { bucket: string; amount: number }>
    ): RollRate[] {
        const loanIds = Array.from(new Set([...previousBuckets.keys(), ...currentBuckets.keys()]));

        const transitions = new Map<string, { count: number; totalAmount: number }>();
        for (const loanId of loanIds) {
            const prevBucket = previousBuckets.get(loanId)?.bucket || 'CURRENT';
            const current = currentBuckets.get(loanId) || { bucket: 'CURRENT', amount: 0 };
            const key = `${prevBucket}->${current.bucket}`;
            if (!transitions.has(key)) {
                transitions.set(key, { count: 0, totalAmount: 0 });
            }
            const trans = transitions.get(key)!;
            trans.count += 1;
            trans.totalAmount += current.amount;
        }

        const bucketCounts = new Map<string, number>();
        loanIds.forEach((loanId) => {
            const bucket = previousBuckets.get(loanId)?.bucket || 'CURRENT';
            bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
        });

        const rollRates: RollRate[] = [];
        transitions.forEach((data, key) => {
            const parts = key.split('->');
            if (parts.length !== 2) return;
            const fromBucket = parts[0] || '';
            const toBucket = parts[1] || '';
            const fromCount = bucketCounts.get(fromBucket) || 0;
            const rollRate = fromCount > 0 ? (data.count / fromCount) * 100 : 0;
            const avgAmount = data.count > 0 ? data.totalAmount / data.count : 0;
            rollRates.push({ fromBucket, toBucket, count: data.count, rollRate, avgAmount });
        });

        return rollRates.sort((a, b) => b.rollRate - a.rollRate);
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

export const bucketRollRatesRealtimeService = new BucketRollRatesRealtimeService();

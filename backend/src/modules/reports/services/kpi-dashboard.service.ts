/**
 * KPI Dashboard Service
 * 
 * Purpose: Real-time KPI dashboard for branch managers
 * Features:
 * - Branch-level KPI calculation
 * - Comparison with previous periods
 * - Threshold alerts
 * - Drill-down capabilities
 * 
 * Requirements: Requirement 10 - KPI Dashboard
 */

import { prisma } from '@config/database.config';

export interface BranchKPIs {
    branchId: string;
    branchName: string;
    period: {
        start: Date;
        end: Date;
    };
    totalLoans: number;
    totalDisbursement: number;
    outstandingBalance: number;
    collectionRate: number;
    nplRatio: number;
    nplCount: number;
    activeCustomers: number;
    newLoansThisMonth: number;
    comparison: {
        previousDay: {
            totalLoans: number;
            disbursement: number;
        };
        previousMonth: {
            totalLoans: number;
            disbursement: number;
            collectionRate: number;
            nplRatio: number;
        };
    };
    alerts: Array<{
        type: 'NPL' | 'COLLECTION' | 'DISBURSEMENT';
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
        message: string;
    }>;
}

export class KPIDashboardService {
    /**
     * Task 6.2.2: Get branch KPIs for current month
     */
    async getBranchKPIs(branchId: string): Promise<BranchKPIs> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            // Get branch info
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { name: true },
            });

            if (!branch) {
                throw new Error('Branch not found');
            }

            // Task 6.2.3: Calculate total loans and disbursement
            const totalLoans = await prisma.loan.count({
                where: {
                    customer: { branchId },
                    status: { in: ['ACTIVE', 'APPROVED', 'NPL'] },
                },
            });

            const disbursementData = await prisma.loan.aggregate({
                where: {
                    customer: { branchId },
                    status: { in: ['ACTIVE', 'APPROVED', 'NPL'] },
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
                _sum: { principal: true },
                _count: true,
            });

            const totalDisbursement = Number(disbursementData._sum.principal || 0);
            const newLoansThisMonth = disbursementData._count;

            // Calculate outstanding balance
            const outstandingData = await prisma.loan.aggregate({
                where: {
                    customer: { branchId },
                    status: { in: ['ACTIVE', 'NPL'] },
                },
                _sum: { outstandingBalance: true },
            });

            const outstandingBalance = Number(outstandingData._sum.outstandingBalance || 0);

            // Task 6.2.3: Calculate collection rate
            const paymentsThisMonth = await prisma.payment.aggregate({
                where: {
                    loan: {
                        customer: { branchId },
                    },
                    paymentDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
                _sum: { amount: true },
            });

            const scheduledPayments = await prisma.paymentSchedule.aggregate({
                where: {
                    loan: {
                        customer: { branchId },
                    },
                    paymentDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
                _sum: { totalPayment: true },
            });

            const scheduledAmount = Number(scheduledPayments._sum.totalPayment || 0);
            const receivedAmount = Number(paymentsThisMonth._sum.amount || 0);
            const collectionRate = scheduledAmount > 0 ? (receivedAmount / scheduledAmount) * 100 : 0;

            // Task 6.2.4: Calculate NPL ratio (>90 days overdue)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const nplLoans = await prisma.loan.findMany({
                where: {
                    customer: { branchId },
                    status: 'NPL',
                    paymentSchedule: {
                        some: {
                            paymentDate: { lt: ninetyDaysAgo },
                            status: 'UNPAID',
                        },
                    },
                },
                select: {
                    id: true,
                    outstandingBalance: true,
                },
            });

            const nplCount = nplLoans.length;
            const nplBalance = nplLoans.reduce((sum, loan) => sum + Number(loan.outstandingBalance || 0), 0);
            const nplRatio = outstandingBalance > 0 ? (nplBalance / outstandingBalance) * 100 : 0;

            // Task 6.2.5: Calculate active customers
            const activeCustomers = await prisma.customer.count({
                where: {
                    branchId,
                    loans: {
                        some: {
                            status: { in: ['ACTIVE', 'NPL'] },
                        },
                    },
                },
            });

            // Task 6.2.7: Get comparison data
            // Previous day
            const previousDayLoans = await prisma.loan.count({
                where: {
                    customer: { branchId },
                    createdAt: {
                        gte: yesterday,
                        lt: now,
                    },
                },
            });

            const previousDayDisbursement = await prisma.loan.aggregate({
                where: {
                    customer: { branchId },
                    createdAt: {
                        gte: yesterday,
                        lt: now,
                    },
                },
                _sum: { principal: true },
            });

            // Previous month
            const previousMonthLoans = await prisma.loan.count({
                where: {
                    customer: { branchId },
                    createdAt: {
                        gte: startOfPreviousMonth,
                        lte: endOfPreviousMonth,
                    },
                },
            });

            const previousMonthDisbursement = await prisma.loan.aggregate({
                where: {
                    customer: { branchId },
                    createdAt: {
                        gte: startOfPreviousMonth,
                        lte: endOfPreviousMonth,
                    },
                },
                _sum: { principal: true },
            });

            // Previous month collection rate
            const previousMonthPayments = await prisma.payment.aggregate({
                where: {
                    loan: {
                        customer: { branchId },
                    },
                    paymentDate: {
                        gte: startOfPreviousMonth,
                        lte: endOfPreviousMonth,
                    },
                },
                _sum: { amount: true },
            });

            const previousMonthScheduled = await prisma.paymentSchedule.aggregate({
                where: {
                    loan: {
                        customer: { branchId },
                    },
                    paymentDate: {
                        gte: startOfPreviousMonth,
                        lte: endOfPreviousMonth,
                    },
                },
                _sum: { totalPayment: true },
            });

            const prevScheduledAmount = Number(previousMonthScheduled._sum.totalPayment || 0);
            const prevReceivedAmount = Number(previousMonthPayments._sum.amount || 0);
            const previousMonthCollectionRate = prevScheduledAmount > 0 ? (prevReceivedAmount / prevScheduledAmount) * 100 : 0;

            // Task 6.2.8: Generate alerts for thresholds
            const alerts: Array<{
                type: 'NPL' | 'COLLECTION' | 'DISBURSEMENT';
                severity: 'HIGH' | 'MEDIUM' | 'LOW';
                message: string;
            }> = [];

            if (nplRatio > 5) {
                alerts.push({
                    type: 'NPL',
                    severity: nplRatio > 10 ? 'HIGH' : 'MEDIUM',
                    message: `⚠️ NPL Ratio สูง: ${nplRatio.toFixed(2)}% (เกินเกณฑ์ 5%)`,
                });
            }

            if (collectionRate < 90) {
                alerts.push({
                    type: 'COLLECTION',
                    severity: collectionRate < 80 ? 'HIGH' : 'MEDIUM',
                    message: `⚠️ Collection Rate ต่ำ: ${collectionRate.toFixed(2)}% (ต่ำกว่าเกณฑ์ 90%)`,
                });
            }

            return {
                branchId,
                branchName: branch.name,
                period: {
                    start: startOfMonth,
                    end: endOfMonth,
                },
                totalLoans,
                totalDisbursement,
                outstandingBalance,
                collectionRate,
                nplRatio,
                nplCount,
                activeCustomers,
                newLoansThisMonth,
                comparison: {
                    previousDay: {
                        totalLoans: previousDayLoans,
                        disbursement: Number(previousDayDisbursement._sum.principal || 0),
                    },
                    previousMonth: {
                        totalLoans: previousMonthLoans,
                        disbursement: Number(previousMonthDisbursement._sum.principal || 0),
                        collectionRate: previousMonthCollectionRate,
                        nplRatio: 0, // Would need historical NPL data
                    },
                },
                alerts,
            };
        } catch (error) {
            console.error('Error getting branch KPIs:', error);
            throw error;
        }
    }

    /**
     * Task 6.2.9: Get drill-down data for specific metric
     */
    async getDrillDownData(
        branchId: string,
        metric: 'NPL' | 'COLLECTION' | 'DISBURSEMENT' | 'CUSTOMERS'
    ): Promise<any> {
        try {
            switch (metric) {
                case 'NPL':
                    return await this.getNPLDrillDown(branchId);
                case 'COLLECTION':
                    return await this.getCollectionDrillDown(branchId);
                case 'DISBURSEMENT':
                    return await this.getDisbursementDrillDown(branchId);
                case 'CUSTOMERS':
                    return await this.getCustomersDrillDown(branchId);
                default:
                    throw new Error('Invalid metric');
            }
        } catch (error) {
            console.error('Error getting drill-down data:', error);
            throw error;
        }
    }

    /**
     * NPL drill-down: List of NPL loans
     */
    private async getNPLDrillDown(branchId: string): Promise<any> {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const nplLoans = await prisma.loan.findMany({
            where: {
                customer: { branchId },
                status: 'NPL',
                paymentSchedule: {
                    some: {
                        paymentDate: { lt: ninetyDaysAgo },
                        status: 'UNPAID',
                    },
                },
            },
            include: {
                customer: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                paymentSchedule: {
                    where: {
                        status: 'UNPAID',
                        paymentDate: { lt: ninetyDaysAgo },
                    },
                    orderBy: {
                        paymentDate: 'asc',
                    },
                    take: 1,
                },
            },
            take: 20,
        });

        return nplLoans.map(loan => ({
            loanNumber: loan.id, // Using id as loanNumber is missing from schema
            customerName: loan.customer.user ? `${loan.customer.user.firstName} ${loan.customer.user.lastName}` : loan.customer.businessName,
            phoneNumber: loan.customer.user?.phoneNumber || loan.customer.phone,
            outstandingBalance: Number(loan.outstandingBalance),
            daysOverdue: loan.paymentSchedule[0]
                ? Math.floor((new Date().getTime() - new Date(loan.paymentSchedule[0].paymentDate).getTime()) / (1000 * 60 * 60 * 24))
                : 0,
        }));
    }

    /**
     * Collection drill-down: Payment performance
     */
    private async getCollectionDrillDown(branchId: string): Promise<any> {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const payments = await prisma.payment.findMany({
            where: {
                loan: {
                    customer: { branchId },
                },
                paymentDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            include: {
                loan: {
                    include: {
                        customer: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                paymentDate: 'desc',
            },
            take: 20,
        });

        return payments.map(payment => ({
            date: payment.paymentDate,
            loanNumber: payment.loan.id,
            customerName: payment.loan.customer.user ? `${payment.loan.customer.user.firstName} ${payment.loan.customer.user.lastName}` : payment.loan.customer.businessName,
            amount: Number(payment.amount),
            method: payment.paymentMethod,
        }));
    }

    /**
     * Disbursement drill-down: Recent disbursements
     */
    private async getDisbursementDrillDown(branchId: string): Promise<any> {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const disbursements = await prisma.loanDisbursement.findMany({
            where: {
                loan: {
                    customer: { branchId },
                },
                disbursedAt: {
                    gte: startOfMonth,
                },
            },
            include: {
                loan: {
                    include: {
                        customer: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                disbursedAt: 'desc',
            },
            take: 20,
        });

        return disbursements.map(d => ({
            date: d.disbursedAt,
            loanNumber: d.loan.id,
            customerName: d.loan.customer.user ? `${d.loan.customer.user.firstName} ${d.loan.customer.user.lastName}` : d.loan.customer.businessName,
            amount: Number(d.amount),
            status: d.status,
        }));
    }

    /**
     * Customers drill-down: Active customers
     */
    private async getCustomersDrillDown(branchId: string): Promise<any> {
        const customers = await prisma.customer.findMany({
            where: {
                branchId,
                loans: {
                    some: {
                        status: { in: ['ACTIVE', 'NPL'] },
                    },
                },
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                loans: {
                    where: {
                        status: { in: ['ACTIVE', 'NPL'] },
                    },
                    select: {
                        id: true,
                        principal: true,
                        outstandingBalance: true,
                        status: true,
                    },
                },
            },
            take: 20,
        });

        return customers.map(customer => ({
            name: customer.user ? `${customer.user.firstName} ${customer.user.lastName}` : customer.businessName,
            phoneNumber: customer.user?.phoneNumber || customer.phone,
            totalLoans: customer.loans.length,
            totalOutstanding: customer.loans.reduce((sum, loan) => sum + Number(loan.outstandingBalance || 0), 0),
            hasOverdue: customer.loans.some(loan => loan.status === 'NPL'),
        }));
    }

    /**
     * Task 6.2.10: Generate trend chart for KPI metrics
     * Uses QuickChart API to generate chart images
     * 
     * @param branchId - Branch ID
     * @param metric - Metric type (disbursement, collection, npl)
     * @param months - Number of months to show (default: 6)
     * @returns Chart URL
     */
    async generateTrendChart(
        branchId: string,
        metric: 'disbursement' | 'collection' | 'npl',
        months: number = 6
    ): Promise<string> {
        try {
            // Get historical data for the specified number of months
            const now = new Date();
            const dataPoints: Array<{ month: string; value: number }> = [];

            for (let i = months - 1; i >= 0; i--) {
                const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

                let value = 0;

                if (metric === 'disbursement') {
                    const result = await prisma.loan.aggregate({
                        where: {
                            customer: { branchId },
                            createdAt: {
                                gte: monthStart,
                                lte: monthEnd,
                            },
                        },
                        _sum: { principal: true },
                    });
                    value = Number(result._sum.principal || 0);
                } else if (metric === 'collection') {
                    const payments = await prisma.payment.aggregate({
                        where: {
                            loan: {
                                customer: { branchId },
                            },
                            paymentDate: {
                                gte: monthStart,
                                lte: monthEnd,
                            },
                        },
                        _sum: { amount: true },
                    });

                    const scheduled = await prisma.paymentSchedule.aggregate({
                        where: {
                            loan: {
                                customer: { branchId },
                            },
                            paymentDate: {
                                gte: monthStart,
                                lte: monthEnd,
                            },
                        },
                        _sum: { totalPayment: true },
                    });

                    const schTotal = Number(scheduled._sum.totalPayment || 0);
                    const payTotal = Number(payments._sum.amount || 0);
                    value = schTotal > 0 ? (payTotal / schTotal) * 100 : 0;
                } else if (metric === 'npl') {
                    // Calculate NPL ratio for each month
                    const ninetyDaysBeforeMonthEnd = new Date(monthEnd);
                    ninetyDaysBeforeMonthEnd.setDate(ninetyDaysBeforeMonthEnd.getDate() - 90);

                    const nplLoans = await prisma.loan.findMany({
                        where: {
                            customer: { branchId },
                            status: 'NPL',
                            paymentSchedule: {
                                some: {
                                    paymentDate: { lt: ninetyDaysBeforeMonthEnd },
                                    status: 'UNPAID',
                                },
                            },
                        },
                        select: {
                            outstandingBalance: true,
                        },
                    });

                    const totalOutstanding = await prisma.loan.aggregate({
                        where: {
                            customer: { branchId },
                            status: { in: ['ACTIVE', 'NPL'] },
                        },
                        _sum: { outstandingBalance: true },
                    });

                    const nplBalance = nplLoans.reduce((sum, loan) => sum + Number(loan.outstandingBalance || 0), 0);
                    const outTotal = Number(totalOutstanding._sum.outstandingBalance || 0);
                    value = outTotal > 0 ? (nplBalance / outTotal) * 100 : 0;
                }

                dataPoints.push({
                    month: monthStart.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
                    value: Math.round(value * 100) / 100,
                });
            }

            // Generate chart using QuickChart API
            const labels = dataPoints.map(d => d.month);
            const data = dataPoints.map(d => d.value);

            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: metric === 'disbursement' ? 'ยอดเบิกจ่าย (บาท)' :
                            metric === 'collection' ? 'Collection Rate (%)' :
                                'NPL Ratio (%)',
                        data: data,
                        borderColor: metric === 'disbursement' ? '#06C755' :
                            metric === 'collection' ? '#2196F3' :
                                '#FF6B6B',
                        backgroundColor: metric === 'disbursement' ? 'rgba(6, 199, 85, 0.1)' :
                            metric === 'collection' ? 'rgba(33, 150, 243, 0.1)' :
                                'rgba(255, 107, 107, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                    }],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: metric === 'disbursement' ? 'แนวโน้มยอดเบิกจ่าย' :
                                metric === 'collection' ? 'แนวโน้ม Collection Rate' :
                                    'แนวโน้ม NPL Ratio',
                            font: {
                                size: 16,
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value: number) => {
                                    if (metric === 'disbursement') {
                                        return `฿${(value / 1000000).toFixed(1)}M`;
                                    }
                                    return `${value}%`;
                                },
                            },
                        },
                    },
                },
            };

            // Encode chart config for QuickChart URL
            const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=300&backgroundColor=white`;

            return chartUrl;
        } catch (error) {
            console.error('Error generating trend chart:', error);
            throw error;
        }
    }
}

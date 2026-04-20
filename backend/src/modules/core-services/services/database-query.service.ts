import { prisma } from '@config/database.config';
import redis from '@config/redis.config';
import { logger } from '@utils/common/logger.util';

/**
 * Database Query Service
 * 
 * Purpose: Replace all mock data with real database queries
 * Features:
 * - Type-safe queries using Prisma ORM
 * - Query result caching (5-minute TTL for dashboard stats)
 * - Redis-based distributed caching
 * - Query performance monitoring
 * - Graceful handling of missing data with null checks
 * 
 * Requirements: Requirement 1 - Replace Mock Data with Real Database Queries
 */

// Cache interface
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Redis-based caching
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get cached data from Redis
 */
async function getCached<T>(key: string): Promise<T | null> {
    try {
        const cached = await redis.get(key);
        if (cached) {
            const entry = JSON.parse(cached) as CacheEntry<T>;
            const now = Date.now();
            
            // Check if cache is still valid
            if (now - entry.timestamp < CACHE_TTL) {
                return entry.data;
            }
        }
        return null;
    } catch (error) {
        logger.error({ error, key }, 'Failed to get cached data');
        return null;
    }
}

/**
 * Set cached data in Redis
 */
async function setCached<T>(key: string, data: T): Promise<void> {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
        };
        await redis.set(key, JSON.stringify(entry), 'EX', 300); // 5 minutes
    } catch (error) {
        logger.error({ error, key }, 'Failed to set cached data');
    }
}

/**
 * Clear cache for a specific key or all cache
 */
async function clearCache(key?: string): Promise<void> {
    try {
        if (key) {
            await redis.del(key);
        } else {
            // Clear all cache keys with prefix
            const keys = await redis.keys('cache:*');
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }
    } catch (error) {
        logger.error({ error, key }, 'Failed to clear cache');
    }
}

/**
 * Loan Balance interface
 */
export interface LoanBalance {
    loanId: string;
    customerId: string;
    customerName: string;
    principal: number;
    outstandingBalance: number;
    accruedInterest: number;
    fees: number;
    totalAmountDue: number;
    nextPaymentDate: Date | null;
    nextPaymentAmount: number | null;
    status: string;
}

/**
 * Officer Stats interface
 */
export interface OfficerStats {
    todayTasks: number;
    overdueLess3Days: number;
    overdueMore3Days: number;
    uncontactedCustomers: number;
    monthlyCollected: number;
    monthlyTarget: number;
    collectionRate: number;
}

/**
 * Manager Stats interface
 */
export interface ManagerStats {
    totalLoans: number;
    totalDisbursement: number;
    outstandingBalance: number;
    collectionRate: number;
    nplRatio: number;
    nplCount: number;
    pendingApprovals: number;
    activeCustomers: number;
}

/**
 * Admin Stats interface
 */
export interface AdminStats {
    systemHealth: 'healthy' | 'warning' | 'critical';
    activeUsers: number;
    totalLoans: number;
    totalDisbursement: number;
    outstandingBalance: number;
    nplRatio: number;
    errorRate: number;
    apiResponseTime: number;
}

/**
 * Task interface
 */
export interface Task {
    id: string;
    type: 'payment' | 'follow_up' | 'approval' | 'contact';
    customerId: string;
    customerName: string;
    loanId: string;
    loanAmount: number;
    actionRequired: string;
    dueDate: Date;
    priority: 'high' | 'medium' | 'low';
    overdueDays?: number;
}

export class DatabaseQueryService {
    /**
     * Get cached data or execute query
     * Uses Redis for distributed caching
     */
    private async getCached<T>(
        key: string,
        queryFn: () => Promise<T>
    ): Promise<T> {
        const cached = await getCached<T>(key);
        
        if (cached) {
            return cached;
        }

        const startTime = Date.now();
        const data = await queryFn();
        const queryTime = Date.now() - startTime;

        // Log slow queries (> 1 second)
        if (queryTime > 1000) {
            logger.warn({ key, queryTime }, 'Slow query detected');
        }

        await setCached(key, data);
        return data;
    }

    /**
     * Clear cache for a specific key or all cache
     * Uses Redis for distributed cache invalidation
     */
    async clearCache(key?: string): Promise<void> {
        await clearCache(key);
    }

    /**
     * Get loan balance with detailed breakdown
     * 
     * @param userId - User ID (customer)
     * @returns Loan balance with principal, interest, fees breakdown
     */
    async getLoanBalance(userId: string): Promise<LoanBalance | null> {
        try {
            // Active loan statuses - include NPL/DEFAULTED so customers can still see their balance
            const activeLoanStatuses = ['APPROVED', 'DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED'];

            // Find customer by userId (direct link)
            let customer = await prisma.customer.findFirst({
                where: { userId: userId },
                include: {
                    loans: {
                        where: { status: { in: activeLoanStatuses } },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            });

            // Fallback: userId might actually be a Customer.id (synthetic user case)
            if (!customer || !customer.loans || customer.loans.length === 0) {
                const byCustomerId = await prisma.customer.findUnique({
                    where: { id: userId },
                    include: {
                        loans: {
                            where: { status: { in: activeLoanStatuses } },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                });
                if (byCustomerId && byCustomerId.loans && byCustomerId.loans.length > 0) {
                    customer = byCustomerId;
                }
            }

            if (!customer || !customer.loans || customer.loans.length === 0) {
                return null;
            }

            const loan = customer.loans[0];
            if (!loan) {
                return null;
            }

            // Calculate accrued interest
            const interestRate = Number(loan.interestRate) / 100 / 12; // Monthly rate
            const outstandingBalance = Number(loan.outstandingBalance);
            const accruedInterest = outstandingBalance * interestRate;

            // Get fees (if any) - for now, we'll use 0 as fees are not in the schema
            const fees = 0;

            return {
                loanId: loan.id,
                customerId: customer.id,
                customerName: customer.businessName,
                principal: Number(loan.principal),
                outstandingBalance,
                accruedInterest,
                fees,
                totalAmountDue: outstandingBalance + accruedInterest + fees,
                nextPaymentDate: loan.nextPaymentDate,
                nextPaymentAmount: loan.nextPaymentAmount ? Number(loan.nextPaymentAmount) : null,
                status: loan.status,
            };
        } catch (error) {
            console.error('Error getting loan balance:', error);
            return null;
        }
    }

    /**
     * Get all loans for a customer
     * 
     * @param customerId - Customer ID
     * @returns Array of customer loans
     */
    async getCustomerLoans(customerId: string) {
        try {
            const loans = await prisma.loan.findMany({
                where: {
                    customerId,
                },
                include: {
                    customer: {
                        select: {
                            businessName: true,
                            customerCode: true,
                        },
                    },
                    officer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return loans;
        } catch (error) {
            console.error('Error getting customer loans:', error);
            return [];
        }
    }

    /**
     * Get next due date for a loan
     * 
     * @param loanId - Loan ID
     * @returns Next payment schedule or null
     */
    async getNextDueDate(loanId: string) {
        try {
            const nextPayment = await prisma.paymentSchedule.findFirst({
                where: {
                    loanId,
                    status: {
                        in: ['UNPAID', 'PARTIAL', 'OVERDUE'],
                    },
                },
                orderBy: {
                    paymentDate: 'asc',
                },
            });

            return nextPayment;
        } catch (error) {
            console.error('Error getting next due date:', error);
            return null;
        }
    }

    /**
     * Get payment history for a loan
     * 
     * @param loanId - Loan ID
     * @param limit - Maximum number of payments to return
     * @returns Array of payment records
     */
    async getPaymentHistory(loanId: string, limit: number = 10) {
        try {
            const payments = await prisma.payment.findMany({
                where: {
                    loanId,
                },
                orderBy: {
                    paymentDate: 'desc',
                },
                take: limit,
            });

            return payments;
        } catch (error) {
            console.error('Error getting payment history:', error);
            return [];
        }
    }
    /**
     * Get payment schedule for a loan
     *
     * @param loanId - Loan ID
     * @returns Array of payment schedules
     */
    async getPaymentSchedule(loanId: string) {
        try {
            const schedules = await prisma.paymentSchedule.findMany({
                where: {
                    loanId,
                },
                orderBy: {
                    paymentDate: 'asc',
                },
                select: {
                    id: true,
                    paymentNumber: true,
                    paymentDate: true,
                    principalAmount: true,
                    interestAmount: true,
                    totalPayment: true,
                    status: true,
                },
            });

            return schedules.map(schedule => ({
                ...schedule,
                dueDate: schedule.paymentDate,
                amount: schedule.totalPayment,
            }));
        } catch (error) {
            console.error('Error getting payment schedule:', error);
            return [];
        }
    }


    /**
     * Get upcoming payments for a user
     * 
     * @param userId - User ID
     * @param days - Number of days to look ahead
     * @returns Array of upcoming payment schedules
     */
    async getUpcomingPayments(userId: string, days: number) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);

            // Find customer linked to this user (correct relation: Customer.userId)
            const customers = await prisma.customer.findMany({
                where: { userId: userId },
                include: {
                    loans: {
                        where: {
                            status: {
                                in: ['APPROVED', 'DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED'],
                            },
                        },
                    },
                },
            });

            if (!customers || customers.length === 0) {
                return [];
            }

            const loanIds = customers.flatMap((c) => c.loans.map((l) => l.id));

            const upcomingPayments = await prisma.paymentSchedule.findMany({
                where: {
                    loanId: {
                        in: loanIds,
                    },
                    paymentDate: {
                        gte: now,
                        lte: futureDate,
                    },
                    status: {
                        in: ['UNPAID', 'PARTIAL'],
                    },
                },
                include: {
                    loan: {
                        include: {
                            customer: {
                                select: {
                                    businessName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    paymentDate: 'asc',
                },
            });

            return upcomingPayments;
        } catch (error) {
            console.error('Error getting upcoming payments:', error);
            return [];
        }
    }

    /**
     * Get loan officer statistics
     * 
     * @param userId - Loan officer user ID
     * @returns Officer statistics
     */
    async getLoanOfficerStats(userId: string): Promise<OfficerStats> {
        const cacheKey = `officer_stats_${userId}`;

        return this.getCached(cacheKey, async () => {
            try {
                const now = new Date();
                const todayStart = new Date(now.setHours(0, 0, 0, 0));
                const todayEnd = new Date(now.setHours(23, 59, 59, 999));

                // Get today's tasks (loans with payments due today)
                const todayTasks = await prisma.loan.count({
                    where: {
                        officerId: userId,
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                        },
                        nextPaymentDate: {
                            gte: todayStart,
                            lte: todayEnd,
                        },
                    },
                });

                // Get overdue loans (< 3 days)
                const overdueLess3Days = await prisma.loan.count({
                    where: {
                        officerId: userId,
                        status: 'ACTIVE',
                        overdueDays: {
                            gte: 1,
                            lt: 3,
                        },
                    },
                });

                // Get overdue loans (>= 3 days)
                const overdueMore3Days = await prisma.loan.count({
                    where: {
                        officerId: userId,
                        status: 'ACTIVE',
                        overdueDays: {
                            gte: 3,
                        },
                    },
                });

                // Get uncontacted customers (no contact log in last 2 days)
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

                const loansWithRecentContact = await prisma.contactLog.findMany({
                    where: {
                        officerId: userId,
                        contactDate: {
                            gte: twoDaysAgo,
                        },
                    },
                    select: {
                        customerId: true,
                    },
                    distinct: ['customerId'],
                });

                const contactedCustomerIds = loansWithRecentContact.map((c) => c.customerId);

                const uncontactedCustomers = await prisma.loan.count({
                    where: {
                        officerId: userId,
                        status: 'ACTIVE',
                        overdueDays: {
                            gte: 1,
                        },
                        customerId: {
                            notIn: contactedCustomerIds,
                        },
                    },
                });

                // Get monthly collection statistics
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

                const payments = await prisma.payment.findMany({
                    where: {
                        loan: {
                            officerId: userId,
                        },
                        paymentDate: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                });

                const monthlyCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

                // Get collection target from system config
                const targetConfig = await prisma.systemConfig.findUnique({
                    where: { key: 'monthly_collection_target' },
                });
                const monthlyTarget = targetConfig ? parseFloat(targetConfig.value) : 0;

                const collectionRate = monthlyTarget > 0 ? (monthlyCollected / monthlyTarget) * 100 : 0;

                return {
                    todayTasks,
                    overdueLess3Days,
                    overdueMore3Days,
                    uncontactedCustomers,
                    monthlyCollected,
                    monthlyTarget,
                    collectionRate: Number(collectionRate.toFixed(2)),
                };
            } catch (error) {
                console.error('Error getting loan officer stats:', error);
                return {
                    todayTasks: 0,
                    overdueLess3Days: 0,
                    overdueMore3Days: 0,
                    uncontactedCustomers: 0,
                    monthlyCollected: 0,
                    monthlyTarget: 0,
                    collectionRate: 0,
                };
            }
        });
    }

    /**
     * Get branch manager statistics
     * 
     * @param branchId - Branch ID
     * @returns Manager statistics
     */
    async getBranchManagerStats(branchId: string): Promise<ManagerStats> {
        const cacheKey = `manager_stats_${branchId}`;

        return this.getCached(cacheKey, async () => {
            try {
                const now = new Date();

                // Get total loans
                const totalLoans = await prisma.loan.count({
                    where: {
                        branchId,
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                        },
                    },
                });

                // Get total disbursement
                const disbursementResult = await prisma.loan.aggregate({
                    where: {
                        branchId,
                        status: {
                            in: ['DISBURSED', 'ACTIVE', 'CLOSED'],
                        },
                    },
                    _sum: {
                        principal: true,
                    },
                });

                const totalDisbursement = disbursementResult._sum.principal
                    ? Number(disbursementResult._sum.principal)
                    : 0;

                // Get outstanding balance
                const outstandingResult = await prisma.loan.aggregate({
                    where: {
                        branchId,
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                        },
                    },
                    _sum: {
                        outstandingBalance: true,
                    },
                });

                const outstandingBalance = outstandingResult._sum.outstandingBalance
                    ? Number(outstandingResult._sum.outstandingBalance)
                    : 0;

                // Get NPL loans (>90 days overdue or status NPL)
                const nplCount = await prisma.loan.count({
                    where: {
                        branchId,
                        OR: [
                            { status: 'NPL' },
                            {
                                status: 'ACTIVE',
                                overdueDays: {
                                    gte: 90,
                                },
                            },
                        ],
                    },
                });

                // Calculate NPL ratio
                const nplRatio = totalLoans > 0 ? (nplCount / totalLoans) * 100 : 0;

                // Get pending approvals
                const pendingApprovals = await prisma.loan.count({
                    where: {
                        branchId,
                        status: 'PENDING_APPROVAL',
                    },
                });

                // Get active customers
                const activeCustomers = await prisma.customer.count({
                    where: {
                        branchId,
                        status: 'ACTIVE',
                    },
                });

                // Get collection rate for current month
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

                const payments = await prisma.payment.findMany({
                    where: {
                        loan: {
                            branchId,
                        },
                        paymentDate: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                });

                const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

                // Get expected payments for the month
                const expectedPayments = await prisma.paymentSchedule.aggregate({
                    where: {
                        loan: {
                            branchId,
                        },
                        paymentDate: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                    _sum: {
                        totalPayment: true,
                    },
                });

                const expected = expectedPayments._sum.totalPayment
                    ? Number(expectedPayments._sum.totalPayment)
                    : 0;
                const collectionRate = expected > 0 ? (collected / expected) * 100 : 0;

                return {
                    totalLoans,
                    totalDisbursement,
                    outstandingBalance,
                    collectionRate: Number(collectionRate.toFixed(2)),
                    nplRatio: Number(nplRatio.toFixed(2)),
                    nplCount,
                    pendingApprovals,
                    activeCustomers,
                };
            } catch (error) {
                console.error('Error getting branch manager stats:', error);
                return {
                    totalLoans: 0,
                    totalDisbursement: 0,
                    outstandingBalance: 0,
                    collectionRate: 0,
                    nplRatio: 0,
                    nplCount: 0,
                    pendingApprovals: 0,
                    activeCustomers: 0,
                };
            }
        });
    }

    /**
     * Get admin statistics
     * 
     * @returns Admin statistics
     */
    async getAdminStats(): Promise<AdminStats> {
        const cacheKey = 'admin_stats';

        return this.getCached(cacheKey, async () => {
            try {
                const now = new Date();
                const todayStart = new Date(now.setHours(0, 0, 0, 0));

                // Get active users today
                const activeUsers = await prisma.user.count({
                    where: {
                        lastLoginAt: {
                            gte: todayStart,
                        },
                        status: 'ACTIVE',
                    },
                });

                // Get total loans
                const totalLoans = await prisma.loan.count({
                    where: {
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                        },
                    },
                });

                // Get total disbursement
                const disbursementResult = await prisma.loan.aggregate({
                    where: {
                        status: {
                            in: ['DISBURSED', 'ACTIVE', 'CLOSED'],
                        },
                    },
                    _sum: {
                        principal: true,
                    },
                });

                const totalDisbursement = disbursementResult._sum.principal
                    ? Number(disbursementResult._sum.principal)
                    : 0;

                // Get outstanding balance
                const outstandingResult = await prisma.loan.aggregate({
                    where: {
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                        },
                    },
                    _sum: {
                        outstandingBalance: true,
                    },
                });

                const outstandingBalance = outstandingResult._sum.outstandingBalance
                    ? Number(outstandingResult._sum.outstandingBalance)
                    : 0;

                // Get NPL ratio
                const nplCount = await prisma.loan.count({
                    where: {
                        OR: [
                            { status: 'NPL' },
                            {
                                status: 'ACTIVE',
                                overdueDays: {
                                    gte: 90,
                                },
                            },
                        ],
                    },
                });

                const nplRatio = totalLoans > 0 ? (nplCount / totalLoans) * 100 : 0;

                // Get error rate (from audit logs)
                const errorCount = await prisma.auditLog.count({
                    where: {
                        action: {
                            contains: 'ERROR',
                        },
                        createdAt: {
                            gte: todayStart,
                        },
                    },
                });

                const totalActions = await prisma.auditLog.count({
                    where: {
                        createdAt: {
                            gte: todayStart,
                        },
                    },
                });

                const errorRate = totalActions > 0 ? (errorCount / totalActions) * 100 : 0;

                // Determine system health
                let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
                if (errorRate > 10 || nplRatio > 10) {
                    systemHealth = 'critical';
                } else if (errorRate > 5 || nplRatio > 5) {
                    systemHealth = 'warning';
                }

                // API response time (placeholder - would need actual monitoring)
                const apiResponseTime = 150; // ms

                return {
                    systemHealth,
                    activeUsers,
                    totalLoans,
                    totalDisbursement,
                    outstandingBalance,
                    nplRatio: Number(nplRatio.toFixed(2)),
                    errorRate: Number(errorRate.toFixed(2)),
                    apiResponseTime,
                };
            } catch (error) {
                console.error('Error getting admin stats:', error);
                return {
                    systemHealth: 'critical',
                    activeUsers: 0,
                    totalLoans: 0,
                    totalDisbursement: 0,
                    outstandingBalance: 0,
                    nplRatio: 0,
                    errorRate: 0,
                    apiResponseTime: 0,
                };
            }
        });
    }

    /**
     * Get loan officer tasks
     * 
     * @param userId - Loan officer user ID
     * @returns Array of tasks
     */
    async getLoanOfficerTasks(userId: string): Promise<Task[]> {
        try {
            const now = new Date();
            const todayStart = new Date(now.setHours(0, 0, 0, 0));
            const todayEnd = new Date(now.setHours(23, 59, 59, 999));

            // Get loans with payments due today or overdue
            const loans = await prisma.loan.findMany({
                where: {
                    officerId: userId,
                    status: {
                        in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                    },
                    OR: [
                        {
                            nextPaymentDate: {
                                gte: todayStart,
                                lte: todayEnd,
                            },
                        },
                        {
                            overdueDays: {
                                gte: 1,
                            },
                        },
                    ],
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            businessName: true,
                        },
                    },
                },
                orderBy: [
                    { overdueDays: 'desc' },
                    { nextPaymentDate: 'asc' },
                ],
            });

            const tasks: Task[] = loans.map((loan) => {
                const isOverdue = loan.overdueDays > 0;
                const priority = loan.overdueDays >= 3 ? 'high' : loan.overdueDays >= 1 ? 'medium' : 'low';

                return {
                    id: loan.id,
                    type: isOverdue ? 'follow_up' : 'payment',
                    customerId: loan.customer.id,
                    customerName: loan.customer.businessName,
                    loanId: loan.id,
                    loanAmount: Number(loan.principal),
                    actionRequired: isOverdue ? 'ติดตามชำระเงิน' : 'แจ้งเตือนชำระเงิน',
                    dueDate: loan.nextPaymentDate || new Date(),
                    priority,
                    overdueDays: loan.overdueDays,
                };
            });

            return tasks;
        } catch (error) {
            console.error('Error getting loan officer tasks:', error);
            return [];
        }
    }

    /**
     * Get pending approvals for a user based on role and approval hierarchy
     * 
     * @param userId - User ID
     * @param role - User role (OFFICER, MANAGER, ADMIN)
     * @returns Array of loans pending approval
     */
    async getPendingApprovals(userId: string, role: string) {
        try {
            // Get user's branch
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { branchId: true },
            });

            if (!user || !user.branchId) {
                return [];
            }

            // Determine which approval level this user can approve
            let approvalLevel: 'OFFICER' | 'MANAGER' | 'HQ' | null = null;

            if (role === 'OFFICER') {
                approvalLevel = 'OFFICER';
            } else if (role === 'MANAGER') {
                approvalLevel = 'MANAGER';
            } else if (role === 'ADMIN') {
                approvalLevel = 'HQ';
            }

            if (!approvalLevel) {
                return [];
            }

            // Get loans that require this approval level
            const loans = await prisma.loan.findMany({
                where: {
                    branchId: user.branchId,
                    status: 'PENDING_APPROVAL',
                    approvalLevel: approvalLevel,
                },
                include: {
                    customer: {
                        select: {
                            businessName: true,
                            customerCode: true,
                        },
                    },
                    officer: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

            return loans;
        } catch (error) {
            console.error('Error getting pending approvals:', error);
            return [];
        }
    }

    /**
     * Get NPL (Non-Performing Loans) for a branch
     * NPL = loans overdue > 90 days
     * 
     * @param branchId - Branch ID
     * @returns Array of NPL loans
     */
    async getNPLLoans(branchId: string) {
        try {
            const nplLoans = await prisma.loan.findMany({
                where: {
                    branchId,
                    OR: [
                        { status: 'NPL' },
                        {
                            status: 'ACTIVE',
                            overdueDays: {
                                gte: 90,
                            },
                        },
                    ],
                },
                include: {
                    customer: {
                        select: {
                            businessName: true,
                            customerCode: true,
                            phone: true,
                        },
                    },
                    officer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                },
                orderBy: {
                    overdueDays: 'desc',
                },
            });

            // Get last contact date for each loan
            const loansWithContact = await Promise.all(
                nplLoans.map(async (loan) => {
                    const lastContact = await prisma.contactLog.findFirst({
                        where: {
                            customerId: loan.customerId,
                        },
                        orderBy: {
                            contactDate: 'desc',
                        },
                        select: {
                            contactDate: true,
                            contactStatus: true,
                        },
                    });

                    return {
                        ...loan,
                        lastContactDate: lastContact?.contactDate || null,
                        lastContactStatus: lastContact?.contactStatus || null,
                    };
                })
            );

            return loansWithContact;
        } catch (error) {
            console.error('Error getting NPL loans:', error);
            return [];
        }
    }
}

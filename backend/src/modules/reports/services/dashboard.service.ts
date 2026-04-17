import { ContactLogRepository } from '@collections/repositories/contact-log.repository';
import { CalendarEventRepository } from '@calendar/repositories/calendar-event.repository';
import { prisma } from '@config/database.config';
import { format, startOfDay, endOfDay } from 'date-fns';
import { logger } from '@utils/common/logger.util';
import type { Prisma } from '@prisma/client';

interface DashboardActivity {
    id: string;
    type: 'payment' | 'contact' | 'loan';
    message: string;
    time: string;
    amount?: string;
    count?: string;
    timestamp: Date;
}

interface CalendarEventWithRelations {
    id: string;
    title: string;
    event_type: string;
    startDate: Date;
    customer?: {
        id: string;
        businessName: string;
    } | null;
}

interface UncontactedCustomerInfo {
    customerId: string;
    customerName: string;
    lastContactDate: Date | null;
    phone: string | null;
}

interface LoanOfficerDashboard {
    kpis: {
        totalBalance: number;
        totalDebtors: number;
        monthlyTarget: number;
        overdueLoans: number;
        todayTasks: number;
    };
    todayTasks: Array<{
        id: string;
        name: string;
        action: string;
        time: string;
    }>;
    overdueLoans: Array<{
        id: string;
        customer: string;
        days: number;
        amount: number;
        risk: 'low' | 'medium' | 'high';
    }>;
    recentActivities: Omit<DashboardActivity, 'timestamp'>[];
    uncontactedCustomers: Array<{
        id: string;
        name: string;
        lastContact: string;
        phone: string;
    }>;
    collectionProgress: number;
    collectionTarget: number;
    collectionAchieved: number;
    pendingPayments: number;
    successRate: number;
    portfolio: {
        total: number;
        normal: number;
        warning: number;
        npl: number;
        totalOutstanding: number;
    };
}

interface OfficerPerformance {
    id: string;
    name: string;
    current: number;
    target: number;
    loanCount: number;
    percentage: number;
}

interface BranchManagerDashboard {
    totalLoans: number;
    outstandingBalance: number;
    nplRatio: number;
    pendingApprovals: number;
    collectionRate: number;
    highRiskLoans: number;
    officerPerformance: OfficerPerformance[];
}

interface AdminDashboard {
    systemHealth: 'healthy' | 'warning' | 'critical';
    activeUsers: number;
    failedJobs: number;
    securityAlerts: number;
    dataVolume: {
        loans: number;
        payments: number;
        customers: number;
        documents: number;
        users: number;
    };
    dataToday: {
        loans: number;
        payments: number;
    };
}

/**
 * Dashboard Service - Business logic for dashboard statistics
 * Aggregates data from multiple sources
 * Updated: Added monthlyTarget support for officers
 */
export class DashboardService {
    private contactLogRepository: ContactLogRepository;
    private calendarEventRepository: CalendarEventRepository;

    constructor() {
        this.contactLogRepository = new ContactLogRepository();
        this.calendarEventRepository = new CalendarEventRepository();
    }

    /**
     * Get Loan Officer Dashboard statistics
     */
    async getLoanOfficerDashboard(userId: string, branchId?: string, role?: string): Promise<LoanOfficerDashboard> {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const portfolioStatuses = ['ACTIVE', 'DISBURSED', 'NPL', 'DEFAULTED'] as const;

        // Determine officer scope from JWT role first (more reliable than DB in mixed/seeded environments)
        const isOfficer = role ? role === 'OFFICER' : await this.isOfficerRole(userId);

        // Officer should always see their own portfolio even if branchId is missing/mismatched.
        // Manager/Admin are scoped by branch when available.
        const branchWhere = !isOfficer && branchId ? { branchId } : {};
        // Portfolio ownership can be linked by `loan.officerId` OR `loan.customer.createdBy`
        // (older data / some flows do not set loan.officerId consistently).
        const officerWhere: Prisma.LoanWhereInput = isOfficer
            ? { OR: [{ officerId: userId }, { customer: { createdBy: userId } }] }
            : {};

        // Get today's tasks from Calendar Events (sorted by time)
        const calendarEvents = await this.calendarEventRepository.list({
            page: 1,
            limit: 100,
            branchId,
            dateFrom: todayStart,
            dateTo: todayEnd,
        });

        // Sort events by time
        const todayTasks = (calendarEvents.events as unknown as CalendarEventWithRelations[])
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 10)
            .map((event) => ({
                id: event.id,
                name: event.customer?.businessName || event.title,
                action: this.getEventActionLabel(event.event_type),
                time: format(new Date(event.startDate), 'HH:mm'),
            }));

        // Get overdue loans - Officer sees only their loans
        const overdueLoans = await prisma.loan.findMany({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: {
                    in: [...portfolioStatuses],
                },
                overdueDays: {
                    gte: 1,
                },
            },
            include: {
                customer: {
                    select: {
                        businessName: true,
                    },
                },
            },
            orderBy: {
                overdueDays: 'desc',
            },
            take: 10,
        });

        // Get uncontacted customers
        const uncontactedCustomers = await this.contactLogRepository.getUncontactedCustomers({
            officerId: userId,
            branchId,
            daysWithoutContact: 2,
        });

        // Get recent activities (payments, contact logs, and loan activities)
        const recentPayments = await prisma.payment.findMany({
            where: {
                loan: {
                    ...branchWhere,
                    ...officerWhere,
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
                createdAt: 'desc',
            },
            take: 3,
        });

        // Get recent contact logs
        const recentContacts = await prisma.contactLog.findMany({
            where: {
                officerId: userId,
                ...(branchId ? { customer: { branchId } } : {}),
            },
            include: {
                customer: {
                    select: {
                        businessName: true,
                    },
                },
            },
            orderBy: {
                contactDate: 'desc',
            },
            take: 3,
        });

        // Get recent loan activities (approved, disbursed)
        const recentLoans = await prisma.loan.findMany({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: {
                    in: ['APPROVED', 'DISBURSED'],
                },
                updatedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
            },
            include: {
                customer: {
                    select: {
                        businessName: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 3,
        });

        // Combine and sort all activities
        const allActivities: DashboardActivity[] = [
            ...recentPayments.map((payment): DashboardActivity => ({
                id: `payment-${payment.id}`,
                type: 'payment',
                message: `รับชำระเงินจาก ${payment.loan.customer.businessName}`,
                time: this.getRelativeTime(payment.createdAt),
                amount: `฿${Number(payment.amount).toLocaleString()}`,
                timestamp: payment.createdAt,
            })),
            ...recentContacts.map((contact): DashboardActivity => ({
                id: `contact-${contact.id}`,
                type: 'contact',
                message: `ติดต่อ ${contact.customer.businessName}`,
                time: this.getRelativeTime(contact.contactDate),
                count: contact.contactMethod || 'โทรศัพท์',
                timestamp: contact.contactDate,
            })),
            ...recentLoans.map((loan): DashboardActivity => ({
                id: `loan-${loan.id}`,
                type: 'loan',
                message: `${loan.status === 'APPROVED' ? 'อนุมัติสินเชื่อ' : 'เบิกจ่ายสินเชื่อ'} ${loan.customer.businessName}`,
                time: this.getRelativeTime(loan.updatedAt),
                amount: `฿${Number(loan.principal).toLocaleString()}`,
                timestamp: loan.updatedAt,
            })),
        ];

        // Sort by timestamp and take top 10
        const recentActivities = allActivities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10)
            .map(({ timestamp, ...activity }) => activity); // Remove timestamp from final output

        // Get collection statistics for current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Calculate disbursed amount this month (ยอดที่ปล่อยสินเชื่อไปในเดือนนี้)
        const disbursedLoans = await prisma.loan.findMany({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: {
                    in: ['DISBURSED', 'ACTIVE'],
                },
                disbursementDate: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        });

        const disbursedAmount = disbursedLoans.reduce((sum, loan) => sum + Number(loan.principal || 0), 0);

        // Get disbursement target from system config (default to 500000 if not set)
        const targetConfig = await prisma.systemConfig.findUnique({
            where: { key: 'monthly_disbursement_target' },
        });
        const target = targetConfig ? parseFloat(targetConfig.value) : 500000;

        const disbursementProgress = target > 0 ? Math.round((disbursedAmount / target) * 100) : 0;

        // Get portfolio summary - include only ACTIVE and DISBURSED loans
        // Officer sees only their own loans, Manager/Admin sees all in branch
        const portfolioLoans = await prisma.loan.findMany({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: {
                    in: [...portfolioStatuses],
                },
            },
        });

        // Calculate pending payments (loans with upcoming payment schedules)
        const pendingPayments = await prisma.paymentSchedule.count({
            where: {
                loan: {
                    ...branchWhere,
                    status: {
                        in: [...portfolioStatuses],
                    },
                    ...officerWhere,
                },
                status: 'UNPAID',
                paymentDate: {
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
                },
            },
        });

        // Calculate success rate (payments received vs expected this month)
        const expectedPayments = await prisma.paymentSchedule.count({
            where: {
                loan: {
                    ...branchWhere,
                    status: {
                        in: [...portfolioStatuses],
                    },
                    ...officerWhere,
                },
                paymentDate: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        });

        const receivedPayments = await prisma.payment.count({
            where: {
                loan: {
                    ...branchWhere,
                    status: {
                        in: [...portfolioStatuses],
                    },
                    ...officerWhere,
                },
                paymentDate: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        });

        const successRate = expectedPayments > 0 ? Math.round((receivedPayments / expectedPayments) * 100) : 0;

        const totalPortfolio = portfolioLoans.length;
        const normalLoans = portfolioLoans.filter(l => l.overdueDays === 0).length;
        const warningLoans = portfolioLoans.filter(l => l.overdueDays > 0 && l.overdueDays < 30).length;
        const nplLoans = portfolioLoans.filter(l => l.overdueDays >= 90 || l.status === 'NPL').length;
        const totalOutstanding = portfolioLoans.reduce((sum, l) => {
            const remaining = Number(l.remainingAmount ?? 0);
            const outstanding = Number(l.outstandingBalance ?? 0);
            const currentPrincipal = Number(l.currentPrincipal ?? 0);
            const principal = Number(l.principal ?? 0);

            // NOTE: Some data uses `remainingAmount`, some uses `outstandingBalance`.
            // Also guard against legacy rows where `remainingAmount` exists but is still 0.
            const effectiveOutstanding =
                remaining > 0 ? remaining : outstanding > 0 ? outstanding : currentPrincipal > 0 ? currentPrincipal : principal;

            return sum + effectiveOutstanding;
        }, 0);

        return {
            kpis: {
                totalBalance: totalOutstanding, // ยอดหนี้ทั้งหมดในพอร์ต
                totalDebtors: totalPortfolio, // จำนวนลูกหนี้
                monthlyTarget: target, // เป้าหมายการปล่อยสินเชื่อ
                overdueLoans: overdueLoans.length, // จำนวนลูกหนี้ค้างชำระ
                todayTasks: todayTasks.length,
            },
            todayTasks,
            overdueLoans: overdueLoans.map((loan) => ({
                id: loan.id,
                customer: loan.customer.businessName,
                days: loan.overdueDays,
                amount: (() => {
                    const remaining = Number(loan.remainingAmount ?? 0);
                    const outstanding = Number(loan.outstandingBalance ?? 0);
                    const currentPrincipal = Number(loan.currentPrincipal ?? 0);
                    const principal = Number(loan.principal ?? 0);
                    return remaining > 0 ? remaining : outstanding > 0 ? outstanding : currentPrincipal > 0 ? currentPrincipal : principal;
                })(),
                risk: loan.overdueDays > 7 ? 'high' : loan.overdueDays > 3 ? 'medium' : 'low',
            })),
            recentActivities,
            uncontactedCustomers: (uncontactedCustomers as unknown as UncontactedCustomerInfo[]).slice(0, 5).map((customer) => ({
                id: customer.customerId,
                name: customer.customerName,
                lastContact: this.getRelativeTime(customer.lastContactDate),
                phone: customer.phone || 'ไม่ระบุ',
            })),
            collectionProgress: disbursementProgress,
            collectionTarget: target,
            collectionAchieved: disbursedAmount, // ยอดที่ปล่อยไปแล้วในเดือนนี้
            pendingPayments, // จำนวนรอการอนุมัติ
            successRate,
            portfolio: {
                total: totalPortfolio,
                normal: normalLoans,
                warning: warningLoans,
                npl: nplLoans,
                totalOutstanding,
            },
        };
    }

    /**
     * Debug helper: return loan counts for the authenticated user (no PII)
     * Useful when dashboard shows all zeros but officer expects a portfolio.
     */
    async getLoanOfficerDashboardDebug(userId: string, branchId?: string, role?: string) {
        const portfolioStatuses = ['ACTIVE', 'DISBURSED', 'NPL', 'DEFAULTED'] as const;
        const isOfficer = role ? role === 'OFFICER' : await this.isOfficerRole(userId);

        const branchWhere = !isOfficer && branchId ? { branchId } : {};
        const officerWhere: Prisma.LoanWhereInput = isOfficer
            ? { OR: [{ officerId: userId }, { customer: { createdBy: userId } }] }
            : {};

        const [allByOfficer, portfolioByOfficer, allByCreator, portfolioByCreator, allByBranch, portfolioByBranch] = await Promise.all([
            prisma.loan.groupBy({
                by: ['status'],
                where: { officerId: userId },
                _count: { _all: true },
            }),
            prisma.loan.groupBy({
                by: ['status'],
                where: { officerId: userId, status: { in: [...portfolioStatuses] } },
                _count: { _all: true },
            }),
            prisma.loan.groupBy({
                by: ['status'],
                where: { customer: { createdBy: userId } },
                _count: { _all: true },
            }),
            prisma.loan.groupBy({
                by: ['status'],
                where: { customer: { createdBy: userId }, status: { in: [...portfolioStatuses] } },
                _count: { _all: true },
            }),
            branchId
                ? prisma.loan.groupBy({
                      by: ['status'],
                      where: { branchId },
                      _count: { _all: true },
                  })
                : Promise.resolve([] as any[]),
            branchId
                ? prisma.loan.groupBy({
                      by: ['status'],
                      where: { branchId, status: { in: [...portfolioStatuses] } },
                      _count: { _all: true },
                  })
                : Promise.resolve([] as any[]),
        ]);

        const toCounts = (rows: Array<{ status: any; _count: { _all: number } }>) =>
            rows.reduce((acc, r) => {
                acc[String(r.status)] = r._count._all;
                return acc;
            }, {} as Record<string, number>);

        // Also validate what the dashboard service would scope to for this user.
        const scopedPortfolioCount = await prisma.loan.count({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: { in: [...portfolioStatuses] },
            },
        });

        return {
            user: { userId, role: role || null, branchId: branchId || null, isOfficer },
            counts: {
                officer_all_statuses: toCounts(allByOfficer),
                officer_portfolio_statuses: toCounts(portfolioByOfficer),
                creator_all_statuses: toCounts(allByCreator),
                creator_portfolio_statuses: toCounts(portfolioByCreator),
                branch_all_statuses: toCounts(allByBranch as any),
                branch_portfolio_statuses: toCounts(portfolioByBranch as any),
                scoped_portfolio_count: scopedPortfolioCount,
            },
        };
    }

    /**
     * Helper: Get event action label in Thai
     */
    private getEventActionLabel(eventType: string): string {
        const labels: Record<string, string> = {
            'PAYMENT_DUE': 'นัดชำระเงิน',
            'APPOINTMENT': 'นัดพบลูกค้า',
            'CUSTOMER_VISIT': 'เยี่ยมลูกค้า',
            'FOLLOW_UP': 'ติดตามหนี้',
            'COLLECTION': 'เก็บเงิน',
            'MEETING': 'ประชุม',
            'INTERNAL_MEETING': 'ประชุมภายใน',
            'REMINDER': 'แจ้งเตือน',
            'HOLIDAY': 'วันหยุด',
            'OTHER': 'อื่นๆ',
        };
        return labels[eventType] || 'กิจกรรม';
    }

    /**
     * Helper: Check if user is an OFFICER role
     */
    private async isOfficerRole(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        return user?.role === 'OFFICER';
    }

    /**
     * Helper: Get relative time string
     */
    private getRelativeTime(date: Date | null): string {
        if (!date) return 'ไม่เคยติดต่อ';

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'เมื่อสักครู่';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        return `${diffDays} วันที่แล้ว`;
    }

    /**
     * Get Branch Manager Dashboard statistics
     */
    async getBranchManagerDashboard(branchId?: string): Promise<BranchManagerDashboard> {
        // Build where clause for branch filtering
        const branchWhere = branchId ? { branchId } : {};

        // Get total loans (including NPL for accurate ratio calculation)
        const totalLoans = await prisma.loan.count({
            where: {
                ...branchWhere,
                status: {
                    in: ['APPROVED', 'DISBURSED', 'ACTIVE', 'NPL'],
                },
            },
        });

        // Get outstanding balance (excluding fully paid loans)
        const outstandingResult = await prisma.loan.aggregate({
            where: {
                ...branchWhere,
                status: {
                    in: ['APPROVED', 'DISBURSED', 'ACTIVE', 'NPL'],
                },
            },
            _sum: {
                outstandingBalance: true,
            },
        });

        const outstandingBalance = outstandingResult._sum.outstandingBalance || 0;

        // Get NPL loans (status NPL or overdue >= 90 days)
        const nplLoans = await prisma.loan.count({
            where: {
                ...branchWhere,
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

        // Calculate NPL ratio (percentage of NPL loans vs total active loans)
        const nplRatio = totalLoans > 0 ? (nplLoans / totalLoans) * 100 : 0;

        logger.info({
            branchId,
            totalLoans,
            nplLoans,
            nplRatio,
        }, 'NPL Calculation');

        // Get pending approvals
        const pendingApprovals = await prisma.loan.count({
            where: {
                ...branchWhere,
                status: 'PENDING_APPROVAL',
            },
        });

        // Get disbursement rate for current month (อัตราการปล่อยสินเชื่อ)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Get approved loans this month
        const approvedLoans = await prisma.loan.findMany({
            where: {
                ...branchWhere,
                status: {
                    in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                },
                approvedAt: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        });

        const disbursedAmount = approvedLoans.reduce((sum, loan) => sum + Number(loan.principal || 0), 0);

        // Get disbursement target from system config or use default
        const targetConfig = await prisma.systemConfig.findUnique({
            where: { key: 'monthly_disbursement_target' },
        });
        const monthlyTarget = targetConfig ? parseFloat(targetConfig.value) : 5000000; // Default 5M per month for branch

        // Calculate disbursement rate based on monthly target
        const disbursementRate = monthlyTarget > 0 ? (disbursedAmount / monthlyTarget) * 100 : 0;

        // Get high risk loans (overdue > 30 days or DSCR < 1.0)
        const highRiskLoans = await prisma.loan.count({
            where: {
                ...branchWhere,
                status: 'ACTIVE',
                OR: [
                    { overdueDays: { gte: 30 } },
                    { dscr: { lt: 1.0 } },
                ],
            },
        });

        // Get officer performance data
        const officerPerformance = await this.getOfficerPerformance(branchId, monthStart, monthEnd);

        const dashboardResult = {
            totalLoans,
            outstandingBalance: Number(outstandingBalance),
            nplRatio: Number(nplRatio.toFixed(2)),
            pendingApprovals,
            collectionRate: Number(disbursementRate.toFixed(2)), // อัตราการปล่อยสินเชื่อ
            highRiskLoans,
            officerPerformance,
        };

        logger.info({ dashboardResult }, 'Dashboard Result');

        return dashboardResult;
    }

    /**
     * Get Officer Performance data for Branch Manager Dashboard
     */
    private async getOfficerPerformance(branchId: string | undefined, monthStart: Date, monthEnd: Date): Promise<OfficerPerformance[]> {
        // Build where clause for branch filtering
        const branchWhere = branchId ? { branchId } : {};

        // Get all officers in the branch with their monthly targets
        const officers = await prisma.user.findMany({
            where: {
                ...branchWhere,
                role: 'OFFICER',
                status: 'ACTIVE',
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                monthlyTarget: true,
            },
        });

        // Calculate performance for each officer based on approved loans
        const performance = await Promise.all(
            officers.map(async (officer): Promise<OfficerPerformance> => {
                // Get approved loans by this officer for current month
                const approvedLoans = await prisma.loan.findMany({
                    where: {
                        officerId: officer.id,
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'], // นับสินเชื่อที่อนุมัติแล้ว
                        },
                        approvedAt: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                });

                const totalAmount = approvedLoans.reduce((sum, loan) => sum + Number(loan.principal || 0), 0);
                const loanCount = approvedLoans.length;

                // Use officer's personal target or default to 500,000 (for loan disbursement)
                const target = officer.monthlyTarget ? Number(officer.monthlyTarget) : 500000;

                return {
                    id: officer.id,
                    name: `${officer.firstName} ${officer.lastName}`,
                    current: totalAmount,
                    target: target,
                    loanCount: loanCount, // จำนวนสัญญาที่อนุมัติ
                    percentage: target > 0 ? Math.round((totalAmount / target) * 100) : 0,
                };
            })
        );

        // Sort by performance percentage (highest first)
        return performance.sort((a, b) => b.percentage - a.percentage);
    }

    /**
     * Get Branch KPIs for automated notifications
     */
    async getBranchKPIs(branchId?: string): Promise<BranchManagerDashboard & { alerts: Array<{ message: string; severity: 'low' | 'medium' | 'high' }> }> {
        const stats = await this.getBranchManagerDashboard(branchId);
        
        // Add alerts based on stats
        const alerts: Array<{ message: string; severity: 'low' | 'medium' | 'high' }> = [];
        
        if (stats.nplRatio > 5) {
            alerts.push({ message: `อัตรา NPL สูงเกินกำหนด (${stats.nplRatio}%)`, severity: 'high' });
        }
        
        if (stats.highRiskLoans > 0) {
            alerts.push({ message: `พบลูกหนี้ที่มีความเสี่ยงสูง ${stats.highRiskLoans} ราย`, severity: 'medium' });
        }
        
        if (stats.pendingApprovals > 0) {
            alerts.push({ message: `มีคำขอสินเชื่อรอการอนุมัติ ${stats.pendingApprovals} รายการ`, severity: 'low' });
        }

        return {
            ...stats,
            alerts,
        };
    }

    /**
     * Get Admin Dashboard statistics
     */
    async getAdminDashboard(): Promise<AdminDashboard> {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));

        // Get active users (unique users with valid, non-expired sessions)
        const activeSessions = await prisma.session.findMany({
            where: {
                isValid: true,
                expiresAt: {
                    gt: new Date(), // Session not expired
                },
            },
            select: {
                userId: true,
            },
            distinct: ['userId'], // Get unique users only
        });

        const activeUsers = activeSessions.length;

        // Get failed jobs from queue (would need to check Redis/BullMQ)
        // For now, return 0 as placeholder
        const failedJobs = 0;

        // Get security alerts from security_events table (new security system)
        // Count all security events created today
        const securityAlerts = await prisma.securityEvent.count({
            where: {
                createdAt: {
                    gte: todayStart,
                },
            },
        });

        // Determine system health
        let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (failedJobs > 10 || securityAlerts > 5) {
            systemHealth = 'critical';
        } else if (failedJobs > 5 || securityAlerts > 2) {
            systemHealth = 'warning';
        }

        // Get total data volume in system (all time)
        const totalLoans = await prisma.loan.count();
        const totalPayments = await prisma.payment.count();
        const totalCustomers = await prisma.customer.count();
        const totalDocuments = await prisma.document.count();
        const totalUsers = await prisma.user.count();

        // Get data created today
        const loansToday = await prisma.loan.count({
            where: {
                createdAt: {
                    gte: todayStart,
                },
            },
        });

        const paymentsToday = await prisma.payment.count({
            where: {
                createdAt: {
                    gte: todayStart,
                },
            },
        });

        return {
            systemHealth,
            activeUsers,
            failedJobs,
            securityAlerts,
            dataVolume: {
                loans: totalLoans,
                payments: totalPayments,
                customers: totalCustomers,
                documents: totalDocuments,
                users: totalUsers,
            },
            dataToday: {
                loans: loansToday,
                payments: paymentsToday,
            },
        };
    }
}

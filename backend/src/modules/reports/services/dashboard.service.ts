import { ContactLogRepository } from '@collections/repositories/contact-log.repository';
import { CalendarEventRepository } from '@calendar/repositories/calendar-event.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';
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
    private dashboardRepository: DashboardRepository;

    constructor() {
        this.contactLogRepository = new ContactLogRepository();
        this.calendarEventRepository = new CalendarEventRepository();
        this.dashboardRepository = new DashboardRepository();
    }

    /**
     * Get Loan Officer Dashboard statistics
     */
    async getLoanOfficerDashboard(userId: string, branchId?: string, role?: string): Promise<LoanOfficerDashboard> {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const portfolioStatuses = ['ACTIVE', 'DISBURSED', 'NPL', 'DEFAULTED'] as const;

        const isOfficer = role ? role === 'OFFICER' : await this.isOfficerRole(userId);

        const branchWhere = !isOfficer && branchId ? { branchId } : {};
        const officerWhere: Prisma.LoanWhereInput = isOfficer
            ? { OR: [{ officerId: userId }, { customer: { createdBy: userId } }] }
            : {};

        // Get today's tasks from Calendar Events
        const calendarEvents = await this.calendarEventRepository.list({
            page: 1,
            limit: 100,
            branchId,
            dateFrom: todayStart,
            dateTo: todayEnd,
        });

        const todayTasks = (calendarEvents.events as unknown as CalendarEventWithRelations[])
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 10)
            .map((event) => ({
                id: event.id,
                name: event.customer?.businessName || event.title,
                action: this.getEventActionLabel(event.event_type),
                time: format(new Date(event.startDate), 'HH:mm'),
            }));

        // Get overdue loans
        const overdueLoans = await this.dashboardRepository.findLoans({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: { in: [...portfolioStatuses] },
                overdueDays: { gte: 1 },
            },
            include: { customer: { select: { businessName: true } } },
            orderBy: { overdueDays: 'desc' },
            take: 10,
        });

        // Get uncontacted customers
        const uncontactedCustomers = await this.contactLogRepository.getUncontactedCustomers({
            officerId: userId,
            branchId,
            daysWithoutContact: 2,
        });

        // Get recent payments
        const recentPayments = await this.dashboardRepository.findPayments({
            where: { loan: { ...branchWhere, ...officerWhere } },
            include: {
                loan: {
                    include: { customer: { select: { businessName: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
        });

        // Get recent contact logs
        const recentContacts = await this.dashboardRepository.findContactLogs({
            where: {
                officerId: userId,
                ...(branchId ? { customer: { branchId } } : {}),
            },
            include: { customer: { select: { businessName: true } } },
            orderBy: { contactDate: 'desc' },
            take: 3,
        });

        // Get recent loan activities
        const recentLoans = await this.dashboardRepository.findLoans({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: { in: ['APPROVED', 'DISBURSED'] },
                updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            include: { customer: { select: { businessName: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 3,
        });

        const allActivities: DashboardActivity[] = [
            ...recentPayments.map((payment: any): DashboardActivity => ({
                id: `payment-${payment.id}`,
                type: 'payment',
                message: `รับชำระเงินจาก ${payment.loan.customer.businessName}`,
                time: this.getRelativeTime(payment.createdAt),
                amount: `฿${Number(payment.amount).toLocaleString()}`,
                timestamp: payment.createdAt,
            })),
            ...recentContacts.map((contact: any): DashboardActivity => ({
                id: `contact-${contact.id}`,
                type: 'contact',
                message: `ติดต่อ ${contact.customer.businessName}`,
                time: this.getRelativeTime(contact.contactDate),
                count: contact.contactMethod || 'โทรศัพท์',
                timestamp: contact.contactDate,
            })),
            ...recentLoans.map((loan: any): DashboardActivity => ({
                id: `loan-${loan.id}`,
                type: 'loan',
                message: `${loan.status === 'APPROVED' ? 'อนุมัติสินเชื่อ' : 'เบิกจ่ายสินเชื่อ'} ${loan.customer.businessName}`,
                time: this.getRelativeTime(loan.updatedAt),
                amount: `฿${Number(loan.principal).toLocaleString()}`,
                timestamp: loan.updatedAt,
            })),
        ];

        const recentActivities = allActivities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10)
            .map(({ timestamp, ...activity }) => activity);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const disbursedLoans = await this.dashboardRepository.findLoans({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: { in: ['DISBURSED', 'ACTIVE'] },
                disbursementDate: { gte: monthStart, lte: monthEnd },
            },
        });

        const disbursedAmount = disbursedLoans.reduce((sum: number, loan: any) => sum + Number(loan.principal || 0), 0);

        const targetConfig = await this.dashboardRepository.findSystemConfig('monthly_disbursement_target');
        const target = targetConfig ? parseFloat(targetConfig.value) : 500000;
        const disbursementProgress = target > 0 ? Math.round((disbursedAmount / target) * 100) : 0;

        const portfolioLoans = await this.dashboardRepository.findLoans({
            where: {
                ...branchWhere,
                ...officerWhere,
                status: { in: [...portfolioStatuses] },
            },
        });

        const [pendingPayments, expectedPayments, receivedPayments] = await Promise.all([
            this.dashboardRepository.countPaymentSchedules({
                loan: { ...branchWhere, status: { in: [...portfolioStatuses] }, ...officerWhere },
                status: 'UNPAID',
                paymentDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            }),
            this.dashboardRepository.countPaymentSchedules({
                loan: { ...branchWhere, status: { in: [...portfolioStatuses] }, ...officerWhere },
                paymentDate: { gte: monthStart, lte: monthEnd },
            }),
            this.dashboardRepository.countPayments({
                loan: { ...branchWhere, status: { in: [...portfolioStatuses] }, ...officerWhere },
                paymentDate: { gte: monthStart, lte: monthEnd },
            }),
        ]);

        const successRate = expectedPayments > 0 ? Math.round((receivedPayments / expectedPayments) * 100) : 0;

        const totalPortfolio = portfolioLoans.length;
        const normalLoans = portfolioLoans.filter((l: any) => l.overdueDays === 0).length;
        const warningLoans = portfolioLoans.filter((l: any) => l.overdueDays > 0 && l.overdueDays < 30).length;
        const nplLoans = portfolioLoans.filter((l: any) => l.overdueDays >= 90 || l.status === 'NPL').length;
        const totalOutstanding = portfolioLoans.reduce((sum: number, l: any) => {
            const remaining = Number(l.remainingAmount ?? 0);
            const outstanding = Number(l.outstandingBalance ?? 0);
            const currentPrincipal = Number(l.currentPrincipal ?? 0);
            const principal = Number(l.principal ?? 0);
            const effectiveOutstanding =
                remaining > 0 ? remaining : outstanding > 0 ? outstanding : currentPrincipal > 0 ? currentPrincipal : principal;
            return sum + effectiveOutstanding;
        }, 0);

        return {
            kpis: {
                totalBalance: totalOutstanding,
                totalDebtors: totalPortfolio,
                monthlyTarget: target,
                overdueLoans: overdueLoans.length,
                todayTasks: todayTasks.length,
            },
            todayTasks,
            overdueLoans: overdueLoans.map((loan: any) => ({
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
            collectionAchieved: disbursedAmount,
            pendingPayments,
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
     */
    async getLoanOfficerDashboardDebug(userId: string, branchId?: string, role?: string) {
        const portfolioStatuses = ['ACTIVE', 'DISBURSED', 'NPL', 'DEFAULTED'] as const;
        const isOfficer = role ? role === 'OFFICER' : await this.isOfficerRole(userId);

        const branchWhere = !isOfficer && branchId ? { branchId } : {};
        const officerWhere: Prisma.LoanWhereInput = isOfficer
            ? { OR: [{ officerId: userId }, { customer: { createdBy: userId } }] }
            : {};

        const [allByOfficer, portfolioByOfficer, allByCreator, portfolioByCreator, allByBranch, portfolioByBranch] = await Promise.all([
            this.dashboardRepository.groupLoansByStatus({ officerId: userId }),
            this.dashboardRepository.groupLoansByStatus({ officerId: userId, status: { in: [...portfolioStatuses] } }),
            this.dashboardRepository.groupLoansByStatus({ customer: { createdBy: userId } }),
            this.dashboardRepository.groupLoansByStatus({ customer: { createdBy: userId }, status: { in: [...portfolioStatuses] } }),
            branchId
                ? this.dashboardRepository.groupLoansByStatus({ branchId })
                : Promise.resolve([] as any[]),
            branchId
                ? this.dashboardRepository.groupLoansByStatus({ branchId, status: { in: [...portfolioStatuses] } })
                : Promise.resolve([] as any[]),
        ]);

        const toCounts = (rows: Array<{ status: any; _count: { _all: number } }>) =>
            rows.reduce((acc, r) => {
                acc[String(r.status)] = r._count._all;
                return acc;
            }, {} as Record<string, number>);

        const scopedPortfolioCount = await this.dashboardRepository.countLoans({
            ...branchWhere,
            ...officerWhere,
            status: { in: [...portfolioStatuses] },
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
        const user = await this.dashboardRepository.findUserRole(userId);
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
        const branchWhere = branchId ? { branchId } : {};

        const [totalLoans, outstandingResult, nplLoans, pendingApprovals] = await Promise.all([
            this.dashboardRepository.countLoans({
                ...branchWhere,
                status: { in: ['APPROVED', 'DISBURSED', 'ACTIVE', 'NPL'] },
            }),
            this.dashboardRepository.aggregateLoanBalance({
                ...branchWhere,
                status: { in: ['APPROVED', 'DISBURSED', 'ACTIVE', 'NPL'] },
            }),
            this.dashboardRepository.countLoans({
                ...branchWhere,
                OR: [{ status: 'NPL' }, { status: 'ACTIVE', overdueDays: { gte: 90 } }],
            }),
            this.dashboardRepository.countLoans({ ...branchWhere, status: 'PENDING_APPROVAL' }),
        ]);

        const outstandingBalance = outstandingResult._sum.outstandingBalance || 0;
        const nplRatio = totalLoans > 0 ? (nplLoans / totalLoans) * 100 : 0;

        logger.info({ branchId, totalLoans, nplLoans, nplRatio }, 'NPL Calculation');

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const [approvedLoans, targetConfig, highRiskLoans] = await Promise.all([
            this.dashboardRepository.findLoans({
                where: {
                    ...branchWhere,
                    status: { in: ['APPROVED', 'DISBURSED', 'ACTIVE'] },
                    approvedAt: { gte: monthStart, lte: monthEnd },
                },
            }),
            this.dashboardRepository.findSystemConfig('monthly_disbursement_target'),
            this.dashboardRepository.countLoans({
                ...branchWhere,
                status: 'ACTIVE',
                OR: [{ overdueDays: { gte: 30 } }, { dscr: { lt: 1.0 } }],
            }),
        ]);

        const disbursedAmount = approvedLoans.reduce((sum: number, loan: any) => sum + Number(loan.principal || 0), 0);
        const monthlyTarget = targetConfig ? parseFloat(targetConfig.value) : 5000000;
        const disbursementRate = monthlyTarget > 0 ? (disbursedAmount / monthlyTarget) * 100 : 0;

        const officerPerformance = await this.getOfficerPerformance(branchId, monthStart, monthEnd);

        const dashboardResult = {
            totalLoans,
            outstandingBalance: Number(outstandingBalance),
            nplRatio: Number(nplRatio.toFixed(2)),
            pendingApprovals,
            collectionRate: Number(disbursementRate.toFixed(2)),
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
        const branchWhere = branchId ? { branchId } : {};

        const officers = await this.dashboardRepository.findOfficers({
            where: { ...branchWhere, role: 'OFFICER', status: 'ACTIVE' },
            select: { id: true, firstName: true, lastName: true, monthlyTarget: true },
        });

        const performance = await Promise.all(
            officers.map(async (officer: any): Promise<OfficerPerformance> => {
                const approvedLoans = await this.dashboardRepository.findLoans({
                    where: {
                        officerId: officer.id,
                        status: { in: ['APPROVED', 'DISBURSED', 'ACTIVE'] },
                        approvedAt: { gte: monthStart, lte: monthEnd },
                    },
                });

                const totalAmount = approvedLoans.reduce((sum: number, loan: any) => sum + Number(loan.principal || 0), 0);
                const loanCount = approvedLoans.length;
                const target = officer.monthlyTarget ? Number(officer.monthlyTarget) : 500000;

                return {
                    id: officer.id,
                    name: `${officer.firstName} ${officer.lastName}`,
                    current: totalAmount,
                    target,
                    loanCount,
                    percentage: target > 0 ? Math.round((totalAmount / target) * 100) : 0,
                };
            })
        );

        return performance.sort((a, b) => b.percentage - a.percentage);
    }

    /**
     * Get Branch KPIs for automated notifications
     */
    async getBranchKPIs(branchId?: string): Promise<BranchManagerDashboard & { alerts: Array<{ message: string; severity: 'low' | 'medium' | 'high' }> }> {
        const stats = await this.getBranchManagerDashboard(branchId);

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

        return { ...stats, alerts };
    }

    /**
     * Get Admin Dashboard statistics
     */
    async getAdminDashboard(): Promise<AdminDashboard> {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));

        const [activeUsers, securityAlerts, totalLoans, totalPayments, totalCustomers, totalDocuments, totalUsers, loansToday, paymentsToday] = await Promise.all([
            this.dashboardRepository.countActiveSessions(),
            this.dashboardRepository.countSecurityEvents({ createdAt: { gte: todayStart } }),
            this.dashboardRepository.countAllLoans(),
            this.dashboardRepository.countAllPayments(),
            this.dashboardRepository.countAllCustomers(),
            this.dashboardRepository.countAllDocuments(),
            this.dashboardRepository.countAllUsers(),
            this.dashboardRepository.countLoansCreatedAfter(todayStart),
            this.dashboardRepository.countPaymentsCreatedAfter(todayStart),
        ]);

        const failedJobs = 0;

        let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (failedJobs > 10 || securityAlerts > 5) {
            systemHealth = 'critical';
        } else if (failedJobs > 5 || securityAlerts > 2) {
            systemHealth = 'warning';
        }

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

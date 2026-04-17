import { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/dashboard.service';
import { ResponseUtil } from '@utils/formatting/response.util';

/**
 * Dashboard Controller - Request/Response ONLY
 */
export class DashboardController {
    private dashboardService: DashboardService;

    constructor() {
        this.dashboardService = new DashboardService();
    }

    /**
     * Get Loan Officer Dashboard
     */
    getLoanOfficerDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user!.userId;
            const branchId = request.user!.branchId; // optional (may be missing in some tokens)
            const role = request.user!.role;

            const result = await this.dashboardService.getLoanOfficerDashboard(userId, branchId, role);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            // Return empty data structure instead of error when no data exists
            const emptyDashboard = {
                kpis: {
                    todayCollection: 0,
                    monthlyTarget: 150000,
                    overdueLoans: 0,
                    todayTasks: 0,
                },
                todayTasks: [],
                overdueLoans: [],
                recentActivities: [],
                uncontactedCustomers: [],
                collectionProgress: 0,
                collectionTarget: 150000,
                collectionAchieved: 0,
                pendingPayments: 0,
                successRate: 0,
                portfolio: {
                    total: 0,
                    normal: 0,
                    warning: 0,
                    npl: 0,
                    totalOutstanding: 0,
                },
            };

            return ResponseUtil.success(reply, emptyDashboard);
        }
    };

    /**
     * Debug Loan Officer Dashboard (counts only)
     */
    getLoanOfficerDashboardDebug = async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.user!.userId;
        const branchId = request.user!.branchId;
        const role = request.user!.role;

        const result = await this.dashboardService.getLoanOfficerDashboardDebug(userId, branchId, role);
        return ResponseUtil.success(reply, result);
    };

    /**
     * Get Branch Manager Dashboard
     */
    getBranchManagerDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const branchId = request.user!.branchId;
            const role = request.user!.role;

            // Admin can see all branches, others need branchId
            if (!branchId && role !== 'ADMIN') {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            // Admin can see all branches, others see only their branch
            const filterBranchId = role === 'ADMIN' ? undefined : branchId;

            const result = await this.dashboardService.getBranchManagerDashboard(filterBranchId);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            // Return empty data structure instead of error when no data exists
            const emptyDashboard = {
                totalLoans: 0,
                outstandingBalance: 0,
                nplRatio: 0,
                pendingApprovals: 0,
                collectionRate: 0,
                highRiskLoans: 0,
                officerPerformance: [],
            };

            return ResponseUtil.success(reply, emptyDashboard);
        }
    };

    /**
     * Get Admin Dashboard
     */
    getAdminDashboard = async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await this.dashboardService.getAdminDashboard();

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            // Return empty data structure instead of error when no data exists
            const emptyDashboard = {
                systemHealth: 'healthy' as const,
                activeUsers: 0,
                failedJobs: 0,
                securityAlerts: 0,
                dataVolume: {
                    loans: 0,
                    payments: 0,
                },
            };

            return ResponseUtil.success(reply, emptyDashboard);
        }
    };
    /**
     * Generic Get Stats - Dispatches based on user role
     */
    getStats = async (request: FastifyRequest, reply: FastifyReply) => {
        const role = request.user!.role;

        if (role === 'ADMIN') {
            return this.getAdminDashboard(request, reply);
        } else if (role === 'MANAGER') {
            return this.getBranchManagerDashboard(request, reply);
        } else {
            return this.getLoanOfficerDashboard(request, reply);
        }
    };

    /**
     * Generic Get Charts - Dispatches based on user role
     * (Placeholder: most charts are already in the main dashboard results)
     */
    getCharts = async (request: FastifyRequest, reply: FastifyReply) => {
        return this.getStats(request, reply);
    };

    /**
     * Generic Get Recent Activities - Dispatches based on user role
     */
    getRecentActivities = async (request: FastifyRequest, reply: FastifyReply) => {
        return this.getStats(request, reply);
    };
}

/**
 * Dashboard API - Dashboard data endpoints
 */

import { dashboardApi } from '@/shared/lib/api-endpoints';

export interface LoanOfficerDashboardData {
  kpis: {
    todayCollection: number;
    monthlyTarget: number;
    overdueLoans: number;
    todayTasks: number;
  };
  todayTasks: Array<{
    id: string;
    customer: string;
    type: string;
    time: string;
    status: string;
  }>;
  overdueLoans: Array<{
    id: string;
    customer: string;
    days: number;
    amount: number;
    risk: string;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    customer: string;
    time: string;
    amount?: number;
    date?: string;
  }>;
  uncontactedCustomers: Array<{
    id: string;
    name: string;
    lastContact: string;
    phone: string;
  }>;
}

export interface BranchManagerDashboardData {
  kpis: Array<{
    title: string;
    value: string;
    icon: string;
    trend: string;
    positive: boolean;
  }>;
  highRiskLoans: Array<{
    id: string;
    customer: string;
    amount: number;
    daysOverdue: number;
    dscr: number;
  }>;
  pendingApprovals: Array<{
    id: string;
    type: string;
    title: string;
    customer: string;
    amount?: number;
    priority: string;
  }>;
  officerPerformance: Array<{
    id: string;
    name: string;
    collected: number;
    target: number;
    rank: number;
  }>;
  dailyAlerts: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
  }>;
  loanStatusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  trendData: Array<{
    day: string;
    collection: number;
    target: number;
  }>;
  collectionData: Array<{
    name: string;
    value: number;
  }>;
}

export interface AdminDashboardData {
  systemHealth: Array<{
    name: string;
    status: string;
    uptime: number;
  }>;
  activeUsers: Array<{
    role: string;
    count: number;
    icon: string;
  }>;
  failedJobs: Array<{
    id: string;
    type: string;
    error: string;
    time: string;
    severity: string;
  }>;
  securityLogs: Array<{
    id: string;
    type: string;
    message: string;
    ip: string;
    time: string;
  }>;
  dataVolume: Array<{
    name: string;
    count: number;
    icon: string;
    trend: string;
  }>;
  branchComparison: Array<{
    name: string;
    loans: number;
    collection: number;
    npl: number;
  }>;
  peakUsageData: Array<{
    hour: string;
    users: number;
  }>;
  adminNotifications: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    priority: string;
  }>;
}

/**
 * Get loan officer dashboard data
 */
export const getLoanOfficerDashboard = async () => {
  return dashboardApi.getLoanOfficerDashboard();
};

/**
 * Get branch manager dashboard data
 */
export const getBranchManagerDashboard = async () => {
  return dashboardApi.getBranchManagerDashboard();
};

/**
 * Get admin dashboard data
 */
export const getAdminDashboard = async () => {
  return dashboardApi.getAdminDashboard();
};

// Export all dashboard API functions
export const dashboardApiService = {
  getLoanOfficerDashboard,
  getBranchManagerDashboard,
  getAdminDashboard,
};

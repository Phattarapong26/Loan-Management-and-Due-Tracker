/**
 * Collections API - Payment reminders and follow-ups
 */

import { apiClient } from '@/shared/lib/api-client';

export interface PaymentSchedule {
  id: string;
  loanId: string;
  paymentNumber: number;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'UNPAID' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  paidAt?: string;
  loan?: {
    id: string;
    customerId: string;
    customer?: {
      id: string;
      businessName: string;
      phone: string;
    };
  };
  payments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
  }>;
}

export interface CustomerDueStatus {
  customerId: string;
  customerName: string;
  customerPhone: string;
  loanId: string;
  scheduleId: string;
  paymentNumber: number;
  dueDate: Date;
  daysUntilDue: number;
  amountDue: number;
  status: 'UPCOMING' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'CRITICAL_OVERDUE';
  lastContactDate?: Date;
  lastContactStatus?: string;
  // Risk-related fields
  dscr?: number;
  dscrStatus?: string;
  nplStatus?: boolean;
  creditUtilization?: number;
  industryCode?: string;
  businessAge?: number;
  // Credit assessment (from backend)
  creditGrade?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'RISKY' | 'CRITICAL';
  creditScore?: number; // 0-100 (higher = healthier / lower risk)
  creditReasons?: string[];
  creditNextActions?: string[];
}

export interface CollectionDashboard {
  summary: {
    totalUpcoming: number;
    totalDueSoon: number;
    totalDueToday: number;
    totalOverdue: number;
    totalCriticalOverdue: number;
    totalAmountDue: number;
    totalAmountOverdue: number;
  };
  upcomingPayments: CustomerDueStatus[];
  dueSoon: CustomerDueStatus[];
  dueToday: CustomerDueStatus[];
  overdue: CustomerDueStatus[];
  criticalOverdue: CustomerDueStatus[];
}

export interface CollectionsSummary {
  overdue: {
    schedules: PaymentSchedule[];
    total: number;
  };
  upcoming: {
    schedules: PaymentSchedule[];
    total: number;
  };
}

export interface CollectionStats {
  totalCustomers: number;
  customersWithOverdue: number;
  overdueRate: number;
  totalOverdueAmount: number;
  averageOverdueDays: number;
}

// Collection Actions Types
export interface CollectionAction {
  id: string;
  customerId: string;
  loanId?: string;
  scheduleId?: string;
  actionType: 'CALL' | 'SMS' | 'EMAIL' | 'VISIT' | 'PAYMENT_PLAN' | 'RESTRUCTURE' | 'SETTLEMENT' | 'LEGAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  agentId: string;
  notes?: string;
  amount?: number;
  followUpDate?: string;
  estimatedDurationMinutes?: number;
  requiresApproval: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  completedAt?: string;
  result?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    businessName: string;
    phone: string;
  };
  loan?: {
    id: string;
    principal: number;
    outstandingBalance: number;
  };
  schedule?: {
    id: string;
    paymentNumber: number;
    paymentDate: string;
    totalPayment: number;
    daysOverdue: number;
  };
  agent: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateCollectionActionInput {
  customerId: string;
  loanId?: string;
  scheduleId?: string;
  actionType: CollectionAction['actionType'];
  priority?: CollectionAction['priority'];
  notes?: string;
  amount?: number;
  followUpDate?: string;
  estimatedDurationMinutes?: number;
  metadata?: any;
}

export interface UpdateCollectionActionInput {
  status?: CollectionAction['status'];
  notes?: string;
  result?: string;
  completedAt?: string;
  metadata?: any;
}

export interface CollectionActionFilters {
  customerId?: string;
  loanId?: string;
  agentId?: string;
  status?: CollectionAction['status'];
  actionType?: CollectionAction['actionType'];
  priority?: CollectionAction['priority'];
  requiresApproval?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * Get collections summary (overdue + upcoming)
 */
export const getCollectionsSummary = async (days: number = 30) => {
  return apiClient.get<CollectionsSummary>('/api/payment-schedules/collections', { days: days.toString() });
};

/**
 * Get collection dashboard with all filters
 */
export const getCollectionDashboard = async () => {
  return apiClient.get<CollectionDashboard>('/api/collections/dashboard');
};

/**
 * Get customers near due date
 */
export const getCustomersNearDue = async (daysAhead: number = 7) => {
  return apiClient.get<{ customers: CustomerDueStatus[]; total: number }>('/api/collections/near-due', { daysAhead: daysAhead.toString() });
};

/**
 * Get customers near overdue
 */
export const getCustomersNearOverdue = async (daysBack: number = 3) => {
  return apiClient.get<{ customers: CustomerDueStatus[]; total: number }>('/api/collections/near-overdue', { daysBack: daysBack.toString() });
};

/**
 * Get overdue customers
 */
export const getOverdueCustomers = async () => {
  return apiClient.get<{ customers: CustomerDueStatus[]; total: number }>('/api/collections/overdue');
};

/**
 * Get collection statistics
 */
export const getCollectionStats = async () => {
  return apiClient.get<CollectionStats>('/api/collections/stats');
};

/**
 * Get bucket roll rates analysis
 */
export interface BucketDistribution {
  bucket: 'CURRENT' | 'DPD_1_30' | 'DPD_31_60' | 'DPD_61_90' | 'NPL';
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface RollRate {
  fromBucket: BucketDistribution['bucket'];
  toBucket: BucketDistribution['bucket'];
  count: number;
  rollRate: number;
  avgAmount: number;
}

export interface BucketRollRatesTrendPoint {
  month: string; // label (week or month)
  asOfDate: string;
  distribution: BucketDistribution[];
  metrics?: {
    rollForwardRate: number;
    rollBackRate: number;
    stayedRate: number;
    rollToNPLRate: number;
    nplRate: number;
  };
}

export interface BucketRollRatesAnalysis {
  asOfDate: string;
  interval: 'week' | 'month';
  distribution: BucketDistribution[];
  rollRates: RollRate[];
  summary: {
    totalLoans: number;
    totalOverdue: number;
    nplCount: number;
    nplRate: number;
    rollToNPLRate: number;
  };
  trends: BucketRollRatesTrendPoint[];
}

export const getBucketRollRates = async (params?: {
  interval?: 'week' | 'month';
  points?: number;
  branchId?: string;
  officerId?: string;
  productId?: string;
}) => {
  return apiClient.get<BucketRollRatesAnalysis>('/api/collections/bucket-roll-rates', {
    ...(params?.interval ? { interval: params.interval } : {}),
    ...(typeof params?.points === 'number' ? { points: String(params.points) } : {}),
    ...(params?.branchId ? { branchId: params.branchId } : {}),
    ...(params?.officerId ? { officerId: params.officerId } : {}),
    ...(params?.productId ? { productId: params.productId } : {}),
  });
};

/**
 * Debt Management Types
 */
export interface DebtManagementSummary {
  totalLoans: number;
  totalOutstanding: number;
  performingCount: number;
  performingAmount: number;
  performingPercentage: number;
  overdueCount: number;
  overdueAmount: number;
  overduePercentage: number;
  nplCount: number;
  nplAmount: number;
  nplPercentage: number;
}

export interface ContractSizeDistribution {
  small: number;
  medium: number;
  large: number;
}

export interface LoanTypeDistribution {
  [productName: string]: number;
}

export interface CollateralTypeDistribution {
  land: number;
  machinery: number;
  vehicle: number;
  deposit: number;
  other: number;
}

export interface InterestRateDataPoint {
  month: string;
  actual: number;
  expected: number;
}

export interface DebtManagementResponse {
  summary: DebtManagementSummary;
  contractSizeDistribution: ContractSizeDistribution;
  loanTypeDistribution: LoanTypeDistribution;
  collateralTypeDistribution: CollateralTypeDistribution;
  interestRateComparison: InterestRateDataPoint[];
}

/**
 * Get debt management summary
 */
export const getDebtManagementSummary = async (params?: {
  year?: string;
  month?: string;
  region?: string;
  zone?: string;
  branchId?: string;
}) => {
  return apiClient.get<DebtManagementResponse>('/api/debt-management/summary', params);
};

/**
 * Get available branches for filters
 */
export const getFilterBranches = async () => {
  return apiClient.get<Array<{ id: string; name: string; province: string; district: string }>>('/api/filter-options/branches');
};

/**
 * Get available regions for filters
 */
export const getFilterRegions = async () => {
  return apiClient.get<Array<{ value: string; label: string }>>('/api/filter-options/regions');
};

/**
 * Get available zones for filters
 */
export const getFilterZones = async (region?: string) => {
  return apiClient.get<Array<{ value: string; label: string }>>('/api/filter-options/zones', region ? { region } : undefined);
};

/**
 * Get available years for filters
 */
export const getFilterYears = async () => {
  return apiClient.get<number[]>('/api/filter-options/years');
};

/**
 * Collection Actions API
 */

/**
 * Create a new collection action
 */
export const createCollectionAction = async (input: CreateCollectionActionInput) => {
  return apiClient.post<CollectionAction>('/api/collection-actions', input);
};

/**
 * Get collection actions with filters
 */
export const getCollectionActions = async (filters: CollectionActionFilters) => {
  return apiClient.get<{
    actions: CollectionAction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>('/api/collection-actions', filters as any);
};

/**
 * Get collection action by ID
 */
export const getCollectionActionById = async (id: string) => {
  return apiClient.get<CollectionAction>(`/api/collection-actions/${id}`);
};

/**
 * Update collection action
 */
export const updateCollectionAction = async (id: string, input: UpdateCollectionActionInput) => {
  return apiClient.put<CollectionAction>(`/api/collection-actions/${id}`, input);
};

/**
 * Approve collection action
 */
export const approveCollectionAction = async (id: string, notes?: string) => {
  return apiClient.post<CollectionAction>(`/api/collection-actions/${id}/approve`, { notes });
};

/**
 * Reject collection action
 */
export const rejectCollectionAction = async (id: string, reason: string) => {
  return apiClient.post<CollectionAction>(`/api/collection-actions/${id}/reject`, { reason });
};

/**
 * Get customer collection action history
 */
export const getCustomerCollectionHistory = async (customerId: string, loanId?: string) => {
  const params = loanId ? { loanId } : {};
  return apiClient.get<CollectionAction[]>(`/api/collection-actions/customer/${customerId}/history`, params);
};

/**
 * Get pending approvals
 */
export const getPendingApprovals = async () => {
  return apiClient.get<CollectionAction[]>('/api/collection-actions/pending-approvals');
};

/**
 * Get collection action statistics
 */
export const getCollectionActionStats = async (agentId?: string, dateFrom?: string, dateTo?: string) => {
  const params: any = {};
  if (agentId) params.agentId = agentId;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  
  return apiClient.get<{
    totalActions: number;
    completedActions: number;
    pendingActions: number;
    pendingApprovals: number;
    completionRate: number;
    actionsByType: Record<string, number>;
    actionsByPriority: Record<string, number>;
  }>('/api/collection-actions/stats', params);
};

// Workflow and Task Assignment Types
export interface WorkflowStep {
  id: string;
  days_overdue_from: number;
  days_overdue_to?: number;
  action_type: string;
  template_id?: string;
  priority: string;
  assigned_role: string;
  sla_hours: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  users?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  task_type?: string;
  assigned_to: string;
  assigned_by: string;
  priority: string;
  due_date: string;
  completion_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  users_task_assignments_assigned_toTousers?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  users_task_assignments_assigned_byTousers?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface WorkflowStats {
  totalSteps: number;
  activeSteps: number;
  inactiveSteps: number;
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

// Workflow API Functions
const getWorkflowSteps = async () => {
  return apiClient.get<WorkflowStep[]>('/api/collection-workflows');
};

const getWorkflowStats = async () => {
  return apiClient.get<WorkflowStats>('/api/collection-workflows/statistics');
};

const createWorkflowStep = async (input: Omit<WorkflowStep, 'id' | 'createdAt' | 'createdBy'>) => {
  return apiClient.post<WorkflowStep>('/api/collection-workflows', input);
};

const updateWorkflowStep = async (id: string, input: Partial<WorkflowStep>) => {
  return apiClient.put<WorkflowStep>(`/api/collection-workflows/${id}`, input);
};

const toggleWorkflowStep = async (id: string, isActive: boolean) => {
  return apiClient.patch<WorkflowStep>(`/api/collection-workflows/${id}/toggle`, { isActive });
};

const deleteWorkflowStep = async (id: string) => {
  return apiClient.delete(`/api/collection-workflows/${id}`);
};

// Task Assignment API Functions
const getTaskAssignments = async (filters?: { status?: string }) => {
  return apiClient.get<TaskAssignment[]>('/api/task-assignments', filters);
};

const getTaskStats = async () => {
  return apiClient.get<TaskStats>('/api/task-assignments/statistics');
};

const completeTask = async (id: string) => {
  return apiClient.post<TaskAssignment>(`/api/task-assignments/${id}/complete`);
};

export const collectionsApi = {
  getCollectionsSummary,
  getCollectionDashboard,
  getCustomersNearDue,
  getCustomersNearOverdue,
  getOverdueCustomers,
  getCollectionStats,
  getBucketRollRates,
  getDebtManagementSummary,
  getFilterBranches,
  getFilterRegions,
  getFilterZones,
  getFilterYears,
  // Collection Actions
  createCollectionAction,
  getCollectionActions,
  getCollectionActionById,
  updateCollectionAction,
  approveCollectionAction,
  rejectCollectionAction,
  getCustomerCollectionHistory,
  getPendingApprovals,
  getCollectionActionStats,
  // Workflow Management
  getWorkflowSteps,
  getWorkflowStats,
  createWorkflowStep,
  updateWorkflowStep,
  toggleWorkflowStep,
  deleteWorkflowStep,
  // Task Assignments
  getTaskAssignments,
  getTaskStats,
  completeTask,
};

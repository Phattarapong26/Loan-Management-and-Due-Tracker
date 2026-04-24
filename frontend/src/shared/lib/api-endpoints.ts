/**
 * API Endpoints - Centralized endpoint definitions
 * Type-safe API method wrappers for all backend endpoints
 */

import { apiClient, ApiResponse } from './api-client';
import { User, UserRole, UserStatus } from '../types/user';
export type { User, UserRole, UserStatus };

// ==================== Types ====================

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface Customer {
    id: string;
    businessName: string;
    thaiId?: string;
    taxId: string;
    phone: string;
    email?: string;
    businessType?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
    address?: string;
    branchId: string;
    officerId?: string;
    customerCode: string;
    avatar?: string;
    registrationNumber?: string;
    lineId?: string;
    phoneNumber?: string;
    yearsInBusiness?: number;
    businessAgeYears?: number;
    registeredCapital?: number;
    registrationDate?: string | Date;
    employees?: number;
    numberOfEmployees?: number;
    pumpCount?: number;
    aiExtractedData?: Record<string, unknown>;
    createdByName?: string;
    createdByUser?: { id: string; firstName: string; lastName: string } | null;
    _count?: { loans?: number };
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Loan {
    id: string;
    loanNo: string;
    customerId: string;
    customerName: string;
    amount: number;
    principal: number;
    interestRate: number;
    term: number;
    status: 'PENDING_APPROVAL' | 'PENDING' | 'APPROVED' | 'DISBURSED' | 'ACTIVE' | 'REJECTED' | 'PAID_OFF' | 'CLOSED' | 'DEFAULTED' | 'NPL';
    disbursementDate?: string;
    totalDisbursed: number;
    remainingAmount: number;
    customer?: {
        businessName: string;
        customerCode: string;
        avatar?: string;
    };
    loanProduct?: { id: string; productName: string };
    branch?: Branch;
    officer?: { id: string; firstName: string; lastName: string };
    nextPaymentAmount?: number;
    annualRevenue?: number;
    annualCogs?: number;
    annualOpex?: number;
    rejectedReason?: string;
    dscr?: number;
    loan_number?: string;
    termMonths?: number;
    loanProductId?: string;
    outstandingBalance?: number; // UI alias
    contractNumber?: string; // UI alias
    nextPaymentDate?: string; // UI alias
    overdueDays?: number;
    lastPaymentDate?: string;
    firstPaymentDate?: string; // Payment schedule
    paymentDay?: number; // Payment schedule
    // Credit assessment (computed by backend)
    creditGrade?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'RISKY' | 'CRITICAL';
    creditScore?: number; // 0-100 (higher = healthier / lower risk)
    creditReasons?: string[];
    creditNextActions?: string[];
    paymentSchedule?: Array<{
        id: string;
        dueDate: string;
        principalAmount: number;
        interestAmount: number;
        totalAmount: number;
        status: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface Payment {
    id: string;
    loanId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNo?: string;
    notes?: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    paymentScheduleId?: string;
    penaltyAmount?: number;
    paymentType?: 'EARLY' | 'ON_TIME' | 'LATE';
    createdAt: string;
}

export interface PaymentReceipt {
    receiptId: string;
    receiptNumber: string;
    paymentId: string;
    loanId: string;
    customerId: string;
    pdfUrl?: string;
}

export interface Document {
    id: string;
    customerId: string;
    documentType: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    extractedData?: Record<string, unknown>;
    confidenceScore?: number;
    reviewStatus: string;
    uploadedBy: string;
    createdAt: string;
}

export interface Branch {
    id: string;
    code: string;
    name: string;
    address?: string;
    phone?: string;
    province?: string;
    district?: string;
    subdistrict?: string;
    postalCode?: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface ContactLog {
    id: string;
    customerId: string;
    loanId?: string;
    contactDate: string;
    contactStatus: string;
    contactMethod: string;
    notes: string;
    promisedDate?: string;
    officerId: string;
}

export interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string;
    expenseDate: string;
    receiptPath?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
    branchId: string;
    createdAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
    eventType: string;
    category?: string;
    loanId?: string;
    customerId?: string;
    location?: string;
    attendees?: string[];
    recurring: boolean;
    recurrenceRule?: string;
    reminderMinutes?: number[];
}

export interface Disbursement {
    id: string;
    loanId: string;
    amount: number;
    purpose: string;
    status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED' | 'CANCELLED';
    requestedDate: string;
    executedDate?: string;
    disbursedAt?: string; // Add this field from database
    disbursementMethod?: string;
    referenceNo?: string;
    notes?: string;
    nextDisbursementDate?: string;
    disbursementNo?: number;
    rejectedReason?: string;
    loan?: {
        id: string;
        loanNo?: string;
        contract_number?: string; // From backend
        loanContractNo?: string; // Alias for contract_number
        customerName?: string;
        principal: number;
        totalDisbursed: number;
        remainingAmount: number;
        approvedAt?: string; // From backend
        approvedDate?: string; // Alias for approvedAt
        firstPaymentDate?: string; // Payment schedule
        paymentDay?: number; // Payment schedule
        productConfig?: Record<string, unknown>; // For PDF status tracking
        paymentSchedule?: Array<{
            id: string;
            dueDate: string;
            principalAmount: number;
            interestAmount: number;
            totalAmount: number;
            status: string;
        }>;
        customer: {
            businessName: string;
            customerCode: string;
            avatar?: string;
            address?: string;
            phone?: string;
            email?: string;
            thaiId?: string; // From backend (National ID)
            nationalId?: string; // Alias for thaiId
            taxId?: string;
        };
    };
    creator?: {
        firstName: string;
        lastName: string;
    };
}

export interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    user?: {
        firstName?: string;
        lastName?: string;
        email?: string;
    };
    action: string;
    resource: string;
    resourceId?: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown> & { severity?: string };
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export interface DashboardStats {
    totalLoans: number;
    totalAmount: number;
    activeCustomers: number;
    pendingTasks: number;
    monthlyGrowth?: number;
    recentActivities?: Array<{
        id: string;
        type: string;
        title: string;
        timestamp: string;
        status?: string;
    }>;
}

// ==================== Auth ====================
export const authApi = {
    login: (email: string, password: string) =>
        apiClient.post<AuthResponse>('/api/auth/login', { email, password }),

    register: (data: { email: string; password: string; firstName: string; lastName: string; phoneNumber?: string }) =>
        apiClient.post<AuthResponse>('/api/auth/register', data),

    logout: () =>
        apiClient.post('/api/auth/logout'),

    refresh: (refreshToken: string) =>
        apiClient.post<{ accessToken: string }>('/api/auth/refresh', { refreshToken }),

    me: (silent = false) =>
        apiClient.get<User & { branchId?: string }>('/api/auth/me', undefined, { silent }),

    forgotPassword: (email: string) =>
        apiClient.post<{ message: string }>('/api/auth/forgot-password', { email }),

    resetPasswordWithToken: (data: { token: string; password: string }) =>
        apiClient.post<{ message: string }>('/api/auth/reset-password', data),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        apiClient.post<{ message: string }>('/api/auth/change-password', data),
};

// ==================== Customers ====================
export const customersApi = {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string; branchId?: string; officerId?: string }) =>
        apiClient.get<{ customers: Customer[]; total: number; page: number; limit: number; totalPages: number }>('/api/customers', params),

    getById: (id: string) =>
        apiClient.get<Customer>(`/api/customers/${id}`),

    create: (data: Partial<Customer>) =>
        apiClient.post<Customer>('/api/customers', data),

    update: (id: string, data: Partial<Customer>) =>
        apiClient.patch<Customer>(`/api/customers/${id}`, data),

    delete: (id: string) =>
        apiClient.delete<{ message: string }>(`/api/customers/${id}`),

    updateWithAIData: (id: string, aiData: Record<string, unknown>, confidenceScore: number, warnings: string[]) =>
        apiClient.post<{ customer: Customer; message: string }>(`/api/customers/${id}/ai-data`, { aiData, confidenceScore, warnings }),

    createFromDocument: (data: { documentId: string; businessProfile: Record<string, unknown>; branchId?: string; officerId?: string }) =>
        apiClient.post<Customer>('/api/customers/from-document', data),
};

// ==================== Loans ====================
export const loansApi = {
    list: (params?: { page?: number; limit?: number; status?: string; customerId?: string; branchId?: string; officerId?: string; search?: string }) =>
        apiClient.get<{ loans: Loan[]; total: number; page: number; limit: number; totalPages: number }>('/api/loans', params),

    getById: (id: string) =>
        apiClient.get<Loan>(`/api/loans/${id}`),

    create: (data: Partial<Loan>) =>
        apiClient.post<Loan>('/api/loans', data),

    approve: (id: string, data: { disbursementDate?: string; notes?: string }) =>
        apiClient.post<{ loan: Loan; message: string }>(`/api/loans/${id}/approve`, data),

    reject: (id: string, data: { reason: string }) =>
        apiClient.post<{ loan: Loan; message: string }>(`/api/loans/${id}/reject`, data),

    setPaymentSchedule: (id: string, data: { firstPaymentDate: string; paymentDay: number }) =>
        apiClient.post<{ message: string }>(`/api/loans/${id}/payment-schedule`, data),

    getPendingApprovals: () =>
        apiClient.get<{ loans: Loan[] }>('/api/loans/pending-approvals'),

    getStatistics: (params?: { status?: string; branchId?: string; officerId?: string }) =>
        apiClient.get<{
            totalLoans: number;
            totalAmount: number;
            totalOutstanding: number;
            statusCounts: Record<string, number>;
            pendingCount: number;
            approvedCount: number;
            activeCount: number;
            nplCount: number;
            overdueCount: number;
        }>('/api/loans/statistics', params),

    getPaymentSchedule: (loanId: string) =>
        apiClient.get<{ 
            schedules: Array<{
                id: string;
                paymentNumber: number;
                paymentDate: string;
                dueDate: string;
                principalAmount: number;
                interestAmount: number;
                totalAmount: number;
                totalPayment: number;
                remainingBalance: number;
                paidAmount: number;
                paidDate?: string;
                status: string;
            }>; 
            total: number; 
            loan: { id: string; customerId: string; customerName: string; outstandingBalance: string } 
        }>(`/api/loans/${loanId}/payment-schedules`),

    getPenaltyPreview: (loanId: string, overdueDays: number) =>
        apiClient.get<{
            loanId: string;
            customerName: string;
            outstandingBalance: number;
            overdueDays: number;
            penaltyAmount: number;
            penaltyDetails: {
                penaltyRate: number;
                maxAnnualRate: number;
                ruleName: string;
                penaltyType: string;
                compoundInterest: boolean;
                compoundRate?: number;
            };
            calculation: {
                dailyRate: number;
                daysApplied: number;
                baseAmount: number;
                cappedAmount: number;
                collectionFee: number;
                totalAmount: number;
            };
            breakdown: {
                dailyRate: string;
                annualRate: string;
                daysApplied: number;
                baseCalculation: string;
                basePenalty: number;
                cappedPenalty: number;
                collectionFee: number;
                totalPenalty: number;
            };
        }>(`/api/loans/${loanId}/penalty-preview`, { overdueDays: overdueDays.toString() }),

    getPenaltyRate: (loanId: string, overdueDays: number) =>
        apiClient.get<{
            penaltyRate: number;
            maxAnnualRate: number;
            ruleName: string;
            penaltyType: string;
            compoundInterest: boolean;
            compoundRate?: number;
        }>(`/api/loans/${loanId}/penalty-rate`, { overdueDays: overdueDays.toString() }),

    delete: (id: string) =>
        apiClient.delete<{
            message: string;
            auditLog?: {
                action: string;
                loanId: string;
                deletedBy?: { userId: string; email: string; role: string; branchId?: string };
                timestamp: string;
            };
        }>(`/api/loans/${id}`),

    restore: (id: string) =>
        apiClient.post<{ message: string }>(`/api/loans/${id}/restore`, {}),
};

// ==================== Payments ====================
export const paymentsApi = {
    list: (params?: { page?: number; limit?: number; loanId?: string; startDate?: string; endDate?: string }) =>
        apiClient.get<{ payments: Payment[]; total: number; page: number; limit: number; totalPages: number }>('/api/payments', params),

    getById: (id: string) =>
        apiClient.get<Payment>(`/api/payments/${id}`),

    create: (data: Partial<Payment>) =>
        apiClient.post<Payment>('/api/payments', data),

    getLoanHistory: async (loanId: string) => {
        // Use the canonical payments list endpoint to avoid route mismatches across environments
        const res = await apiClient.get<{ payments: Payment[]; total: number; page: number; limit: number; totalPages: number }>(
            '/api/payments',
            { loanId, page: '1', limit: '200' }
        );
        if (res.error) return res as ApiResponse<{ payments: Payment[]; total: number; page: number; limit: number; totalPages: number }>;
        return { ...res, data: { payments: res.data?.payments || [] } };
    },

    getStatistics: (params?: { startDate?: string; endDate?: string }) =>
        apiClient.get<{ totalCollected: number; totalPending: number; totalOverdue: number; overdueCount: number; totalPayments: number }>('/api/payments/statistics', params),
};

// ==================== Receipts ====================
export const receiptsApi = {
    getLoanReceipts: (loanId: string) =>
        apiClient.get<PaymentReceipt[]>(`/api/receipts/loan/${loanId}`),

    getReceiptPdfUrl: (receiptId: string) =>
        apiClient.get<{ pdfUrl: string }>(`/api/receipts/${receiptId}/pdf-url`),
};

// ==================== Documents ====================
export const documentsApi = {
    list: (params?: { page?: number; limit?: number; customerId?: string; branchId?: string; status?: string; documentType?: string }) =>
        apiClient.get<{ documents: Document[]; total: number; page: number; limit: number; totalPages: number }>('/api/documents', params),

    getById: (id: string) =>
        apiClient.get<Document>(`/api/documents/${id}`),

    upload: (file: File, additionalFields: { customerId?: string; documentType: string; officerId?: string; branchId?: string }, onProgress?: (progress: number) => void) =>
        apiClient.uploadFile<Document>('/api/documents/upload', file, additionalFields, onProgress),

    getFile: (id: string) =>
        apiClient.get(`/api/documents/${id}/file`),

    linkToCustomer: (documentId: string, customerId: string, businessProfile?: Record<string, unknown>) =>
        apiClient.post<{ message: string }>(`/api/documents/${documentId}/link-customer`, { customerId, businessProfile }),

    saveParsedData: (id: string, data: Record<string, unknown>) =>
        apiClient.post<{ message: string }>(`/api/documents/${id}/save-parsed-data`, data),

    delete: (id: string) =>
        apiClient.delete<{ message: string }>(`/api/documents/${id}`),
};

// ==================== Branches ====================
export const branchesApi = {
    list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
        apiClient.get<{ branches: Branch[]; total: number; page: number; limit: number; totalPages: number }>('/api/branches', params),

    getAll: () =>
        apiClient.get<Branch[]>('/api/branches/all'),

    getById: (id: string) =>
        apiClient.get<Branch>(`/api/branches/${id}`),

    getWithStats: (id: string) =>
        apiClient.get<{ branch: Branch; stats: {
            totalLoans: number;
            activeLoans: number;
            totalAmount: number;
            customerCount: number;
        } }>(`/api/branches/${id}/stats`),

    getEmployees: (id: string) =>
        apiClient.get<User[]>(`/api/branches/${id}/employees`),

    create: (data: { 
        code: string; 
        name: string; 
        address?: string; 
        phone?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
        postalCode?: string;
    }) =>
        apiClient.post<Branch>('/api/branches', data),

    update: (id: string, data: { 
        name?: string; 
        address?: string; 
        phone?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
        postalCode?: string;
        status?: string;
    }) =>
        apiClient.patch<Branch>(`/api/branches/${id}`, data),
};

// ==================== Users ====================
export const usersApi = {
    list: (params?: { page?: number; limit?: number; role?: string; status?: string; branchId?: string; search?: string }) =>
        apiClient.get<{ users: User[]; total: number; page: number; limit: number; totalPages: number }>('/api/users', params),

    getById: (id: string) =>
        apiClient.get<User>(`/api/users/${id}`),

    create: (data: { email: string; firstName: string; lastName: string; phoneNumber?: string; role: string; branchId?: string; password?: string }) =>
        apiClient.post<User>('/api/users', data),

    update: (id: string, data: { firstName?: string; lastName?: string; phoneNumber?: string; role?: string; status?: string; branchId?: string; monthlyTarget?: number }) =>
        apiClient.patch<User>(`/api/users/${id}`, data),

    resetPassword: (id: string, data: { newPassword?: string; temporaryPassword?: boolean; sendResetLink?: boolean }) =>
        apiClient.post<{ message: string }>(`/api/users/${id}/reset-password`, data),

    toggleStatus: (id: string) =>
        apiClient.post<{ user: User; message: string }>(`/api/users/${id}/toggle-status`),
};

// ==================== Contact Logs ====================
export const contactLogsApi = {
    list: (params?: { page?: number; limit?: number; customerId?: string; loanId?: string; officerId?: string; contactStatus?: string; contactMethod?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<{ contactLogs: ContactLog[]; total: number; page: number; limit: number; totalPages: number }>('/api/contact-logs', params),

    getById: (id: string) =>
        apiClient.get<ContactLog>(`/api/contact-logs/${id}`),

    create: (data: { customerId: string; loanId?: string; contactDate: string; contactStatus: string; contactMethod: string; notes: string; promisedDate?: string }) =>
        apiClient.post<ContactLog>('/api/contact-logs', data),

    getReminders: (params?: { officerId?: string; status?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<ContactLog[]>('/api/contact-logs/reminders', params),

    getUncontactedCustomers: (params?: { daysWithoutContact?: number }) =>
        apiClient.get<Customer[]>('/api/contact-logs/uncontacted', params),
};

// ==================== Dashboard ====================
export const dashboardApi = {
    getLoanOfficerDashboard: () =>
        apiClient.get<{
            stats: DashboardStats;
            monthlyTarget: number;
            collectionRate: number;
            upcomingPayments: Array<{
                id: string;
                customerName: string;
                amount: number;
                dueDate: string;
                status: string;
            }>;
            recentCustomers: Customer[];
        }>('/api/dashboard/loan-officer'),

    getBranchManagerDashboard: () =>
        apiClient.get<{
            totalLoans: number;
            outstandingBalance: number;
            nplRatio: number;
            pendingApprovals: number;
            collectionRate: number;
            highRiskLoans: number;
            officerPerformance: Array<{
                id: string;
                name: string;
                current: number;
                target: number;
                percentage: number;
            }>;
        }>('/api/dashboard/branch-manager'),

    getAdminDashboard: () =>
        apiClient.get<{
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
        }>('/api/dashboard/admin'),
};

// ==================== Reports ====================
export const reportsApi = {
    generateBranchSummary: (params?: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<{
            summary: {
                portfolioLoans: number;
                activeLoans: number;
                nplLoans: number;
                totalDisbursed: number;
                totalCollected: number;
                totalExpected: number;
                collectionRate: number;
                totalOutstanding: number;
                nplRatio: number;
            };
            dpdBuckets: {
                current: number;
                dpd1to7: number;
                dpd8to29: number;
                dpd30to89: number;
                dpd90plus: number;
            };
        }>('/api/reports/branch-summary', params),

    generateNPLReport: (params?: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<Array<{
            loanId: string;
            contractNumber?: string | null;
            customerName: string;
            customerCode?: string;
            branchName?: string;
            officerName?: string;
            productName?: string;
            status: string;
            outstandingAmount: number;
            overdueDays: number;
            lastPaymentDate?: string;
        }>>('/api/reports/npl-report', params),

    generateOfficerPerformance: (params?: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<Array<{
            officerId: string;
            officerName: string;
            portfolioLoans: number;
            activeLoans: number;
            nplLoans: number;
            disbursementAmount: number;
            totalCollected: number;
            totalExpected: number;
            collectionRate: number;
        }>>('/api/reports/officer-performance', params),

    getLoanReport: (params?: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<Array<{
            loanId: string;
            contractNumber?: string | null;
            customerName: string;
            customerCode?: string;
            branchName?: string;
            officerName?: string;
            productName?: string;
            principal: number;
            outstandingBalance: number;
            status: string;
            disbursementDate?: string;
            overdueDays: number;
            createdAt: string;
        }>>('/api/reports/loans', params),

    getPaymentReport: (params?: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<{
            summary: {
                totalPayments: number;
                totalCollected: number;
            };
            payments: Array<{
                paymentId: string;
                paymentDate: string;
                amount: number;
                paymentMethod: string;
                paymentType: string;
                loanId: string;
                contractNumber?: string | null;
                customerName: string;
                customerCode?: string;
                branchName?: string;
                officerName?: string;
                productName?: string;
                receiptNumber?: string;
                recordedBy?: string;
            }>;
        }>('/api/reports/payments', params),
};

// ==================== Expenses ====================
export const expensesApi = {
    list: (params?: { page?: number; limit?: number; branchId?: string; status?: string; category?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<{ expenses: Expense[]; total: number; page: number; limit: number; totalPages: number }>('/api/expenses', params),

    getById: (id: string) =>
        apiClient.get<Expense>(`/api/expenses/${id}`),

    create: (data: { category: string; amount: number; description: string; expenseDate: string; receiptPath?: string }) =>
        apiClient.post<Expense>('/api/expenses', data),

    update: (id: string, data: { category?: string; amount?: number; description?: string; expenseDate?: string; receiptPath?: string }) =>
        apiClient.patch<Expense>(`/api/expenses/${id}`, data),

    approve: (id: string, data?: { notes?: string }) =>
        apiClient.post<{ expense: Expense; message: string }>(`/api/expenses/${id}/approve`, data || {}),

    reject: (id: string, data: { reason: string }) =>
        apiClient.post<{ expense: Expense; message: string }>(`/api/expenses/${id}/reject`, data),

    reimburse: (id: string) =>
        apiClient.post<{ expense: Expense; message: string }>(`/api/expenses/${id}/reimburse`),
};

// ==================== Loan Disbursements ====================
export interface DisbursementStats {
    total: number;
    pending: number;
    approved: number;
    disbursed: number;
    rejected: number;
    cancelled: number;
    totalAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    disbursedAmount: number;
}

export const disbursementsApi = {
    list: (params?: { 
        page?: number; 
        limit?: number; 
        loanId?: string; 
        customerId?: string; 
        branchId?: string;
        status?: string; 
        dateFrom?: string; 
        dateTo?: string;
        searchTerm?: string;
    }) =>
        apiClient.get<{ disbursements: Disbursement[]; total: number; page: number; limit: number; totalPages: number }>('/api/disbursements', params),

    getById: (id: string) =>
        apiClient.get<Disbursement>(`/api/disbursements/${id}`),

    create: (data: { 
        loanId: string; 
        amount: number; 
        purpose: string; 
        requestedDate: string; 
        nextDisbursementDate?: string; 
        notes?: string;
        firstPaymentDate?: string;
        paymentDay?: number;
    }) =>
        apiClient.post<{ disbursement: Disbursement; message: string }>('/api/disbursements', data),

    update: (id: string, data: { 
        amount?: number; 
        purpose?: string; 
        requestedDate?: string; 
        nextDisbursementDate?: string; 
        notes?: string;
        firstPaymentDate?: string;
        paymentDay?: number;
    }) =>
        apiClient.patch<{ disbursement: Disbursement; message: string }>(`/api/disbursements/${id}`, data),

    approve: (id: string, notes?: string) =>
        apiClient.post<{ disbursement: Disbursement; message: string }>(`/api/disbursements/${id}/approve`, { notes }),

    reject: (id: string, reason: string) =>
        apiClient.post<{ disbursement: Disbursement; message: string }>(`/api/disbursements/${id}/reject`, { reason }),

    disburse: (id: string, data: { 
        disbursementMethod: string; 
        referenceNo?: string; 
        notes?: string;
    }) =>
        apiClient.post<{ referenceNo?: string }>(`/api/disbursements/${id}/execute`, data),

    cancel: (id: string) =>
        apiClient.post<{ message: string }>(`/api/disbursements/${id}/cancel`, {}),

    delete: (id: string) =>
        apiClient.delete<{ message: string }>(`/api/disbursements/${id}`),

    getStats: (params?: { branchId?: string; dateFrom?: string; dateTo?: string }) =>
        apiClient.get<DisbursementStats>('/api/disbursements/stats', params),

    getByLoan: (loanId: string) =>
        apiClient.get<Disbursement[]>(`/api/loans/${loanId}/disbursements`),

    getSummary: (loanId: string) =>
        apiClient.get<{
            totalAmount: number;
            totalDisbursed: number;
            remainingAmount: number;
            disbursementCount: number;
        }>(`/api/loans/${loanId}/disbursement-summary`),

    regenerateContractPdf: (loanId: string) =>
        apiClient.get<{ message: string }>(`/api/disbursements/loans/${loanId}/regenerate-contract-pdf`),
};

// ==================== Notifications ====================
export const notificationsApi = {
    list: (params?: { page?: number; limit?: number; read?: boolean; type?: string }) =>
        apiClient.get<{ notifications: Notification[]; total: number; page: number; limit: number; totalPages: number }>('/api/notifications', params),

    create: (data: { userId: string; type: string; title: string; message: string; link?: string; metadata?: Record<string, unknown> }) =>
        apiClient.post<Notification>('/api/notifications', data),

    markAsRead: (id: string) =>
        apiClient.post(`/api/notifications/${id}/read`),

    markAllAsRead: () =>
        apiClient.post('/api/notifications/read-all'),

    delete: (id: string) =>
        apiClient.delete(`/api/notifications/${id}`),

    getUnreadCount: () =>
        apiClient.get<{ count: number }>('/api/notifications/unread-count'),
};

// ==================== Calendar Events ====================
export const calendarApi = {
    list: (params?: { page?: number; limit?: number; branchId?: string; eventType?: string; category?: string; dateFrom?: string; dateTo?: string; loanId?: string; customerId?: string }) =>
        apiClient.get<{ events: CalendarEvent[]; total: number; page: number; limit: number; totalPages: number }>('/api/calendar-events', params),

    getById: (id: string) =>
        apiClient.get<CalendarEvent>(`/api/calendar-events/${id}`),

    create: (data: { 
        title: string; 
        description?: string; 
        startDate: string; 
        endDate?: string; 
        allDay?: boolean; 
        eventType: string; 
        category?: string; 
        loanId?: string; 
        customerId?: string; 
        location?: string; 
        attendees?: string[]; 
        recurring?: boolean; 
        recurrenceRule?: string; 
        reminderMinutes?: number[];
        assignedTo?: string;
        priority?: string;
    }) =>
        apiClient.post<CalendarEvent>('/api/calendar-events', data),

    update: (id: string, data: { 
        title?: string; 
        description?: string; 
        startDate?: string; 
        endDate?: string; 
        allDay?: boolean; 
        eventType?: string; 
        category?: string; 
        loanId?: string; 
        customerId?: string; 
        location?: string; 
        attendees?: string[]; 
        recurring?: boolean; 
        recurrenceRule?: string; 
        reminderMinutes?: number[];
        assignedTo?: string;
        priority?: string;
    }) =>
        apiClient.patch<CalendarEvent>(`/api/calendar-events/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/api/calendar-events/${id}`),
};

// ==================== LINE Integration ====================
export const lineApi = {
    sendDailyNotification: (data: { role: string; lineUserId: string; testMode?: boolean }) =>
        apiClient.post('/api/line/notifications/daily', data),

    sendTestDailyNotification: (data: { targetUserId?: string; targetLineUserId?: string }) =>
        apiClient.post('/api/line/notifications/test', data),

    sendTestCustomerNotification: (data: { loanId?: string; contractNumber?: string; customerId?: string; customerLineUserId?: string }) =>
        apiClient.post('/api/line/customers/notifications/test', data),

    generateQR: (customerId: string) =>
        apiClient.post<{ qrCodeUrl: string; token: string }>(`/api/line/qr/generate/${customerId}`),

    checkQRStatus: (token: string) =>
        apiClient.get<{ status: string; customerId?: string }>(`/api/line/qr/status/${token}`),
};

// ==================== Monitoring & Audit ====================
export const monitoringApi = {
    getAuditLogs: (params?: { page?: number; limit?: number; userId?: string; action?: string; resource?: string; dateFrom?: string; dateTo?: string; search?: string; severity?: string }) =>
        apiClient.get<{ logs: AuditLog[]; total: number; page: number; limit: number; totalPages: number }>('/api/monitoring/audit-logs', params),
    
    getSecuritySummary: () =>
        apiClient.get<{ 
            summary: {
                suspiciousActivities?: number;
                highSeverityAlerts?: number;
                failedLogins?: number;
                totalActions24h?: number;
            };
            recentAlerts: AuditLog[];
            activityOverTime: Array<{ createdAt: string; _count: number }>;
        }>('/api/monitoring/security-summary'),
    
    getSecurityEvents: (params?: { 
        page?: number; 
        limit?: number; 
        threatType?: string; 
        severity?: string; 
        ipAddress?: string; 
        blocked?: boolean;
        startDate?: string;
        endDate?: string;
    }) =>
        apiClient.get<{ 
            events: Array<{
                id: string;
                ipAddress: string;
                endpoint: string;
                method: string;
                threatType: string;
                severity: string;
                description: string;
                blocked: boolean;
                payload?: string;
                userAgent?: string;
                createdAt: string;
            }>;
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>('/api/security/events', params),
    
    getBlockedIps: () =>
        apiClient.get<{
            blockedIps: Array<{
                id: string;
                ipAddress: string;
                reason: string;
                blockedBy?: string;
                expiresAt?: string;
                createdAt: string;
            }>;
        }>('/api/security/blocked-ips'),
    
    unblockIp: (ipAddress: string) =>
        apiClient.delete<{ message: string }>(`/api/security/unblock-ip/${ipAddress}`),
    
    blockIp: (data: { ipAddress: string; reason: string; duration?: number }) =>
        apiClient.post<{ message: string }>('/api/security/block-ip', data),
    
    clearAuditLogs: () =>
        apiClient.delete<{ message: string; deletedCount: number }>('/api/monitoring/audit-logs'),
};

// ==================== Document Backfill ====================
export interface BackfillDocStats {
    total: number;
    completed: number;
    missing: number;
}

export interface DocumentBackfillStats {
    receipts: BackfillDocStats;
    contracts: BackfillDocStats;
    invoices: BackfillDocStats;
}

export interface BackfillLastRunStatus {
    timelinesCreated: number;
    timelinesFailed: number;
    receiptsCreated: number;
    receiptsFailed: number;
    contractsCreated: number;
    contractsFailed: number;
    invoicesCreated: number;
    invoicesFailed: number;
    durationMs: number;
    ranAt: string;
}

export const documentBackfillApi = {
    getStats: () =>
        apiClient.get<DocumentBackfillStats>('/api/admin/document-backfill/stats'),

    getLastRunStatus: () =>
        apiClient.get<BackfillLastRunStatus | null>('/api/admin/document-backfill/status'),

    runAll: () =>
        apiClient.post<{ message: string }>('/api/admin/document-backfill/run', {}),

    runTask: (task: 'receipts' | 'contracts' | 'invoices') =>
        apiClient.post<{ message: string }>(`/api/admin/document-backfill/run/${task}`, {}),
};

// ==================== Settings ====================
export const settingsApi = {
    // General Settings
    getGeneral: () =>
        apiClient.get<{ companyName: string; email: string; phone: string; language: string }>('/api/settings/general'),
    
    updateGeneral: (data: { companyName: string; email: string; phone: string; language: string }) =>
        apiClient.patch<{ message: string }>('/api/settings/general', data),

    // Notification Settings
    getNotifications: () =>
        apiClient.get<{ emailNotifications: boolean; lineNotifications: boolean; reminderDays: string; dailyReport: boolean; nplAlert: boolean }>('/api/settings/notifications'),
    
    updateNotifications: (data: { emailNotifications: boolean; lineNotifications: boolean; reminderDays: string; dailyReport: boolean; nplAlert: boolean }) =>
        apiClient.patch<{ message: string }>('/api/settings/notifications', data),

    // Security Settings
    getSecurity: () =>
        apiClient.get<{ sessionTimeout: string; passwordExpiry: string; twoFactor: boolean; loginAttempts: string }>('/api/settings/security'),
    
    updateSecurity: (data: { sessionTimeout: string; passwordExpiry: string; twoFactor: boolean; loginAttempts: string }) =>
        apiClient.patch<{ message: string }>('/api/settings/security', data),
};

// ==================== Business Profiles ====================
export const businessProfilesApi = {
    create: (data: { customerId: string; parsedData: Record<string, unknown>; documentId?: string; action: 'create' | 'link'; existingCustomerId?: string }) =>
        apiClient.post<{ success: boolean; data: Record<string, unknown>; error?: string }>('/api/business-profiles', data),

    getLatest: (customerId: string) =>
        apiClient.get<{ success: boolean; data: Record<string, unknown>; error?: string }>(`/api/business-profiles/${customerId}`),

    getVersions: (customerId: string) =>
        apiClient.get<{ success: boolean; data: Record<string, unknown>[]; error?: string }>(`/api/business-profiles/${customerId}/versions`),

    update: (profileId: string, data: { parsedData: Record<string, unknown> }) =>
        apiClient.put<{ success: boolean; data: Record<string, unknown>; error?: string }>(`/api/business-profiles/${profileId}`, data),

    delete: (profileId: string) =>
        apiClient.delete<{ success: boolean; message: string; error?: string }>(`/api/business-profiles/${profileId}`),

    updateReviewStatus: (profileId: string, data: { reviewStatus: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'; reviewedBy: string; reviewNotes?: string }) =>
        apiClient.patch<{ success: boolean; message: string; error?: string }>(`/api/business-profiles/${profileId}/review`, data),
};

// ==================== Health Check ====================
export const healthApi = {
    getHealthCheck: () =>
        apiClient.get<{
            status: 'healthy' | 'degraded' | 'unhealthy';
            timestamp: string;
            checks: {
                database: { status: string; latency?: number; message?: string };
                redis: { status: string; latency?: number; message?: string };
                queue: { status: string; latency?: number; message?: string };
                disk: { status: string; message?: string; details?: Record<string, unknown> };
                memory: { status: string; message?: string; details?: Record<string, unknown> };
                uptime: number;
            };
        }>('/health'),

    getReadiness: () =>
        apiClient.get<{ status: 'ready' | 'not ready'; timestamp: string }>('/health/ready'),

    getLiveness: () =>
        apiClient.get<{ status: 'alive'; timestamp: string; uptime: number }>('/health/live'),

    getAllEndpoints: () =>
        apiClient.get<{
            total: number;
            categories: Record<string, Array<{ method: string; path: string; status: string; latency?: number }>>;
        }>('/api/status/endpoints'),
};

// Export all APIs
export const api = {
    auth: authApi,
    customers: customersApi,
    loans: loansApi,
    payments: paymentsApi,
    documents: documentsApi,
    branches: branchesApi,
    users: usersApi,
    contactLogs: contactLogsApi,
    dashboard: dashboardApi,
    reports: reportsApi,
    expenses: expensesApi,
    notifications: notificationsApi,
    calendar: calendarApi,
    line: lineApi,
    monitoring: monitoringApi,
    settings: settingsApi,
    health: healthApi,
    businessProfiles: businessProfilesApi,
};

import { NotificationService } from '@notifications/services/notification.service';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { CustomerRepository } from '@customers/repositories/customer.repository';
import { CreateNotificationInput } from '../models/notification.model';

/**
 * Notification Helper Service
 * Provides role-based notification creation helpers
 */
export class NotificationHelperService {
    private notificationService: NotificationService;
    private loanRepository: LoanRepository;
    private userRepository: UserRepository;
    private customerRepository: CustomerRepository;

    constructor() {
        this.notificationService = new NotificationService();
        this.loanRepository = new LoanRepository();
        this.userRepository = new UserRepository();
        this.customerRepository = new CustomerRepository();
    }

    /**
     * Send notification to loan officer about their loan
     * Only sends to the officer assigned to the loan
     */
    async notifyLoanOfficer(params: {
        loanId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        metadata?: any;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }) {
        // Get loan with officer info
        const loan = await this.loanRepository.findById(params.loanId);

        if (!loan || !loan.officerId) {
            throw new Error('Loan or officer not found');
        }

        // Only send to active officers
        if ((loan as any).officer?.status !== 'ACTIVE') {
            console.log(`[Notification] Skipped - Officer ${loan.officerId} is not active`);
            return null;
        }

        // Create notification for officer
        const notification: CreateNotificationInput = {
            userId: loan.officerId,
            type: params.type as any,
            title: params.title,
            message: params.message,
            link: params.link,
            metadata: {
                ...params.metadata,
                loanId: params.loanId,
                branchId: loan.branchId,
            },
            priority: params.priority || 'MEDIUM',
            dedupKey: `${params.type}_${params.loanId}_${loan.officerId}`,
        };

        return this.notificationService.createNotification({} as any, notification);
    }

    /**
     * Send notification to all officers in a branch
     * Used by managers to notify their team
     */
    async notifyBranchOfficers(params: {
        branchId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        metadata?: any;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        excludeUserId?: string; // Exclude sender
    }) {
        // Get all active officers in branch
        const officers = await this.userRepository.findByBranchAndRoles(params.branchId, ['loan_officer']);
        const filtered = params.excludeUserId
            ? officers.filter(o => o.id !== params.excludeUserId)
            : officers;
        if (filtered.length === 0) {
            console.log(`[Notification] No active officers found in branch ${params.branchId}`);
            return { count: 0 };
        }

        const notifications: CreateNotificationInput[] = filtered.map((officer) => ({
            userId: officer.id,
            type: params.type as any,
            title: params.title,
            message: params.message,
            link: params.link,
            metadata: {
                ...params.metadata,
                branchId: params.branchId,
            },
            priority: params.priority || 'MEDIUM',
        }));

        return this.notificationService.createBulkNotifications({} as any, notifications);
    }

    /**
     * Send notification to branch manager
     * Used for escalations and approvals
     */
    async notifyBranchManager(params: {
        branchId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        metadata?: any;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }) {
        // Get branch manager via UserRepository
        const managers = await this.userRepository.findByBranchAndRoles(params.branchId, ['branch_manager']);
        const manager = managers[0] ?? null;

        if (!manager) {
            console.log(`[Notification] No active manager found in branch ${params.branchId}`);
            return null;
        }

        // Create notification for manager
        const notification: CreateNotificationInput = {
            userId: manager.id,
            type: params.type as any,
            title: params.title,
            message: params.message,
            link: params.link,
            metadata: {
                ...params.metadata,
                branchId: params.branchId,
            },
            priority: params.priority || 'MEDIUM',
        };

        return this.notificationService.createNotification({} as any, notification);
    }

    /**
     * Send notification to all admins
     * Used for system-wide alerts
     */
    async notifyAdmins(params: {
        type: string;
        title: string;
        message: string;
        link?: string;
        metadata?: any;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }) {
        // Get all active admins via UserRepository
        const admins = await this.userRepository.findActiveByRole('ADMIN');

        if (admins.length === 0) {
            console.log('[Notification] No active admins found');
            return { count: 0 };
        }

        // Create notifications for all admins
        const notifications: CreateNotificationInput[] = admins.map((admin) => ({
            userId: admin.id,
            type: params.type as any,
            title: params.title,
            message: params.message,
            link: params.link,
            metadata: params.metadata,
            priority: params.priority || 'HIGH',
        }));

        return this.notificationService.createBulkNotifications({} as any, notifications);
    }

    /**
     * Send notification about customer to their assigned officer
     */
    async notifyCustomerOfficer(params: {
        customerId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        metadata?: any;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }) {
        // Get customer with officer info via CustomerRepository
        const customer = await this.customerRepository.findById(params.customerId);

        if (!customer || !customer.createdBy) {
            throw new Error('Customer or officer not found');
        }

        // Get officer details via UserRepository
        const officer = await this.userRepository.findById(customer.createdBy);

        // Only send to active officers
        if (!officer || officer.status !== 'ACTIVE') {
            console.log(`[Notification] Skipped - Officer ${customer.createdBy} is not active`);
            return null;
        }

        // Create notification for officer
        const notification: CreateNotificationInput = {
            userId: customer.createdBy,
            type: params.type as any,
            title: params.title,
            message: params.message,
            link: params.link,
            metadata: {
                ...params.metadata,
                customerId: params.customerId,
                branchId: customer.branchId,
            },
            priority: params.priority || 'MEDIUM',
            dedupKey: `${params.type}_${params.customerId}_${customer.createdBy}`,
        };

        return this.notificationService.createNotification({} as any, notification);
    }

    /**
     * Send payment reminder to loan officer
     * Only notifies the officer assigned to the loan
     */
    async sendPaymentReminder(params: {
        loanId: string;
        customerId: string;
        customerName: string;
        dueDate: Date;
        amount: number;
        daysOverdue?: number;
    }) {
        const isOverdue = params.daysOverdue && params.daysOverdue > 0;
        const title = isOverdue
            ? `🔴 ชำระเงินเกินกำหนด ${params.daysOverdue} วัน`
            : '⏰ แจ้งเตือนชำระเงิน';

        const message = isOverdue
            ? `ลูกค้า ${params.customerName} เกินกำหนดชำระเงิน ${params.daysOverdue} วัน จำนวน ${this.formatCurrency(params.amount)} บาท`
            : `ลูกค้า ${params.customerName} ครบกำหนดชำระเงิน ${this.formatCurrency(params.amount)} บาท ในวันที่ ${this.formatDate(params.dueDate)}`;

        return this.notifyLoanOfficer({
            loanId: params.loanId,
            type: isOverdue ? 'PAYMENT_OVERDUE' : 'PAYMENT_DUE',
            title,
            message,
            link: `/loans/${params.loanId}`,
            metadata: {
                customerId: params.customerId,
                customerName: params.customerName,
                dueDate: params.dueDate,
                amount: params.amount,
                daysOverdue: params.daysOverdue,
            },
            priority: isOverdue ? 'HIGH' : 'MEDIUM',
        });
    }

    /**
     * Send loan approval request to manager
     */
    async sendLoanApprovalRequest(params: {
        loanId: string;
        branchId: string;
        customerName: string;
        amount: number;
        officerName: string;
    }) {
        return this.notifyBranchManager({
            branchId: params.branchId,
            type: 'REMINDER', // Use valid enum value
            title: '📋 คำขออนุมัติสินเชื่อใหม่',
            message: `${params.officerName} ขออนุมัติสินเชื่อสำหรับ ${params.customerName} จำนวน ${this.formatCurrency(params.amount)} บาท`,
            link: `/loans/${params.loanId}`,
            metadata: {
                loanId: params.loanId,
                customerName: params.customerName,
                amount: params.amount,
                officerName: params.officerName,
                notificationType: 'LOAN_APPROVAL_REQUEST', // Store actual type in metadata
            },
            priority: 'HIGH',
        });
    }

    /**
     * Send loan approval result to officer
     */
    async sendLoanApprovalResult(params: {
        loanId: string;
        customerName: string;
        approved: boolean;
        managerName: string;
        reason?: string;
    }) {
        const title = params.approved
            ? '✅ สินเชื่ออนุมัติแล้ว'
            : '❌ สินเชื่อไม่อนุมัติ';

        const message = params.approved
            ? `สินเชื่อของ ${params.customerName} ได้รับการอนุมัติจาก ${params.managerName}`
            : `สินเชื่อของ ${params.customerName} ไม่ได้รับการอนุมัติ${params.reason ? `: ${params.reason}` : ''}`;

        return this.notifyLoanOfficer({
            loanId: params.loanId,
            type: params.approved ? 'LOAN_APPROVED' : 'LOAN_REJECTED',
            title,
            message,
            link: `/loans/${params.loanId}`,
            metadata: {
                customerName: params.customerName,
                approved: params.approved,
                managerName: params.managerName,
                reason: params.reason,
            },
            priority: 'HIGH',
        });
    }

    /**
     * Send NPL alert to officer and manager
     */
    async sendNPLAlert(params: {
        loanId: string;
        branchId: string;
        customerName: string;
        daysOverdue: number;
        outstandingAmount: number;
    }) {
        const title = '🚨 แจ้งเตือน NPL';
        const message = `ลูกค้า ${params.customerName} เกินกำหนดชำระ ${params.daysOverdue} วัน ยอดคงค้าง ${this.formatCurrency(params.outstandingAmount)} บาท`;

        // Notify officer
        await this.notifyLoanOfficer({
            loanId: params.loanId,
            type: 'SYSTEM_ALERT',
            title,
            message,
            link: `/loans/${params.loanId}`,
            metadata: {
                customerName: params.customerName,
                daysOverdue: params.daysOverdue,
                outstandingAmount: params.outstandingAmount,
                notificationType: 'NPL_ALERT',
            },
            priority: 'URGENT',
        });

        // Also notify manager
        return this.notifyBranchManager({
            branchId: params.branchId,
            type: 'SYSTEM_ALERT',
            title,
            message,
            link: `/loans/${params.loanId}`,
            metadata: {
                loanId: params.loanId,
                customerName: params.customerName,
                daysOverdue: params.daysOverdue,
                outstandingAmount: params.outstandingAmount,
                notificationType: 'NPL_ALERT',
            },
            priority: 'URGENT',
        });
    }

    /**
     * Helper: Format currency
     */
    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    /**
     * Helper: Format date
     */
    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    }
}

// Export singleton instance
export const notificationHelper = new NotificationHelperService();

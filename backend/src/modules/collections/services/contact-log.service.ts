import { FastifyRequest } from 'fastify';
import { ContactLogRepository } from '../repositories/contact-log.repository';
import { CustomerRepository } from '@customers/repositories/customer.repository';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { EncryptionUtil } from '@core/utils/security/encryption.util';
import { CreateContactLogInput, GetRemindersQuery } from '../models/contact-log.model';

/**
 * Contact Log Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class ContactLogService {
    private contactLogRepository: ContactLogRepository;
    private customerRepository: CustomerRepository;
    private loanRepository: LoanRepository;

    constructor() {
        this.contactLogRepository = new ContactLogRepository();
        this.customerRepository = new CustomerRepository();
        this.loanRepository = new LoanRepository();
    }

    /**
     * Create contact log with validation
     */
    async createContactLog(
        _request: FastifyRequest,
        input: CreateContactLogInput,
        officerId: string
    ) {
        // Validate customer exists
        const customer = await this.customerRepository.findById(input.customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Validate loan if provided
        if (input.loanId) {
            const loan = await this.loanRepository.findById(input.loanId);
            if (!loan) {
                throw new Error('Loan not found');
            }

            // Verify loan belongs to customer
            if (loan.customerId !== input.customerId) {
                throw new Error('Loan does not belong to customer');
            }
        }

        // Validate promised date if status requires it
        if (
            (input.contactStatus === 'PROMISED_TO_PAY' ||
                input.contactStatus === 'REQUEST_EXTENSION') &&
            !input.promisedDate
        ) {
            throw new Error('Promised date is required for this contact status');
        }

        // Create contact log
        const contactLog = await this.contactLogRepository.create({
            ...input,
            officerId,
        });

        return contactLog;
    }

    /**
     * Get contact log by ID
     */
    async getContactLog(contactLogId: string) {
        const contactLog = await this.contactLogRepository.findById(contactLogId);
        if (!contactLog) {
            throw new Error('Contact log not found');
        }

        return contactLog;
    }

    /**
     * List contact logs
     */
    async listContactLogs(params: {
        page: number;
        limit: number;
        customerId?: string;
        loanId?: string;
        officerId?: string;
        contactStatus?: string;
        contactMethod?: string;
        dateFrom?: string;
        dateTo?: string;
    }) {
        const result = await this.contactLogRepository.list({
            page: params.page,
            limit: params.limit,
            customerId: params.customerId,
            loanId: params.loanId,
            officerId: params.officerId,
            contactStatus: params.contactStatus as any,
            contactMethod: params.contactMethod as any,
            dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
            dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
        });

        return {
            contactLogs: result.contactLogs,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
    }

    /**
     * Get reminders
     */
    async getReminders(params: GetRemindersQuery & { officerId?: string; branchId?: string }) {
        const reminders = await this.contactLogRepository.getReminders({
            officerId: params.officerId,
            status: params.status,
            dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
            dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
        });

        // Format reminders
        const now = new Date();
        return reminders.map((log) => {
            const promisedDate = log.promisedDate ? new Date(log.promisedDate) : null;
            const isOverdue = promisedDate ? promisedDate < now : false;
            const daysUntilDue = promisedDate
                ? Math.ceil((promisedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                id: log.id,
                loanId: log.loanId,
                customerId: log.customerId,
                customerName: log.customer?.businessName || 'Unknown',
                customerPhone: log.customer?.phone ? EncryptionUtil.decrypt(log.customer.phone) : '',
                dueDate: promisedDate?.toISOString().split('T')[0] || null,
                type: log.contactStatus === 'PROMISED_TO_PAY' ? 'promised_payment' : 'follow_up',
                notes: log.notes,
                status: isOverdue ? 'overdue' : 'pending',
                daysUntilDue,
                officerId: log.officerId,
                contactDate: log.contactDate.toISOString(),
            };
        });
    }

    /**
     * Get uncontacted customers
     */
    async getUncontactedCustomers(params: {
        officerId?: string;
        branchId?: string;
        daysWithoutContact?: number;
    }) {
        const daysWithoutContact = params.daysWithoutContact || 2;

        return this.contactLogRepository.getUncontactedCustomers({
            officerId: params.officerId,
            branchId: params.branchId,
            daysWithoutContact,
        });
    }
}

import { FastifyRequest } from 'fastify';
import { LineAuditRepository } from '../repositories/line-audit.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { CustomerRepository } from '@customers/repositories/customer.repository';
import {
    CreateLineAuditLogInput,
    ListLineAuditLogsQuery,
    LineAuditAction,
    DisconnectLineUserInput,
} from '../models/line-audit.model';

/**
 * LINE Audit Service - Business logic for LINE audit logs
 */
export class LineAuditService {
    private lineAuditRepository: LineAuditRepository;
    private userRepository: UserRepository;
    private customerRepository: CustomerRepository;

    constructor() {
        this.lineAuditRepository = new LineAuditRepository();
        this.userRepository = new UserRepository();
        this.customerRepository = new CustomerRepository();
    }

    /**
     * Create LINE audit log
     */
    async createAuditLog(
        request: FastifyRequest,
        input: CreateLineAuditLogInput
    ) {
        const performedBy = request.user?.userId;
        if (!performedBy) {
            throw new Error('User not authenticated');
        }

        const auditLog = await this.lineAuditRepository.create({
            ...input,
            performedBy,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
        });

        return auditLog;
    }

    /**
     * List LINE audit logs
     */
    async listAuditLogs(params: ListLineAuditLogsQuery) {
        const result = await this.lineAuditRepository.list(params);

        return {
            logs: result.logs,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
    }

    /**
     * Get LINE audit logs for user
     */
    async getUserAuditLogs(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        return this.lineAuditRepository.getByUserId(userId);
    }

    /**
     * Get LINE audit logs for customer
     */
    async getCustomerAuditLogs(customerId: string) {
        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        return this.lineAuditRepository.getByCustomerId(customerId);
    }

    /**
     * Get LINE audit logs by LINE User ID
     */
    async getLineUserAuditLogs(lineUserId: string) {
        return this.lineAuditRepository.getByLineUserId(lineUserId);
    }

    /**
     * Disconnect LINE user from user account
     */
    async disconnectUserLineAccount(
        request: FastifyRequest,
        userId: string,
        input: DisconnectLineUserInput
    ) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.lineUserId) {
            throw new Error('User is not connected to LINE');
        }

        const previousLineUserId = user.lineUserId;

        // Update user to disconnect LINE
        await this.userRepository.update(userId, {
            lineUserId: null,
            lineActive: false,
            lineLinkedAt: null,
        });

        // Create audit log
        await this.createAuditLog(request, {
            userId,
            action: input.forceDisconnect 
                ? LineAuditAction.ADMIN_FORCE_DISCONNECT 
                : LineAuditAction.ADMIN_DISCONNECT,
            previousLineUserId,
            reason: input.reason,
            metadata: {
                forceDisconnect: input.forceDisconnect,
                disconnectedAt: new Date().toISOString(),
            },
        });

        return {
            success: true,
            message: 'LINE account disconnected successfully',
            previousLineUserId,
        };
    }

    /**
     * Disconnect LINE user from customer account
     */
    async disconnectCustomerLineAccount(
        request: FastifyRequest,
        customerId: string,
        input: DisconnectLineUserInput
    ) {
        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        if (!customer.lineUserId) {
            throw new Error('Customer is not connected to LINE');
        }

        const previousLineUserId = customer.lineUserId;

        // Update customer to disconnect LINE
        await this.customerRepository.update(customerId, {
            lineUserId: null,
            lineLinkedAt: null,
        });

        // Create audit log
        await this.createAuditLog(request, {
            customerId,
            action: input.forceDisconnect 
                ? LineAuditAction.ADMIN_FORCE_DISCONNECT 
                : LineAuditAction.ADMIN_DISCONNECT,
            previousLineUserId,
            reason: input.reason,
            metadata: {
                forceDisconnect: input.forceDisconnect,
                disconnectedAt: new Date().toISOString(),
            },
        });

        return {
            success: true,
            message: 'LINE account disconnected successfully',
            previousLineUserId,
        };
    }

    /**
     * Get current LINE connection status for user
     */
    async getUserLineStatus(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const auditLogs = await this.lineAuditRepository.getByUserId(userId);

        return {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
            },
            currentLineUserId: user.lineUserId,
            lineActive: user.lineActive,
            lineLinkedAt: user.lineLinkedAt,
            auditLogs,
        };
    }

    /**
     * Get current LINE connection status for customer
     */
    async getCustomerLineStatus(customerId: string) {
        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const auditLogs = await this.lineAuditRepository.getByCustomerId(customerId);

        return {
            customer: {
                id: customer.id,
                businessName: customer.businessName,
                customerCode: customer.customerCode,
            },
            currentLineUserId: customer.lineUserId,
            lineLinkedAt: customer.lineLinkedAt,
            auditLogs,
        };
    }
}
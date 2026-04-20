import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';

const workflowInclude = {
    loans: {
        select: {
            id: true,
            principal: true,
            status: true,
            customer: {
                select: {
                    id: true,
                    businessName: true,
                },
            },
        },
    },
    users: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
        },
    },
} as const;

export class LoanWorkflowRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    async create(data: {
        loanId: string;
        approvalLevel?: number;
        approverId?: string;
        approvalStatus?: string;
        approvedAmount?: number;
        approvalNotes?: string;
        slaDeadline?: Date;
    }) {
        return this.db.loan_approval_workflow.create({
            data: {
                loan_id: data.loanId,
                approval_level: data.approvalLevel ?? 1,
                approver_id: data.approverId,
                approval_status: data.approvalStatus ?? 'PENDING',
                approved_amount: data.approvedAmount,
                approval_notes: data.approvalNotes,
                sla_deadline: data.slaDeadline,
                created_at: new Date(),
                updated_at: new Date(),
            },
            include: workflowInclude,
        });
    }

    async findManyByLoanId(loanId: string) {
        return this.db.loan_approval_workflow.findMany({
            where: { loan_id: loanId },
            include: workflowInclude,
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(workflowId: string) {
        return this.db.loan_approval_workflow.findUnique({
            where: { id: workflowId },
            include: workflowInclude,
        });
    }

    async update(
        workflowId: string,
        data: {
            approvalStatus?: string;
            approvedAmount?: number;
            approvalNotes?: string;
            completedAt?: Date;
        }
    ) {
        return this.db.loan_approval_workflow.update({
            where: { id: workflowId },
            data: {
                ...data,
                updated_at: new Date(),
            },
            include: workflowInclude,
        });
    }

    async findPending(approverId?: string, limit = 50) {
        const where: any = {
            approval_status: 'PENDING',
            completed_at: null,
        };
        if (approverId) {
            where.approver_id = approverId;
        }
        return this.db.loan_approval_workflow.findMany({
            where,
            include: workflowInclude,
            orderBy: { created_at: 'asc' },
            take: limit,
        });
    }

    async findMany(filters?: {
        status?: string;
        customerId?: string;
        approverId?: string;
        approvalLevel?: number;
        limit?: number;
    }) {
        const where: any = {};
        if (filters?.status) where.approval_status = filters.status;
        if (filters?.approverId) where.approver_id = filters.approverId;
        if (filters?.approvalLevel) where.approval_level = filters.approvalLevel;
        if (filters?.customerId) where.loans = { customerId: filters.customerId };

        return this.db.loan_approval_workflow.findMany({
            where,
            include: workflowInclude,
            orderBy: { created_at: 'desc' },
            take: filters?.limit ?? 50,
        });
    }

    async countByStatus(status?: string) {
        return this.db.loan_approval_workflow.count(
            status ? { where: { approval_status: status } } : undefined
        );
    }

    async findCompletedForAverageTime() {
        return this.db.loan_approval_workflow.findMany({
            where: {
                approval_status: { in: ['APPROVED', 'REJECTED'] },
                completed_at: { not: null },
            },
            select: {
                created_at: true,
                completed_at: true,
            },
        });
    }

    async countOverdue() {
        return this.db.loan_approval_workflow.count({
            where: {
                approval_status: 'PENDING',
                sla_deadline: { lt: new Date() },
            },
        });
    }

    async delete(workflowId: string) {
        await this.db.loan_approval_workflow.delete({
            where: { id: workflowId },
        });
    }
}

import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';
import {
    CreateWorkflowStepInput,
    UpdateWorkflowStepInput,
    WorkflowStep,
} from '../services/collection-workflow.service';

const userInclude = {
    users: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    },
};

/**
 * Collection Workflow Repository - Database access ONLY
 * No business logic, just Prisma queries
 */
export class CollectionWorkflowRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    async create(data: CreateWorkflowStepInput): Promise<WorkflowStep> {
        return this.db.collection_workflow_steps.create({
            data: {
                days_overdue_from: data.daysOverdueFrom,
                days_overdue_to: data.daysOverdueTo,
                action_type: data.actionType,
                template_id: data.templateId,
                priority: data.priority,
                assigned_role: data.assignedRole,
                sla_hours: data.slaHours,
                is_active: data.isActive ?? true,
                created_by: data.createdBy,
                created_at: new Date(),
            },
            include: userInclude,
        }) as unknown as WorkflowStep;
    }

    async findById(stepId: string): Promise<WorkflowStep | null> {
        return this.db.collection_workflow_steps.findUnique({
            where: { id: stepId },
            include: userInclude,
        }) as unknown as WorkflowStep | null;
    }

    async findMany(where: any): Promise<WorkflowStep[]> {
        return this.db.collection_workflow_steps.findMany({
            where,
            include: userInclude,
            orderBy: { days_overdue_from: 'asc' },
        }) as unknown as WorkflowStep[];
    }

    async findFirst(daysOverdue: number): Promise<WorkflowStep | null> {
        return this.db.collection_workflow_steps.findFirst({
            where: {
                is_active: true,
                days_overdue_from: { lte: daysOverdue },
                OR: [
                    { days_overdue_to: null },
                    { days_overdue_to: { gte: daysOverdue } },
                ],
            },
            include: userInclude,
            orderBy: { days_overdue_from: 'desc' },
        }) as unknown as WorkflowStep | null;
    }

    async update(stepId: string, data: UpdateWorkflowStepInput): Promise<WorkflowStep> {
        return this.db.collection_workflow_steps.update({
            where: { id: stepId },
            data: {
                days_overdue_from: data.daysOverdueFrom,
                days_overdue_to: data.daysOverdueTo,
                action_type: data.actionType,
                template_id: data.templateId,
                priority: data.priority,
                assigned_role: data.assignedRole,
                sla_hours: data.slaHours,
                is_active: data.isActive,
            },
            include: userInclude,
        }) as unknown as WorkflowStep;
    }

    async delete(stepId: string): Promise<void> {
        await this.db.collection_workflow_steps.delete({ where: { id: stepId } });
    }

    async count(where?: any): Promise<number> {
        return this.db.collection_workflow_steps.count({ where });
    }

    async findManyForStats(): Promise<Array<{ priority: string; action_type: string }>> {
        return this.db.collection_workflow_steps.findMany({
            select: { priority: true, action_type: true },
        });
    }
}

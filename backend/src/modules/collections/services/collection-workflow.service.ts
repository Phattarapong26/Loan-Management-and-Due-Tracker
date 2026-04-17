/**
 * Collection Workflow Service
 * 
 * Manages collection workflow steps and templates
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateWorkflowStepInput {
  daysOverdueFrom: number;
  daysOverdueTo?: number;
  actionType: string;
  templateId?: string;
  priority: string;
  assignedRole: string;
  slaHours: number;
  isActive?: boolean;
  createdBy: string;
}

export interface UpdateWorkflowStepInput {
  daysOverdueFrom?: number;
  daysOverdueTo?: number;
  actionType?: string;
  templateId?: string;
  priority?: string;
  assignedRole?: string;
  slaHours?: number;
  isActive?: boolean;
}

export interface WorkflowStep {
  id: string;
  days_overdue_from: number;
  days_overdue_to: number | null;
  action_type: string;
  template_id: string | null;
  priority: string;
  assigned_role: string;
  sla_hours: number;
  is_active: boolean | null;
  created_by: string;
  created_at: Date | null;
  users: any;
}

export class CollectionWorkflowService {
  /**
   * Create new workflow step
   */
  async createWorkflowStep(data: CreateWorkflowStepInput): Promise<WorkflowStep> {
    const step = await prisma.collection_workflow_steps.create({
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
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return step as WorkflowStep;
  }

  /**
   * Get workflow step by ID
   */
  async getWorkflowStepById(stepId: string): Promise<WorkflowStep | null> {
    const step = await prisma.collection_workflow_steps.findUnique({
      where: { id: stepId },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return step as WorkflowStep | null;
  }

  /**
   * Get all workflow steps
   */
  async getWorkflowSteps(filters?: {
    isActive?: boolean;
    priority?: string;
    actionType?: string;
  }): Promise<WorkflowStep[]> {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.is_active = filters.isActive;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.actionType) {
      where.action_type = filters.actionType;
    }

    const steps = await prisma.collection_workflow_steps.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { days_overdue_from: 'asc' },
    });

    return steps as WorkflowStep[];
  }

  /**
   * Get workflow step for specific days overdue
   */
  async getWorkflowStepForDaysOverdue(daysOverdue: number): Promise<WorkflowStep | null> {
    const step = await prisma.collection_workflow_steps.findFirst({
      where: {
        is_active: true,
        days_overdue_from: { lte: daysOverdue },
        OR: [
          { days_overdue_to: null },
          { days_overdue_to: { gte: daysOverdue } },
        ],
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { days_overdue_from: 'desc' },
    });

    return step as WorkflowStep | null;
  }

  /**
   * Update workflow step
   */
  async updateWorkflowStep(stepId: string, data: UpdateWorkflowStepInput): Promise<WorkflowStep> {
    const step = await prisma.collection_workflow_steps.update({
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
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return step as WorkflowStep;
  }

  /**
   * Delete workflow step
   */
  async deleteWorkflowStep(stepId: string): Promise<void> {
    await prisma.collection_workflow_steps.delete({
      where: { id: stepId },
    });
  }

  /**
   * Activate/Deactivate workflow step
   */
  async toggleWorkflowStep(stepId: string, isActive: boolean): Promise<WorkflowStep> {
    return this.updateWorkflowStep(stepId, { isActive });
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(): Promise<{
    totalSteps: number;
    activeSteps: number;
    inactiveSteps: number;
    stepsByPriority: Record<string, number>;
    stepsByActionType: Record<string, number>;
  }> {
    const [totalSteps, activeSteps, inactiveSteps, allSteps] = await Promise.all([
      prisma.collection_workflow_steps.count(),
      prisma.collection_workflow_steps.count({ where: { is_active: true } }),
      prisma.collection_workflow_steps.count({ where: { is_active: false } }),
      prisma.collection_workflow_steps.findMany({
        select: {
          priority: true,
          action_type: true,
        },
      }),
    ]);

    // Count by priority
    const stepsByPriority: Record<string, number> = {};
    const stepsByActionType: Record<string, number> = {};

    allSteps.forEach((step) => {
      stepsByPriority[step.priority] = (stepsByPriority[step.priority] || 0) + 1;
      stepsByActionType[step.action_type] = (stepsByActionType[step.action_type] || 0) + 1;
    });

    return {
      totalSteps,
      activeSteps,
      inactiveSteps,
      stepsByPriority,
      stepsByActionType,
    };
  }
}

export const collectionWorkflowService = new CollectionWorkflowService();

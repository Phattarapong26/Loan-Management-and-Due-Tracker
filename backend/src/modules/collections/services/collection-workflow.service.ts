/**
 * Collection Workflow Service
 * 
 * Manages collection workflow steps and templates
 */

import { CollectionWorkflowRepository } from '../repositories/collection-workflow.repository';

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
  private repository: CollectionWorkflowRepository;

  constructor() {
    this.repository = new CollectionWorkflowRepository();
  }

  /**
   * Create new workflow step
   */
  async createWorkflowStep(data: CreateWorkflowStepInput): Promise<WorkflowStep> {
    return this.repository.create(data);
  }

  /**
   * Get workflow step by ID
   */
  async getWorkflowStepById(stepId: string): Promise<WorkflowStep | null> {
    return this.repository.findById(stepId);
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

    return this.repository.findMany(where);
  }

  /**
   * Get workflow step for specific days overdue
   */
  async getWorkflowStepForDaysOverdue(daysOverdue: number): Promise<WorkflowStep | null> {
    return this.repository.findFirst(daysOverdue);
  }

  /**
   * Update workflow step
   */
  async updateWorkflowStep(stepId: string, data: UpdateWorkflowStepInput): Promise<WorkflowStep> {
    return this.repository.update(stepId, data);
  }

  /**
   * Delete workflow step
   */
  async deleteWorkflowStep(stepId: string): Promise<void> {
    await this.repository.delete(stepId);
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
      this.repository.count(),
      this.repository.count({ is_active: true }),
      this.repository.count({ is_active: false }),
      this.repository.findManyForStats(),
    ]);

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

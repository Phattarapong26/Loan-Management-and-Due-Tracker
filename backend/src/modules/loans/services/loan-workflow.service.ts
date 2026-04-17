/**
 * Loan Approval Workflow Service
 * 
 * Manages multi-level loan approval workflow
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateWorkflowInput {
  loanId: string;
  approvalLevel?: number;
  approverId?: string;
  approvalStatus?: string;
  approvedAmount?: number;
  approvalNotes?: string;
  slaDeadline?: Date;
}

export interface UpdateWorkflowInput {
  approvalStatus?: string;
  approvedAmount?: number;
  approvalNotes?: string;
  completedAt?: Date;
}

export interface WorkflowWithDetails {
  id: string;
  loan_id: string;
  approval_level: number;
  approver_id: string | null;
  approval_status: string | null;
  approved_amount: any;
  approval_notes: string | null;
  sla_deadline: Date | null;
  completed_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  loans: any;
  users: any;
}

export class LoanWorkflowService {
  /**
   * Create new loan approval workflow
   */
  async createWorkflow(data: CreateWorkflowInput): Promise<WorkflowWithDetails> {
    const workflow = await prisma.loan_approval_workflow.create({
      data: {
        loan_id: data.loanId,
        approval_level: data.approvalLevel || 1,
        approver_id: data.approverId,
        approval_status: data.approvalStatus || 'PENDING',
        approved_amount: data.approvedAmount,
        approval_notes: data.approvalNotes,
        sla_deadline: data.slaDeadline,
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: {
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
      },
    });

    return workflow as WorkflowWithDetails;
  }

  /**
   * Get workflow by loan ID
   */
  async getWorkflowsByLoanId(loanId: string): Promise<WorkflowWithDetails[]> {
    const workflows = await prisma.loan_approval_workflow.findMany({
      where: { loan_id: loanId },
      include: {
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
      },
      orderBy: { created_at: 'desc' },
    });

    return workflows as WorkflowWithDetails[];
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(workflowId: string): Promise<WorkflowWithDetails | null> {
    const workflow = await prisma.loan_approval_workflow.findUnique({
      where: { id: workflowId },
      include: {
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
      },
    });

    return workflow as WorkflowWithDetails | null;
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId: string, data: UpdateWorkflowInput): Promise<WorkflowWithDetails> {
    const workflow = await prisma.loan_approval_workflow.update({
      where: { id: workflowId },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: {
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
      },
    });

    // Update loan status if workflow is completed
    if (data.approvalStatus === 'APPROVED') {
      await prisma.loan.update({
        where: { id: workflow.loan_id },
        data: { status: 'APPROVED' },
      });
    } else if (data.approvalStatus === 'REJECTED') {
      await prisma.loan.update({
        where: { id: workflow.loan_id },
        data: { status: 'REJECTED' },
      });
    }

    return workflow as WorkflowWithDetails;
  }

  /**
   * Approve workflow
   */
  async approveWorkflow(
    workflowId: string,
    _approverId: string,
    approvedAmount?: number,
    notes?: string
  ): Promise<WorkflowWithDetails> {
    return this.updateWorkflow(workflowId, {
      approvalStatus: 'APPROVED',
      approvedAmount,
      approvalNotes: notes,
      completedAt: new Date(),
    });
  }

  /**
   * Reject workflow
   */
  async rejectWorkflow(workflowId: string, notes: string): Promise<WorkflowWithDetails> {
    return this.updateWorkflow(workflowId, {
      approvalStatus: 'REJECTED',
      approvalNotes: notes,
      completedAt: new Date(),
    });
  }

  /**
   * Get pending workflows for approver
   */
  async getPendingWorkflows(approverId?: string, limit = 50): Promise<WorkflowWithDetails[]> {
    const where: any = {
      approval_status: 'PENDING',
      completed_at: null,
    };

    if (approverId) {
      where.approver_id = approverId;
    }

    const workflows = await prisma.loan_approval_workflow.findMany({
      where,
      include: {
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
      },
      orderBy: { created_at: 'asc' },
      take: limit,
    });

    return workflows as WorkflowWithDetails[];
  }

  /**
   * Get all workflows with filters
   */
  async getWorkflows(filters?: {
    status?: string;
    customerId?: string;
    approverId?: string;
    approvalLevel?: number;
    limit?: number;
  }): Promise<WorkflowWithDetails[]> {
    const where: any = {};

    if (filters?.status) {
      where.approval_status = filters.status;
    }

    if (filters?.approverId) {
      where.approver_id = filters.approverId;
    }

    if (filters?.approvalLevel) {
      where.approval_level = filters.approvalLevel;
    }

    if (filters?.customerId) {
      where.loans = {
        customerId: filters.customerId,
      };
    }

    const workflows = await prisma.loan_approval_workflow.findMany({
      where,
      include: {
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
      },
      orderBy: { created_at: 'desc' },
      take: filters?.limit || 50,
    });

    return workflows as WorkflowWithDetails[];
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    averageApprovalTime: number;
    overdueCount: number;
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.loan_approval_workflow.count(),
      prisma.loan_approval_workflow.count({ where: { approval_status: 'PENDING' } }),
      prisma.loan_approval_workflow.count({ where: { approval_status: 'APPROVED' } }),
      prisma.loan_approval_workflow.count({ where: { approval_status: 'REJECTED' } }),
    ]);

    // Calculate average approval time for completed workflows
    const completedWorkflows = await prisma.loan_approval_workflow.findMany({
      where: {
        approval_status: { in: ['APPROVED', 'REJECTED'] },
        completed_at: { not: null },
      },
      select: {
        created_at: true,
        completed_at: true,
      },
    });

    let averageApprovalTime = 0;
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((sum, workflow) => {
        const time = workflow.completed_at!.getTime() - workflow.created_at!.getTime();
        return sum + time;
      }, 0);
      averageApprovalTime = totalTime / completedWorkflows.length / (1000 * 60 * 60); // Convert to hours
    }

    // Count overdue workflows
    const overdueCount = await prisma.loan_approval_workflow.count({
      where: {
        approval_status: 'PENDING',
        sla_deadline: {
          lt: new Date(),
        },
      },
    });

    return {
      total,
      pending,
      approved,
      rejected,
      averageApprovalTime,
      overdueCount,
    };
  }

  /**
   * Reassign workflow to different approver
   */
  async reassignWorkflow(workflowId: string, _newApproverId: string): Promise<WorkflowWithDetails> {
    return this.updateWorkflow(workflowId, {
      approvalStatus: 'PENDING', // Reset to pending for new approver
    });
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await prisma.loan_approval_workflow.delete({
      where: { id: workflowId },
    });
  }
}

export const loanWorkflowService = new LoanWorkflowService();

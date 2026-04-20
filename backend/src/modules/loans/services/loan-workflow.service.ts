/**
 * Loan Approval Workflow Service
 * 
 * Manages multi-level loan approval workflow
 */

import { LoanWorkflowRepository } from '../repositories/loan-workflow.repository';
import { LoanRepository } from '../repositories/loan.repository';

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
  private workflowRepository: LoanWorkflowRepository;
  private loanRepository: LoanRepository;

  constructor() {
    this.workflowRepository = new LoanWorkflowRepository();
    this.loanRepository = new LoanRepository();
  }

  /**
   * Create new loan approval workflow
   */
  async createWorkflow(data: CreateWorkflowInput): Promise<WorkflowWithDetails> {
    return this.workflowRepository.create(data) as Promise<WorkflowWithDetails>;
  }

  /**
   * Get workflow by loan ID
   */
  async getWorkflowsByLoanId(loanId: string): Promise<WorkflowWithDetails[]> {
    return this.workflowRepository.findManyByLoanId(loanId) as Promise<WorkflowWithDetails[]>;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(workflowId: string): Promise<WorkflowWithDetails | null> {
    return this.workflowRepository.findById(workflowId) as Promise<WorkflowWithDetails | null>;
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId: string, data: UpdateWorkflowInput): Promise<WorkflowWithDetails> {
    const workflow = await this.workflowRepository.update(workflowId, data) as WorkflowWithDetails;

    // Update loan status if workflow is completed
    if (data.approvalStatus === 'APPROVED') {
      await this.loanRepository.updateStatus(workflow.loan_id, 'APPROVED');
    } else if (data.approvalStatus === 'REJECTED') {
      await this.loanRepository.updateStatus(workflow.loan_id, 'REJECTED');
    }

    return workflow;
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
    return this.workflowRepository.findPending(approverId, limit) as Promise<WorkflowWithDetails[]>;
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
    return this.workflowRepository.findMany(filters) as Promise<WorkflowWithDetails[]>;
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
    const [total, pending, approved, rejected, completedWorkflows, overdueCount] = await Promise.all([
      this.workflowRepository.countByStatus(),
      this.workflowRepository.countByStatus('PENDING'),
      this.workflowRepository.countByStatus('APPROVED'),
      this.workflowRepository.countByStatus('REJECTED'),
      this.workflowRepository.findCompletedForAverageTime(),
      this.workflowRepository.countOverdue(),
    ]);

    let averageApprovalTime = 0;
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((sum, workflow) => {
        const time = workflow.completed_at!.getTime() - workflow.created_at!.getTime();
        return sum + time;
      }, 0);
      averageApprovalTime = totalTime / completedWorkflows.length / (1000 * 60 * 60); // hours
    }

    return { total, pending, approved, rejected, averageApprovalTime, overdueCount };
  }

  /**
   * Reassign workflow to different approver
   */
  async reassignWorkflow(workflowId: string, _newApproverId: string): Promise<WorkflowWithDetails> {
    return this.updateWorkflow(workflowId, {
      approvalStatus: 'PENDING',
    });
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.workflowRepository.delete(workflowId);
  }
}

export const loanWorkflowService = new LoanWorkflowService();

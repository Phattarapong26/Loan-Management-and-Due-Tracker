// @ts-nocheck
/**
 * Loan Approval Workflow Routes
 */

import { Router } from 'express';
import { loanWorkflowService } from '../modules/loans/services/loan-workflow.service';

const router = Router();

/**
 * POST /api/loan-workflows
 * Create new loan approval workflow
 */
router.post('/', async (req, res) => {
  try {
    const workflow = await loanWorkflowService.createWorkflow(req.body);
    res.status(201).json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถสร้าง workflow ได้ กรุณาตรวจสอบข้อมูล' });
  }
});

/**
 * GET /api/loan-workflows
 * Get all workflows with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, customerId, approverId, approvalLevel, limit } = req.query;
    const workflows = await loanWorkflowService.getWorkflows({
      status: status as string,
      customerId: customerId as string,
      approverId: approverId as string,
      approvalLevel: approvalLevel ? parseInt(approvalLevel as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการ workflow ได้' });
  }
});

/**
 * GET /api/loan-workflows/pending
 * Get pending workflows for approver
 */
router.get('/pending', async (req, res) => {
  try {
    const { approverId, limit } = req.query;
    const workflows = await loanWorkflowService.getPendingWorkflows(
      approverId as string,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดงานที่รออนุมัติได้' });
  }
});

/**
 * GET /api/loan-workflows/statistics
 * Get workflow statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await loanWorkflowService.getWorkflowStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดสถิติได้' });
  }
});

/**
 * GET /api/loan-workflows/:id
 * Get workflow by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const workflow = await loanWorkflowService.getWorkflowById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'ไม่พบ workflow' });
    }
    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลด workflow ได้' });
  }
});

/**
 * GET /api/loan-workflows/loan/:loanId
 * Get workflows by loan ID
 */
router.get('/loan/:loanId', async (req, res) => {
  try {
    const workflows = await loanWorkflowService.getWorkflowsByLoanId(req.params.loanId);
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการ workflow ได้' });
  }
});

/**
 * PUT /api/loan-workflows/:id
 * Update workflow
 */
router.put('/:id', async (req, res) => {
  try {
    const workflow = await loanWorkflowService.updateWorkflow(req.params.id, req.body);
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถอัปเดต workflow ได้' });
  }
});

/**
 * POST /api/loan-workflows/:id/approve
 * Approve workflow
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { approverId, approvedAmount, notes } = req.body;
    const workflow = await loanWorkflowService.approveWorkflow(
      req.params.id,
      approverId,
      approvedAmount,
      notes
    );
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถอนุมัติได้' });
  }
});

/**
 * POST /api/loan-workflows/:id/reject
 * Reject workflow
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { notes } = req.body;
    const workflow = await loanWorkflowService.rejectWorkflow(req.params.id, notes);
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถปฏิเสธได้' });
  }
});

/**
 * POST /api/loan-workflows/:id/reassign
 * Reassign workflow to different approver
 */
router.post('/:id/reassign', async (req, res) => {
  try {
    const { newApproverId } = req.body;
    const workflow = await loanWorkflowService.reassignWorkflow(req.params.id, newApproverId);
    res.json(workflow);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถมอบหมายใหม่ได้' });
  }
});

/**
 * DELETE /api/loan-workflows/:id
 * Delete workflow
 */
router.delete('/:id', async (req, res) => {
  try {
    await loanWorkflowService.deleteWorkflow(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถลบ workflow ได้' });
  }
});

export default router;

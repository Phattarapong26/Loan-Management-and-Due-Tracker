// @ts-nocheck
/**
 * Collection Workflow Routes
 */

import { Router } from 'express';
import { collectionWorkflowService } from '../modules/collections/services/collection-workflow.service';

const router = Router();

/**
 * POST /api/collection-workflows
 * Create new workflow step
 */
router.post('/', async (req, res) => {
  try {
    const step = await collectionWorkflowService.createWorkflowStep(req.body);
    res.status(201).json(step);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถสร้างขั้นตอนการทำงานได้ กรุณาตรวจสอบข้อมูล' });
  }
});

/**
 * GET /api/collection-workflows
 * Get all workflow steps
 */
router.get('/', async (req, res) => {
  try {
    const { isActive, priority, actionType } = req.query;
    const steps = await collectionWorkflowService.getWorkflowSteps({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      priority: priority as string,
      actionType: actionType as string,
    });
    res.json(steps);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลขั้นตอนการทำงานได้' });
  }
});

/**
 * GET /api/collection-workflows/statistics
 * Get workflow statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await collectionWorkflowService.getWorkflowStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดสถิติได้' });
  }
});

/**
 * GET /api/collection-workflows/for-overdue/:days
 * Get workflow step for specific days overdue
 */
router.get('/for-overdue/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    const step = await collectionWorkflowService.getWorkflowStepForDaysOverdue(days);
    if (!step) {
      return res.status(404).json({ error: 'ไม่พบขั้นตอนการทำงานสำหรับช่วงค้างชำระนี้' });
    }
    res.json(step);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดขั้นตอนการทำงานได้' });
  }
});

/**
 * GET /api/collection-workflows/:id
 * Get workflow step by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const step = await collectionWorkflowService.getWorkflowStepById(req.params.id);
    if (!step) {
      return res.status(404).json({ error: 'ไม่พบขั้นตอนการทำงาน' });
    }
    res.json(step);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดขั้นตอนการทำงานได้' });
  }
});

/**
 * PUT /api/collection-workflows/:id
 * Update workflow step
 */
router.put('/:id', async (req, res) => {
  try {
    const step = await collectionWorkflowService.updateWorkflowStep(req.params.id, req.body);
    res.json(step);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถอัปเดตขั้นตอนการทำงานได้' });
  }
});

/**
 * PATCH /api/collection-workflows/:id/toggle
 * Activate/Deactivate workflow step
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { isActive } = req.body;
    const step = await collectionWorkflowService.toggleWorkflowStep(req.params.id, isActive);
    res.json(step);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถเปลี่ยนสถานะขั้นตอนการทำงานได้' });
  }
});

/**
 * DELETE /api/collection-workflows/:id
 * Delete workflow step
 */
router.delete('/:id', async (req, res) => {
  try {
    await collectionWorkflowService.deleteWorkflowStep(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถลบขั้นตอนการทำงานได้' });
  }
});

export default router;

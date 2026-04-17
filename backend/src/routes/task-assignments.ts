// @ts-nocheck
/**
 * Task Assignment Routes
 */

import { Router } from 'express';
import { taskAssignmentService } from '../modules/collections/services/task-assignment.service';

const router = Router();

/**
 * POST /api/task-assignments
 * Create new task assignment
 */
router.post('/', async (req, res) => {
  try {
    const task = await taskAssignmentService.createTask(req.body);
    res.status(201).json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/task-assignments/bulk
 * Bulk create task assignments
 */
router.post('/bulk', async (req, res) => {
  try {
    const { tasks } = req.body;
    const count = await taskAssignmentService.bulkCreateTasks(tasks);
    res.status(201).json({ count, message: `Created ${count} tasks` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/task-assignments
 * Get tasks with filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      assignedTo,
      assignedBy,
      status,
      priority,
      taskType,
      dueDateFrom,
      dueDateTo,
      limit,
    } = req.query;

    const tasks = await taskAssignmentService.getTasks({
      assignedTo: assignedTo as string,
      assignedBy: assignedBy as string,
      status: status as string,
      priority: priority as string,
      taskType: taskType as any,
      dueDateFrom: dueDateFrom ? new Date(dueDateFrom as string) : undefined,
      dueDateTo: dueDateTo ? new Date(dueDateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/task-assignments/pending/:userId
 * Get pending tasks for user
 */
router.get('/pending/:userId', async (req, res) => {
  try {
    const { limit } = req.query;
    const tasks = await taskAssignmentService.getPendingTasks(
      req.params.userId,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/task-assignments/overdue
 * Get overdue tasks
 */
router.get('/overdue', async (req, res) => {
  try {
    const { userId } = req.query;
    const tasks = await taskAssignmentService.getOverdueTasks(userId as string);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/task-assignments/statistics
 * Get task statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { userId } = req.query;
    const stats = await taskAssignmentService.getTaskStatistics(userId as string);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/task-assignments/:id
 * Get task by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await taskAssignmentService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/task-assignments/:id
 * Update task
 */
router.put('/:id', async (req, res) => {
  try {
    const task = await taskAssignmentService.updateTask(req.params.id, req.body);
    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/task-assignments/:id/complete
 * Complete task
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { notes } = req.body;
    const task = await taskAssignmentService.completeTask(req.params.id, notes);
    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/task-assignments/:id/reassign
 * Reassign task
 */
router.post('/:id/reassign', async (req, res) => {
  try {
    const { newAssigneeId } = req.body;
    const task = await taskAssignmentService.reassignTask(req.params.id, newAssigneeId);
    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/task-assignments/:id/cancel
 * Cancel task
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const task = await taskAssignmentService.cancelTask(req.params.id, reason);
    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/task-assignments/:id
 * Delete task
 */
router.delete('/:id', async (req, res) => {
  try {
    await taskAssignmentService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

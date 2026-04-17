/**
 * Task Assignment Service
 * 
 * Manages task assignments for collection and other workflows
 */

import { PrismaClient, BankTaskType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTaskInput {
  taskId: string;
  taskType?: BankTaskType;
  assignedTo: string;
  assignedBy: string;
  priority?: string;
  dueDate: Date;
  notes?: string;
}

export interface UpdateTaskInput {
  taskType?: BankTaskType;
  assignedTo?: string;
  priority?: string;
  dueDate?: Date;
  completionDate?: Date;
  status?: string;
  notes?: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  task_type: BankTaskType | null;
  assigned_to: string;
  assigned_by: string;
  priority: string;
  due_date: Date;
  completion_date: Date | null;
  status: string | null;
  notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  users_task_assignments_assigned_toTousers: any;
  users_task_assignments_assigned_byTousers: any;
}

export class TaskAssignmentService {
  /**
   * Create new task assignment
   */
  async createTask(data: CreateTaskInput): Promise<TaskAssignment> {
    const task = await prisma.task_assignments.create({
      data: {
        task_id: data.taskId,
        task_type: data.taskType,
        assigned_to: data.assignedTo,
        assigned_by: data.assignedBy,
        priority: data.priority || 'MEDIUM',
        due_date: data.dueDate,
        status: 'PENDING',
        notes: data.notes,
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        users_task_assignments_assigned_toTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        users_task_assignments_assigned_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return task as TaskAssignment;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<TaskAssignment | null> {
    const task = await prisma.task_assignments.findUnique({
      where: { id: taskId },
      include: {
        users_task_assignments_assigned_toTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        users_task_assignments_assigned_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return task as TaskAssignment | null;
  }

  /**
   * Get tasks with filters
   */
  async getTasks(filters?: {
    assignedTo?: string;
    assignedBy?: string;
    status?: string;
    priority?: string;
    taskType?: BankTaskType;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    limit?: number;
  }): Promise<TaskAssignment[]> {
    const where: any = {};

    if (filters?.assignedTo) {
      where.assigned_to = filters.assignedTo;
    }

    if (filters?.assignedBy) {
      where.assigned_by = filters.assignedBy;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.taskType) {
      where.task_type = filters.taskType;
    }

    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.due_date = {};
      if (filters.dueDateFrom) {
        where.due_date.gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        where.due_date.lte = filters.dueDateTo;
      }
    }

    const tasks = await prisma.task_assignments.findMany({
      where,
      include: {
        users_task_assignments_assigned_toTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        users_task_assignments_assigned_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ due_date: 'asc' }, { priority: 'desc' }],
      take: filters?.limit || 100,
    });

    return tasks as TaskAssignment[];
  }

  /**
   * Get pending tasks for user
   */
  async getPendingTasks(userId: string, limit = 50): Promise<TaskAssignment[]> {
    return this.getTasks({
      assignedTo: userId,
      status: 'PENDING',
      limit,
    });
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId?: string): Promise<TaskAssignment[]> {
    const where: any = {
      status: 'PENDING',
      due_date: {
        lt: new Date(),
      },
    };

    if (userId) {
      where.assigned_to = userId;
    }

    const tasks = await prisma.task_assignments.findMany({
      where,
      include: {
        users_task_assignments_assigned_toTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        users_task_assignments_assigned_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    return tasks as TaskAssignment[];
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, data: UpdateTaskInput): Promise<TaskAssignment> {
    const task = await prisma.task_assignments.update({
      where: { id: taskId },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: {
        users_task_assignments_assigned_toTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        users_task_assignments_assigned_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return task as TaskAssignment;
  }

  /**
   * Complete task
   */
  async completeTask(taskId: string, notes?: string): Promise<TaskAssignment> {
    return this.updateTask(taskId, {
      status: 'COMPLETED',
      completionDate: new Date(),
      notes,
    });
  }

  /**
   * Reassign task
   */
  async reassignTask(taskId: string, newAssigneeId: string): Promise<TaskAssignment> {
    return this.updateTask(taskId, {
      assignedTo: newAssigneeId,
      status: 'PENDING',
    });
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string, reason?: string): Promise<TaskAssignment> {
    return this.updateTask(taskId, {
      status: 'CANCELLED',
      notes: reason,
    });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    await prisma.task_assignments.delete({
      where: { id: taskId },
    });
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(userId?: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    overdue: number;
    byPriority: Record<string, number>;
    byTaskType: Record<string, number>;
  }> {
    const where: any = userId ? { assigned_to: userId } : {};

    const [total, pending, completed, cancelled, overdue, allTasks] = await Promise.all([
      prisma.task_assignments.count({ where }),
      prisma.task_assignments.count({ where: { ...where, status: 'PENDING' } }),
      prisma.task_assignments.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task_assignments.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.task_assignments.count({
        where: {
          ...where,
          status: 'PENDING',
          due_date: { lt: new Date() },
        },
      }),
      prisma.task_assignments.findMany({
        where,
        select: {
          priority: true,
          task_type: true,
        },
      }),
    ]);

    // Count by priority and task type
    const byPriority: Record<string, number> = {};
    const byTaskType: Record<string, number> = {};

    allTasks.forEach((task) => {
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      if (task.task_type) {
        byTaskType[task.task_type] = (byTaskType[task.task_type] || 0) + 1;
      }
    });

    return {
      total,
      pending,
      completed,
      cancelled,
      overdue,
      byPriority,
      byTaskType,
    };
  }

  /**
   * Bulk create tasks
   */
  async bulkCreateTasks(tasks: CreateTaskInput[]): Promise<number> {
    const result = await prisma.task_assignments.createMany({
      data: tasks.map((task) => ({
        task_id: task.taskId,
        task_type: task.taskType,
        assigned_to: task.assignedTo,
        assigned_by: task.assignedBy,
        priority: task.priority || 'MEDIUM',
        due_date: task.dueDate,
        status: 'PENDING',
        notes: task.notes,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    });

    return result.count;
  }
}

export const taskAssignmentService = new TaskAssignmentService();

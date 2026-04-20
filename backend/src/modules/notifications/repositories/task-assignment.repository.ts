import { prisma } from '@config/database.config';

/**
 * Task Assignment Repository - Database access ONLY
 * Provides access to task_assignments table for calendar reminders
 */
export class TaskAssignmentRepository {
    /**
     * Find pending task assignments due within a time window
     */
    async findPendingDueInWindow(from: Date, to: Date): Promise<Array<{
        task_id: string;
        assigned_to: string;
        priority: string;
    }>> {
        return prisma.task_assignments.findMany({
            where: {
                task_type: 'OTHER',
                status: 'PENDING',
                due_date: { gte: from, lte: to },
            },
            select: { task_id: true, assigned_to: true, priority: true },
        });
    }

    /**
     * Update task assignment status
     */
    async updateStatus(taskId: string, assignedTo: string, status: string): Promise<void> {
        await prisma.task_assignments.updateMany({
            where: { task_id: taskId, assigned_to: assignedTo },
            data: { status },
        });
    }
}

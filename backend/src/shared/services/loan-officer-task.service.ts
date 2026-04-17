/**
 * Loan Officer Task Service
 * 
 * Purpose: Manage daily tasks for loan officers
 * Features:
 * - Get tasks requiring follow-up
 * - Track task completion
 * - Postpone tasks with new follow-up dates
 * - Link tasks to contact logs
 * 
 * Requirements: Requirement 7 - Daily Task Management
 */

import { prisma } from '@config/database.config';

export interface LoanOfficerTask {
    taskId: string;
    customerId: string;
    customerName: string;
    loanId: string;
    loanAmount: number;
    daysOverdue: number;
    lastContactDate: Date | null;
    nextFollowUpDate: Date;
    priority: 'high' | 'medium' | 'low';
    reason: string;
}

export class LoanOfficerTaskService {
    /**
     * Task 5.1.2: Get tasks for loan officer
     * Returns loans requiring follow-up based on:
     * - Overdue payments (>30 days = high, 15-30 = medium, <15 = low)
     * - Scheduled follow-ups from contact logs
     * - Pending approvals
     */
    async getTasksForOfficer(officerId: string): Promise<LoanOfficerTask[]> {
        try {
            const tasks: LoanOfficerTask[] = [];

            // Get officer's branch
            const officer = await prisma.user.findUnique({
                where: { id: officerId },
                select: { branchId: true },
            });

            if (!officer?.branchId) {
                return [];
            }

            // Get loans requiring follow-up
            const loans = await prisma.loan.findMany({
                where: {
                    customer: {
                        branchId: officer.branchId,
                    },
                    status: {
                        in: ['ACTIVE', 'NPL'],
                    },
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            businessName: true,
                        },
                    },
                    payments: {
                        orderBy: {
                            paymentDate: 'desc',
                        },
                        take: 1,
                    },
                    paymentSchedule: {
                        where: {
                            status: 'UNPAID',
                        },
                        orderBy: {
                            paymentDate: 'asc',
                        },
                        take: 1,
                    },
                },
            });

            // Get contact logs separately for each loan
            const loanIds = loans.map(l => l.id);
            const contactLogs = await prisma.contactLog.findMany({
                where: {
                    loanId: {
                        in: loanIds,
                    },
                    nextFollowUpDate: {
                        lte: new Date(),
                    },
                },
                orderBy: {
                    nextFollowUpDate: 'asc',
                },
            });

            // Group contact logs by loan ID
            const contactLogsByLoan = contactLogs.reduce((acc, log) => {
                const loanId = log.loanId;
                if (loanId) {
                    if (!acc[loanId]) {
                        acc[loanId] = [];
                    }
                    acc[loanId].push(log);
                }
                return acc;
            }, {} as Record<string, typeof contactLogs>);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const loan of loans) {
                const loanContactLogs = contactLogsByLoan[loan.id] || [];

                // Skip if customer data is missing
                if (!loan.customer) {
                    continue;
                }

                // Check if loan has overdue payments
                if (loan.paymentSchedule.length > 0) {
                    const schedule = loan.paymentSchedule[0];
                    if (schedule) {
                        const dueDate = new Date(schedule.paymentDate);
                        const daysOverdue = Math.floor(
                            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
                        );

                        if (daysOverdue > 0) {
                            tasks.push({
                                taskId: `overdue-${loan.id}`,
                                customerId: loan.customerId,
                                customerName: loan.customer.businessName,
                                loanId: loan.id,
                                loanAmount: loan.principal.toNumber(),
                                daysOverdue,
                                lastContactDate: loanContactLogs[0]?.contactDate || null,
                                nextFollowUpDate: today,
                                priority: daysOverdue > 30 ? 'high' : daysOverdue > 15 ? 'medium' : 'low',
                                reason: `ค้างชำระ ${daysOverdue} วัน`,
                            });
                        }
                    }
                }

                // Check for scheduled follow-ups
                if (loanContactLogs.length > 0) {
                    const contactLog = loanContactLogs[0];
                    if (contactLog && contactLog.nextFollowUpDate) {
                        const followUpDate = new Date(contactLog.nextFollowUpDate);

                        if (followUpDate <= today) {
                            // Check if not already added as overdue task
                            const existingTask = tasks.find(t => t.loanId === loan.id);
                            if (!existingTask) {
                                tasks.push({
                                    taskId: `followup-${contactLog.id}`,
                                    customerId: loan.customerId,
                                    customerName: loan.customer.businessName,
                                    loanId: loan.id,
                                    loanAmount: loan.principal.toNumber(),
                                    daysOverdue: 0,
                                    lastContactDate: contactLog.contactDate,
                                    nextFollowUpDate: followUpDate,
                                    priority: 'medium',
                                    reason: 'ติดตามตามนัด',
                                });
                            }
                        }
                    }
                }
            }

            // Sort by priority (high > medium > low) and days overdue
            tasks.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                }
                return b.daysOverdue - a.daysOverdue;
            });

            return tasks;
        } catch (error) {
            console.error('Error getting tasks for officer:', error);
            throw error;
        }
    }

    /**
     * Task 5.1.5: Mark task as completed
     * 
     * @param taskId - Task ID
     * @param contactLogId - Contact log ID (if task was completed via contact logging)
     */
    async completeTask(taskId: string, contactLogId?: string): Promise<void> {
        try {
            // Extract loan ID from task ID
            const [type, id] = taskId.split('-');

            if (type === 'followup' && contactLogId) {
                // Update contact log to mark as completed
                await prisma.contactLog.update({
                    where: { id },
                    data: {
                        taskId: contactLogId,
                    },
                });
            }

            console.log(`Task completed: ${taskId}`);
        } catch (error) {
            console.error('Error completing task:', error);
            throw error;
        }
    }

    /**
     * Task 5.1.6: Postpone task with new follow-up date
     * 
     * @param taskId - Task ID
     * @param newFollowUpDate - New follow-up date
     * @param reason - Reason for postponement
     */
    async postponeTask(
        taskId: string,
        newFollowUpDate: Date,
        reason: string
    ): Promise<void> {
        try {
            const [type, id] = taskId.split('-');

            if (type === 'followup') {
                // Update contact log with new follow-up date
                await prisma.contactLog.update({
                    where: { id },
                    data: {
                        nextFollowUpDate: newFollowUpDate,
                        notes: `เลื่อนนัด: ${reason}`,
                    },
                });
            } else if (type === 'overdue') {
                // Create new contact log with follow-up date
                const loan = await prisma.loan.findUnique({
                    where: { id },
                    select: { customerId: true },
                });

                if (loan) {
                    await prisma.contactLog.create({
                        data: {
                            customerId: loan.customerId,
                            loanId: id,
                            officerId: '', // TODO: Get officer ID from context
                            contactMethod: 'PHONE',
                            contactStatus: 'PROMISED_TO_PAY',
                            outcome: 'PROMISED_TO_PAY',
                            notes: `เลื่อนนัด: ${reason}`,
                            nextFollowUpDate: newFollowUpDate,
                            contactDate: new Date(),
                        },
                    });
                }
            }

            console.log(`Task postponed: ${taskId} to ${newFollowUpDate}`);
        } catch (error) {
            console.error('Error postponing task:', error);
            throw error;
        }
    }

    /**
     * Get task count for officer (for dashboard)
     */
    async getTaskCount(officerId: string): Promise<number> {
        const tasks = await this.getTasksForOfficer(officerId);
        return tasks.length;
    }

    /**
     * Get high priority task count
     */
    async getHighPriorityTaskCount(officerId: string): Promise<number> {
        const tasks = await this.getTasksForOfficer(officerId);
        return tasks.filter(t => t.priority === 'high').length;
    }
}

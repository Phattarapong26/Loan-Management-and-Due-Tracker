/**
 * Contact Logging Service
 * 
 * Purpose: Handle customer contact logging through LINE
 * Features:
 * - Multi-step conversation flow for contact logging
 * - Contact type selection (phone, visit, email, LINE)
 * - Outcome selection (contacted, promised, extension, unreachable, paid)
 * - Notes and next follow-up date input
 * - Link to tasks and contact logs
 * 
 * Requirements: Requirement 8 - Customer Contact Logging
 */

import { prisma } from '@config/database.config';

export type ContactType = 'PHONE' | 'VISIT' | 'EMAIL' | 'LINE';
export type ContactOutcome = 'CONTACTED' | 'PROMISED' | 'EXTENSION' | 'UNREACHABLE' | 'PAID';

export interface ContactLogData {
    customerId: string;
    loanId: string;
    contactType: ContactType;
    outcome: ContactOutcome;
    notes: string;
    nextFollowUpDate?: Date;
    taskId?: string;
}

export class ContactLoggingService {
    /**
     * Task 5.2.5: Save contact log with all context
     * 
     * @param data - Contact log data
     * @param officerId - Loan officer ID
     * @returns Created contact log
     */
    async saveContactLog(data: ContactLogData, officerId: string): Promise<any> {
        try {
            // Create contact log
            const contactLog = await (prisma as any).contactLog.create({
                data: {
                    customerId: data.customerId,
                    loanId: data.loanId,
                    contactMethod: data.contactType as any,
                    contactStatus: this.mapOutcomeToStatus(data.outcome),
                    notes: data.notes,
                    nextFollowUpDate: data.nextFollowUpDate,
                    taskId: data.taskId,
                    contactDate: new Date(),
                    officerId: officerId,
                    outcome: this.mapOutcomeToStatus(data.outcome),
                },
                include: {
                    customer: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                    loan: {
                        select: {
                            id: true,
                            principal: true,
                        },
                    },
                } as any,
            });

            // Task 5.2.6: Create new task if next follow-up date is set
            if (data.nextFollowUpDate) {
                await this.createFollowUpTask(
                    data.customerId,
                    data.loanId,
                    data.nextFollowUpDate,
                    contactLog.id
                );
            }

            // Task 5.2.7: Update task status if linked to a task
            if (data.taskId) {
                await this.updateTaskStatus(data.taskId, contactLog.id);
            }

            console.log(`Contact log created: ${contactLog.id}`);
            return contactLog;
        } catch (error) {
            console.error('Error saving contact log:', error);
            throw error;
        }
    }

    /**
     * Task 5.2.6: Create follow-up task
     */
    private async createFollowUpTask(
        customerId: string,
        loanId: string,
        followUpDate: Date,
        contactLogId: string
    ): Promise<void> {
        try {
            // Update the contact log with taskId reference
            // The task will be picked up by LoanOfficerTaskService based on nextFollowUpDate
            console.log(`Follow-up task for customer ${customerId}, loan ${loanId} scheduled for ${followUpDate} (Log: ${contactLogId})`);
        } catch (error) {
            console.error('Error creating follow-up task:', error);
            throw error;
        }
    }

    /**
     * Task 5.2.7: Update task status after contact logging
     */
    private async updateTaskStatus(taskId: string, contactLogId: string): Promise<void> {
        try {
            // Extract the actual ID from taskId (format: "overdue-{id}" or "followup-{id}")
            const [type, id] = taskId.split('-');

            if (type === 'followup') {
                // Update the original contact log that created this task
                await (prisma as any).contactLog.update({
                    where: { id },
                    data: {
                        taskId: contactLogId, // Link to the new contact log
                    },
                });
            }

            console.log(`Task ${taskId} updated with contact log ${contactLogId}`);
        } catch (error) {
            console.error('Error updating task status:', error);
            // Don't throw - this is not critical
        }
    }

    /**
     * Task 5.2.8: Get contact history for a customer
     * 
     * @param customerId - Customer ID
     * @param loanId - Optional loan ID to filter by specific loan
     * @param limit - Number of records to return
     * @returns Contact history in chronological order
     */
    async getContactHistory(
        customerId: string,
        loanId?: string,
        limit: number = 10
    ): Promise<any[]> {
        try {
            const contactLogs = await (prisma as any).contactLog.findMany({
                where: {
                    customerId,
                    ...(loanId && { loanId }),
                },
                include: {
                    loan: {
                        select: {
                            id: true,
                            principal: true,
                        },
                    },
                    customer: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                    officer: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                } as any,
                orderBy: {
                    contactDate: 'desc',
                },
                take: limit,
            });

            return contactLogs;
        } catch (error) {
            console.error('Error getting contact history:', error);
            throw error;
        }
    }

    /**
     * Get contact type options for selection
     */
    getContactTypeOptions(): Array<{ value: ContactType; label: string }> {
        return [
            { value: 'PHONE', label: '📞 โทรศัพท์' },
            { value: 'VISIT', label: '🏠 เยี่ยมบ้าน' },
            { value: 'EMAIL', label: '📧 อีเมล' },
            { value: 'LINE', label: '💬 LINE' },
        ];
    }

    /**
     * Get outcome options for selection
     */
    getOutcomeOptions(): Array<{ value: ContactOutcome; label: string; description: string }> {
        return [
            {
                value: 'CONTACTED',
                label: '✅ ติดต่อได้',
                description: 'พูดคุยกับลูกค้าได้'
            },
            {
                value: 'PROMISED',
                label: '🤝 สัญญาชำระ',
                description: 'ลูกค้าสัญญาว่าจะชำระ'
            },
            {
                value: 'EXTENSION',
                label: '📅 ขอผ่อนผัน',
                description: 'ลูกค้าขอเลื่อนกำหนดชำระ'
            },
            {
                value: 'UNREACHABLE',
                label: '❌ ติดต่อไม่ได้',
                description: 'ไม่สามารถติดต่อลูกค้าได้'
            },
            {
                value: 'PAID',
                label: '💰 ชำระแล้ว',
                description: 'ลูกค้าชำระเงินแล้ว'
            },
        ];
    }

    /**
     * Validate contact log data
     */
    validateContactLogData(data: Partial<ContactLogData>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.customerId) {
            errors.push('ไม่พบข้อมูลลูกค้า');
        }

        if (!data.loanId) {
            errors.push('ไม่พบข้อมูลสินเชื่อ');
        }

        if (!data.contactType) {
            errors.push('กรุณาเลือกประเภทการติดต่อ');
        }

        if (!data.outcome) {
            errors.push('กรุณาเลือกผลการติดต่อ');
        }

        if (!data.notes || data.notes.trim().length === 0) {
            errors.push('กรุณาระบุหมายเหตุ');
        }

        if (data.notes && data.notes.length > 1000) {
            errors.push('หมายเหตุยาวเกินไป (สูงสุด 1000 ตัวอักษร)');
        }

        if (data.nextFollowUpDate) {
            const followUpDate = new Date(data.nextFollowUpDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (followUpDate < today) {
                errors.push('วันนัดติดตามต้องไม่เป็นวันในอดีต');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Format contact log for display
     */
    formatContactLogForDisplay(contactLog: any): string {
        const contactTypeLabels: Record<string, string> = {
            PHONE: '📞 โทรศัพท์',
            VISIT: '🏠 เยี่ยมบ้าน',
            EMAIL: '📧 อีเมล',
            LINE: '💬 LINE',
        };

        const outcomeLabels: Record<string, string> = {
            CONTACTED: '✅ ติดต่อได้',
            PROMISED_TO_PAY: '🤝 สัญญาชำระ',
            REQUEST_EXTENSION: '📅 ขอผ่อนผัน',
            UNREACHABLE: '❌ ติดต่อไม่ได้',
            ALREADY_PAID: '💰 ชำระแล้ว',
        };

        const date = new Date(contactLog.contactDate || contactLog.createdAt).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const method = contactLog.contactMethod || contactLog.contactType;
        const outcome = contactLog.outcome || contactLog.contactStatus;

        let text = `${date}\n`;
        text += `${contactTypeLabels[method] || method} - ${outcomeLabels[outcome] || outcome}\n`;
        text += `หมายเหตุ: ${contactLog.notes}\n`;

        if (contactLog.nextFollowUpDate) {
            const followUpDate = new Date(contactLog.nextFollowUpDate).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            text += `นัดติดตาม: ${followUpDate}\n`;
        }

        const person = contactLog.officer || contactLog.creator;
        if (person) {
            text += `โดย: ${person.firstName} ${person.lastName}`;
        }

        return text;
    }

    /**
     * Map internal outcome to Prisma ContactStatus enum
     */
    private mapOutcomeToStatus(outcome: ContactOutcome): any {
        const map: Record<ContactOutcome, any> = {
            CONTACTED: 'CONTACTED',
            PROMISED: 'PROMISED_TO_PAY',
            EXTENSION: 'REQUEST_EXTENSION',
            UNREACHABLE: 'UNREACHABLE',
            PAID: 'ALREADY_PAID',
        };
        return map[outcome];
    }
}

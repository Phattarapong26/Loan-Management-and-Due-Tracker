/**
 * NPL Alert Service
 * 
 * Purpose: NPL and high-risk loan alerts with action items
 * Features:
 * - NPL loan detection (>90 days overdue)
 * - High-risk loan detection (60-89 days overdue)
 * - Immediate push notifications
 * - Action buttons for follow-up
 * 
 * Requirements: Requirement 11 - NPL Alerts
 */

import { LoanRepository } from '@loans/repositories/loan.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { ContactLogRepository } from '@collections/repositories/contact-log.repository';
import { NotificationService } from '@notifications/services/notification.service';
import axios from 'axios';
import { env } from '@config/env.config';
import { EncryptionUtil } from '@core/utils/security/encryption.util';
import { ContactMethod, ContactStatus } from '@prisma/client';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';


export interface NPLLoan {
    loanId: string;
    loanNumber: string;
    customerId: string;
    customerName: string;
    phoneNumber: string;
    outstandingBalance: number;
    daysOverdue: number;
    lastPaymentDate: Date | null;
    lastContactDate: Date | null;
}

export class NPLAlertService {
    private accessToken: string;
    private loanRepository: LoanRepository;
    private userRepository: UserRepository;
    private contactLogRepository: ContactLogRepository;
    private notificationService: NotificationService;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
        this.loanRepository = new LoanRepository();
        this.userRepository = new UserRepository();
        this.contactLogRepository = new ContactLogRepository();
        this.notificationService = new NotificationService();
    }

    /**
     * Task 6.3.2: Get NPL loans for branch (>90 days overdue)
     */
    async getNPLLoans(branchId: string): Promise<NPLLoan[]> {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const loans = await this.loanRepository.findNPLLoansByBranch(branchId, ninetyDaysAgo);

            return loans.map(loan => {
                const oldestOverdue = loan.paymentSchedule[0];
                const daysOverdue = oldestOverdue
                    ? Math.floor((new Date().getTime() - new Date(oldestOverdue.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                return {
                    loanId: loan.id,
                    loanNumber: loan.id,
                    customerId: loan.customer.id,
                    customerName: loan.customer.businessName,
                    phoneNumber: EncryptionUtil.decrypt(loan.customer.phone || ''),
                    outstandingBalance: Number(loan.outstandingBalance) || 0,
                    daysOverdue,
                    lastPaymentDate: loan.payments[0]?.paymentDate || null,
                    lastContactDate: loan.contactLogs[0]?.contactDate || null,
                };
            });
        } catch (error) {
            console.error('Error getting NPL loans:', error);
            throw error;
        }
    }

    /**
     * Task 6.3.3: Get high-risk loans (60-89 days overdue)
     */
    async getHighRiskLoans(branchId: string): Promise<NPLLoan[]> {
        try {
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const loans = await this.loanRepository.findHighRiskLoansByBranch(branchId, ninetyDaysAgo, sixtyDaysAgo);

            return loans.map(loan => {
                const oldestOverdue = loan.paymentSchedule[0];
                const daysOverdue = oldestOverdue
                    ? Math.floor((new Date().getTime() - new Date(oldestOverdue.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                return {
                    loanId: loan.id,
                    loanNumber: loan.id,
                    customerId: loan.customer.id,
                    customerName: loan.customer.businessName,
                    phoneNumber: EncryptionUtil.decrypt(loan.customer.phone || ''),
                    outstandingBalance: Number(loan.outstandingBalance) || 0,
                    daysOverdue,
                    lastPaymentDate: loan.payments[0]?.paymentDate || null,
                    lastContactDate: loan.contactLogs[0]?.contactDate || null,
                };
            });
        } catch (error) {
            console.error('Error getting high-risk loans:', error);
            throw error;
        }
    }

    /**
     * Task 6.3.4: Send immediate push notification when loan becomes NPL
     * Now creates in-app notification + LINE notification
     */
    async sendNPLAlert(loanId: string, managerId: string): Promise<boolean> {
        try {
            const loan = await this.loanRepository.findById(loanId);
            if (!loan) return false;

            const manager = await this.userRepository.findById(managerId);
            if (!manager) return false;

            const daysOverdue = loan.overdueDays || 0;
            const customerName = (loan as any).customer?.businessName ?? 'ลูกค้า';
            const outstandingBalance = Number(loan.outstandingBalance || 0);

            // 1. Create in-app notification (always, regardless of LINE)
            await this.notificationService.notify({
                userId: managerId,
                type: 'SYSTEM_ALERT' as any,
                title: '🚨 แจ้งเตือน NPL',
                message: `ลูกค้า ${customerName} เกินกำหนดชำระ ${daysOverdue} วัน ยอดคงค้าง ${outstandingBalance.toLocaleString('th-TH')} บาท`,
                link: `/loans/${loanId}`,
                priority: 'URGENT' as any,
                dedupKey: `npl-alert-${loanId}-${managerId}`,
                dedupWindow: 168, // 7 days
                metadata: {
                    loanId,
                    customerName,
                    daysOverdue,
                    outstandingBalance,
                    notificationType: 'NPL_ALERT',
                },
            });

            // 2. Send LINE if manager has LINE connected
            if (manager.lineUserId && (manager as any).lineActive) {
                const message = this.createNPLAlertMessage(loan, daysOverdue);
                await axios.post(
                    `${LINE_MESSAGING_API}/message/push`,
                    { to: manager.lineUserId, messages: [message] },
                    { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
                );
            }

            console.log(`NPL alert sent for loan ${loanId} to manager ${managerId}`);
            return true;
        } catch (error) {
            console.error('Error sending NPL alert:', error);
            return false;
        }
    }

    /**
     * Task 6.3.5: Create Flex Message template for NPL alert
     */
    private createNPLAlertMessage(loan: any, daysOverdue: number): any {
        return {
            type: 'flex',
            altText: `🚨 แจ้งเตือน NPL - ${loan.customer.businessName}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '🚨 แจ้งเตือน NPL', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                        { type: 'text', text: 'สินเชื่อเกิน 90 วัน', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                    ],
                    backgroundColor: '#F44336',
                    paddingAll: '15px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'เลขที่สินเชื่อ:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: loan.id, size: 'sm', weight: 'bold', flex: 2 },
                            ],
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ลูกค้า:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: loan.customer.businessName, size: 'sm', flex: 2, wrap: true },
                            ],
                            margin: 'sm',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'โทร:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: EncryptionUtil.decrypt(loan.customer.phone || '') || 'ไม่ระบุ', size: 'sm', flex: 2 },
                            ],
                            margin: 'sm',
                        },
                        { type: 'separator', margin: 'md' },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ยอดคงเหลือ:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: `฿${(loan.outstandingBalance || 0).toLocaleString()}`, size: 'md', weight: 'bold', color: '#F44336', flex: 2 },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ค้างชำระ:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: `${daysOverdue} วัน`, size: 'md', weight: 'bold', color: '#F44336', flex: 2 },
                            ],
                            margin: 'sm',
                        },
                    ],
                    paddingAll: '15px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '👤 มอบหมายงาน',
                                data: `action=assign_followup&loanId=${loan.id}&customerId=${loan.customerId}`,
                            },
                            style: 'primary',
                            color: '#2196F3',
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '📝 ดูประวัติ',
                                data: `action=view_history&loanId=${loan.id}&customerId=${loan.customerId}`,
                            },
                            style: 'secondary',
                            margin: 'sm',
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '🔄 ปรับโครงสร้างหนี้',
                                data: `action=restructure&loanId=${loan.id}`,
                            },
                            style: 'secondary',
                            margin: 'sm',
                        },
                    ],
                    paddingAll: '10px',
                },
            },
        };
    }

    /**
     * Task 6.3.7: Assign follow-up task to loan officer
     */
    async assignFollowUpTask(loanId: string, officerId: string, _managerId: string): Promise<boolean> {
        try {
            const loan = await this.loanRepository.findLoanForNPLTask(loanId);

            if (!loan) {
                return false;
            }

            // Create contact log with task assignment
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            await this.contactLogRepository.create({
                customerId: loan.customerId,
                loanId,
                contactMethod: ContactMethod.PHONE,
                contactStatus: ContactStatus.CONTACTED,
                notes: `มอบหมายจากผู้จัดการ: ติดตาม NPL เลขที่ ${loan.id}`,
                nextFollowUpDate: tomorrow.toISOString(),
                contactDate: new Date().toISOString(),
                officerId: officerId,
            });

            // Notify officer
            const officer = await this.userRepository.findLineInfoById(officerId);

            if (officer?.lineUserId && officer.lineActive) {
                const message = `📋 งานใหม่: ติดตาม NPL\n\nเลขที่สินเชื่อ: ${loan.id}\nกำหนดติดตาม: พรุ่งนี้\n\nกรุณาติดต่อลูกค้าโดยเร็วที่สุด`;

                await axios.post(
                    `${LINE_MESSAGING_API}/message/push`,
                    {
                        to: officer.lineUserId,
                        messages: [{ type: 'text', text: message }],
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
            }

            console.log(`Follow-up task assigned for loan ${loanId} to officer ${officerId}`);
            return true;
        } catch (error) {
            console.error('Error assigning follow-up task:', error);
            return false;
        }
    }

    /**
     * Task 6.3.8: Send update notification when NPL status changes
     */
    async sendNPLStatusUpdate(
        loanId: string,
        managerId: string,
        newStatus: 'RESOLVED' | 'RESTRUCTURED' | 'WRITTEN_OFF'
    ): Promise<boolean> {
        try {
            const loan = await this.loanRepository.findLoanWithCustomerForNPL(loanId);

            if (!loan) {
                return false;
            }

            const manager = await this.userRepository.findLineInfoById(managerId);

            if (!manager?.lineUserId || !manager.lineActive) {
                return false;
            }

            const statusMessages = {
                RESOLVED: '✅ NPL ได้รับการแก้ไขแล้ว',
                RESTRUCTURED: '🔄 ปรับโครงสร้างหนี้เรียบร้อย',
                WRITTEN_OFF: '❌ ตัดหนี้สูญแล้ว',
            };

            const message = `${statusMessages[newStatus]}\n\nเลขที่สินเชื่อ: ${loan.id}\nลูกค้า: ${loan.customer.businessName}\nยอดคงเหลือ: ฿${Number(loan.outstandingBalance || 0).toLocaleString()}`;

            await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                {
                    to: manager.lineUserId,
                    messages: [{ type: 'text', text: message }],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log(`NPL status update sent for loan ${loanId}`);
            return true;
        } catch (error) {
            console.error('Error sending NPL status update:', error);
            return false;
        }
    }

    /**
     * Check for new NPL loans and send alerts
     * Should be run daily
     */
    async checkAndAlertNewNPLs(branchId: string): Promise<number> {
        try {
            const nplLoans = await this.getNPLLoans(branchId);

            // Get manager for this branch via UserRepository
            const managers = await this.userRepository.findByBranchAndRoles(branchId, ['branch_manager']);
            const manager = managers[0] ?? null;

            if (!manager) {
                console.log(`No active manager found for branch ${branchId}`);
                return 0;
            }

            let alertsSent = 0;

            for (const loan of nplLoans) {
                // Check dedup via ContactLogRepository
                const existingAlert = await this.contactLogRepository.findRecentNPLAlert(loan.loanId, 7);

                if (!existingAlert) {
                    const sent = await this.sendNPLAlert(loan.loanId, manager.id);
                    if (sent) {
                        // Log via ContactLogRepository
                        await this.contactLogRepository.create({
                            customerId: loan.customerId,
                            loanId: loan.loanId,
                            contactMethod: ContactMethod.LINE,
                            contactStatus: ContactStatus.CONTACTED,
                            notes: 'NPL Alert sent to manager',
                            contactDate: new Date().toISOString(),
                            officerId: manager.id,
                        });
                        alertsSent++;
                    }
                }
            }

            console.log(`Sent ${alertsSent} NPL alerts for branch ${branchId}`);
            return alertsSent;
        } catch (error) {
            console.error('Error checking and alerting NPLs:', error);
            return 0;
        }
    }
}
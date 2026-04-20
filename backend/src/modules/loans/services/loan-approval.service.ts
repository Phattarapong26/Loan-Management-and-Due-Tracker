/**
 * Loan Approval Service
 * 
 * Purpose: Handle loan approval workflow with hierarchy and risk assessment
 * Features:
 * - Multi-level approval based on loan amount
 * - Risk assessment integration
 * - Approval history tracking
 * - SLA monitoring
 * - Notifications to all stakeholders
 * 
 * Requirements: Requirement 9 - Loan Approval Workflow
 * 
 * Note: Prisma schema supports 3 approval levels: OFFICER, MANAGER, HQ
 * This service maps SENIOR_MANAGER and DIRECTOR to HQ for compatibility
 */

import axios from 'axios';
import { env } from '@config/env.config';
import { ApprovalLevel as PrismaApprovalLevel, UserRole } from '@prisma/client';
import { ApprovalLimitRepository } from '../repositories/approval-limit.repository';
import { LoanRepository } from '../repositories/loan.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { CustomerRepository } from '@customers/repositories/customer.repository';
import { DisbursementRepository } from '@disbursements/repositories/disbursement.repository';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

// Extended approval levels for business logic (maps to Prisma's 3 levels)
export type ApprovalLevel = 'OFFICER' | 'MANAGER' | 'HQ';
export type ApprovalAction = 'APPROVED' | 'REJECTED' | 'DOCUMENTS_REQUESTED';

export interface ApprovalHistoryEntry {
    timestamp: Date;
    approverId: string;
    approverName: string;
    approverRole: string;
    action: ApprovalAction;
    level: ApprovalLevel;
    reason?: string;
    requestedDocuments?: string[];
}

export class LoanApprovalService {
    private accessToken: string;
    private approvalLimitRepository: ApprovalLimitRepository;
    private loanRepository: LoanRepository;
    private userRepository: UserRepository;
    private customerRepository: CustomerRepository;
    private disbursementRepository: DisbursementRepository;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
        this.approvalLimitRepository = new ApprovalLimitRepository();
        this.loanRepository = new LoanRepository();
        this.userRepository = new UserRepository();
        this.customerRepository = new CustomerRepository();
        this.disbursementRepository = new DisbursementRepository();
    }

    /**
     * Task 6.1.2: Get required approval level based on loan amount
     * 
     * Uses approval_limits table for dynamic configuration
     * Default hierarchy:
     * - ≤ 500,000: OFFICER
     * - ≤ 15,000,000: MANAGER (Branch Manager) ✅
     * - > 15,000,000: HQ (Headquarters)
     */
    async getRequiredApprovalLevel(loanAmount: number, userRole?: UserRole): Promise<ApprovalLevel> {
        try {
            // If userRole provided, check their approval limit
            if (userRole) {
                const limit = await this.approvalLimitRepository.findFirstForRoleAndAmount(userRole, loanAmount);
                if (limit) {
                    return limit.approvalLevel as ApprovalLevel;
                }
            }

            // Get all active approval limits
            const limits = await this.approvalLimitRepository.findAllActive();

            // Find the appropriate limit
            for (const limit of limits) {
                const minAmount = Number(limit.minAmount);
                const maxAmount = limit.maxAmount ? Number(limit.maxAmount) : null;

                if (loanAmount >= minAmount && (maxAmount === null || loanAmount <= maxAmount)) {
                    return limit.approvalLevel as ApprovalLevel;
                }
            }

            // Default fallback
            if (loanAmount <= 500000) {
                return 'OFFICER';
            } else if (loanAmount <= 15000000) {
                return 'MANAGER';
            } else {
                return 'HQ';
            }
        } catch (error) {
            console.error('Error getting required approval level:', error);
            // Fallback to default logic
            if (loanAmount <= 500000) {
                return 'OFFICER';
            } else if (loanAmount <= 15000000) {
                return 'MANAGER';
            } else {
                return 'HQ';
            }
        }
    }

    /**
     * Get next approval level in hierarchy
     */
    getNextApprovalLevel(currentLevel: ApprovalLevel): ApprovalLevel | null {
        const hierarchy: ApprovalLevel[] = ['OFFICER', 'MANAGER', 'HQ'];
        const currentIndex = hierarchy.indexOf(currentLevel);

        if (currentIndex < hierarchy.length - 1) {
            return hierarchy[currentIndex + 1] ?? null;
        }

        return null;
    }

    /**
     * Task 6.1.3: Send approval notification with loan details
     * 
     * @param loanId - Loan ID
     * @param approverId - Approver user ID
     */
    async sendApprovalNotification(loanId: string, approverId: string): Promise<boolean> {
        try {
            // Get loan details with customer and risk info
            const loan = await this.loanRepository.findById(loanId) as any;

            if (!loan) {
                throw new Error('Loan not found');
            }

            // Get approver's LINE user ID
            const approver = await this.userRepository.findById(approverId);

            if (!approver?.lineUserId || !approver.lineActive) {
                console.log(`Approver ${approverId} does not have active LINE account`);
                return false;
            }

            // Task 6.1.4: Create Flex Message with risk info
            const message = this.createApprovalRequestMessage(loan);

            // Send push message
            await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                {
                    to: approver.lineUserId,
                    messages: [message],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log(`Approval notification sent to ${approverId} for loan ${loanId}`);
            return true;
        } catch (error) {
            console.error('Error sending approval notification:', error);
            return false;
        }
    }

    /**
     * Task 6.1.4: Create Flex Message for approval request with risk info
     */
    private createApprovalRequestMessage(loan: any): any {
        const confidenceScore = loan.customer.aiConfidenceScore ? Number(loan.customer.aiConfidenceScore) : 0;
        const riskColor = confidenceScore >= 70 ? '#4CAF50' : confidenceScore >= 40 ? '#FF9800' : '#F44336';
        const riskLabel = confidenceScore >= 70 ? '🟢 ความเสี่ยงต่ำ' : confidenceScore >= 40 ? '🟡 ความเสี่ยงปานกลาง' : '🔴 ความเสี่ยงสูง';

        return {
            type: 'flex',
            altText: `รออนุมัติสินเชื่อ - ${loan.customer.businessName}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '📋 รออนุมัติสินเชื่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                        { type: 'text', text: `เลขที่: ${loan.id.substring(0, 8)}`, size: 'sm', color: '#FFFFFF', margin: 'sm' },
                    ],
                    backgroundColor: '#FF9800',
                    paddingAll: '15px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        // Customer Info
                        { type: 'text', text: 'ข้อมูลลูกค้า', weight: 'bold', size: 'md', color: '#111111' },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ชื่อธุรกิจ:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: loan.customer.businessName, size: 'sm', flex: 2, wrap: true },
                            ],
                            margin: 'sm',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'โทร:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: loan.customer.phone || 'ไม่ระบุ', size: 'sm', flex: 2 },
                            ],
                            margin: 'sm',
                        },
                        { type: 'separator', margin: 'md' },

                        // Loan Info
                        { type: 'text', text: 'ข้อมูลสินเชื่อ', weight: 'bold', size: 'md', color: '#111111', margin: 'md' },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ยอดกู้:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: `฿${loan.principal.toNumber().toLocaleString()}`, size: 'md', weight: 'bold', color: '#111111', flex: 2 },
                            ],
                            margin: 'sm',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ระยะเวลา:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: `${loan.termMonths} เดือน`, size: 'sm', flex: 2 },
                            ],
                            margin: 'sm',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'อัตราดอกเบี้ย:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: `${loan.interestRate.toNumber()}%`, size: 'sm', flex: 2 },
                            ],
                            margin: 'sm',
                        },
                        { type: 'separator', margin: 'md' },

                        // Risk Assessment
                        { type: 'text', text: 'การประเมินความเสี่ยง (AI)', weight: 'bold', size: 'md', color: '#111111', margin: 'md' },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ระดับความเสี่ยง:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: riskLabel, size: 'sm', weight: 'bold', color: riskColor, flex: 2 },
                            ],
                            margin: 'sm',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'คะแนน:', size: 'sm', color: '#666666', flex: 1 },
                                { type: 'text', text: `${confidenceScore}/100`, size: 'sm', flex: 2 },
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
                                label: '✅ อนุมัติ',
                                data: `action=approve_loan&loanId=${loan.id}`,
                            },
                            style: 'primary',
                            color: '#4CAF50',
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '❌ ปฏิเสธ',
                                data: `action=reject_loan&loanId=${loan.id}`,
                            },
                            style: 'secondary',
                            margin: 'sm',
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '📄 ขอเอกสารเพิ่ม',
                                data: `action=request_documents&loanId=${loan.id}`,
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
     * Task 6.1.5: Approve loan with hierarchy routing
     */
    async approveLoan(loanId: string, approverId: string, reason?: string): Promise<boolean> {
        try {
            const loan = await this.loanRepository.findById(loanId) as any;

            if (!loan) {
                throw new Error('Loan not found');
            }

            const approver = await this.userRepository.findForApproval(approverId);

            if (!approver) {
                throw new Error('Approver not found');
            }

            // Get required approval level
            const requiredLevel = await this.getRequiredApprovalLevel(loan.principal.toNumber());
            const currentLevel = (loan.currentApprovalLevel as ApprovalLevel) || 'OFFICER';

            // Task 6.1.8: Record approval in history
            const approvalHistory = loan.approvalHistory ? JSON.parse(loan.approvalHistory as string) : [];
            const historyEntry: ApprovalHistoryEntry = {
                timestamp: new Date(),
                approverId,
                approverName: `${approver.firstName} ${approver.lastName}`,
                approverRole: approver.role,
                action: 'APPROVED',
                level: currentLevel,
                reason,
            };
            approvalHistory.push(historyEntry);

            // Check if this is final approval
            const nextLevel = this.getNextApprovalLevel(currentLevel);
            const isFinalApproval = currentLevel === requiredLevel || !nextLevel;

            if (isFinalApproval) {
                // Final approval - update loan status
                await this.loanRepository.update(loanId, {
                    status: 'APPROVED',
                    approvalLevel: requiredLevel as PrismaApprovalLevel,
                    currentApprovalLevel: requiredLevel as PrismaApprovalLevel,
                    approvalHistory: JSON.stringify(approvalHistory),
                    approvedBy: approverId,
                    approvedAt: new Date(),
                });

                // Task 6.1.10: Create LoanDisbursement record
                await this.disbursementRepository.create({
                    loanId,
                    disbursementNo: 1,
                    amount: loan.principal,
                    purpose: 'เบิกจ่ายเงินกู้',
                    requestedDate: new Date(),
                    createdBy: approverId,
                });

                // Task 6.1.9: Send notifications to loan officer and customer
                await this.sendFinalDecisionNotifications(loan, 'APPROVED');

                console.log(`Loan ${loanId} finally approved by ${approverId}`);
            } else {
                // Route to next level
                await this.loanRepository.update(loanId, {
                    currentApprovalLevel: nextLevel as PrismaApprovalLevel,
                    approvalHistory: JSON.stringify(approvalHistory),
                });

                // Send notification to next approver
                const nextApprover = await this.findNextApprover(loan.branchId, nextLevel);
                if (nextApprover) {
                    await this.sendApprovalNotification(loanId, nextApprover.id);
                }

                console.log(`Loan ${loanId} approved at ${currentLevel}, routed to ${nextLevel}`);
            }

            return true;
        } catch (error) {
            console.error('Error approving loan:', error);
            throw error;
        }
    }

    /**
     * Task 6.1.6: Reject loan with reason
     */
    async rejectLoan(loanId: string, approverId: string, reason: string): Promise<boolean> {
        try {
            const loan = await this.loanRepository.findById(loanId) as any;

            if (!loan) {
                throw new Error('Loan not found');
            }

            const approver = await this.userRepository.findForApproval(approverId);

            if (!approver) {
                throw new Error('Approver not found');
            }

            // Task 6.1.8: Record rejection in history
            const approvalHistory = loan.approvalHistory ? JSON.parse(loan.approvalHistory as string) : [];
            const historyEntry: ApprovalHistoryEntry = {
                timestamp: new Date(),
                approverId,
                approverName: `${approver.firstName} ${approver.lastName}`,
                approverRole: approver.role,
                action: 'REJECTED',
                level: (loan.currentApprovalLevel as ApprovalLevel) || 'OFFICER',
                reason,
            };
            approvalHistory.push(historyEntry);

            // Update loan status
            await this.loanRepository.update(loanId, {
                status: 'REJECTED',
                approvalHistory: JSON.stringify(approvalHistory),
                rejectedBy: approverId,
                rejectedAt: new Date(),
                rejectedReason: reason,
            });

            // Task 6.1.9: Send notifications
            await this.sendFinalDecisionNotifications(loan, 'REJECTED', reason);

            console.log(`Loan ${loanId} rejected by ${approverId}`);
            return true;
        } catch (error) {
            console.error('Error rejecting loan:', error);
            throw error;
        }
    }

    /**
     * Task 6.1.7: Request additional documents
     */
    async requestDocuments(
        loanId: string,
        approverId: string,
        requestedDocuments: string[]
    ): Promise<boolean> {
        try {
            const loan = await this.loanRepository.findById(loanId) as any;

            if (!loan) {
                throw new Error('Loan not found');
            }

            const approver = await this.userRepository.findForApproval(approverId);

            if (!approver) {
                throw new Error('Approver not found');
            }

            // Task 6.1.8: Record in history
            const approvalHistory = loan.approvalHistory ? JSON.parse(loan.approvalHistory as string) : [];
            const historyEntry: ApprovalHistoryEntry = {
                timestamp: new Date(),
                approverId,
                approverName: `${approver.firstName} ${approver.lastName}`,
                approverRole: approver.role,
                action: 'DOCUMENTS_REQUESTED',
                level: (loan.currentApprovalLevel as ApprovalLevel) || 'OFFICER',
                requestedDocuments,
            };
            approvalHistory.push(historyEntry);

            // Keep status as PENDING_APPROVAL but add note about documents
            await this.loanRepository.update(loanId, {
                approvalHistory: JSON.stringify(approvalHistory),
            });

            console.log(`Documents requested for loan ${loanId}`);
            return true;
        } catch (error) {
            console.error('Error requesting documents:', error);
            throw error;
        }
    }

    /**
     * Task 6.1.9: Send final decision notifications
     */
    private async sendFinalDecisionNotifications(
        loan: any,
        decision: 'APPROVED' | 'REJECTED',
        reason?: string
    ): Promise<void> {
        try {
            // Notify loan officer
            const officer = await this.userRepository.findFirstByBranchAndRole(
                loan.branchId,
                'OFFICER'
            );

            // Try to get officer by officerId directly if available
            const officerUser = loan.officerId
                ? await this.userRepository.findLineInfoById(loan.officerId)
                : officer;

            if (officerUser?.lineUserId && officerUser.lineActive) {
                const message = decision === 'APPROVED'
                    ? `✅ สินเชื่อเลขที่ ${loan.id.substring(0, 8)} ได้รับการอนุมัติแล้ว\n\nลูกค้า: ${loan.customer.businessName}\nยอดเงิน: ฿${loan.principal.toNumber().toLocaleString()}`
                    : `❌ สินเชื่อเลขที่ ${loan.id.substring(0, 8)} ถูกปฏิเสธ\n\nเหตุผล: ${reason || 'ไม่ระบุ'}`;

                await axios.post(
                    `${LINE_MESSAGING_API}/message/push`,
                    {
                        to: officerUser.lineUserId,
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

            // Notify customer (if they have LINE linked)
            const customer = await this.customerRepository.findById(loan.customerId) as any;

            if (customer?.lineUserId) {
                const message = decision === 'APPROVED'
                    ? `🎉 ยินดีด้วย! สินเชื่อของคุณได้รับการอนุมัติแล้ว\n\nยอดเงิน: ฿${loan.principal.toNumber().toLocaleString()}\nระยะเวลา: ${loan.termMonths} เดือน\n\nเจ้าหน้าที่จะติดต่อกลับเพื่อดำเนินการต่อไป`
                    : `ขออภัย สินเชื่อของคุณไม่ได้รับการอนุมัติ\n\nกรุณาติดต่อเจ้าหน้าที่เพื่อขอรายละเอียดเพิ่มเติม`;

                await axios.post(
                    `${LINE_MESSAGING_API}/message/push`,
                    {
                        to: customer.lineUserId,
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
        } catch (error) {
            console.error('Error sending final decision notifications:', error);
        }
    }

    /**
     * Find next approver in hierarchy
     */
    private async findNextApprover(branchId: string, level: ApprovalLevel): Promise<any> {
        const roleMap: Record<ApprovalLevel, UserRole> = {
            OFFICER: 'OFFICER',
            MANAGER: 'MANAGER',
            HQ: 'ADMIN', // Use ADMIN role for HQ level
        };

        return this.userRepository.findFirstByBranchAndRole(branchId, roleMap[level]);
    }

    /**
     * Task 6.1.11: Check approval SLA
     * 
     * @param loanId - Loan ID
     * @returns SLA status and hours remaining
     */
    async checkApprovalSLA(loanId: string): Promise<{
        exceeded: boolean;
        hoursRemaining: number;
        slaHours: number;
    }> {
        try {
            const loan = await this.loanRepository.findById(loanId) as any;

            if (!loan) {
                throw new Error('Loan not found');
            }

            // SLA by level: OFFICER=24h, MANAGER=48h, HQ=72h
            const slaMap: Record<ApprovalLevel, number> = {
                OFFICER: 24,
                MANAGER: 48,
                HQ: 72,
            };

            const level = (loan.currentApprovalLevel as ApprovalLevel) || 'OFFICER';
            const slaHours = slaMap[level];

            const now = new Date();
            const createdAt = new Date(loan.createdAt);
            const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const hoursRemaining = slaHours - hoursElapsed;

            return {
                exceeded: hoursRemaining < 0,
                hoursRemaining: Math.round(hoursRemaining),
                slaHours,
            };
        } catch (error) {
            console.error('Error checking approval SLA:', error);
            throw error;
        }
    }

    /**
     * Task 6.1.12: Send escalation notification when SLA exceeded
     */
    async sendEscalationNotification(loanId: string): Promise<boolean> {
        try {
            const loan = await this.loanRepository.findById(loanId) as any;

            if (!loan) {
                return false;
            }

            const sla = await this.checkApprovalSLA(loanId);

            if (!sla.exceeded) {
                return false;
            }

            // Send to branch manager
            const manager = await this.userRepository.findFirstByBranchAndRole(
                loan.customer?.branchId || loan.branchId,
                'MANAGER'
            );

            if (manager?.lineUserId) {
                const message = `⚠️ แจ้งเตือน: สินเชื่อเกิน SLA\n\nเลขที่: ${loan.id.substring(0, 8)}\nลูกค้า: ${loan.customer?.businessName}\nยอดเงิน: ฿${loan.principal.toNumber().toLocaleString()}\n\nเกินกำหนด: ${Math.abs(sla.hoursRemaining)} ชั่วโมง\nกรุณาเร่งดำเนินการ`;

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

                console.log(`Escalation notification sent for loan ${loanId}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error sending escalation notification:', error);
            return false;
        }
    }
}

/**
 * LINE Messages Service - Main Entry Point
 * K-Bank Theme: Clean, Minimal, Professional
 * 
 * This service delegates to role-specific message classes for better organization
 */

import { CustomerMessages } from '@line/messages/customer.messages';
import { OfficerMessages } from '@line/messages/officer.messages';
import { ManagerMessages } from '@line/messages/manager.messages';
import { AdminMessages } from '@line/messages/admin.messages';
import { CommonMessages } from '@line/messages/common.messages';

export class LineMessagesService {
    /**
     * Create menu message based on role
     */
    static createMenuMessage(role?: string): any[] {
        const isCustomer = role === 'USER' || role === 'CUSTOMER';
        const isOfficer = role === 'OFFICER';
        const isManager = role === 'MANAGER';
        const isAdmin = role === 'ADMIN';

        if (isCustomer) {
            return CustomerMessages.createMenuMessage();
        } else if (isOfficer) {
            return OfficerMessages.createMenuMessage();
        } else if (isManager) {
            return ManagerMessages.createMenuMessage();
        } else if (isAdmin) {
            return AdminMessages.createMenuMessage();
        } else {
            // Unregistered user
            const commandList = [
                '⚠ กรุณาลงทะเบียนก่อนใช้งาน',
                '',
                'พิมพ์: ลงทะเบียน, register',
            ];

            const quickActions = [
                {
                    type: 'button',
                    action: { type: 'uri', label: '🔗 ลงทะเบียน', uri: 'https://line.me/R/ti/p/@your-line-oa' },
                    style: 'primary',
                    color: '#00AA5B',
                },
            ];

            return [
                {
                    type: 'flex',
                    altText: 'เมนูคำสั่ง',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '⊞ คำสั่งที่ใช้ได้', weight: 'bold', size: 'xl', color: '#FFFFFF' },
                                { type: 'text', text: 'ยังไม่ได้ลงทะเบียน', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                            ],
                            backgroundColor: '#00AA5B',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: commandList.join('\n'),
                                    size: 'sm',
                                    wrap: true,
                                    color: '#333333',
                                },
                            ],
                            paddingAll: '20px',
                        },
                        footer: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '⚡ Quick Actions',
                                    size: 'sm',
                                    weight: 'bold',
                                    color: '#666666',
                                    margin: 'none',
                                },
                                {
                                    type: 'separator',
                                    margin: 'md',
                                },
                                ...quickActions,
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '💡 พิมพ์คำสั่งภาษาไทยหรือภาษาอังกฤษก็ได้',
                                            size: 'xs',
                                            color: '#888888',
                                            align: 'center',
                                            wrap: true,
                                        },
                                    ],
                                    margin: 'lg',
                                },
                            ],
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        }
    }

    // ==================== Common Messages ====================
    static createRegistrationMessage(userId: string): any[] {
        return CommonMessages.createRegistrationMessage(userId);
    }

    static createWelcomeMessage(): any[] {
        return CommonMessages.createWelcomeMessage();
    }

    static createPaymentReminderMessage(reminder: any): any {
        return CommonMessages.createPaymentReminderMessage(reminder);
    }

    createPaymentConfirmationMessage(data: any): any {
        return CommonMessages.createPaymentConfirmationMessage(data);
    }

    createTextMessage(text: string): any {
        return CommonMessages.createTextMessage(text);
    }

    // ==================== Customer Messages ====================
    static async createBalanceMessage(userId?: string): Promise<any[]> {
        return CustomerMessages.createBalanceMessage(userId);
    }

    static async createNextDueMessage(userId?: string): Promise<any[]> {
        return CustomerMessages.createNextDueMessage(userId);
    }

    static async createHistoryMessage(userId?: string): Promise<any[]> {
        return CustomerMessages.createHistoryMessage(userId);
    }

    static async createContractsMessage(userId?: string): Promise<any[]> {
        return CustomerMessages.createContractsMessage(userId);
    }

    static async createScheduleMessage(userId?: string): Promise<any[]> {
        return CustomerMessages.createScheduleMessage(userId);
    }

    // ==================== Officer Messages ====================
    static createTaskListMessage(tasks: any[]): any[] {
        return OfficerMessages.createTaskListMessage(tasks);
    }

    static createContactTypeSelectionMessage(taskId: string, customerId: string, loanId: string): any[] {
        return OfficerMessages.createContactTypeSelectionMessage(taskId, customerId, loanId);
    }

    static createOutcomeSelectionMessage(
        contactType: string,
        taskId: string,
        customerId: string,
        loanId: string
    ): any[] {
        return OfficerMessages.createOutcomeSelectionMessage(contactType, taskId, customerId, loanId);
    }

    static createContactHistoryMessage(contactLogs: any[], customerName: string): any[] {
        return OfficerMessages.createContactHistoryMessage(contactLogs, customerName);
    }

    // ==================== Manager Messages ====================
    static createKPIDashboardMessage(kpis: any): any {
        return ManagerMessages.createKPIDashboardMessage(kpis);
    }

    // ==================== Contact Messages (Role-based) ====================
    static createContactMessage(role?: string): any[] {
        const isStaff = ['ADMIN', 'MANAGER', 'OFFICER'].includes(role || '');

        if (isStaff) {
            if (role === 'OFFICER') {
                return OfficerMessages.createContactMessage();
            } else if (role === 'MANAGER') {
                return ManagerMessages.createContactMessage();
            } else if (role === 'ADMIN') {
                return AdminMessages.createContactMessage();
            }
        }

        return CustomerMessages.createContactMessage();
    }

    // ==================== Dashboard Messages (Role-based) ====================
    static async createDashboardMessage(role: string, userId: string): Promise<any[]> {
        if (role === 'ADMIN') {
            return AdminMessages.createDashboardMessage(userId);
        } else if (role === 'MANAGER') {
            return ManagerMessages.createDashboardMessage(userId);
        } else if (role === 'OFFICER') {
            return OfficerMessages.createDashboardMessage(userId);
        } else {
            return [{ type: 'text', text: '✗ ไม่สามารถแสดง Dashboard สำหรับ role นี้ได้' }];
        }
    }

    // ==================== Legacy/Additional Methods ====================
    // These methods are kept for backward compatibility
    // TODO: Move to appropriate role-specific classes if needed

    static createPaymentChannelsMessage(
        loanNumber: string,
        channels: Array<{
            id: string;
            name: string;
            icon: string;
            instructions: string;
            available: boolean;
        }>
    ): any {
        const channelItems = channels
            .filter(c => c.available)
            .map((channel, index) => ({
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: `${channel.icon} ${channel.name}`,
                        size: 'md',
                        weight: 'bold',
                        color: '#000000',
                    },
                    {
                        type: 'text',
                        text: channel.instructions,
                        size: 'xs',
                        color: '#666666',
                        wrap: true,
                        margin: 'sm',
                    },
                ],
                margin: index > 0 ? 'lg' : 'none',
                paddingAll: '15px',
                backgroundColor: '#F5F5F5',
                cornerRadius: '10px',
            }));

        return {
            type: 'flex',
            altText: 'ช่องทางการชำระเงิน',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '▣ ช่องทางการชำระเงิน',
                            weight: 'bold',
                            size: 'lg',
                            color: '#FFFFFF',
                        },
                        {
                            type: 'text',
                            text: `เลขที่สินเชื่อ: ${loanNumber}`,
                            size: 'sm',
                            color: '#FFFFFF',
                            margin: 'sm',
                        },
                    ],
                    backgroundColor: '#00AA5B',
                    paddingAll: '20px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: channelItems,
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '⚠ การชำระเงินจะดำเนินการผ่านระบบธนาคารหลัก',
                            size: 'xxs',
                            color: '#999999',
                            wrap: true,
                            align: 'center',
                        },
                        {
                            type: 'text',
                            text: 'กรุณาระบุเลขที่สินเชื่อเป็นหมายเหตุ',
                            size: 'xxs',
                            color: '#999999',
                            wrap: true,
                            align: 'center',
                            margin: 'xs',
                        },
                    ],
                    paddingAll: '15px',
                },
            },
        };
    }

    static createEnhancedBalanceMessage(balance: any): any {
        // Delegate to customer messages for now
        // This can be moved to customer.messages.ts if needed
        return {
            type: 'flex',
            altText: `ยอดคงเหลือ - ${balance.loanNumber}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '฿ ยอดคงเหลือ',
                            weight: 'bold',
                            size: 'lg',
                            color: '#FFFFFF',
                        },
                        {
                            type: 'text',
                            text: `เลขที่สินเชื่อ: ${balance.loanNumber}`,
                            size: 'sm',
                            color: '#FFFFFF',
                            margin: 'sm',
                        },
                    ],
                    backgroundColor: '#00AA5B',
                    paddingAll: '20px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'รายละเอียดยอดคงเหลือ',
                            size: 'sm',
                            weight: 'bold',
                            margin: 'md',
                        },
                        // ... rest of the implementation
                    ],
                    paddingAll: '20px',
                },
            },
        };
    }

    static createMultipleLoansMessage(loans: any[]): any {
        // Implementation for multiple loans display
        return {
            type: 'flex',
            altText: `คุณมี ${loans.length} สินเชื่อ`,
            contents: {
                type: 'carousel',
                contents: [],
            },
        };
    }

    static createLoanDetailMessage(loan: any): any {
        // Implementation for loan detail display
        return {
            type: 'flex',
            altText: `รายละเอียดสินเชื่อ - ${loan.loanNumber}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [],
                },
            },
        };
    }

    static createPaymentScheduleMessage(_schedule: any[], loanNumber: string): any {
        // Implementation for payment schedule display
        // TODO: Move to customer.messages.ts or create a dedicated payment.messages.ts
        return {
            type: 'flex',
            altText: `ตารางชำระเงิน - ${loanNumber}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [],
                },
            },
        };
    }

    static createTaskDetailMessage(_task: any): any {
        // Implementation for task detail display
        // TODO: Move to officer.messages.ts
        return {
            type: 'flex',
            altText: `รายละเอียดงาน`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [],
                },
            },
        };
    }
}

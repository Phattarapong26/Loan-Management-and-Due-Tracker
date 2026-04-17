/**
 * Officer (OFFICER) LINE Messages
 * K-Bank Theme: Clean, Minimal, Professional
 */

import { DatabaseQueryService } from '@core-services/services/database-query.service';
import { COLORS } from './theme';

export class OfficerMessages {
    private static dbQueryService = new DatabaseQueryService();

    /**
     * Create officer menu message
     */
    static createMenuMessage(): any[] {
        const commandList = [
            '📋 งานวันนี้',
            '  พิมพ์: งาน, tasks',
            '',
            '📊 บันทึกการติดต่อ',
            '  พิมพ์: บันทึก, log',
            '',
            '📊 Dashboard',
            '  พิมพ์: สรุป, dashboard',
            '',
            '📞 ติดต่อทีมงาน',
            '  พิมพ์: ติดต่อ, contact',
        ];

        const quickActions = [
            {
                type: 'button',
                action: { type: 'postback', label: '📋 งานวันนี้', data: 'action=tasks' },
                style: 'primary',
                color: COLORS.PRIMARY,
            },
            {
                type: 'button',
                action: { type: 'postback', label: '📊 Dashboard', data: 'action=dashboard' },
                style: 'primary',
                color: COLORS.PRIMARY,
                margin: 'sm',
            },
            {
                type: 'button',
                action: { type: 'postback', label: '📝 บันทึกการติดต่อ', data: 'action=start_contact_log' },
                style: 'primary',
                color: COLORS.PRIMARY,
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
                            { type: 'text', text: '📋 คำสั่งที่ใช้ได้', weight: 'bold', size: 'xl', color: '#FFFFFF' },
                            { type: 'text', text: 'เจ้าหน้าที่สินเชื่อ', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                        ],
                        backgroundColor: COLORS.PRIMARY,
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
                                color: COLORS.TEXT_PRIMARY,
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
                                color: COLORS.TEXT_SECONDARY,
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

    /**
     * Create officer dashboard message
     */
    static async createDashboardMessage(userId: string): Promise<any[]> {
        if (!userId) {
            return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
        }

        try {
            const stats = await this.dbQueryService.getLoanOfficerStats(userId);

            const formatCurrency = (amount: number) => {
                return `💰${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            };

            const formatPercent = (value: number) => {
                return `${value.toFixed(2)}%`;
            };

            const items = [
                { label: 'งานวันนี้', value: `${stats.todayTasks} รายการ` },
                { label: 'เกินกำหนด < 3 วัน', value: `${stats.overdueLess3Days} รายการ` },
                { label: 'เกินกำหนด ≥ 3 วัน', value: `${stats.overdueMore3Days} รายการ` },
                { label: 'ยังไม่ติดต่อ', value: `${stats.uncontactedCustomers} ราย` },
                { label: 'เก็บเงินได้เดือนนี้', value: formatCurrency(stats.monthlyCollected) },
                { label: 'เป้าหมายเดือนนี้', value: formatCurrency(stats.monthlyTarget) },
                { label: 'Collection Rate', value: formatPercent(stats.collectionRate) },
            ];

            const contents = items.map((item, index) => ({
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'text', text: item.label, size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                    { type: 'text', text: item.value, size: 'sm', weight: 'bold', color: COLORS.PRIMARY, align: 'end', flex: 1 },
                ],
                margin: index > 0 ? 'md' : 'none',
            }));

            return [
                {
                    type: 'flex',
                    altText: '📊 Dashboard Officer',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📊 Dashboard Officer', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            ],
                            backgroundColor: COLORS.PRIMARY,
                            paddingAll: '15px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: contents,
                            paddingAll: '15px',
                        },
                        footer: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: 'อัพเดทล่าสุด: ' + new Date().toLocaleString('th-TH'), size: 'xs', color: COLORS.TEXT_LIGHT, align: 'center' },
                            ],
                            paddingAll: '10px',
                        },
                    },
                },
            ];
        } catch (error) {
            console.error('Error creating officer dashboard message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }

    /**
     * Create task list message
     */
    static createTaskListMessage(tasks: any[]): any[] {
        try {
            if (tasks.length === 0) {
                return [{ type: 'text', text: '✅ ยินดีด้วย! ไม่มีงานค้างวันนี้\n\nคุณได้ทำงานทั้งหมดเสร็จสิ้นแล้ว', weight: 'bold' }];
            }

            const bubbles = tasks.slice(0, 10).map((task, index) => {
                const priorityColor = task.priority === 'high' ? COLORS.DANGER :
                    task.priority === 'medium' ? COLORS.PRIMARY : COLORS.PRIMARY;
                const priorityText = task.priority === 'high' ? 'ด่วนมาก' :
                    task.priority === 'medium' ? 'ปานกลาง' : 'ปกติ';

                return {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: `งานที่ ${index + 1}`, weight: 'bold', size: 'md', color: '#FFFFFF', flex: 1 },
                                    { type: 'text', text: priorityText, size: 'sm', color: '#FFFFFF', align: 'end' },
                                ],
                            },
                        ],
                        backgroundColor: priorityColor,
                        paddingAll: '15px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: task.customerName, weight: 'bold', size: 'lg', wrap: true },
                            { type: 'separator', margin: 'md' },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'เหตุผล:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { type: 'text', text: task.reason, size: 'sm', weight: 'bold', align: 'end', flex: 2, wrap: true },
                                        ],
                                        margin: 'md',
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'ยอดกู้:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { type: 'text', text: `💰${task.loanAmount.toLocaleString()}`, size: 'sm', weight: 'bold', color: COLORS.PRIMARY, align: 'end', flex: 2 },
                                        ],
                                        margin: 'sm',
                                    },
                                    ...(task.daysOverdue > 0 ? [{
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'ค้างชำระ:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { type: 'text', text: `${task.daysOverdue} วัน`, size: 'sm', weight: 'bold', color: COLORS.DANGER, align: 'end', flex: 2 },
                                        ],
                                        margin: 'sm',
                                    }] : []),
                                    ...(task.lastContactDate ? [{
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'ติดต่อล่าสุด:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { type: 'text', text: new Date(task.lastContactDate).toLocaleDateString('th-TH'), size: 'sm', align: 'end', flex: 2 },
                                        ],
                                        margin: 'sm',
                                    }] : []),
                                ],
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
                                    label: '📞 ติดต่อลูกค้า',
                                    data: `action=contact_customer&taskId=${task.taskId}&customerId=${task.customerId}`,
                                },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '📋 บันทึกการติดต่อ',
                                    data: `action=log_contact&taskId=${task.taskId}&loanId=${task.loanId}`,
                                },
                                style: 'secondary',
                                margin: 'sm',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '🕐 เลื่อนนัด',
                                    data: `action=postpone_task&taskId=${task.taskId}`,
                                },
                                style: 'secondary',
                                margin: 'sm',
                            },
                        ],
                        paddingAll: '10px',
                    },
                };
            });

            return [
                {
                    type: 'flex',
                    altText: `งานวันนี้ (${tasks.length} รายการ)`,
                    contents: {
                        type: 'carousel',
                        contents: bubbles,
                    },
                },
            ];
        } catch (error) {
            console.error('Error creating task list message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลงาน กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }

    /**
     * Create contact type selection message
     */
    static createContactTypeSelectionMessage(taskId: string, customerId: string, loanId: string): any[] {
        return [
            {
                type: 'flex',
                altText: 'เลือกประเภทการติดต่อ',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📋 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: 'ขั้นตอนที่ 1: เลือกประเภทการติดต่อ', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '15px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'คุณติดต่อลูกค้าผ่านช่องทางใด?', size: 'md', wrap: true, margin: 'none' },
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
                                    label: '📞 โทรศัพท์',
                                    data: `action=contact_type&type=PHONE&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '📊 เยี่ยมบ้าน',
                                    data: `action=contact_type&type=VISIT&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                                margin: 'sm',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '📞 อีเมล',
                                    data: `action=contact_type&type=EMAIL&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                                margin: 'sm',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '📞 LINE',
                                    data: `action=contact_type&type=LINE&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                                margin: 'sm',
                            },
                        ],
                        paddingAll: '10px',
                    },
                },
            },
        ];
    }

    /**
     * Create outcome selection message
     */
    static createOutcomeSelectionMessage(
        contactType: string,
        taskId: string,
        customerId: string,
        loanId: string
    ): any[] {
        const contactTypeLabels: Record<string, string> = {
            PHONE: '📞 โทรศัพท์',
            VISIT: '📊 เยี่ยมบ้าน',
            EMAIL: '📞 อีเมล',
            LINE: '📞 LINE',
        };

        return [
            {
                type: 'flex',
                altText: 'เลือกผลการติดต่อ',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📋 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: 'ขั้นตอนที่ 2: เลือกผลการติดต่อ', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '15px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: `ช่องทาง: ${contactTypeLabels[contactType]}`, size: 'sm', color: COLORS.TEXT_SECONDARY },
                            { type: 'separator', margin: 'md' },
                            { type: 'text', text: 'ผลการติดต่อเป็นอย่างไร?', size: 'md', wrap: true, margin: 'md' },
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
                                    label: '✅ ติดต่อได้',
                                    data: `action=contact_outcome&outcome=CONTACTED&type=${contactType}&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '✅ สัญญาชำระ',
                                    data: `action=contact_outcome&outcome=PROMISED&type=${contactType}&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '🕐 ขอผ่อนผัน',
                                    data: `action=contact_outcome&outcome=EXTENSION&type=${contactType}&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '❌ ติดต่อไม่ได้',
                                    data: `action=contact_outcome&outcome=UNREACHABLE&type=${contactType}&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'secondary',
                                margin: 'sm',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: '💰 ชำระแล้ว',
                                    data: `action=contact_outcome&outcome=PAID&type=${contactType}&taskId=${taskId}&customerId=${customerId}&loanId=${loanId}`,
                                },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm',
                            },
                        ],
                        paddingAll: '10px',
                    },
                },
            },
        ];
    }

    /**
     * Create contact history message
     */
    static createContactHistoryMessage(contactLogs: any[], customerName: string): any[] {
        if (contactLogs.length === 0) {
            return [{ type: 'text', text: '📋 ยังไม่มีประวัติการติดต่อ', weight: 'bold' }];
        }

        const contactTypeLabels: Record<string, string> = {
            PHONE: '📞',
            VISIT: '📊',
            EMAIL: '📞',
            LINE: '📞',
        };

        const outcomeLabels: Record<string, string> = {
            CONTACTED: '✅ ติดต่อได้',
            PROMISED: '✅ สัญญาชำระ',
            EXTENSION: '🕐 ขอผ่อนผัน',
            UNREACHABLE: '❌ ติดต่อไม่ได้',
            PAID: '💰 ชำระแล้ว',
        };

        const items = contactLogs.map((log, index) => {
            const date = new Date(log.contactDate).toLocaleDateString('th-TH', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            return {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: `${contactTypeLabels[log.contactType]} ${date}`, size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                            { type: 'text', text: outcomeLabels[log.outcome], size: 'xs', color: COLORS.TEXT_PRIMARY, align: 'end', flex: 1 },
                        ],
                    },
                    ...(log.notes ? [{
                        type: 'text',
                        text: log.notes.length > 50 ? log.notes.substring(0, 50) + '...' : log.notes,
                        size: 'xs',
                        color: COLORS.TEXT_LIGHT,
                        margin: 'xs',
                        wrap: true,
                    }] : []),
                    ...(log.nextFollowUpDate ? [{
                        type: 'text',
                        text: `นัดติดตาม: ${new Date(log.nextFollowUpDate).toLocaleDateString('th-TH')}`,
                        size: 'xs',
                        color: COLORS.PRIMARY,
                        margin: 'xs',
                    }] : []),
                ],
                margin: index > 0 ? 'lg' : 'none',
                paddingBottom: '10px',
                borderWidth: '0px',
                borderColor: '#E0E0E0',
            };
        });

        return [
            {
                type: 'flex',
                altText: `ประวัติการติดต่อ - ${customerName}`,
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📋 ประวัติการติดต่อ', weight: 'bold', size: 'lg' },
                            { type: 'text', text: customerName, size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'sm' },
                        ],
                        paddingAll: '15px',
                        backgroundColor: '#F5F5F5',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: items,
                        paddingAll: '15px',
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: `แสดง ${contactLogs.length} รายการล่าสุด`, size: 'xs', color: COLORS.TEXT_LIGHT, align: 'center' },
                        ],
                        paddingAll: '10px',
                    },
                },
            },
        ];
    }

    /**
     * Create contact message
     */
    static createContactMessage(): any[] {
        return [
            {
                type: 'flex',
                altText: 'ติดต่อทีมงาน',
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📞 ติดต่อทีมงาน', weight: 'bold', size: 'lg', color: COLORS.PRIMARY },
                            { type: 'text', text: 'ข้อมูลติดต่อทีมงาน:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'lg' },
                            { type: 'text', text: 'ฝ่ายสนับสนุน', size: 'md', weight: 'bold', margin: 'sm' },
                            { type: 'text', text: 'โทร: 02-xxx-xxxx', size: 'sm', color: COLORS.PRIMARY, margin: 'sm' },
                            { type: 'separator', margin: 'lg' },
                            { type: 'text', text: 'สามารถติดต่อได้ตลอด 24 ชั่วโมง', size: 'xs', color: COLORS.TEXT_LIGHT, margin: 'lg', wrap: true, align: 'center' },
                        ],
                        paddingAll: '20px',
                    },
                },
            },
        ];
    }
}

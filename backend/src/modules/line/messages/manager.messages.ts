/**
 * Manager (MANAGER) LINE Messages
 * K-Bank Theme: Clean, Minimal, Professional
 */

import { DatabaseQueryService } from '@core-services/services/database-query.service';
import { prisma } from '@config/database.config';
import { COLORS } from './theme';

export class ManagerMessages {
    private static dbQueryService = new DatabaseQueryService();

    /**
     * Create manager menu message
     */
    static createMenuMessage(): any[] {
        const commandList = [
            '📊 Dashboard & KPI',
            '  พิมพ์: สรุป, kpi',
            '',
            '📋 สินเชื่อรออนุมัติ',
            '  พิมพ์: อนุมัติ, approval',
            '',
            '⚠️ NPL & High-risk',
            '  พิมพ์: npl, หนี้เสีย',
            '',
            '📞 ติดต่อทีมงาน',
            '  พิมพ์: ติดต่อ, contact',
        ];

        const quickActions = [
            {
                type: 'button',
                action: { type: 'postback', label: '📊 Dashboard', data: 'action=dashboard' },
                style: 'primary',
                color: COLORS.PRIMARY,
            },
            {
                type: 'button',
                action: { type: 'postback', label: '📋 อนุมัติ', data: 'action=approvals' },
                style: 'primary',
                color: COLORS.PRIMARY,
                margin: 'sm',
            },
            {
                type: 'button',
                action: { type: 'postback', label: '⚠️ NPL', data: 'action=npl' },
                style: 'secondary',
                margin: 'sm',
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
                            { type: 'text', text: 'ผู้จัดการสาขา', size: 'sm', color: '#FFFFFF', margin: 'sm' },
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
     * Create manager dashboard message
     */
    static async createDashboardMessage(userId: string): Promise<any[]> {
        if (!userId) {
            return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { branchId: true },
            });

            if (!user || !user.branchId) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลสาขาของคุณ กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            const stats = await this.dbQueryService.getBranchManagerStats(user.branchId);

            const formatCurrency = (amount: number) => {
                return `💰${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            };

            const formatPercent = (value: number) => {
                return `${value.toFixed(2)}%`;
            };

            const items = [
                { label: 'สินเชื่อในสาขา', value: `${stats.totalLoans} รายการ` },
                { label: 'ยอดเบิกจ่ายรวม', value: formatCurrency(stats.totalDisbursement) },
                { label: 'ยอดคงเหลือรวม', value: formatCurrency(stats.outstandingBalance) },
                { label: 'Collection Rate', value: formatPercent(stats.collectionRate) },
                { label: 'NPL Ratio', value: formatPercent(stats.nplRatio) },
                { label: 'NPL Count', value: `${stats.nplCount} รายการ` },
                { label: 'รออนุมัติ', value: `${stats.pendingApprovals} รายการ` },
                { label: 'ลูกค้าใช้งาน', value: `${stats.activeCustomers} ราย` },
            ];

            const contents = items.map((item, index) => ({
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'text', text: item.label, size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                    { type: 'text', text: item.value, size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, align: 'end', flex: 1 },
                ],
                margin: index > 0 ? 'md' : 'none',
            }));

            return [
                {
                    type: 'flex',
                    altText: '📊 Dashboard Manager',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📊 Dashboard Manager', weight: 'bold', size: 'lg', color: '#FFFFFF' },
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
            console.error('Error creating manager dashboard message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }

    /**
     * Create KPI Dashboard message
     */
    static createKPIDashboardMessage(kpis: {
        branchName: string;
        period: { start: Date; end: Date };
        totalLoans: number;
        totalDisbursement: number;
        outstandingBalance: number;
        collectionRate: number;
        nplRatio: number;
        nplCount: number;
        activeCustomers: number;
        newLoansThisMonth: number;
        comparison: {
            previousDay: { totalLoans: number; disbursement: number };
            previousMonth: { totalLoans: number; disbursement: number; collectionRate: number; nplRatio: number };
        };
        alerts: Array<{ type: string; severity: string; message: string }>;
    }): any {
        const formatCurrency = (amount: number) => {
            return `💰${(amount / 1000000).toFixed(2)}M`;
        };

        const formatPercent = (value: number) => {
            return `${value.toFixed(2)}%`;
        };

        const getAlertColor = (severity: string) => {
            return severity === 'HIGH' ? COLORS.DANGER : severity === 'MEDIUM' ? COLORS.WARNING : COLORS.PRIMARY;
        };

        const alertItems = kpis.alerts.slice(0, 3).map((alert: any, index: number) => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'text',
                    text: alert.message,
                    size: 'xs',
                    color: getAlertColor(alert.severity),
                    wrap: true,
                    flex: 1,
                },
            ],
            margin: index > 0 ? 'sm' : 'none',
            paddingAll: '8px',
            backgroundColor: '#FFF9F0',
            cornerRadius: '5px',
        }));

        return {
            type: 'flex',
            altText: `KPI Dashboard - ${kpis.branchName}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '📊 KPI Dashboard',
                            weight: 'bold',
                            size: 'xl',
                            color: '#FFFFFF',
                        },
                        {
                            type: 'text',
                            text: kpis.branchName,
                            size: 'sm',
                            color: '#FFFFFF',
                            margin: 'sm',
                        },
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
                            text: '📊 สรุปภาพรวม',
                            weight: 'bold',
                            size: 'sm',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                { type: 'text', text: 'สินเชื่อทั้งหมด:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 0 },
                                { type: 'text', text: `${kpis.totalLoans} รายการ`, size: 'sm', weight: 'bold', align: 'end' },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                { type: 'text', text: 'ยอดเบิกจ่าย:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 0 },
                                { type: 'text', text: formatCurrency(kpis.totalDisbursement), size: 'sm', weight: 'bold', align: 'end' , color: COLORS.PRIMARY},
                            ],
                            margin: 'xs',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                { type: 'text', text: 'ยอดคงเหลือ:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 0 },
                                { type: 'text', text: formatCurrency(kpis.outstandingBalance), size: 'sm', weight: 'bold', align: 'end' , color: COLORS.PRIMARY},
                            ],
                            margin: 'xs',
                        },
                        { type: 'separator', margin: 'lg' },
                        {
                            type: 'text',
                            text: '📊 ประสิทธิภาพ',
                            weight: 'bold',
                            size: 'sm',
                            margin: 'lg',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                { type: 'text', text: 'Collection Rate:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 0 },
                                { type: 'text', text: formatPercent(kpis.collectionRate), size: 'sm', weight: 'bold', color: COLORS.PRIMARY, align: 'end' },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                { type: 'text', text: 'NPL Ratio:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 0 },
                                { type: 'text', text: formatPercent(kpis.nplRatio), size: 'sm', weight: 'bold', color: kpis.nplRatio > 5 ? COLORS.DANGER : COLORS.PRIMARY, align: 'end' },
                            ],
                            margin: 'xs',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                { type: 'text', text: 'NPL Count:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 0 },
                                { type: 'text', text: `${kpis.nplCount} รายการ`, size: 'sm', weight: 'bold', align: 'end' },
                            ],
                            margin: 'xs',
                        },
                        ...(kpis.alerts.length > 0 ? [
                            { type: 'separator', margin: 'lg' },
                            {
                                type: 'text',
                                text: '⚠️ แจ้งเตือน',
                                weight: 'bold',
                                size: 'sm',
                                margin: 'lg',
                            },
                            ...alertItems,
                        ] : []),
                    ],
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `อัพเดท: ${new Date().toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
                            size: 'xs',
                            color: COLORS.TEXT_LIGHT,
                            align: 'center',
                        },
                    ],
                    paddingAll: '10px',
                },
            },
        };
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

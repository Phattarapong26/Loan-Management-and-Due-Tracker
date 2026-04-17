/**
 * Admin (ADMIN) LINE Messages
 * K-Bank Theme: Clean, Minimal, Professional
 */

import { DatabaseQueryService } from '@core-services/services/database-query.service';
import { COLORS } from './theme';

export class AdminMessages {
    private static dbQueryService = new DatabaseQueryService();

    /**
     * Create admin menu message
     */
    static createMenuMessage(): any[] {
        const commandList = [
            '📊 Dashboard Admin',
            '  พิมพ์: สรุป, dashboard',
            '',
            '⚙️ สถานะระบบ',
            '  พิมพ์: ระบบ, system',
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
                action: { type: 'postback', label: '⚙️ สถานะระบบ', data: 'action=system_status' },
                style: 'primary',
                color: COLORS.PRIMARY,
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
                            { type: 'text', text: 'ผู้ดูแลระบบ', size: 'sm', color: '#FFFFFF', margin: 'sm' },
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
     * Create admin dashboard message
     */
    static async createDashboardMessage(userId: string): Promise<any[]> {
        if (!userId) {
            return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
        }

        try {
            const stats = await this.dbQueryService.getAdminStats();

            const formatCurrency = (amount: number) => {
                return `💰${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            };

            const formatPercent = (value: number) => {
                return `${value.toFixed(2)}%`;
            };

            const items = [
                { label: 'สถานะระบบ', value: stats.systemHealth === 'healthy' ? '✅ ปกติ' : stats.systemHealth === 'warning' ? '⚠️ เฝ้าระวัง' : '❌ วิกฤต' },
                { label: 'ผู้ใช้งานวันนี้', value: `${stats.activeUsers} ราย` },
                { label: 'สินเชื่อทั้งหมด', value: `${stats.totalLoans} รายการ` },
                { label: 'ยอดเบิกจ่ายรวม', value: formatCurrency(stats.totalDisbursement) },
                { label: 'ยอดคงเหลือรวม', value: formatCurrency(stats.outstandingBalance) },
                { label: 'NPL Ratio', value: formatPercent(stats.nplRatio) },
                { label: 'Error Rate', value: formatPercent(stats.errorRate) },
                { label: 'API Response Time', value: `${stats.apiResponseTime} ms` },
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
                    altText: '📊 Dashboard Admin',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📊 Dashboard Admin', weight: 'bold', size: 'lg', color: '#FFFFFF' },
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
            console.error('Error creating admin dashboard message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }

    /**
     * Create contact message
     */
    static createContactMessage(): any[] {
        const supportPhone = process.env.SUPPORT_PHONE || '02-123-4567';
        const supportEmail = process.env.SUPPORT_EMAIL || 'support@smebank.com';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@smebank.com';
        const securityEmail = process.env.SECURITY_EMAIL || 'security@smebank.com';
        
        return [
            {
                type: 'flex',
                altText: 'ติดต่อทีมงาน',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📞 ติดต่อทีมงาน', weight: 'bold', size: 'xl', color: '#FFFFFF' },
                            { type: 'text', text: 'ช่องทางติดต่อสำหรับผู้ดูแลระบบ', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '20px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            // ฝ่ายสนับสนุนเทคนิค
                            { type: 'text', text: '🛠️ ฝ่ายสนับสนุนเทคนิค', size: 'md', weight: 'bold', color: COLORS.PRIMARY, margin: 'none' },
                            { type: 'text', text: `โทร: ${supportPhone}`, size: 'sm', color: COLORS.TEXT_PRIMARY, margin: 'sm' },
                            { type: 'text', text: `อีเมล: ${supportEmail}`, size: 'sm', color: COLORS.TEXT_PRIMARY, margin: 'xs' },
                            { type: 'text', text: '⏰ 24/7 ตลอดเวลา', size: 'xs', color: COLORS.SUCCESS, margin: 'xs' },
                            
                            { type: 'separator', margin: 'lg' },
                            
                            // ฝ่ายบริหารระบบ
                            { type: 'text', text: '⚙️ ฝ่ายบริหารระบบ', size: 'md', weight: 'bold', color: COLORS.PRIMARY, margin: 'md' },
                            { type: 'text', text: `โทร: ${supportPhone} ต่อ 101`, size: 'sm', color: COLORS.TEXT_PRIMARY, margin: 'sm' },
                            { type: 'text', text: `อีเมล: ${adminEmail}`, size: 'sm', color: COLORS.TEXT_PRIMARY, margin: 'xs' },
                            { type: 'text', text: '⏰ จ-ศ 08:00-18:00', size: 'xs', color: COLORS.TEXT_SECONDARY, margin: 'xs' },
                            
                            { type: 'separator', margin: 'lg' },
                            
                            // ฝ่ายรักษาความปลอดภัย
                            { type: 'text', text: '🔒 ฝ่ายรักษาความปลอดภัย', size: 'md', weight: 'bold', color: COLORS.DANGER, margin: 'md' },
                            { type: 'text', text: `โทร: ${supportPhone} ต่อ 911`, size: 'sm', color: COLORS.TEXT_PRIMARY, margin: 'sm' },
                            { type: 'text', text: `อีเมล: ${securityEmail}`, size: 'sm', color: COLORS.TEXT_PRIMARY, margin: 'xs' },
                            { type: 'text', text: '🚨 24/7 ฉุกเฉิน', size: 'xs', color: COLORS.DANGER, margin: 'xs' },
                        ],
                        paddingAll: '20px',
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'button',
                                        action: { type: 'uri', label: '📞 โทรด่วน', uri: `tel:${supportPhone.replace(/-/g, '')}` },
                                        style: 'primary',
                                        color: COLORS.PRIMARY,
                                        flex: 1,
                                    },
                                    {
                                        type: 'button',
                                        action: { type: 'uri', label: '📧 อีเมล', uri: `mailto:${supportEmail}` },
                                        style: 'secondary',
                                        flex: 1,
                                        margin: 'sm',
                                    },
                                ],
                            },
                            {
                                type: 'text',
                                text: '💡 สำหรับเหตุฉุกเฉินด้านความปลอดภัย กรุณาโทร ต่อ 911',
                                size: 'xs',
                                color: COLORS.TEXT_LIGHT,
                                margin: 'lg',
                                wrap: true,
                                align: 'center',
                            },
                        ],
                        paddingAll: '15px',
                    },
                },
            },
        ];
    }
}

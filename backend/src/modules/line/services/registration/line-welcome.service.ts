import { LineService } from '@line/services/core/line.service';
import { logger } from '@utils/common/logger.util';
import { COLORS } from '@line/messages/theme';

/**
 * LINE Welcome Service
 * Send beautiful welcome messages after successful registration
 */
export class LineWelcomeService {
    private lineService: LineService;

    constructor() {
        this.lineService = new LineService();
    }

    /**
     * Send welcome message based on user role
     */
    async sendWelcomeMessage(
        lineUserId: string,
        user: {
            firstName: string;
            lastName: string;
            role: string;
            email: string;
        }
    ): Promise<boolean> {
        try {
            const messages = this.createWelcomeMessage(user);
            const success = await this.lineService.pushMessage(lineUserId, messages);

            if (success) {
                logger.info(
                    { lineUserId, userId: user.email, role: user.role },
                    'Welcome message sent successfully'
                );
            } else {
                logger.error(
                    { lineUserId, userId: user.email },
                    'Failed to send welcome message'
                );
            }

            return success;
        } catch (error) {
            logger.error({ error, lineUserId }, 'Error sending welcome message');
            return false;
        }
    }

    /**
     * Create welcome message based on role
     */
    private createWelcomeMessage(user: {
        firstName: string;
        lastName: string;
        role: string;
        email: string;
    }): any[] {
        const fullName = `${user.firstName} ${user.lastName}`;

        switch (user.role) {
            case 'ADMIN':
                return this.createAdminWelcome(fullName);
            case 'MANAGER':
                return this.createManagerWelcome(fullName);
            case 'OFFICER':
                return this.createOfficerWelcome(fullName);
            case 'USER':
                return this.createCustomerWelcome(fullName);
            default:
                return this.createDefaultWelcome(fullName, user.role);
        }
    }

    /**
     * Admin welcome message
     */
    private createAdminWelcome(name: string): any[] {
        return [
            {
                type: 'flex',
                altText: `ยินดีต้อนรับ ${name}`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '👑',
                                        size: 'xxl',
                                        flex: 0,
                                    },
                                    {
                                        type: 'text',
                                        text: 'ผู้ดูแลระบบ',
                                        weight: 'bold',
                                        size: 'xl',
                                        color: '#FFFFFF',
                                        margin: 'md',
                                    },
                                ],
                            },
                        ],
                        backgroundColor: '#1E40AF',
                        paddingAll: '20px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '✅ เชื่อมต่อบัญชีสำเร็จ!',
                                weight: 'bold',
                                size: 'lg',
                                color: COLORS.SUCCESS,
                                margin: 'none',
                            },
                            {
                                type: 'text',
                                text: `สวัสดี คุณ${name}`,
                                size: 'md',
                                color: COLORS.TEXT_PRIMARY,
                                margin: 'md',
                                wrap: true,
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🎯 คุณสามารถใช้งานได้:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: '• ดูรายงานระบบทั้งหมด\n• จัดการผู้ใช้และสิทธิ์\n• ตั้งค่าระบบ\n• ดูสถิติและ Analytics\n• รับการแจ้งเตือนสำคัญ',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                        wrap: true,
                                    },
                                ],
                                margin: 'lg',
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '💡 เริ่มต้นใช้งาน:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: 'พิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                    },
                                ],
                                margin: 'lg',
                            },
                        ],
                        paddingAll: '20px',
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'message',
                                    label: '📊 ดูเมนู',
                                    text: 'เมนู',
                                },
                                style: 'primary',
                                color: '#1E40AF',
                            },
                        ],
                        paddingAll: '15px',
                    },
                },
            },
        ];
    }

    /**
     * Manager welcome message
     */
    private createManagerWelcome(name: string): any[] {
        return [
            {
                type: 'flex',
                altText: `ยินดีต้อนรับ ${name}`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '👔',
                                        size: 'xxl',
                                        flex: 0,
                                    },
                                    {
                                        type: 'text',
                                        text: 'ผู้จัดการ',
                                        weight: 'bold',
                                        size: 'xl',
                                        color: '#FFFFFF',
                                        margin: 'md',
                                    },
                                ],
                            },
                        ],
                        backgroundColor: '#7C3AED',
                        paddingAll: '20px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '✅ เชื่อมต่อบัญชีสำเร็จ!',
                                weight: 'bold',
                                size: 'lg',
                                color: COLORS.SUCCESS,
                                margin: 'none',
                            },
                            {
                                type: 'text',
                                text: `สวัสดี คุณ${name}`,
                                size: 'md',
                                color: COLORS.TEXT_PRIMARY,
                                margin: 'md',
                                wrap: true,
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🎯 คุณสามารถใช้งานได้:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: '• อนุมัติ/ปฏิเสธสินเชื่อ\n• ดูรายงานสาขา\n• ติดตามงานเจ้าหน้าที่\n• ดู Dashboard สรุป\n• รับการแจ้งเตือนรออนุมัติ',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                        wrap: true,
                                    },
                                ],
                                margin: 'lg',
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⚡ คำสั่งด่วน:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: '• พิมพ์ "อนุมัติ" - ดูรายการรออนุมัติ\n• พิมพ์ "รายงาน" - ดูรายงานสรุป\n• พิมพ์ "เมนู" - ดูคำสั่งทั้งหมด',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                        wrap: true,
                                    },
                                ],
                                margin: 'lg',
                            },
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
                                        action: {
                                            type: 'message',
                                            label: '✅ อนุมัติ',
                                            text: 'อนุมัติ',
                                        },
                                        style: 'primary',
                                        color: '#7C3AED',
                                        flex: 1,
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'message',
                                            label: '📊 รายงาน',
                                            text: 'รายงาน',
                                        },
                                        style: 'secondary',
                                        flex: 1,
                                    },
                                ],
                                spacing: 'sm',
                            },
                        ],
                        paddingAll: '15px',
                    },
                },
            },
        ];
    }

    /**
     * Officer welcome message
     */
    private createOfficerWelcome(name: string): any[] {
        return [
            {
                type: 'flex',
                altText: `ยินดีต้อนรับ ${name}`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '💼',
                                        size: 'xxl',
                                        flex: 0,
                                    },
                                    {
                                        type: 'text',
                                        text: 'เจ้าหน้าที่',
                                        weight: 'bold',
                                        size: 'xl',
                                        color: '#FFFFFF',
                                        margin: 'md',
                                    },
                                ],
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
                                text: '✅ เชื่อมต่อบัญชีสำเร็จ!',
                                weight: 'bold',
                                size: 'lg',
                                color: COLORS.SUCCESS,
                                margin: 'none',
                            },
                            {
                                type: 'text',
                                text: `สวัสดี คุณ${name}`,
                                size: 'md',
                                color: COLORS.TEXT_PRIMARY,
                                margin: 'md',
                                wrap: true,
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🎯 คุณสามารถใช้งานได้:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: '• ดูงานที่ต้องทำวันนี้\n• บันทึกการติดต่อลูกค้า\n• ดูรายการเก็บเงิน\n• สร้างคำขอสินเชื่อ\n• รับการแจ้งเตือนงาน',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                        wrap: true,
                                    },
                                ],
                                margin: 'lg',
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⚡ คำสั่งด่วน:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: '• พิมพ์ "งาน" - ดูงานวันนี้\n• พิมพ์ "เก็บเงิน" - รายการเก็บเงิน\n• พิมพ์ "เมนู" - ดูคำสั่งทั้งหมด',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                        wrap: true,
                                    },
                                ],
                                margin: 'lg',
                            },
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
                                        action: {
                                            type: 'message',
                                            label: '📋 งานวันนี้',
                                            text: 'งาน',
                                        },
                                        style: 'primary',
                                        color: COLORS.PRIMARY,
                                        flex: 1,
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'message',
                                            label: '💰 เก็บเงิน',
                                            text: 'เก็บเงิน',
                                        },
                                        style: 'secondary',
                                        flex: 1,
                                    },
                                ],
                                spacing: 'sm',
                            },
                        ],
                        paddingAll: '15px',
                    },
                },
            },
        ];
    }

    /**
     * Customer welcome message
     */
    private createCustomerWelcome(name: string): any[] {
        return [
            {
                type: 'flex',
                altText: `ยินดีต้อนรับ ${name}`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🎉',
                                        size: 'xxl',
                                        flex: 0,
                                    },
                                    {
                                        type: 'text',
                                        text: 'ยินดีต้อนรับ!',
                                        weight: 'bold',
                                        size: 'xl',
                                        color: '#FFFFFF',
                                        margin: 'md',
                                    },
                                ],
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
                                text: '✅ เชื่อมต่อบัญชีสำเร็จ!',
                                weight: 'bold',
                                size: 'lg',
                                color: COLORS.SUCCESS,
                                margin: 'none',
                            },
                            {
                                type: 'text',
                                text: `สวัสดี คุณ${name}`,
                                size: 'md',
                                color: COLORS.TEXT_PRIMARY,
                                margin: 'md',
                                wrap: true,
                            },
                            {
                                type: 'text',
                                text: 'ขอบคุณที่ไว้วางใจใช้บริการของเรา',
                                size: 'sm',
                                color: COLORS.TEXT_LIGHT,
                                margin: 'sm',
                                wrap: true,
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🎯 คุณสามารถใช้งานได้:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: '• ตรวจสอบยอดคงเหลือ\n• ดูกำหนดชำระ\n• ดูประวัติการชำระเงิน\n• ดาวน์โหลดใบแจ้งหนี้\n• รับการแจ้งเตือนอัตโนมัติ',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                        wrap: true,
                                    },
                                ],
                                margin: 'lg',
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⚡ คำสั่งด่วน:',
                                        weight: 'bold',
                                        size: 'sm',
                                        color: COLORS.TEXT_PRIMARY,
                                    },
                                    {
                                        type: 'text',
                                        text: '• พิมพ์ "ยอด" - ดูยอดคงเหลือ\n• พิมพ์ "กำหนด" - ดูกำหนดชำระ\n• พิมพ์ "เมนู" - ดูคำสั่งทั้งหมด',
                                        size: 'xs',
                                        color: COLORS.TEXT_LIGHT,
                                        margin: 'sm',
                                        wrap: true,
                                    },
                                ],
                                margin: 'lg',
                            },
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
                                        action: {
                                            type: 'message',
                                            label: '💰 ยอดคงเหลือ',
                                            text: 'ยอด',
                                        },
                                        style: 'primary',
                                        color: COLORS.PRIMARY,
                                        flex: 1,
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'message',
                                            label: '📅 กำหนดชำระ',
                                            text: 'กำหนด',
                                        },
                                        style: 'secondary',
                                        flex: 1,
                                    },
                                ],
                                spacing: 'sm',
                            },
                        ],
                        paddingAll: '15px',
                    },
                },
            },
        ];
    }

    /**
     * Default welcome message (fallback)
     */
    private createDefaultWelcome(name: string, role: string): any[] {
        return [
            {
                type: 'text',
                text: `✅ เชื่อมต่อบัญชีสำเร็จ!\n\nสวัสดี คุณ${name}\nบทบาท: ${role}\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้`,
            },
        ];
    }
}

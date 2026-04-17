/**
 * Common LINE Messages
 * Shared messages across all roles
 * K-Bank Theme: Clean, Minimal, Professional
 */

import { COLORS } from './theme';

export class CommonMessages {
    /**
     * Create registration message with User ID
     */
    static createRegistrationMessage(userId: string): any[] {
        return [
            {
                type: 'flex',
                altText: 'ลงทะเบียนสำเร็จ',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '✅ ลงทะเบียนสำเร็จ', weight: 'bold', size: 'lg', color: COLORS.PRIMARY },
                        ],
                        backgroundColor: COLORS.LIGHT_BG,
                        paddingAll: '15px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'LINE User ID ของคุณคือ:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY },
                            { type: 'text', text: userId, size: 'xs', color: COLORS.TEXT_PRIMARY, margin: 'sm', wrap: true },
                            { type: 'separator', margin: 'lg' },
                            { type: 'text', text: '📋 คัดลอก ID นี้ไปใส่ในหน้าลงทะเบียนของระบบ', weight: 'bold', size: 'xs', color: COLORS.TEXT_LIGHT, margin: 'lg', wrap: true },
                        ],
                        paddingAll: '15px',
                    },
                },
            },
        ];
    }

    /**
     * Create welcome message
     */
    static createWelcomeMessage(): any[] {
        return [
            {
                type: 'flex',
                altText: 'ยินดีต้อนรับ',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '✅ ยินดีต้อนรับ', weight: 'bold', size: 'xl', color: COLORS.PRIMARY },
                        ],
                        backgroundColor: '#F5F5F5',
                        paddingAll: '15px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน!', size: 'md', wrap: true },
                            { type: 'text', text: 'คุณสามารถใช้บริการดังนี้:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'md', wrap: true },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '📊 ดูยอดคงเหลือ', weight: 'bold', size: 'sm', margin: 'sm' },
                                    { type: 'text', text: '🕐 ดูกำหนดชำระ', weight: 'bold', size: 'sm', margin: 'sm' },
                                    { type: 'text', text: '📋 ประวัติการชำระ', weight: 'bold', size: 'sm', margin: 'sm' },
                                    { type: 'text', text: '📞 ติดต่อเจ้าหน้าที่', weight: 'bold', size: 'sm', margin: 'sm' },
                                ],
                                margin: 'lg',
                            },
                        ],
                        paddingAll: '15px',
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'พิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด', size: 'xs', color: COLORS.TEXT_LIGHT, align: 'center' },
                        ],
                        paddingAll: '10px',
                    },
                },
            },
        ];
    }

    /**
     * Create payment reminder message
     */
    static createPaymentReminderMessage(reminder: {
        loanNumber: string;
        dueDate: Date;
        amount: number;
        principal: number;
        interest: number;
        fees: number;
        daysUntilDue: number;
        isOverdue: boolean;
        daysOverdue: number;
    }): any {
        const isOverdue = reminder.isOverdue;
        const urgencyColor = isOverdue ? COLORS.DANGER : reminder.daysUntilDue === 1 ? COLORS.WARNING : COLORS.PRIMARY;
        const urgencyText = isOverdue
            ? `⚠️ เกินกำหนด ${reminder.daysOverdue} วัน`
            : reminder.daysUntilDue === 1
                ? '🕐 ครบกำหนดพรุ่งนี้'
                : `🕐 ครบกำหนดใน ${reminder.daysUntilDue} วัน`;

        return {
            type: 'flex',
            altText: `แจ้งเตือนชำระเงิน - ${reminder.loanNumber}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: isOverdue ? '⚠️ แจ้งเตือนค้างชำระ' : '💰 แจ้งเตือนชำระเงิน',
                            weight: 'bold',
                            size: 'lg',
                            color: '#FFFFFF',
                        },
                        {
                            type: 'text',
                            text: urgencyText,
                            size: 'sm',
                            color: '#FFFFFF',
                            margin: 'sm',
                        },
                    ],
                    backgroundColor: urgencyColor,
                    paddingAll: '20px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `เลขที่สินเชื่อ: ${reminder.loanNumber}`,
                            size: 'sm',
                            color: COLORS.TEXT_SECONDARY,
                            margin: 'md',
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
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'วันครบกำหนด:',
                                            size: 'sm',
                                            color: COLORS.TEXT_SECONDARY,
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: new Date(reminder.dueDate).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            }),
                                            size: 'sm',
                                            weight: 'bold',
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'separator',
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'เงินต้น:',
                                            size: 'sm',
                                            color: COLORS.TEXT_SECONDARY,
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: `${reminder.principal.toLocaleString('th-TH')} บาท`,
                                            size: 'sm',
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ดอกเบี้ย:',
                                            size: 'sm',
                                            color: COLORS.TEXT_SECONDARY,
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: `${reminder.interest.toLocaleString('th-TH')} บาท`,
                                            size: 'sm',
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'xs',
                                },
                                ...(reminder.fees > 0 ? [{
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ค่าธรรมเนียม:',
                                            size: 'sm',
                                            color: COLORS.TEXT_SECONDARY,
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: `${reminder.fees.toLocaleString('th-TH')} บาท`,
                                            size: 'sm',
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'xs',
                                }] : []),
                                {
                                    type: 'separator',
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'รวมทั้งสิ้น:',
                                            size: 'md',
                                            color: '#000000',
                                            weight: 'bold',
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: `${reminder.amount.toLocaleString('th-TH')} บาท`,
                                            size: 'md',
                                            weight: 'bold',
                                            color: urgencyColor,
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'md',
                                },
                            ],
                        },
                        {
                            type: 'separator',
                            margin: 'lg',
                        },
                        {
                            type: 'text',
                            text: '📊 ช่องทางการชำระเงิน',
                            size: 'sm',
                            weight: 'bold',
                            margin: 'lg',
                        },
                        {
                            type: 'text',
                            text: '• พร้อมเพย์ (PromptPay)\n• โอนเงินผ่านธนาคาร\n• ชำระที่เคาน์เตอร์สาขา',
                            size: 'xs',
                            color: COLORS.TEXT_SECONDARY,
                            wrap: true,
                            margin: 'sm',
                        },
                        {
                            type: 'text',
                            text: '💡 พิมพ์ "ชำระเงิน" เพื่อดูรายละเอียดการชำระ',
                            size: 'xs',
                            color: COLORS.PRIMARY,
                            wrap: true,
                            margin: 'md',
                            align: 'center',
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
                                type: 'postback',
                                label: '📊 ดูวิธีชำระเงิน',
                                data: `action=payment_options&loanNumber=${reminder.loanNumber}`,
                            },
                            style: 'primary',
                            color: urgencyColor,
                        },
                    ],
                    paddingAll: '15px',
                },
            },
        };
    }

    /**
     * Create payment confirmation message
     */
    static createPaymentConfirmationMessage(data: {
        amount: number;
        paymentDate: string;
        loanId: string;
        reference: string;
    }): any {
        return {
            type: 'flex',
            altText: `✅ ชำระเงินสำเร็จ - ${data.amount.toLocaleString('th-TH')} บาท`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '✅ ชำระเงินสำเร็จ',
                            weight: 'bold',
                            size: 'lg',
                            color: '#FFFFFF',
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
                            text: 'ขอบคุณที่ชำระเงินตรงเวลา',
                            size: 'md',
                            weight: 'bold',
                            margin: 'md',
                        },
                        {
                            type: 'separator',
                            margin: 'lg',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'จำนวนเงิน:',
                                    size: 'sm',
                                    color: COLORS.TEXT_SECONDARY,
                                    flex: 0,
                                },
                                {
                                    type: 'text',
                                    text: `${data.amount.toLocaleString('th-TH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })} บาท`,
                                    size: 'md',
                                    weight: 'bold',
                                    align: 'end',
                                    color: COLORS.PRIMARY,
                                },
                            ],
                            margin: 'lg',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'วันที่ชำระ:',
                                    size: 'sm',
                                    color: COLORS.TEXT_SECONDARY,
                                    flex: 0,
                                },
                                {
                                    type: 'text',
                                    text: new Date(data.paymentDate).toLocaleDateString('th-TH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    }),
                                    size: 'sm',
                                    align: 'end',
                                },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'เลขที่อ้างอิง:',
                                    size: 'sm',
                                    color: COLORS.TEXT_SECONDARY,
                                    flex: 0,
                                },
                                {
                                    type: 'text',
                                    text: data.reference,
                                    size: 'xs',
                                    align: 'end',
                                    wrap: true,
                                },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'separator',
                            margin: 'lg',
                        },
                        {
                            type: 'text',
                            text: '💡 ตรวจสอบยอดคงเหลือและตารางชำระได้ที่เมนูด้านล่าง',
                            size: 'xs',
                            color: COLORS.TEXT_LIGHT,
                            wrap: true,
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
                                type: 'postback',
                                label: '💰 ดูยอดคงเหลือ',
                                data: 'action=balance',
                            },
                            style: 'primary',
                            color: COLORS.PRIMARY,
                        },
                    ],
                    paddingAll: '15px',
                },
            },
        };
    }

    /**
     * Create simple text message
     */
    static createTextMessage(text: string): any {
        return {
            type: 'text',
            text: text,
        };
    }
}

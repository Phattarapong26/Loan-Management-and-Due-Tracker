/**
 * Customer (USER) LINE Messages
 * K-Bank Theme: Clean, Minimal, Professional
 */

import { DatabaseQueryService } from '@core-services/services/database-query.service';
import { prisma } from '@config/database.config';
import { env } from '@config/env.config';
import { OverpaymentLinkTokenService } from '@line/services/overpayment-link-token.service';
import { COLORS } from './theme';

export class CustomerMessages {
    private static dbQueryService = new DatabaseQueryService();

    private static async findUserWithCustomer(userIdOrLineUserId: string) {
        return prisma.user.findFirst({
            where: {
                OR: [
                    { id: userIdOrLineUserId },
                    { lineUserId: userIdOrLineUserId },
                ],
            },
            include: {
                customers: {
                    select: { id: true, businessName: true },
                    take: 1,
                },
            },
        });
    }

    /**
     * Create customer menu message
     */
    static createMenuMessage(): any[] {
        const commandList = [
            '💰 ยอดคงเหลือ',
            '  พิมพ์: ยอด, balance',
            '',
            '🕐 กำหนดชำระ',
            '  พิมพ์: กำหนด, due',
            '',
            '🧾 ใบแจ้งหนี้',
            '  พิมพ์: ใบแจ้งหนี้, invoice',
            '',
            '📋 ประวัติการชำระ',
            '  พิมพ์: ประวัติ, history',
            '',
            '� สัญญา',
            '  พิมพ์: สัญญา, contract',
        ];

        const quickActions = [
            {
                type: 'button',
                action: { type: 'postback', label: '💰 ยอดคงเหลือ', data: 'action=balance' },
                style: 'primary',
                color: COLORS.PRIMARY,
            },
            {
                type: 'button',
                action: { type: 'postback', label: '🕐 กำหนดชำระ', data: 'action=next_due' },
                style: 'primary',
                color: COLORS.PRIMARY,
                margin: 'sm',
            },
            {
                type: 'button',
                action: { type: 'postback', label: '🧾 ใบแจ้งหนี้', data: 'action=invoices' },
                style: 'primary',
                color: COLORS.PRIMARY,
                margin: 'sm',
            },
            {
                type: 'button',
                action: { type: 'postback', label: '📋 ประวัติ', data: 'action=history' },
                style: 'secondary',
                margin: 'sm',
            },
            {
                type: 'button',
                action: { type: 'postback', label: '📄 สัญญา', data: 'action=contracts' },
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
                            { type: 'text', text: 'ลูกค้า', size: 'sm', color: '#FFFFFF', margin: 'sm' },
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
     * Create balance message
     */
    static async createBalanceMessage(userId?: string): Promise<any[]> {
        if (!userId) {
            return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
        }

        try {
            // Get customer from LINE user ID
            const user = await this.findUserWithCustomer(userId);

            if (!user || !user.customers || user.customers.length === 0) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            const customer = user.customers?.[0];
            if (!customer) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            // Get loan balance using user.id (for dbQueryService compatibility)
            const balance = await this.dbQueryService.getLoanBalance(user.id);
            if (!balance) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลสินเชื่อของคุณ กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            const formatCurrency = (amount: number) => {
                return `💰${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            };

            const formatDate = (date: Date | null) => {
                if (!date) return 'ไม่ระบุ';
                return new Date(date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
            };

            return [
                {
                    type: 'flex',
                    altText: 'ยอดคงเหลือ',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '💰 ข้อมูลสินเชื่อ', weight: 'bold', size: 'lg', color: COLORS.PRIMARY },
                                { type: 'text', text: balance.customerName, size: 'xs', color: COLORS.TEXT_SECONDARY, margin: 'sm' },
                            ],
                            backgroundColor: COLORS.LIGHT_BG,
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
                                        { type: 'text', text: 'ยอดเงินต้น', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                                        { type: 'text', text: formatCurrency(balance.principal), size: 'sm', color: COLORS.PRIMARY, align: 'end', flex: 3 },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ดอกเบี้ยค้าง', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                                        { type: 'text', text: formatCurrency(balance.accruedInterest), size: 'sm', color: COLORS.PRIMARY, align: 'end', flex: 3 },
                                    ],
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ค่าธรรมเนียม', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                                        { type: 'text', text: formatCurrency(balance.fees), size: 'sm', color: COLORS.PRIMARY, align: 'end', flex: 3 },
                                    ],
                                    margin: 'md',
                                },
                                { type: 'separator', margin: 'lg' },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ยอดคงเหลือ', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2, weight: 'bold' },
                                        { type: 'text', text: formatCurrency(balance.outstandingBalance), size: 'lg', weight: 'bold', color: COLORS.PRIMARY, align: 'end', flex: 3 },
                                    ],
                                    margin: 'lg',
                                },
                                { type: 'separator', margin: 'lg' },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'งวดถัดไป', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                                        { type: 'text', text: formatDate(balance.nextPaymentDate), size: 'sm', color: COLORS.TEXT_PRIMARY, align: 'end', flex: 3 },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ยอดชำระ', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 2 },
                                        { type: 'text', text: balance.nextPaymentAmount ? formatCurrency(balance.nextPaymentAmount) : 'ไม่ระบุ', size: 'sm', weight: 'bold', color: COLORS.DANGER, align: 'end', flex: 3 },
                                    ],
                                    margin: 'md',
                                },
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { type: 'text', text: `สถานะ: ${balance.status}`, size: 'xs', color: COLORS.TEXT_LIGHT, align: 'center' },
                                    ],
                                    margin: 'lg',
                                },
                            ],
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        } catch (error) {
            console.error('Error creating balance message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }

    /**
     * Create next due message
     */
    static async createNextDueMessage(userId?: string): Promise<any[]> {
            if (!userId) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
            }

            try {
                // Get customer from LINE user ID
                const user = await this.findUserWithCustomer(userId);

                if (!user || !user.customers || user.customers.length === 0) {
                    return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
                }

                const customer = user.customers?.[0];
                if (!customer) {
                    return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
                }

                const customerId = customer.id;

                // Get all active loans with next payment
                const loans = await prisma.loan.findMany({
                    where: {
                        customerId,
                        status: { in: ['ACTIVE', 'DISBURSED', 'NPL', 'DEFAULTED'] },
                    },
                    include: {
                        paymentSchedule: {
                            where: { status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] } },
                            orderBy: { paymentDate: 'asc' },
                            take: 1,
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                });

                // Filter loans that actually have pending schedules
                const loansWithDue = loans.filter(l => l.paymentSchedule.length > 0);

                if (!loansWithDue || loansWithDue.length === 0) {
                    return [
                        {
                            type: 'flex',
                            altText: 'กำหนดชำระ',
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { type: 'text', text: '📅 กำหนดชำระ', weight: 'bold', size: 'xl', color: '#FFFFFF' },
                                    ],
                                    paddingAll: '20px',
                                    backgroundColor: COLORS.PRIMARY,
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { 
                                            type: 'text', 
                                            text: 'ไม่มีงวดค้างชำระในขณะนี้', 
                                            size: 'sm', 
                                            color: COLORS.TEXT_SECONDARY, 
                                            align: 'center',
                                            wrap: true,
                                        },
                                    ],
                                    paddingAll: '20px',
                                },
                            },
                        },
                    ];
                }

                const formatCurrency = (amount: number) => {
                    return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                };

                const formatDate = (date: Date) => {
                    return new Date(date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    });
                };

                const now = new Date();

                // Create carousel bubbles for each loan
                const bubbles = loansWithDue.map((loan) => {
                    const nextSchedule = loan.paymentSchedule[0];
                    const nextPaymentDate = nextSchedule ? new Date(nextSchedule.paymentDate) : null;
                    const nextPaymentAmount = nextSchedule ? Number(nextSchedule.totalPayment) : 0;
                    const daysUntilDue = nextPaymentDate 
                        ? Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        : 0;

                    const isOverdue = daysUntilDue < 0;
                    const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 3;

                    const statusColor = isOverdue ? COLORS.DANGER : isUrgent ? '#FF9800' : COLORS.SUCCESS;
                    const statusText = isOverdue 
                        ? `⚠️ เกินกำหนด ${Math.abs(daysUntilDue)} วัน`
                        : daysUntilDue === 0 
                        ? '⏰ ครบกำหนดวันนี้'
                        : `📅 อีก ${daysUntilDue} วัน`;

                    const paymentScheduleId = nextSchedule?.id || '';

                    return {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '📅 กำหนดชำระงวดถัดไป',
                                    weight: 'bold',
                                    size: 'lg',
                                    color: '#FFFFFF',
                                },
                                {
                                    type: 'text',
                                    text: loan.contract_number || `สินเชื่อ ${loan.id.substring(0, 8)}`,
                                    size: 'xs',
                                    color: '#FFFFFF',
                                    margin: 'sm',
                                },
                            ],
                            paddingAll: '15px',
                            backgroundColor: statusColor,
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: statusText,
                                            size: 'md',
                                            weight: 'bold',
                                            color: statusColor,
                                            align: 'center',
                                        },
                                        {
                                            type: 'text',
                                            text: nextPaymentDate ? formatDate(nextPaymentDate) : '-',
                                            size: 'xl',
                                            weight: 'bold',
                                            color: COLORS.TEXT_PRIMARY,
                                            align: 'center',
                                            margin: 'sm',
                                        },
                                    ],
                                    margin: 'none',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ยอดที่ต้องชำระ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { 
                                            type: 'text', 
                                            text: `${formatCurrency(nextPaymentAmount)} บาท`, 
                                            size: 'lg', 
                                            weight: 'bold', 
                                            color: COLORS.PRIMARY, 
                                            flex: 2,
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ยอดคงเหลือ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                        { 
                                            type: 'text', 
                                            text: `${formatCurrency(Number(loan.outstandingBalance))} บาท`, 
                                            size: 'sm', 
                                            color: COLORS.TEXT_PRIMARY, 
                                            flex: 2,
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'md',
                                },
                            ],
                            paddingAll: '15px',
                        },
                        footer: paymentScheduleId ? {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📄 ขอใบแจ้งหนี้', size: 'xs', color: COLORS.TEXT_SECONDARY, align: 'center', weight: 'bold' },
                                { type: 'separator', margin: 'sm' },
                                {
                                    type: 'button',
                                    action: {
                                        type: 'postback',
                                        label: '📄 งวดนี้',
                                        data: `action=request_invoice&schedule_id=${paymentScheduleId}&customer_id=${customerId}`,
                                        displayText: 'ขอใบแจ้งหนี้งวดนี้',
                                    },
                                    style: 'primary', color: COLORS.PRIMARY, height: 'sm', margin: 'sm',
                                },
                                {
                                    type: 'button',
                                    action: {
                                        type: 'postback',
                                        label: '📅 ล่วงหน้า 1 งวด',
                                        data: `action=request_invoice_next&loan_id=${loan.id}&customer_id=${customerId}`,
                                        displayText: 'ขอใบแจ้งหนี้ล่วงหน้า',
                                    },
                                    style: 'secondary', height: 'sm', margin: 'xs',
                                },
                                {
                                    type: 'button',
                                    action: {
                                        type: 'postback',
                                        label: '📋 งวดค้างทั้งหมด',
                                        data: `action=request_overdue_invoices&loan_id=${loan.id}&customer_id=${customerId}`,
                                        displayText: 'ดูงวดค้างชำระ',
                                    },
                                    style: 'secondary', height: 'sm', margin: 'xs',
                                },
                            ],
                            paddingAll: '12px',
                        } : undefined,
                    };
                });

                return [
                    {
                        type: 'flex',
                        altText: `กำหนดชำระ (${loansWithDue.length} สินเชื่อ)`,
                        contents: {
                            type: 'carousel',
                            contents: bubbles,
                        },
                    },
                ];
            } catch (error) {
                console.error('Error creating next due message:', error);
                return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
            }
        }

    static async createContractsMessage(userId?: string): Promise<any[]> {
        if (!userId) {
            return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
        }

        try {
            const user = await this.findUserWithCustomer(userId);
            if (!user || !user.customers || user.customers.length === 0) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            const customer = user.customers?.[0];
            if (!customer) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            const loans = await prisma.loan.findMany({
                where: {
                    customerId: customer.id,
                },
                select: {
                    id: true,
                    contract_number: true,
                    principal: true,
                    status: true,
                    productConfig: true,
                },
                orderBy: {
                    createdAt: 'desc',
                } as any,
                take: 10,
            });

            if (!loans || loans.length === 0) {
                return [{ type: 'text', text: 'ยังไม่พบข้อมูลสัญญา/สินเชื่อของคุณ', weight: 'bold' }];
            }

            const formatCurrency = (amount: any) => {
                const value = Number(amount || 0);
                return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };

            const bubbles = loans.map((loan) => {
                const productConfig = loan.productConfig as any;
                const hasPdf = !!productConfig?.contractPdfUrl;
                return {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📄 สัญญาสินเชื่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: loan.contract_number || '-', size: 'xs', color: '#FFFFFF', margin: 'sm' },
                        ],
                        paddingAll: '15px',
                        backgroundColor: COLORS.PRIMARY,
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'วงเงิน:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                    { type: 'text', text: `${formatCurrency(loan.principal)} บาท`, size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2, align: 'end' },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'สถานะ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                    { type: 'text', text: String(loan.status || '-'), size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2, align: 'end' },
                                ],
                                margin: 'md',
                            },
                            {
                                type: 'text',
                                text: hasPdf ? '🔒 ต้องยืนยันตัวตนก่อนเปิดดู PDF' : '⚠️ ยังไม่มีไฟล์ PDF สัญญาในระบบ',
                                size: 'xs',
                                color: hasPdf ? COLORS.TEXT_LIGHT : COLORS.DANGER,
                                wrap: true,
                                margin: 'lg',
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
                                    label: '📄 ดูสัญญา',
                                    data: `action=contract&loan_id=${loan.id}&customer_id=${customer.id}`,
                                    displayText: 'ดูสัญญา',
                                },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                height: 'sm',
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'uri',
                                    label: '🧮 คำนวณการจ่ายเกิน',
                                    uri: (() => {
                                        const token = OverpaymentLinkTokenService.createToken(
                                            { loanId: loan.id, lineUserId: userId },
                                            7 * 24 * 60 * 60 * 1000
                                        );
                                        let apiBase = '';
                                        try {
                                            const backendUrl = env.BACKEND_URL || '';
                                            if (backendUrl) {
                                                const host = new URL(backendUrl).hostname;
                                                if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
                                                    apiBase = backendUrl;
                                                }
                                            }
                                        } catch {
                                            apiBase = '';
                                        }

                                        const rawFrontend = env.FRONTEND_URL || '';
                                        const safeUrl1 = rawFrontend.startsWith('http') ? rawFrontend : `https://${rawFrontend}`;
                                        return `${safeUrl1}/overpayment-calculator?t=${encodeURIComponent(token)}${
                                            apiBase ? `&apiBase=${encodeURIComponent(apiBase)}` : ''
                                        }`;
                                    })(),
                                },
                                style: 'secondary',
                                height: 'sm',
                                margin: 'sm',
                            },
                        ],
                        paddingAll: '12px',
                    },
                };
            });

            return [
                {
                    type: 'flex',
                    altText: `สัญญา (${loans.length} รายการ)`,
                    contents: {
                        type: 'carousel',
                        contents: bubbles,
                    },
                },
            ];
        } catch (error) {
            console.error('Error creating contracts message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }

    /**
     * Create payment history message
     */
    static async createHistoryMessage(userId?: string): Promise<any[]> {
            if (!userId) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
            }

            try {
                // Get customer from LINE user ID
                const user = await this.findUserWithCustomer(userId);

                if (!user || !user.customers || user.customers.length === 0) {
                    return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
                }

                const customer = user.customers?.[0];
                if (!customer) {
                    return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
                }

                const customerId = customer.id;

                // Get recent payments
                const payments = await prisma.payment.findMany({
                    where: {
                        loan: { customerId },
                    },
                    include: {
                        loan: {
                            select: {
                                contract_number: true,
                            },
                        },
                        paymentReceipts: {
                            select: {
                                id: true,
                                receiptNumber: true,
                            },
                            take: 1,
                        },
                    },
                    orderBy: { paymentDate: 'desc' },
                    take: 10,
                });

                if (!payments || payments.length === 0) {
                    return [
                        {
                            type: 'flex',
                            altText: 'ประวัติการชำระ',
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { type: 'text', text: '📋 ประวัติการชำระ', weight: 'bold', size: 'xl', color: '#FFFFFF' },
                                    ],
                                    paddingAll: '20px',
                                    backgroundColor: COLORS.PRIMARY,
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { 
                                            type: 'text', 
                                            text: 'ยังไม่มีประวัติการชำระเงิน', 
                                            size: 'sm', 
                                            color: COLORS.TEXT_SECONDARY, 
                                            align: 'center',
                                            wrap: true,
                                        },
                                    ],
                                    paddingAll: '20px',
                                },
                            },
                        },
                    ];
                }

                // Create secure document service
                const { SecureDocumentService } = await import('@documents/services/secure-document.service');
                const secureDocumentService = new SecureDocumentService();

                // Create carousel bubbles for each payment
                const bubbles = await Promise.all(
                    payments.slice(0, 10).map(async (payment) => {
                        const receiptId = payment.paymentReceipts[0]?.id;
                        const receiptNumber = payment.paymentReceipts[0]?.receiptNumber || '-';

                        // Generate secure token for receipt
                        let secureUrl = '';
                        if (receiptId) {
                            try {
                                const secureToken = await secureDocumentService.generateSecureToken(
                                    'receipt',
                                    receiptId,
                                    customerId
                                );
                                secureUrl = await secureDocumentService.getSecureDocumentUrl(secureToken);
                            } catch (error) {
                                console.error('Error generating secure token for receipt:', error);
                            }
                        }

                        const formatDate = (date: Date) => {
                            return new Date(date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            });
                        };

                        const formatCurrency = (amount: number) => {
                            return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        };

                        return {
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
                                    {
                                        type: 'text',
                                        text: formatDate(payment.paymentDate),
                                        size: 'xs',
                                        color: '#FFFFFF',
                                        margin: 'sm',
                                    },
                                ],
                                paddingAll: '15px',
                                backgroundColor: COLORS.SUCCESS,
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'เลขที่สัญญา:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { 
                                                type: 'text', 
                                                text: payment.loan.contract_number || '-', 
                                                size: 'sm', 
                                                weight: 'bold', 
                                                color: COLORS.TEXT_PRIMARY, 
                                                flex: 2,
                                                wrap: true,
                                            },
                                        ],
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'เลขที่ใบเสร็จ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { 
                                                type: 'text', 
                                                text: receiptNumber, 
                                                size: 'sm', 
                                                weight: 'bold', 
                                                color: COLORS.PRIMARY, 
                                                flex: 2,
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
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'จำนวนเงิน:', size: 'md', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { 
                                                type: 'text', 
                                                text: `${formatCurrency(Number(payment.amount))} บาท`, 
                                                size: 'xl', 
                                                weight: 'bold', 
                                                color: COLORS.SUCCESS, 
                                                flex: 2,
                                                align: 'end',
                                            },
                                        ],
                                        margin: 'lg',
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            { type: 'text', text: 'วิธีชำระ:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                            { 
                                                type: 'text', 
                                                text: payment.paymentMethod === 'BANK_TRANSFER' ? 'โอนเงิน' : 
                                                      payment.paymentMethod === 'CASH' ? 'เงินสด' : 
                                                      payment.paymentMethod === 'CHEQUE' ? 'เช็ค' : 'อื่นๆ',
                                                size: 'sm', 
                                                color: COLORS.TEXT_PRIMARY, 
                                                flex: 2,
                                            },
                                        ],
                                        margin: 'md',
                                    },
                                ],
                                paddingAll: '15px',
                            },
                            footer: receiptId && secureUrl ? {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '🔒 เอกสารได้รับการปกป้อง',
                                                size: 'xs',
                                                color: COLORS.SUCCESS,
                                                weight: 'bold',
                                                align: 'center',
                                            },
                                            {
                                                type: 'text',
                                                text: 'ต้องกรอกเลขบัตรประชาชน 4 ตัวท้ายเพื่อเข้าถึง',
                                                size: 'xxs',
                                                color: COLORS.TEXT_SECONDARY,
                                                align: 'center',
                                                margin: 'xs',
                                                wrap: true,
                                            },
                                        ],
                                        margin: 'none',
                                    },
                                    {
                                        type: 'separator',
                                        margin: 'md',
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'uri',
                                            label: '🔐 ดูใบเสร็จ (ต้องยืนยันตัวตน)',
                                            uri: secureUrl,
                                        },
                                        style: 'primary',
                                        color: COLORS.PRIMARY,
                                        height: 'sm',
                                        margin: 'md',
                                    },
                                ],
                                paddingAll: '12px',
                            } : undefined,
                        };
                    })
                );

                return [
                    {
                        type: 'flex',
                        altText: `ประวัติการชำระ (${payments.length} รายการ)`,
                        contents: {
                            type: 'carousel',
                            contents: bubbles,
                        },
                    },
                ];
            } catch (error) {
                console.error('Error creating history message:', error);
                return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
            }
        }
    /**
     * Create payment schedule message - shows contract cards for selection
     */
    static async createScheduleMessage(userId?: string): Promise<any[]> {
        if (!userId) {
            return [{ type: 'text', text: '❌ ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนใช้งาน', weight: 'bold' }];
        }

        try {
            const user = await this.findUserWithCustomer(userId);
            if (!user || !user.customers || user.customers.length === 0) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            const customer = user.customers?.[0];
            if (!customer) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า กรุณาติดต่อเจ้าหน้าที่', weight: 'bold' }];
            }

            const loans = await prisma.loan.findMany({
                where: {
                    customerId: customer.id,
                },
                select: {
                    id: true,
                    contract_number: true,
                    principal: true,
                    status: true,
                    nextPaymentDate: true,
                },
                orderBy: {
                    createdAt: 'desc',
                } as any,
                take: 10,
            });

            if (!loans || loans.length === 0) {
                return [{ type: 'text', text: 'ยังไม่พบข้อมูลสัญญา/สินเชื่อของคุณ', weight: 'bold' }];
            }

            const formatCurrency = (amount: any) => {
                const value = Number(amount || 0);
                return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };

            const bubbles = loans.map((loan) => {
                const nextPaymentDate = loan.nextPaymentDate ? new Date(loan.nextPaymentDate) : null;
                const formatDate = (date: Date | null) => {
                    if (!date) return 'ไม่ระบุ';
                    return date.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    });
                };

                return {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📅 ตารางการชำระ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: loan.contract_number || '-', size: 'xs', color: '#FFFFFF', margin: 'sm' },
                        ],
                        paddingAll: '15px',
                        backgroundColor: COLORS.PRIMARY,
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'วงเงิน:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                    { type: 'text', text: `${formatCurrency(loan.principal)} บาท`, size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2, align: 'end' },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'งวดถัดไป:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                    { type: 'text', text: formatDate(nextPaymentDate), size: 'sm', weight: 'bold', color: COLORS.TEXT_PRIMARY, flex: 2, align: 'end' },
                                ],
                                margin: 'md',
                            },
                            {
                                type: 'text',
                                text: '💡 เลือกเพื่อดูตารางผ่อนชำระ',
                                size: 'xs',
                                color: COLORS.TEXT_LIGHT,
                                wrap: true,
                                margin: 'lg',
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
                                    label: '📅 ดูตาราง',
                                    data: `action=schedule&loan_id=${loan.id}&customer_id=${customer.id}`,
                                    displayText: 'ดูตาราง',
                                },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                height: 'sm',
                            },
                        ],
                        paddingAll: '12px',
                    },
                };
            });

            return [
                {
                    type: 'flex',
                    altText: `ตารางการชำระ (${loans.length} สัญญา)`,
                    contents: {
                        type: 'carousel',
                        contents: bubbles,
                    },
                },
            ];
        } catch (error) {
            console.error('Error creating schedule message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }

    /**
     * Create payment schedule detail message for a specific loan
     */
    static async createScheduleDetailMessage(loanId: string, customerId: string): Promise<any[]> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: true,
                    paymentSchedule: {
                        orderBy: { paymentDate: 'asc' },
                    },
                },
            });

            if (!loan) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลสินเชื่อ', weight: 'bold' }];
            }

            if (loan.customerId !== customerId) {
                return [{ type: 'text', text: '❌ ไม่มีสิทธิ์เข้าถึงข้อมูลสินเชื่อนี้', weight: 'bold' }];
            }

            const schedule = loan.paymentSchedule || [];

            if (!schedule || schedule.length === 0) {
                return [
                    {
                        type: 'flex',
                        altText: 'ตารางการชำระ',
                        contents: {
                            type: 'bubble',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '📅 ตารางการชำระ', weight: 'bold', size: 'lg' },
                                ],
                                paddingAll: '15px',
                                backgroundColor: '#F5F5F5',
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: 'ยังไม่มีตารางการชำระ', size: 'sm', color: COLORS.TEXT_SECONDARY, align: 'center' },
                                ],
                                paddingAll: '15px',
                            },
                        },
                    },
                ];
            }

            const formatCurrency = (amount: number) => {
                return `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
            };

            const formatDate = (date: Date) => {
                return new Date(date).toLocaleDateString('th-TH', {
                    year: '2-digit',
                    month: 'short',
                    day: 'numeric',
                });
            };

            const scheduleItems = schedule.map((item: any, index: number) => ({
                type: 'box',
                layout: 'horizontal',
                contents: [
                    {
                        type: 'text',
                        text: `งวดที่ ${item.statementNumber ?? index + 1}`,
                        size: 'sm',
                        color: COLORS.TEXT_SECONDARY,
                        flex: 1
                    },
                    {
                        type: 'text',
                        text: formatDate(item.dueDate ?? item.paymentDate),
                        size: 'sm',
                        color: COLORS.TEXT_SECONDARY,
                        flex: 2
                    },
                    {
                        type: 'text',
                        text: formatCurrency(Number(item.amount ?? item.totalPayment ?? 0)),
                        size: 'sm',
                        color: item.status === 'PAID' ? COLORS.SUCCESS : COLORS.PRIMARY,
                        flex: 2,
                        align: 'end'
                    },
                    {
                        type: 'text',
                        text: item.status === 'PAID' ? '✅' : item.status === 'OVERDUE' ? '⚠️' : '⏳',
                        weight: 'bold',
                        size: 'sm',
                        align: 'end',
                        flex: 1
                    },
                ],
                margin: index > 0 ? 'md' : 'none',
            }));

            const totalSchedule = schedule.length;
            const paidCount = schedule.filter((s: any) => s.status === 'PAID').length;
            const progressPercent = totalSchedule > 0 ? Math.round((paidCount / totalSchedule) * 100) : 0;

            return [
                {
                    type: 'flex',
                    altText: `ตารางการชำระ - ${loan.contract_number || ''}`,
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📅 ตารางการชำระ', weight: 'bold', size: 'lg' },
                                { type: 'text', text: loan.contract_number || '-', size: 'xs', color: '#FFFFFF', margin: 'sm' },
                            ],
                            paddingAll: '15px',
                            backgroundColor: COLORS.PRIMARY,
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                ...scheduleItems.slice(0, 10),
                                scheduleItems.length > 10 ? {
                                    type: 'text',
                                    text: `... และอีก ${scheduleItems.length - 10} งวด`,
                                    size: 'xs',
                                    color: COLORS.TEXT_SECONDARY,
                                    align: 'center',
                                    margin: 'md',
                                } : null,
                                { type: 'separator', margin: 'lg' },
                                {
                                    type: 'text',
                                    text: `ชำระแล้ว ${paidCount}/${totalSchedule} งวด (${progressPercent}%)`,
                                    size: 'xs',
                                    color: COLORS.PRIMARY,
                                    margin: 'lg',
                                    align: 'center'
                                },
                            ].filter(Boolean),
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        } catch (error) {
            console.error('Error creating schedule detail message:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง', weight: 'bold' }];
        }
    }


    /**
     * Create contact officer message
     */
    static createContactMessage(): any[] {
        return [
            {
                type: 'flex',
                altText: 'ติดต่อเจ้าหน้าที่',
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📞 ติดต่อเจ้าหน้าที่', weight: 'bold', size: 'lg', color: COLORS.PRIMARY },
                            { type: 'text', text: 'เจ้าหน้าที่ที่ดูแลท่าน:', weight: 'bold', size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'lg' },
                            { type: 'text', text: 'คุณสมชาย ใจดี', size: 'md', weight: 'bold', margin: 'sm' },
                            { type: 'text', text: 'โทร: 02-xxx-xxxx', size: 'sm', color: COLORS.PRIMARY, margin: 'sm' },
                            { type: 'separator', margin: 'lg' },
                            { type: 'text', text: 'ระบบได้แจ้งเจ้าหน้าที่แล้ว\nจะติดต่อกลับภายใน 1 ชั่วโมง', size: 'xs', color: COLORS.TEXT_LIGHT, margin: 'lg', wrap: true, align: 'center' },
                        ],
                        paddingAll: '20px',
                    },
                },
            },
        ];
    }
}

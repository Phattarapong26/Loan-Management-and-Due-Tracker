import { logger } from '@utils/common/logger.util';
import { SecureDocumentService } from '@documents/services/secure-document.service';
import { prisma } from '@config/database.config';
import { formatThaiDate } from '@utils/common/thai-language.util';

export interface PaymentInvoiceData {
    invoiceId: string;
    invoiceNumber: string;
    loanId: string;
    customer: {
        businessName: string;
    };
    nextPayment: {
        installmentNo: number;
        totalAmount: number;
        dueDate: Date;
    };
}

export interface PaymentReminderData {
    loanId: string;
    paymentSchedule: {
        paymentNumber: number;
        paymentDate: Date;
        totalPayment: number;
    };
    reminderNumber: number;
    daysUntilDue: number;
}

export interface PenaltyInvoiceData {
    invoice: PaymentInvoiceData;
    penaltyAmount: number;
    daysOverdue: number;
}

export interface NPLNotificationData {
    loanId: string;
    customerName: string;
    daysOverdue: number;
}

/**
 * Service สำหรับส่งการแจ้งเตือนผ่าน LINE
 */
export class LineNotificationService {
    private secureDocumentService: SecureDocumentService;

    constructor() {
        this.secureDocumentService = new SecureDocumentService();
    }
    
    /**
     * ส่ง Invoice ผ่าน LINE (T-7 วัน) with secure password-protected link
     */
    async sendPaymentInvoice(lineUserId: string, invoiceData: PaymentInvoiceData): Promise<void> {
        try {
            // Get customer ID from LINE user ID
            const user = await prisma.user.findFirst({
                where: { lineUserId },
                include: {
                    customers: {
                        select: { id: true },
                        take: 1,
                    },
                },
            });

            if (!user || !user.customers || user.customers.length === 0) {
                throw new Error('Customer not found for LINE user');
            }

            const customer = user.customers[0]!;
            const customerId = customer.id;

            // Generate secure token for password-protected access
            const secureToken = await this.secureDocumentService.generateSecureToken(
                'invoice',
                invoiceData.invoiceId,
                customerId
            );
            const secureUrl = await this.secureDocumentService.getSecureDocumentUrl(secureToken);

            await this.sendLineMessage(lineUserId, {
                type: 'flex',
                altText: `ใบแจ้งหนี้ ${invoiceData.invoiceNumber}`,
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '📋 ใบแจ้งหนี้',
                                weight: 'bold',
                                size: 'xl',
                                color: '#1DB446'
                            },
                            {
                                type: 'text',
                                text: invoiceData.invoiceNumber,
                                size: 'sm',
                                color: '#666666'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `สวัสดีครับ คุณ${invoiceData.customer.businessName}`,
                                wrap: true,
                                margin: 'md'
                            },
                            {
                                type: 'separator',
                                margin: 'md'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'md',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'งวดที่:',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 2
                                            },
                                            {
                                                type: 'text',
                                                text: `${invoiceData.nextPayment.installmentNo}`,
                                                wrap: true,
                                                color: '#666666',
                                                size: 'sm',
                                                flex: 3
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'จำนวนเงิน:',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 2
                                            },
                                            {
                                                type: 'text',
                                                text: `฿${invoiceData.nextPayment.totalAmount.toLocaleString()}`,
                                                wrap: true,
                                                color: '#1DB446',
                                                size: 'md',
                                                weight: 'bold',
                                                flex: 3
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ครบกำหนด:',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 2
                                            },
                                            {
                                                type: 'text',
                                                text: formatThaiDate(invoiceData.nextPayment.dueDate, 'd MMMM yyyy'),
                                                wrap: true,
                                                color: '#FF5551',
                                                size: 'sm',
                                                weight: 'bold',
                                                flex: 3
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    footer: {
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
                                        color: '#1DB446',
                                        weight: 'bold',
                                        align: 'center',
                                    },
                                    {
                                        type: 'text',
                                        text: 'ต้องกรอกเลขบัตรประชาชน 4 ตัวท้ายเพื่อเข้าถึง',
                                        size: 'xxs',
                                        color: '#666666',
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
                                style: 'primary',
                                height: 'sm',
                                margin: 'md',
                                action: {
                                    type: 'uri',
                                    label: '🔐 ดูใบแจ้งหนี้ (ต้องยืนยันตัวตน)',
                                    uri: secureUrl
                                }
                            },
                            {
                                type: 'text',
                                text: '💡 ลิงก์นี้หมดอายุใน 7 วัน',
                                size: 'xxs',
                                color: '#999999',
                                align: 'center',
                                margin: 'md',
                                wrap: true,
                            },
                        ]
                    }
                }
            });

            logger.info({
                lineUserId,
                invoiceId: invoiceData.invoiceId,
                invoiceNumber: invoiceData.invoiceNumber,
                secureToken: secureToken.substring(0, 10) + '...',
            }, 'Payment invoice sent via LINE with secure link');

        } catch (error) {
            logger.error({
                error,
                lineUserId,
                invoiceId: invoiceData.invoiceId,
            }, 'Error sending payment invoice via LINE');
            throw error;
        }
    }

    /**
     * ส่งการแจ้งเตือน (T-3 และ T-1 วัน)
     */
    async sendPaymentReminder(lineUserId: string, reminderData: PaymentReminderData): Promise<void> {
        try {
            const daysText = reminderData.daysUntilDue === 1 ? 'พรุ่งนี้' : `อีก ${reminderData.daysUntilDue} วัน`;
            const urgencyColor = reminderData.daysUntilDue === 1 ? '#FF5551' : '#FF9500';
            const urgencyIcon = reminderData.daysUntilDue === 1 ? '🚨' : '⏰';

            await this.sendLineMessage(lineUserId, {
                type: 'flex',
                altText: `เตือนชำระเงิน ${daysText}`,
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `${urgencyIcon} แจ้งเตือนชำระเงิน`,
                                weight: 'bold',
                                size: 'xl',
                                color: urgencyColor
                            },
                            {
                                type: 'text',
                                text: `ครบกำหนด${daysText}`,
                                size: 'sm',
                                color: urgencyColor
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `งวดที่ ${reminderData.paymentSchedule.paymentNumber} จำนวน ฿${Number(reminderData.paymentSchedule.totalPayment).toLocaleString()}`,
                                wrap: true,
                                weight: 'bold',
                                size: 'md'
                            },
                            {
                                type: 'text',
                                text: `ครบกำหนดชำระ: ${formatThaiDate(reminderData.paymentSchedule.paymentDate, 'd MMMM yyyy')}`,
                                wrap: true,
                                margin: 'md',
                                color: '#666666'
                            },
                            {
                                type: 'separator',
                                margin: 'md'
                            },
                            {
                                type: 'text',
                                text: reminderData.daysUntilDue === 1 
                                    ? '⚠️ กรุณาชำระภายในวันนี้เพื่อหลีกเลี่ยงค่าปรับ'
                                    : 'กรุณาเตรียมชำระเงินให้พร้อม',
                                wrap: true,
                                margin: 'md',
                                color: urgencyColor,
                                size: 'sm'
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                style: 'primary',
                                height: 'sm',
                                color: urgencyColor,
                                action: {
                                    type: 'uri',
                                    label: 'ชำระเงิน',
                                    uri: `${process.env.FRONTEND_URL}/payments/${reminderData.loanId}`
                                }
                            }
                        ]
                    }
                }
            });

            logger.info({
                lineUserId,
                loanId: reminderData.loanId,
                reminderNumber: reminderData.reminderNumber,
                daysUntilDue: reminderData.daysUntilDue,
            }, 'Payment reminder sent via LINE');

        } catch (error) {
            logger.error({
                error,
                lineUserId,
                loanId: reminderData.loanId,
            }, 'Error sending payment reminder via LINE');
            throw error;
        }
    }

    /**
     * ส่งใบแจ้งหนี้ที่มีค่าปรับ (T+1 วัน) with secure password-protected link
     */
    async sendPenaltyInvoice(lineUserId: string, penaltyData: PenaltyInvoiceData): Promise<void> {
        try {
            // Get customer ID from LINE user ID
            const user = await prisma.user.findFirst({
                where: { lineUserId },
                include: {
                    customers: {
                        select: { id: true },
                        take: 1,
                    },
                },
            });

            if (!user || !user.customers || user.customers.length === 0) {
                throw new Error('Customer not found for LINE user');
            }

            const customer = user.customers[0]!;
            const customerId = customer.id;

            // Generate secure token for password-protected access
            const secureToken = await this.secureDocumentService.generateSecureToken(
                'invoice',
                penaltyData.invoice.invoiceId,
                customerId
            );
            const secureUrl = await this.secureDocumentService.getSecureDocumentUrl(secureToken);

            await this.sendLineMessage(lineUserId, {
                type: 'flex',
                altText: `ใบแจ้งหนี้ค่าปรับ ${penaltyData.invoice.invoiceNumber}`,
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '⚠️ ใบแจ้งหนี้ค่าปรับ',
                                weight: 'bold',
                                size: 'xl',
                                color: '#FF5551'
                            },
                            {
                                type: 'text',
                                text: `เลยกำหนดชำระ ${penaltyData.daysOverdue} วัน`,
                                size: 'sm',
                                color: '#FF5551'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `คุณ${penaltyData.invoice.customer.businessName}`,
                                wrap: true,
                                weight: 'bold'
                            },
                            {
                                type: 'separator',
                                margin: 'md'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'md',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ยอดเงินต้น:',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 2
                                            },
                                            {
                                                type: 'text',
                                                text: `฿${penaltyData.invoice.nextPayment.totalAmount.toLocaleString()}`,
                                                wrap: true,
                                                color: '#666666',
                                                size: 'sm',
                                                flex: 3
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ค่าปรับ:',
                                                size: 'sm',
                                                color: '#FF5551',
                                                flex: 2
                                            },
                                            {
                                                type: 'text',
                                                text: `฿${penaltyData.penaltyAmount.toLocaleString()}`,
                                                wrap: true,
                                                color: '#FF5551',
                                                size: 'sm',
                                                weight: 'bold',
                                                flex: 3
                                            }
                                        ]
                                    },
                                    {
                                        type: 'separator',
                                        margin: 'sm'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'รวมทั้งสิ้น:',
                                                size: 'md',
                                                color: '#FF5551',
                                                weight: 'bold',
                                                flex: 2
                                            },
                                            {
                                                type: 'text',
                                                text: `฿${(penaltyData.invoice.nextPayment.totalAmount + penaltyData.penaltyAmount).toLocaleString()}`,
                                                wrap: true,
                                                color: '#FF5551',
                                                size: 'lg',
                                                weight: 'bold',
                                                flex: 3
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: '💡 ค่าปรับจะเพิ่มขึ้น 0.05% ต่อวัน จนกว่าจะชำระครบ',
                                wrap: true,
                                margin: 'md',
                                color: '#FF9500',
                                size: 'xs'
                            }
                        ]
                    },
                    footer: {
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
                                        color: '#FF5551',
                                        weight: 'bold',
                                        align: 'center',
                                    },
                                    {
                                        type: 'text',
                                        text: 'ต้องกรอกเลขบัตรประชาชน 4 ตัวท้ายเพื่อเข้าถึง',
                                        size: 'xxs',
                                        color: '#666666',
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
                                style: 'primary',
                                height: 'sm',
                                color: '#FF5551',
                                margin: 'md',
                                action: {
                                    type: 'uri',
                                    label: '🔐 ดูใบแจ้งหนี้ค่าปรับ (ต้องยืนยันตัวตน)',
                                    uri: secureUrl
                                }
                            },
                            {
                                type: 'text',
                                text: '💡 ลิงก์นี้หมดอายุใน 7 วัน',
                                size: 'xxs',
                                color: '#999999',
                                align: 'center',
                                margin: 'md',
                                wrap: true,
                            },
                        ]
                    }
                }
            });

            logger.info({
                lineUserId,
                invoiceId: penaltyData.invoice.invoiceId,
                penaltyAmount: penaltyData.penaltyAmount,
                daysOverdue: penaltyData.daysOverdue,
                secureToken: secureToken.substring(0, 10) + '...',
            }, 'Penalty invoice sent via LINE with secure link');

        } catch (error) {
            logger.error({
                error,
                lineUserId,
                invoiceId: penaltyData.invoice.invoiceId,
            }, 'Error sending penalty invoice via LINE');
            throw error;
        }
    }

    /**
     * ส่งการแจ้งเตือน NPL (T+90 วัน)
     */
    async sendNPLNotification(lineUserId: string, nplData: NPLNotificationData): Promise<void> {
        try {
            await this.sendLineMessage(lineUserId, {
                type: 'flex',
                altText: 'แจ้งเตือน NPL - ติดต่อด่วน',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🚨 แจ้งเตือนสำคัญ',
                                weight: 'bold',
                                size: 'xl',
                                color: '#FF0000'
                            },
                            {
                                type: 'text',
                                text: 'สินเชื่อเข้าสู่สถานะ NPL',
                                size: 'sm',
                                color: '#FF0000'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `เรียน คุณ${nplData.customerName}`,
                                wrap: true,
                                weight: 'bold'
                            },
                            {
                                type: 'text',
                                text: `สินเชื่อของท่านเลยกำหนดชำระมาแล้ว ${nplData.daysOverdue} วัน และได้เข้าสู่สถานะ NPL (Non-Performing Loan)`,
                                wrap: true,
                                margin: 'md',
                                color: '#666666'
                            },
                            {
                                type: 'separator',
                                margin: 'md'
                            },
                            {
                                type: 'text',
                                text: '⚠️ กรุณาติดต่อเจ้าหน้าที่เพื่อหาทางออกร่วมกันโดยด่วน',
                                wrap: true,
                                margin: 'md',
                                color: '#FF0000',
                                weight: 'bold'
                            },
                            {
                                type: 'text',
                                text: 'หากไม่ติดต่อภายใน 7 วัน อาจมีการดำเนินการทางกฎหมาย',
                                wrap: true,
                                margin: 'sm',
                                color: '#FF5551',
                                size: 'sm'
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                style: 'primary',
                                height: 'sm',
                                color: '#FF0000',
                                action: {
                                    type: 'uri',
                                    label: 'ติดต่อเจ้าหน้าที่',
                                    uri: `tel:${process.env.COLLECTION_PHONE || '02-123-4567'}`
                                }
                            },
                            {
                                type: 'button',
                                style: 'secondary',
                                height: 'sm',
                                margin: 'sm',
                                action: {
                                    type: 'uri',
                                    label: 'ดูรายละเอียด',
                                    uri: `${process.env.FRONTEND_URL}/loans/${nplData.loanId}`
                                }
                            }
                        ]
                    }
                }
            });

            logger.info({
                lineUserId,
                loanId: nplData.loanId,
                daysOverdue: nplData.daysOverdue,
            }, 'NPL notification sent via LINE');

        } catch (error) {
            logger.error({
                error,
                lineUserId,
                loanId: nplData.loanId,
            }, 'Error sending NPL notification via LINE');
            throw error;
        }
    }

    // Private helper methods

    private async sendLineMessage(lineUserId: string, message: any): Promise<void> {
        // TODO: Implement actual LINE Bot API call
        // This is a placeholder for the actual LINE messaging implementation
        
        logger.info({
            lineUserId,
            messageType: message.type,
        }, 'LINE message sent (placeholder)');
        
        // In real implementation, this would use LINE Bot SDK:
        // await lineClient.pushMessage(lineUserId, message);
    }
}

export const lineNotificationService = new LineNotificationService();
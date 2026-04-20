/**
 * Enhanced LINE Contact Logging Service
 * ระบบบันทึกการติดต่อแบบสมบูรณ์สำหรับ Loan Officer
 */

import { CustomerRepository } from '@customers/repositories/customer.repository';
import { ContactLogRepository } from '../repositories/contact-log.repository';
import { ConversationStateService } from '@core-services/services/conversation-state.service';
import { COLORS } from '@line/messages/theme';

export interface ContactLogData {
    taskId?: string;
    customerId: string;
    loanId: string;
    contactType: 'PHONE' | 'VISIT' | 'EMAIL' | 'LINE' | 'SMS';
    outcome: 'CONTACTED' | 'PROMISED' | 'EXTENSION' | 'UNREACHABLE' | 'PAID' | 'REFUSED' | 'PARTIAL_PAYMENT';
    notes?: string;
    nextFollowUpDate?: Date;
    promisedAmount?: number;
    promisedDate?: Date;
    location?: string; // GPS coordinates for visits
    attachments?: string[]; // File paths for photos/documents
}

export class LineContactLoggingEnhancedService {
    private conversationService: ConversationStateService;
    private customerRepository: CustomerRepository;
    private contactLogRepository: ContactLogRepository;

    constructor() {
        this.conversationService = new ConversationStateService();
        this.customerRepository = new CustomerRepository();
        this.contactLogRepository = new ContactLogRepository();
    }

    /**
     * Map service outcome to database ContactStatus
     */
    private mapOutcomeToContactStatus(outcome: string): 'CONTACTED' | 'PROMISED_TO_PAY' | 'REQUEST_EXTENSION' | 'UNREACHABLE' | 'ALREADY_PAID' {
        switch (outcome) {
            case 'PROMISED':
            case 'PARTIAL_PAYMENT':
                return 'PROMISED_TO_PAY';
            case 'EXTENSION':
                return 'REQUEST_EXTENSION';
            case 'UNREACHABLE':
                return 'UNREACHABLE';
            case 'PAID':
                return 'ALREADY_PAID';
            case 'CONTACTED':
            case 'REFUSED':
            default:
                return 'CONTACTED';
        }
    }

    /**
     * Map service contact type to database ContactMethod
     */
    private mapContactTypeToMethod(contactType: string): 'PHONE' | 'LINE' | 'VISIT' | 'EMAIL' {
        switch (contactType) {
            case 'PHONE':
            case 'SMS':
                return 'PHONE';
            case 'LINE':
                return 'LINE';
            case 'VISIT':
                return 'VISIT';
            case 'EMAIL':
                return 'EMAIL';
            default:
                return 'PHONE';
        }
    }

    /**
     * Reverse map database ContactMethod to service contact type
     */
    private reverseMapContactMethod(contactMethod: string): string {
        switch (contactMethod) {
            case 'PHONE':
                return 'PHONE';
            case 'LINE':
                return 'LINE';
            case 'VISIT':
                return 'VISIT';
            case 'EMAIL':
                return 'EMAIL';
            default:
                return 'PHONE';
        }
    }

    /**
     * Reverse map database ContactStatus to service outcome
     */
    private reverseMapContactStatus(contactStatus: string): string {
        switch (contactStatus) {
            case 'PROMISED_TO_PAY':
                return 'PROMISED';
            case 'REQUEST_EXTENSION':
                return 'EXTENSION';
            case 'UNREACHABLE':
                return 'UNREACHABLE';
            case 'ALREADY_PAID':
                return 'PAID';
            case 'CONTACTED':
            default:
                return 'CONTACTED';
        }
    }

    /**
     * Start contact logging flow
     */
    async startContactLogging(userId: string, taskId?: string, customerId?: string, loanId?: string): Promise<any[]> {
        // If no specific task, show customer selection
        if (!customerId || !loanId) {
            return await this.showCustomerSelection(userId);
        }

        const customer = await this.customerRepository.findById(customerId);

        if (!customer) {
            return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า' }];
        }

        // Set conversation state
        await this.conversationService.setState(userId, 'contact_logging', {
            step: 'select_type',
            taskId,
            customerId,
            loanId,
            customerName: customer.businessName
        });

        return this.createContactTypeSelection(customer.businessName);
    }

    /**
     * Show customer selection for officer
     */
    private async showCustomerSelection(userId: string): Promise<any[]> {
        // Get officer's customers with active loans
        const customers = await this.customerRepository.findWithActiveLoansByOfficer(userId, 10);

        if (customers.length === 0) {
            return [{ type: 'text', text: '❌ ไม่พบลูกค้าที่ต้องติดตาม' }];
        }

        const bubbles = customers.map((customer, index) => {
            const loan = customer.loans[0];
            if (!loan) return null; // Skip customers without loans
            
            const isOverdue = loan.overdueDays > 0;
            
            return {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${index + 1}. ${customer.businessName}`,
                            weight: 'bold',
                            size: 'md',
                            color: '#FFFFFF',
                            wrap: true
                        },
                        ...(isOverdue ? [{
                            type: 'text',
                            text: `⚠️ เกินกำหนด ${loan.overdueDays} วัน`,
                            size: 'sm',
                            color: '#FFFFFF',
                            margin: 'sm'
                        }] : [])
                    ],
                    backgroundColor: isOverdue ? COLORS.DANGER : COLORS.PRIMARY,
                    paddingAll: '15px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'เลือกลูกค้าที่ต้องการบันทึกการติดต่อ',
                            size: 'sm',
                            color: COLORS.TEXT_SECONDARY,
                            wrap: true
                        }
                    ],
                    paddingAll: '15px'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '📝 บันทึกการติดต่อ',
                                data: `action=start_contact_log&customerId=${customer.id}&loanId=${loan.id}`
                            },
                            style: 'primary',
                            color: COLORS.PRIMARY
                        }
                    ],
                    paddingAll: '10px'
                }
            };
        }).filter(Boolean); // Remove null entries

        return [
            {
                type: 'flex',
                altText: 'เลือกลูกค้าที่ต้องการบันทึก',
                contents: {
                    type: 'carousel',
                    contents: bubbles
                }
            }
        ];
    }

    /**
     * Create contact type selection message
     */
    private createContactTypeSelection(customerName: string): any[] {
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
                            { type: 'text', text: '📝 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: customerName, size: 'sm', color: '#FFFFFF', margin: 'sm', wrap: true }
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '15px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'ขั้นตอนที่ 1: เลือกช่องทางการติดต่อ', size: 'md', wrap: true, weight: 'bold' },
                            { type: 'text', text: 'คุณติดต่อลูกค้าผ่านช่องทางใด?', size: 'sm', wrap: true, margin: 'md', color: COLORS.TEXT_SECONDARY }
                        ],
                        paddingAll: '15px'
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: { type: 'postback', label: '📞 โทรศัพท์', data: 'contact_type=PHONE' },
                                style: 'primary',
                                color: COLORS.PRIMARY
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '🏠 เยี่ยมบ้าน/ร้าน', data: 'contact_type=VISIT' },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '📧 อีเมล', data: 'contact_type=EMAIL' },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '💬 LINE Chat', data: 'contact_type=LINE' },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '📱 SMS', data: 'contact_type=SMS' },
                                style: 'secondary',
                                margin: 'sm'
                            }
                        ],
                        paddingAll: '10px'
                    }
                }
            }
        ];
    }

    /**
     * Handle contact type selection
     */
    async handleContactTypeSelection(userId: string, contactType: string): Promise<any[]> {
        const state = await this.conversationService.getState(userId);
        if (!state || state.type !== 'contact_logging') {
            return [{ type: 'text', text: '❌ เซสชันหมดอายุ กรุณาเริ่มใหม่' }];
        }

        // Update state
        await this.conversationService.setState(userId, 'contact_logging', {
            ...state.data,
            step: 'select_outcome',
            contactType
        });

        return this.createOutcomeSelection(contactType, state.data.customerName);
    }

    /**
     * Create outcome selection message
     */
    private createOutcomeSelection(contactType: string, customerName: string): any[] {
        const contactTypeLabels: Record<string, string> = {
            PHONE: '📞 โทรศัพท์',
            VISIT: '🏠 เยี่ยมบ้าน/ร้าน',
            EMAIL: '📧 อีเมล',
            LINE: '💬 LINE Chat',
            SMS: '📱 SMS'
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
                            { type: 'text', text: '📝 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: customerName, size: 'sm', color: '#FFFFFF', margin: 'sm', wrap: true }
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '15px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'ขั้นตอนที่ 2: เลือกผลการติดต่อ', size: 'md', wrap: true, weight: 'bold' },
                            { type: 'text', text: `ช่องทาง: ${contactTypeLabels[contactType]}`, size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'sm' },
                            { type: 'separator', margin: 'md' },
                            { type: 'text', text: 'ผลการติดต่อเป็นอย่างไร?', size: 'sm', wrap: true, margin: 'md', color: COLORS.TEXT_SECONDARY }
                        ],
                        paddingAll: '15px'
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: { type: 'postback', label: '✅ ติดต่อได้ (ทั่วไป)', data: 'contact_outcome=CONTACTED' },
                                style: 'primary',
                                color: COLORS.PRIMARY
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '🤝 สัญญาชำระ', data: 'contact_outcome=PROMISED' },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '💰 ชำระเงินแล้ว', data: 'contact_outcome=PAID' },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '💸 ชำระบางส่วน', data: 'contact_outcome=PARTIAL_PAYMENT' },
                                style: 'primary',
                                color: COLORS.PRIMARY,
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '🕐 ขอผ่อนผัน', data: 'contact_outcome=EXTENSION' },
                                style: 'secondary',
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '❌ ติดต่อไม่ได้', data: 'contact_outcome=UNREACHABLE' },
                                style: 'secondary',
                                margin: 'sm'
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '🚫 ปฏิเสธชำระ', data: 'contact_outcome=REFUSED' },
                                style: 'secondary',
                                margin: 'sm'
                            }
                        ],
                        paddingAll: '10px'
                    }
                }
            }
        ];
    }

    /**
     * Handle outcome selection
     */
    async handleOutcomeSelection(userId: string, outcome: string): Promise<any[]> {
        const state = await this.conversationService.getState(userId);
        if (!state || state.type !== 'contact_logging') {
            return [{ type: 'text', text: '❌ เซสชันหมดอายุ กรุณาเริ่มใหม่' }];
        }

        // Update state
        await this.conversationService.setState(userId, 'contact_logging', {
            ...state.data,
            step: 'add_notes',
            outcome
        });

        // Check if outcome requires additional info
        if (['PROMISED', 'EXTENSION', 'PARTIAL_PAYMENT'].includes(outcome)) {
            return this.createAdditionalInfoRequest(outcome, state.data.customerName);
        }

        // For simple outcomes, ask for notes
        return this.createNotesRequest(state.data.customerName, outcome);
    }

    /**
     * Create additional info request for complex outcomes
     */
    private createAdditionalInfoRequest(outcome: string, customerName: string): any[] {
        const outcomeLabels: Record<string, string> = {
            PROMISED: '🤝 สัญญาชำระ',
            EXTENSION: '🕐 ขอผ่อนผัน',
            PARTIAL_PAYMENT: '💸 ชำระบางส่วน'
        };

        let promptText = '';
        let exampleText = '';

        switch (outcome) {
            case 'PROMISED':
                promptText = 'กรุณาระบุจำนวนเงินและวันที่สัญญาชำระ:';
                exampleText = 'ตัวอย่าง: 50000 วันที่ 15/02/2026';
                break;
            case 'EXTENSION':
                promptText = 'กรุณาระบุวันที่ขอผ่อนผันและเหตุผล:';
                exampleText = 'ตัวอย่าง: วันที่ 20/02/2026 เหตุผล: รอเงินจากลูกค้า';
                break;
            case 'PARTIAL_PAYMENT':
                promptText = 'กรุณาระบุจำนวนเงินที่ชำระและวันที่ชำระส่วนที่เหลือ:';
                exampleText = 'ตัวอย่าง: ชำระ 25000 วันที่ 10/02/2026 ชำระเหลือ 15/02/2026';
                break;
        }

        return [
            {
                type: 'flex',
                altText: 'ระบุข้อมูลเพิ่มเติม',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📝 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: customerName, size: 'sm', color: '#FFFFFF', margin: 'sm', wrap: true }
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '15px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'ขั้นตอนที่ 3: ระบุข้อมูลเพิ่มเติม', size: 'md', wrap: true, weight: 'bold' },
                            { type: 'text', text: `ผลการติดต่อ: ${outcomeLabels[outcome]}`, size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'sm' },
                            { type: 'separator', margin: 'md' },
                            { type: 'text', text: promptText, size: 'sm', wrap: true, margin: 'md' },
                            { type: 'text', text: exampleText, size: 'xs', wrap: true, margin: 'sm', color: COLORS.TEXT_LIGHT }
                        ],
                        paddingAll: '15px'
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'พิมพ์ข้อมูลในแชทถัดไป', size: 'xs', color: COLORS.TEXT_LIGHT, align: 'center' },
                            { type: 'text', text: 'หรือพิมพ์ "ข้าม" เพื่อข้ามขั้นตอนนี้', size: 'xs', color: COLORS.TEXT_LIGHT, align: 'center', margin: 'sm' }
                        ],
                        paddingAll: '10px'
                    }
                }
            }
        ];
    }

    /**
     * Create notes request
     */
    private createNotesRequest(customerName: string, outcome: string): any[] {
        const outcomeLabels: Record<string, string> = {
            CONTACTED: '✅ ติดต่อได้ (ทั่วไป)',
            PROMISED: '🤝 สัญญาชำระ',
            EXTENSION: '🕐 ขอผ่อนผัน',
            UNREACHABLE: '❌ ติดต่อไม่ได้',
            PAID: '💰 ชำระเงินแล้ว',
            REFUSED: '🚫 ปฏิเสธชำระ',
            PARTIAL_PAYMENT: '💸 ชำระบางส่วน'
        };

        return [
            {
                type: 'flex',
                altText: 'เพิ่มหมายเหตุ',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📝 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: customerName, size: 'sm', color: '#FFFFFF', margin: 'sm', wrap: true }
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '15px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'ขั้นตอนสุดท้าย: เพิ่มหมายเหตุ', size: 'md', wrap: true, weight: 'bold' },
                            { type: 'text', text: `ผลการติดต่อ: ${outcomeLabels[outcome]}`, size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'sm' },
                            { type: 'separator', margin: 'md' },
                            { type: 'text', text: 'กรุณาเพิ่มหมายเหตุหรือรายละเอียดเพิ่มเติม:', size: 'sm', wrap: true, margin: 'md' },
                            { type: 'text', text: '• สภาพธุรกิจ\n• ความสามารถในการชำระ\n• ข้อตกลงพิเศษ\n• ปัญหาที่พบ', size: 'xs', wrap: true, margin: 'sm', color: COLORS.TEXT_LIGHT }
                        ],
                        paddingAll: '15px'
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: { type: 'postback', label: '✅ บันทึกโดยไม่มีหมายเหตุ', data: 'save_contact_log=no_notes' },
                                style: 'secondary'
                            },
                            { type: 'text', text: 'หรือพิมพ์หมายเหตุในแชทถัดไป', size: 'xs', color: COLORS.TEXT_LIGHT, align: 'center', margin: 'md' }
                        ],
                        paddingAll: '10px'
                    }
                }
            }
        ];
    }

    /**
     * Handle additional info input
     */
    async handleAdditionalInfo(userId: string, text: string): Promise<any[]> {
        const state = await this.conversationService.getState(userId);
        if (!state || state.type !== 'contact_logging') {
            return [{ type: 'text', text: '❌ เซสชันหมดอายุ กรุณาเริ่มใหม่' }];
        }

        if (text.toLowerCase() === 'ข้าม') {
            // Skip additional info, go to notes
            await this.conversationService.setState(userId, 'contact_logging', {
                ...state.data,
                step: 'add_notes'
            });
            return this.createNotesRequest(state.data.customerName, state.data.outcome);
        }

        // Parse additional info based on outcome
        let additionalData = {};
        try {
            additionalData = this.parseAdditionalInfo(state.data.outcome, text);
        } catch (error) {
            return [
                {
                    type: 'text',
                    text: `❌ รูปแบบข้อมูลไม่ถูกต้อง\n\n${error}\n\nกรุณาลองใหม่หรือพิมพ์ "ข้าม" เพื่อข้ามขั้นตอนนี้`
                }
            ];
        }

        // Update state with additional info
        await this.conversationService.setState(userId, 'contact_logging', {
            ...state.data,
            step: 'add_notes',
            additionalInfo: additionalData
        });

        return this.createNotesRequest(state.data.customerName, state.data.outcome);
    }

    /**
     * Parse additional info based on outcome type
     */
    private parseAdditionalInfo(outcome: string, text: string): any {
        switch (outcome) {
            case 'PROMISED':
                // Expected format: "50000 วันที่ 15/02/2026"
                const promiseMatch = text.match(/(\d+).*?(\d{1,2}\/\d{1,2}\/\d{4})/);
                if (!promiseMatch || !promiseMatch[1] || !promiseMatch[2]) {
                    throw new Error('รูปแบบที่ถูกต้อง: จำนวนเงิน วันที่ DD/MM/YYYY\nตัวอย่าง: 50000 วันที่ 15/02/2026');
                }
                return {
                    promisedAmount: parseInt(promiseMatch[1]),
                    promisedDate: this.parseThaiDate(promiseMatch[2])
                };

            case 'EXTENSION':
                // Expected format: "วันที่ 20/02/2026 เหตุผล: รอเงินจากลูกค้า"
                const extensionMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}).*?เหตุผล[:\s]*(.+)/i);
                if (!extensionMatch || !extensionMatch[1] || !extensionMatch[2]) {
                    throw new Error('รูปแบบที่ถูกต้อง: วันที่ DD/MM/YYYY เหตุผล: รายละเอียด\nตัวอย่าง: วันที่ 20/02/2026 เหตุผล: รอเงินจากลูกค้า');
                }
                return {
                    extensionDate: this.parseThaiDate(extensionMatch[1]),
                    extensionReason: extensionMatch[2].trim()
                };

            case 'PARTIAL_PAYMENT':
                // Expected format: "ชำระ 25000 วันที่ 10/02/2026 ชำระเหลือ 15/02/2026"
                const partialMatch = text.match(/ชำระ\s*(\d+).*?(\d{1,2}\/\d{1,2}\/\d{4}).*?เหลือ.*?(\d{1,2}\/\d{1,2}\/\d{4})/i);
                if (!partialMatch || !partialMatch[1] || !partialMatch[2] || !partialMatch[3]) {
                    throw new Error('รูปแบบที่ถูกต้อง: ชำระ จำนวน วันที่ DD/MM/YYYY ชำระเหลือ DD/MM/YYYY\nตัวอย่าง: ชำระ 25000 วันที่ 10/02/2026 ชำระเหลือ 15/02/2026');
                }
                return {
                    partialAmount: parseInt(partialMatch[1]),
                    partialDate: this.parseThaiDate(partialMatch[2]),
                    remainingDate: this.parseThaiDate(partialMatch[3])
                };

            default:
                return {};
        }
    }

    /**
     * Parse Thai date format DD/MM/YYYY to Date object
     */
    private parseThaiDate(dateStr: string): Date {
        const parts = dateStr.split('/');
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
            throw new Error('Invalid date format');
        }
        
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            throw new Error('Invalid date values');
        }
        
        return new Date(year, month - 1, day);
    }

    /**
     * Handle notes input and save contact log
     */
    async handleNotesAndSave(userId: string, notes: string = ''): Promise<any[]> {
        const state = await this.conversationService.getState(userId);
        if (!state || state.type !== 'contact_logging') {
            return [{ type: 'text', text: '❌ เซสชันหมดอายุ กรุณาเริ่มใหม่' }];
        }

        try {
            // Save contact log to database
            const contactLog = await this.saveContactLog(userId, {
                taskId: state.data.taskId,
                customerId: state.data.customerId,
                loanId: state.data.loanId,
                contactType: state.data.contactType,
                outcome: state.data.outcome,
                notes: notes || undefined,
                ...state.data.additionalInfo
            });

            // Clear conversation state
            await this.conversationService.clearState(userId);

            // Create success message
            return this.createSuccessMessage(contactLog, state.data.customerName);

        } catch (error) {
            console.error('Error saving contact log:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง' }];
        }
    }

    /**
     * Save contact log to database
     */
    private async saveContactLog(userId: string, data: ContactLogData): Promise<any> {
        return this.contactLogRepository.createWithLoanInclude({
            customerId: data.customerId,
            loanId: data.loanId,
            officerId: userId,
            contactMethod: this.mapContactTypeToMethod(data.contactType),
            contactStatus: this.mapOutcomeToContactStatus(data.outcome),
            outcome: this.mapOutcomeToContactStatus(data.outcome),
            notes: data.notes || '',
            contactDate: new Date(),
            nextFollowUpDate: data.nextFollowUpDate,
            promisedDate: data.promisedDate,
            taskId: data.taskId,
        });
    }

    /**
     * Create success message
     */
    private createSuccessMessage(contactLog: any, customerName: string): any[] {
        const outcomeLabels: Record<string, string> = {
            CONTACTED: '✅ ติดต่อได้ (ทั่วไป)',
            PROMISED: '🤝 สัญญาชำระ',
            EXTENSION: '🕐 ขอผ่อนผัน',
            UNREACHABLE: '❌ ติดต่อไม่ได้',
            PAID: '💰 ชำระเงินแล้ว',
            REFUSED: '🚫 ปฏิเสธชำระ',
            PARTIAL_PAYMENT: '💸 ชำระบางส่วน'
        };

        const contactTypeLabels: Record<string, string> = {
            PHONE: '📞 โทรศัพท์',
            VISIT: '🏠 เยี่ยมบ้าน/ร้าน',
            EMAIL: '📧 อีเมล',
            LINE: '💬 LINE Chat',
            SMS: '📱 SMS'
        };

        return [
            {
                type: 'flex',
                altText: 'บันทึกการติดต่อสำเร็จ',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '✅ บันทึกสำเร็จ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                            { type: 'text', text: 'การติดต่อถูกบันทึกแล้ว', size: 'sm', color: '#FFFFFF', margin: 'sm' }
                        ],
                        backgroundColor: COLORS.PRIMARY,
                        paddingAll: '15px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: customerName, weight: 'bold', size: 'md', wrap: true },
                            { type: 'separator', margin: 'md' },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'ช่องทาง:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                    { type: 'text', text: contactTypeLabels[this.reverseMapContactMethod(contactLog.contactMethod)], size: 'sm', flex: 2, wrap: true }
                                ],
                                margin: 'md'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'ผลลัพธ์:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                    { type: 'text', text: outcomeLabels[this.reverseMapContactStatus(contactLog.contactStatus)], size: 'sm', flex: 2, wrap: true }
                                ],
                                margin: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'เวลา:', size: 'sm', color: COLORS.TEXT_SECONDARY, flex: 1 },
                                    { type: 'text', text: new Date().toLocaleString('th-TH'), size: 'sm', flex: 2 }
                                ],
                                margin: 'sm'
                            },
                            ...(contactLog.notes ? [{
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: 'หมายเหตุ:', size: 'sm', color: COLORS.TEXT_SECONDARY, margin: 'md' },
                                    { type: 'text', text: contactLog.notes, size: 'xs', wrap: true, margin: 'sm' }
                                ]
                            }] : [])
                        ],
                        paddingAll: '15px'
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: { type: 'postback', label: '📝 บันทึกการติดต่อใหม่', data: 'action=start_contact_log' },
                                style: 'primary',
                                color: COLORS.PRIMARY
                            },
                            {
                                type: 'button',
                                action: { type: 'postback', label: '📋 ดูงานวันนี้', data: 'action=tasks' },
                                style: 'secondary',
                                margin: 'sm'
                            }
                        ],
                        paddingAll: '10px'
                    }
                }
            }
        ];
    }

    /**
     * Get recent contact logs for a customer
     */
    async getContactHistory(customerId: string, limit: number = 5): Promise<any[]> {
        return this.contactLogRepository.findRecentByCustomer(customerId, limit);
    }
}
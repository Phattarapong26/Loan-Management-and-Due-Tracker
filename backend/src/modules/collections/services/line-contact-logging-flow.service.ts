/**
 * LINE Contact Logging Flow Service
 * Handles multi-step conversation flow for contact logging through LINE
 */

import { prisma } from '@config/database.config';
import { ContactLoggingService, ContactType, ContactOutcome } from './contact-logging.service';
import { ConversationStateService } from '@core-services/services/conversation-state.service';
import { LineMessagesService } from '@line/services/messaging/line-messages.service';

export class LineContactLoggingFlowService {
    private contactService: ContactLoggingService;
    private conversationService: ConversationStateService;

    constructor() {
        this.contactService = new ContactLoggingService();
        this.conversationService = new ConversationStateService();
    }

    /**
     * Handle contact type selection from postback
     */
    async handleContactTypeSelection(
        lineUserId: string,
        contactType: ContactType,
        taskId: string,
        customerId: string,
        loanId: string
    ): Promise<any[]> {
        try {
            // Get customer name
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });

            if (!customer) {
                return [{ type: 'text', text: '❌ ไม่พบข้อมูลลูกค้า' }];
            }

            const customerName = `${customer.user?.firstName || ''} ${customer.user?.lastName || ''}`.trim();

            // Update conversation state
            await this.conversationService.setState(
                lineUserId,
                'CONTACT_LOGGING',
                {
                    step: 'SELECT_OUTCOME',
                    taskId,
                    customerId,
                    loanId,
                    customerName,
                    contactType,
                }
            );

            // Show outcome selection
            return LineMessagesService.createOutcomeSelectionMessage(
                contactType,
                taskId,
                customerId,
                loanId
            );
        } catch (error) {
            console.error('Error handling contact type selection:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }];
        }
    }

    /**
     * Handle outcome selection from postback
     */
    async handleOutcomeSelection(
        lineUserId: string,
        outcome: ContactOutcome,
        _contactType: ContactType, // Unused but kept for interface consistency
        _taskId: string, // Unused but kept for interface consistency
        _customerId: string, // Unused but kept for interface consistency
        _loanId: string // Unused but kept for interface consistency
    ): Promise<any[]> {
        try {
            // Get current state
            const state = await this.conversationService.getState(lineUserId);
            if (!state) {
                return [{ type: 'text', text: '❌ เซสชันหมดอายุ กรุณาเริ่มใหม่อีกครั้ง' }];
            }

            // Update conversation state
            await this.conversationService.updateStep(
                lineUserId,
                'ENTER_NOTES',
                {
                    ...state.data,
                    outcome,
                }
            );

            const outcomeLabels: Record<ContactOutcome, string> = {
                CONTACTED: '✅ ติดต่อได้',
                PROMISED: '✅ สัญญาชำระ',
                EXTENSION: '🕐 ขอผ่อนผัน',
                UNREACHABLE: '❌ ติดต่อไม่ได้',
                PAID: '💰 ชำระแล้ว',
            };

            return [
                {
                    type: 'flex',
                    altText: 'บันทึกหมายเหตุ',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📋 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                                { type: 'text', text: 'ขั้นตอนที่ 3: บันทึกหมายเหตุ', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                            ],
                            backgroundColor: '#00AA5B',
                            paddingAll: '15px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: `ผลการติดต่อ: ${outcomeLabels[outcome]}`, size: 'sm', color: '#666666' },
                                { type: 'separator', margin: 'md' },
                                { type: 'text', text: '📝 กรุณาพิมพ์หมายเหตุ:', size: 'md', wrap: true, margin: 'md', weight: 'bold' },
                                { type: 'text', text: 'ตัวอย่าง:\n- ลูกค้าสัญญาชำระวันที่ 15\n- ติดต่อไม่ได้ เบอร์ไม่รับสาย\n- ลูกค้าขอผ่อนผัน 7 วัน', size: 'xs', color: '#999999', wrap: true, margin: 'md' },
                                { type: 'separator', margin: 'lg' },
                                { type: 'text', text: '💡 พิมพ์ "ข้าม" หากไม่ต้องการระบุหมายเหตุ', size: 'xs', color: '#999999', wrap: true, margin: 'md', align: 'center' },
                            ],
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        } catch (error) {
            console.error('Error handling outcome selection:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }];
        }
    }

    /**
     * Handle notes input from text message
     */
    async handleNotesInput(
        lineUserId: string,
        notes: string
    ): Promise<any[]> {
        try {
            // Get current state
            const state = await this.conversationService.getState(lineUserId);
            if (!state || state.data.step !== 'ENTER_NOTES') {
                return [{ type: 'text', text: '❌ เซสชันหมดอายุ กรุณาเริ่มใหม่อีกครั้ง' }];
            }

            // Check if user wants to skip
            const skipNotes = ['ข้าม', 'skip', '-', 'ไม่มี', 'no'].includes(notes.toLowerCase().trim());
            const finalNotes = skipNotes ? 'ไม่มีหมายเหตุ' : notes;

            // Update conversation state
            await this.conversationService.updateStep(
                lineUserId,
                'ENTER_FOLLOW_UP',
                {
                    ...state.data,
                    notes: finalNotes,
                }
            );

            return [
                {
                    type: 'flex',
                    altText: 'กำหนดวันนัดติดตาม',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📋 บันทึกการติดต่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                                { type: 'text', text: 'ขั้นตอนที่ 4: กำหนดวันนัดติดตาม (ถ้ามี)', size: 'sm', color: '#FFFFFF', margin: 'sm' },
                            ],
                            backgroundColor: '#00AA5B',
                            paddingAll: '15px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '📅 ต้องการนัดติดตามหรือไม่?', size: 'md', wrap: true, weight: 'bold' },
                                { type: 'separator', margin: 'md' },
                                { type: 'text', text: 'ถ้าต้องการ กรุณาพิมพ์วันที่ในรูปแบบ:', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
                                { type: 'text', text: '• DD/MM/YYYY (เช่น 15/02/2026)\n• DD-MM-YYYY (เช่น 15-02-2026)\n• วันนี้ +X วัน (เช่น +3, +7)', size: 'xs', color: '#999999', wrap: true, margin: 'sm' },
                                { type: 'separator', margin: 'lg' },
                                { type: 'text', text: '💡 พิมพ์ "ไม่นัด" หากไม่ต้องการนัดติดตาม', size: 'xs', color: '#999999', wrap: true, margin: 'md', align: 'center' },
                            ],
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        } catch (error) {
            console.error('Error handling notes input:', error);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }];
        }
    }

    /**
     * Handle follow-up date input and save contact log
     */
    async handleFollowUpDateInput(
        lineUserId: string,
        dateInput: string,
        officerId: string
    ): Promise<any[]> {
        try {
            // Get current state
            const state = await this.conversationService.getState(lineUserId);
            if (!state || state.data.step !== 'ENTER_FOLLOW_UP') {
                return [{ type: 'text', text: '❌ เซสชันหมดอายุ กรุณาเริ่มใหม่อีกครั้ง' }];
            }

            // Parse date
            let followUpDate: Date | undefined;
            const skipFollowUp = ['ไม่นัด', 'ไม่', 'no', 'skip', '-'].includes(dateInput.toLowerCase().trim());

            if (!skipFollowUp) {
                const parsedDate = this.parseDate(dateInput);
                if (!parsedDate) {
                    return [
                        {
                            type: 'text',
                            text: '❌ รูปแบบวันที่ไม่ถูกต้อง\n\nกรุณาพิมพ์ใหม่ในรูปแบบ:\n• DD/MM/YYYY (เช่น 15/02/2026)\n• DD-MM-YYYY (เช่น 15-02-2026)\n• +X วัน (เช่น +3, +7)\n\nหรือพิมพ์ "ไม่นัด" เพื่อข้าม',
                        },
                    ];
                }

                // Validate date is not in the past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (parsedDate < today) {
                    return [
                        {
                            type: 'text',
                            text: '❌ วันนัดติดตามต้องไม่เป็นวันในอดีต\n\nกรุณาพิมพ์วันที่ใหม่ หรือพิมพ์ "ไม่นัด" เพื่อข้าม',
                        },
                    ];
                }
                
                followUpDate = parsedDate;
            }

            // Save contact log
            await this.contactService.saveContactLog(
                {
                    customerId: state.data.customerId as string,
                    loanId: state.data.loanId as string,
                    contactType: state.data.contactType as ContactType,
                    outcome: state.data.outcome as ContactOutcome,
                    notes: state.data.notes as string,
                    nextFollowUpDate: followUpDate,
                    taskId: state.data.taskId as string | undefined,
                },
                officerId
            );

            // Clear conversation state
            await this.conversationService.clearState(lineUserId);

            // Create success message
            const contactTypeLabels: Record<ContactType, string> = {
                PHONE: '📞 โทรศัพท์',
                VISIT: '📊 เยี่ยมบ้าน',
                EMAIL: '📞 อีเมล',
                LINE: '📞 LINE',
            };

            const outcomeLabels: Record<ContactOutcome, string> = {
                CONTACTED: '✅ ติดต่อได้',
                PROMISED: '✅ สัญญาชำระ',
                EXTENSION: '🕐 ขอผ่อนผัน',
                UNREACHABLE: '❌ ติดต่อไม่ได้',
                PAID: '💰 ชำระแล้ว',
            };

            const contactType = state.data.contactType as ContactType;
            const outcome = state.data.outcome as ContactOutcome;
            const customerName = state.data.customerName as string;
            const notes = state.data.notes as string;

            return [
                {
                    type: 'flex',
                    altText: 'บันทึกสำเร็จ',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: '✅ บันทึกสำเร็จ', weight: 'bold', size: 'xl', color: '#00AA5B' },
                            ],
                            backgroundColor: '#E8F5E9',
                            paddingAll: '15px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: 'บันทึกการติดต่อเรียบร้อยแล้ว', size: 'md', wrap: true, weight: 'bold' },
                                { type: 'separator', margin: 'lg' },
                                { type: 'text', text: '📋 สรุปการติดต่อ:', size: 'sm', weight: 'bold', margin: 'lg' },
                                { type: 'text', text: `ลูกค้า: ${customerName}`, size: 'xs', color: '#666666', margin: 'sm' },
                                { type: 'text', text: `ช่องทาง: ${contactTypeLabels[contactType]}`, size: 'xs', color: '#666666', margin: 'xs' },
                                { type: 'text', text: `ผลการติดต่อ: ${outcomeLabels[outcome]}`, size: 'xs', color: '#666666', margin: 'xs' },
                                { type: 'text', text: `หมายเหตุ: ${notes}`, size: 'xs', color: '#666666', margin: 'xs', wrap: true },
                                ...(followUpDate ? [{
                                    type: 'text',
                                    text: `นัดติดตาม: ${followUpDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                                    size: 'xs',
                                    color: '#00AA5B',
                                    margin: 'xs',
                                    weight: 'bold',
                                }] : []),
                                { type: 'separator', margin: 'lg' },
                                { type: 'text', text: '💡 พิมพ์ "งาน" เพื่อดูงานถัดไป', size: 'xs', color: '#999999', margin: 'lg', align: 'center' },
                            ],
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        } catch (error) {
            console.error('Error handling follow-up date input:', error);
            await this.conversationService.clearState(lineUserId);
            return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง' }];
        }
    }

    /**
     * Parse date from various formats
     */
    private parseDate(input: string): Date | null {
        const trimmed = input.trim();

        // Format: +X days
        const plusDaysMatch = trimmed.match(/^\+(\d+)$/);
        if (plusDaysMatch && plusDaysMatch[1]) {
            const days = parseInt(plusDaysMatch[1], 10);
            const date = new Date();
            date.setDate(date.getDate() + days);
            date.setHours(0, 0, 0, 0);
            return date;
        }

        // Format: DD/MM/YYYY or DD-MM-YYYY
        const dateMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
            const day = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
            const year = parseInt(dateMatch[3], 10);
            
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            
            // Validate date
            if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
                return date;
            }
        }

        return null;
    }
}

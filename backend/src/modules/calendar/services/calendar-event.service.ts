import { FastifyRequest } from 'fastify';
import { CalendarEventRepository } from '../repositories/calendar-event.repository';
import { BranchRepository } from '@branches/repositories/branch.repository';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { CustomerRepository } from '@customers/repositories/customer.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { NotificationService } from '@notifications/services/notification.service';
import { CreateCalendarEventInput, UpdateCalendarEventInput } from '../models/calendar-event.model';
import { LineService } from '@line/services/core/line.service';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ensureHttps } from '@config/env.config';

/**
 * Calendar Event Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class CalendarEventService {
    private calendarEventRepository: CalendarEventRepository;
    private branchRepository: BranchRepository;
    private loanRepository: LoanRepository;
    private customerRepository: CustomerRepository;
    private userRepository: UserRepository;
    private notificationService: NotificationService;
    private lineService: LineService;

    constructor() {
        this.calendarEventRepository = new CalendarEventRepository();
        this.branchRepository = new BranchRepository();
        this.loanRepository = new LoanRepository();
        this.customerRepository = new CustomerRepository();
        this.userRepository = new UserRepository();
        this.notificationService = new NotificationService();
        this.lineService = new LineService();
    }

    /**
     * Create calendar event with validation
     */
    async createEvent(
        _request: FastifyRequest,
        input: CreateCalendarEventInput,
        branchId: string | undefined,
        createdBy: string
    ) {
        // Validate branch if provided
        if (branchId) {
            const branch = await this.branchRepository.findById(branchId);
            if (!branch) {
                throw new Error('Branch not found');
            }
        }

        // Validate loan if provided
        if (input.loanId) {
            const loan = await this.loanRepository.findById(input.loanId);
            if (!loan) {
                throw new Error('Loan not found');
            }
        }

        // Validate customer if provided
        if (input.customerId) {
            const customer = await this.customerRepository.findById(input.customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }
        }

        // Validate assignedTo if provided
        if (input.assignedTo) {
            const assignee = await this.userRepository.findById(input.assignedTo);
            if (!assignee) {
                throw new Error('Assigned user not found');
            }
        }

        // Validate dates
        const startDate = new Date(input.startDate);
        if (input.endDate) {
            const endDate = new Date(input.endDate);
            if (endDate < startDate) {
                throw new Error('End date must be after start date');
            }
        }

        // Create event
        const event = await this.calendarEventRepository.create({
            ...input,
            branchId,
            createdBy,
        });

        // Create task assignment if assignedTo is provided (Manager feature)
        if (input.assignedTo) {
            await this.calendarEventRepository.createTaskAssignment({
                taskId: event.id,
                taskType: 'OTHER',
                assignedTo: input.assignedTo,
                assignedBy: createdBy,
                priority: input.priority || 'MEDIUM',
                dueDate: startDate,
                status: 'PENDING',
                notes: input.description || input.title,
            });

            // Send notification to assigned user
            await this.sendTaskAssignmentNotification(event, input.assignedTo, createdBy, input.priority || 'MEDIUM');
        }

        // Send LINE notifications based on creator's role
        try {
            // Get creator's role
            const creator = await this.userRepository.findById(createdBy);

            console.log('[Calendar Event] Creator info:', {
                userId: createdBy,
                role: creator?.role,
                branchId: branchId,
            });

            if (creator) {
                if (creator.role === 'ADMIN') {
                    // Admin: Send to all staff in all branches
                    console.log('[Calendar Event] Admin created event - sending to all staff');
                    await this.sendEventNotificationToAllStaff(event);
                } else if (branchId) {
                    // Officer/Manager: Send only to staff in the same branch
                    console.log('[Calendar Event] Officer/Manager created event - sending to branch:', branchId);
                    await this.sendEventNotificationToStaff(event, branchId);
                } else {
                    console.log('[Calendar Event] No branchId provided for non-admin user');
                }
            } else {
                console.log('[Calendar Event] Creator not found');
            }
        } catch (error) {
            console.error('[Calendar Event] Failed to send LINE notifications:', error);
            // Don't fail the event creation if notification fails
        }

        // Create notifications for attendees via NotificationService
        if (input.attendees && input.attendees.length > 0) {
            for (const userId of input.attendees) {
                try {
                    await this.notificationService.notify({
                        userId,
                        type: 'CALENDAR_EVENT' as any,
                        title: `📅 กิจกรรมใหม่: ${event.title}`,
                        message: `คุณได้รับเชิญเข้าร่วม: ${input.title}`,
                        link: `/calendar`,
                        priority: 'MEDIUM' as any,
                        dedupKey: `event-attendee-${event.id}-${userId}`,
                        dedupWindow: 24,
                        metadata: { eventId: event.id },
                    });
                } catch (err) {
                    console.error(`[Calendar Event] Failed to notify attendee ${userId}:`, err);
                }
            }
        }

        return event;
    }

    /**
     * Send LINE notification to all staff (Admin only)
     */
    private async sendEventNotificationToAllStaff(event: any) {
        // Get all Loan Officers, Branch Managers, and Admins
        const staff = await this.userRepository.findAllStaff();

        console.log('[Calendar Event] Found staff for all branches:', staff.length);

        if (!staff || staff.length === 0) {
            console.log('[Calendar Event] No staff found with LINE IDs');
            return;
        }

        // Send LINE notification to each staff member
        const message = this.createEventNotificationMessage(event);

        for (const user of staff) {
            if (user.lineUserId) {
                try {
                    await this.lineService.pushMessage(user.lineUserId, [message]);
                    console.log(`[Calendar Event] Sent notification to ${user.firstName} ${user.lastName} (${user.lineUserId})`);
                } catch (error) {
                    console.error(`[Calendar Event] Failed to send to ${user.firstName} ${user.lastName}:`, error);
                }
            }
        }
    }

    /**
     * Send task assignment notification (Manager feature)
     */
    private async sendTaskAssignmentNotification(event: any, assignedToId: string, assignedById: string, priority: string) {
        try {
            const assignee = await this.userRepository.findById(assignedToId);
            const assigner = await this.userRepository.findById(assignedById);

            if (!assignee) {
                console.log('[Task Assignment] Assignee not found');
                return;
            }

            // Create in-app notification via NotificationService
            await this.notificationService.notify({
                userId: assignedToId,
                type: 'TASK_ASSIGNED' as any,
                title: `งานใหม่: ${event.title}`,
                message: `${assigner ? `${assigner.firstName} ${assigner.lastName}` : 'ผู้จัดการ'} มอบหมายงานให้คุณ`,
                link: `/calendar`,
                priority: priority as any,
                metadata: {
                    eventId: event.id,
                    assignedBy: assignedById,
                    priority: priority,
                },
                dedupWindow: 1,
            });

            // Send LINE notification if user has LINE connected
            if (assignee.lineUserId) {
                const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'ผู้จัดการ';
                const message = this.createTaskAssignmentMessage(event, assignerName, priority);
                await this.lineService.pushMessage(assignee.lineUserId, [message]);
                console.log(`[Task Assignment] Sent LINE notification to ${assignee.firstName} ${assignee.lastName}`);
            }
        } catch (error) {
            console.error('[Task Assignment] Failed to send notification:', error);
        }
    }

    /**
     * Create task assignment LINE message
     */
    private createTaskAssignmentMessage(event: any, assignerName: string, priority: string) {
        const eventDate = format(new Date(event.startDate), 'PPP', { locale: th });
        const eventTime = event.allDay ? 'ทั้งวัน' : format(new Date(event.startDate), 'HH:mm', { locale: th });

        const priorityConfig: Record<string, { label: string; color: string; emoji: string }> = {
            'LOW': { label: 'ปกติ', color: '#999999', emoji: '📋' },
            'MEDIUM': { label: 'ปานกลาง', color: '#FFA500', emoji: '⚠️' },
            'HIGH': { label: 'สูง', color: '#FF6B6B', emoji: '🔴' },
            'URGENT': { label: 'เร่งด่วน', color: '#DC143C', emoji: '🚨' },
        };

        const config = priorityConfig[priority] || priorityConfig['MEDIUM']!;

        return {
            type: 'flex',
            altText: `${config.emoji} งานใหม่: ${event.title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${config.emoji} งานใหม่ถูกมอบหมาย`,
                            weight: 'bold',
                            size: 'xl',
                            color: '#FFFFFF',
                        },
                        {
                            type: 'text',
                            text: `ความเร่งด่วน: ${config.label}`,
                            size: 'sm',
                            color: '#FFFFFF',
                            margin: 'sm',
                        },
                    ],
                    backgroundColor: config.color,
                    paddingAll: '20px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: event.title,
                            weight: 'bold',
                            size: 'lg',
                            wrap: true,
                            color: '#1A1A1A',
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'มอบหมายโดย:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: assignerName,
                                            size: 'sm',
                                            color: '#1A1A1A',
                                            weight: 'bold',
                                            flex: 1,
                                            align: 'end',
                                        },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'กำหนดเสร็จ:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: eventDate,
                                            size: 'sm',
                                            color: '#1A1A1A',
                                            flex: 1,
                                            align: 'end',
                                            wrap: true,
                                        },
                                    ],
                                    margin: 'sm',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'เวลา:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: eventTime,
                                            size: 'sm',
                                            color: '#1A1A1A',
                                            flex: 1,
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'sm',
                                },
                            ],
                            margin: 'lg',
                            spacing: 'sm',
                        },
                        ...(event.description ? [{
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'รายละเอียด:',
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'text',
                                    text: event.description,
                                    size: 'sm',
                                    color: '#1A1A1A',
                                    wrap: true,
                                    margin: 'xs',
                                },
                            ],
                        }] : []),
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
                                type: 'uri',
                                label: '📋 ดูรายละเอียด',
                                uri: `${ensureHttps(process.env.FRONTEND_URL || '')}/calendar`,
                            },
                            style: 'primary',
                            color: config.color,
                        },
                    ],
                    paddingAll: '15px',
                },
            },
        };
    }

    /**
     * Send LINE notification to branch staff when event is created
     */
    private async sendEventNotificationToStaff(event: any, branchId: string) {
        // Get all Loan Officers and Branch Managers in the branch
        const staff = await this.userRepository.findByBranchAndRoles(branchId, ['loan_officer', 'branch_manager']);

        console.log('[Calendar Event] Found staff for branch', branchId, ':', staff.length);

        if (!staff || staff.length === 0) {
            console.log('[Calendar Event] No staff found with LINE IDs in branch');
            return;
        }

        const message = this.createEventNotificationMessage(event);

        // Send to each staff member
        let successCount = 0;
        let failCount = 0;

        for (const staffMember of staff) {
            if (staffMember.lineUserId) {
                try {
                    console.log('[Calendar Event] Sending to:', staffMember.email, 'LINE ID:', staffMember.lineUserId);
                    await this.lineService.pushMessage(staffMember.lineUserId, [message]);
                    successCount++;
                } catch (error) {
                    console.error(`[Calendar Event] Failed to send LINE notification to ${staffMember.email}:`, error);
                    failCount++;
                }
            } else {
                console.log('[Calendar Event] Staff member has no LINE ID:', staffMember.email);
            }
        }

        console.log(`[Calendar Event] LINE notifications sent: ${successCount} success, ${failCount} failed`);
    }

    /**
     * Create LINE notification message for calendar event
     */
    private createEventNotificationMessage(event: any) {
        const eventDate = format(new Date(event.startDate), 'PPP', { locale: th });
        const eventTime = event.allDay ? 'ทั้งวัน' : format(new Date(event.startDate), 'HH:mm', { locale: th });

        const eventTypeLabels: Record<string, string> = {
            'PAYMENT_DUE': '💰 นัดชำระเงิน',
            'APPOINTMENT': '👤 นัดพบลูกค้า',
            'CUSTOMER_VISIT': '🏢 เยี่ยมลูกค้า',
            'FOLLOW_UP': '📞 ติดตามหนี้',
            'COLLECTION': '💵 เก็บเงิน',
            'MEETING': '📋 ประชุม',
            'INTERNAL_MEETING': '🏛️ ประชุมภายใน',
            'REMINDER': '⏰ แจ้งเตือน',
            'HOLIDAY': '🎉 วันหยุด',
            'OTHER': '📌 อื่นๆ',
        };

        const eventTypeLabel = eventTypeLabels[event.eventType] || '📌 กิจกรรม';

        // Create LINE message
        return {
            type: 'flex',
            altText: `📅 กิจกรรมใหม่: ${event.title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '📅 กิจกรรมใหม่',
                            weight: 'bold',
                            size: 'xl',
                            color: '#FFFFFF',
                        },
                        {
                            type: 'text',
                            text: 'มีกิจกรรมใหม่ในปฏิทิน',
                            size: 'sm',
                            color: '#FFFFFF',
                            margin: 'sm',
                        },
                    ],
                    backgroundColor: '#0065FB',
                    paddingAll: '20px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: event.title,
                            weight: 'bold',
                            size: 'lg',
                            wrap: true,
                            color: '#1A1A1A',
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ประเภท:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: eventTypeLabel,
                                            size: 'sm',
                                            color: '#1A1A1A',
                                            weight: 'bold',
                                            flex: 1,
                                            align: 'end',
                                        },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'วันที่:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: eventDate,
                                            size: 'sm',
                                            color: '#1A1A1A',
                                            flex: 1,
                                            align: 'end',
                                            wrap: true,
                                        },
                                    ],
                                    margin: 'sm',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'เวลา:',
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 0,
                                        },
                                        {
                                            type: 'text',
                                            text: eventTime,
                                            size: 'sm',
                                            color: '#1A1A1A',
                                            flex: 1,
                                            align: 'end',
                                        },
                                    ],
                                    margin: 'sm',
                                },
                            ],
                            margin: 'lg',
                            spacing: 'sm',
                        },
                        ...(event.description ? [{
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'รายละเอียด:',
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'text',
                                    text: event.description,
                                    size: 'sm',
                                    color: '#1A1A1A',
                                    wrap: true,
                                    margin: 'xs',
                                },
                            ],
                        }] : []),
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
                                type: 'uri',
                                label: '📅 ดูในปฏิทิน',
                                uri: `${ensureHttps(process.env.FRONTEND_URL || '')}/calendar`,
                            },
                            style: 'primary',
                            color: '#0065FB',
                        },
                    ],
                    paddingAll: '15px',
                },
            },
        };
    }

    /**
     * Get event by ID
     */
    async getEvent(eventId: string) {
        const event = await this.calendarEventRepository.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        return event;
    }

    /**
     * List events
     */
    async listEvents(params: {
        page: number;
        limit: number;
        branchId?: string;
        eventType?: string;
        category?: string;
        dateFrom?: string;
        dateTo?: string;
        loanId?: string;
        customerId?: string;
    }) {
        const result = await this.calendarEventRepository.list({
            page: params.page,
            limit: params.limit,
            branchId: params.branchId,
            eventType: params.eventType as any,
            category: params.category as any,
            dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
            dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
            loanId: params.loanId,
            customerId: params.customerId,
        });

        return {
            events: result.events,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
    }

    /**
     * Update event
     */
    async updateEvent(
        _request: FastifyRequest,
        eventId: string,
        input: UpdateCalendarEventInput,
        userId: string
    ) {
        // Check if event exists
        const existingEvent = await this.calendarEventRepository.findById(eventId);
        if (!existingEvent) {
            throw new Error('Event not found');
        }

        // Only creator can update
        if (existingEvent.createdBy !== userId) {
            throw new Error('Only event creator can update');
        }

        // Validate dates if provided
        if (input.startDate && input.endDate) {
            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);
            if (endDate < startDate) {
                throw new Error('End date must be after start date');
            }
        }

        // Update event
        const updateData: any = {};
        if (input.title) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.startDate) updateData.startDate = new Date(input.startDate);
        if (input.endDate !== undefined) updateData.endDate = input.endDate ? new Date(input.endDate) : null;
        if (input.allDay !== undefined) updateData.allDay = input.allDay;
        if (input.eventType) updateData.eventType = input.eventType;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.loanId !== undefined) updateData.loanId = input.loanId;
        if (input.customerId !== undefined) updateData.customerId = input.customerId;
        if (input.location !== undefined) updateData.location = input.location;
        if (input.attendees !== undefined) updateData.attendees = input.attendees;
        if (input.recurring !== undefined) updateData.recurring = input.recurring;
        if (input.recurrenceRule !== undefined) updateData.recurrenceRule = input.recurrenceRule;
        if (input.reminderMinutes !== undefined) updateData.reminderMinutes = input.reminderMinutes;

        const event = await this.calendarEventRepository.update(eventId, updateData);

        return event;
    }

    /**
     * Delete event
     */
    async deleteEvent(eventId: string, userId: string) {
        // Check if event exists
        const existingEvent = await this.calendarEventRepository.findById(eventId);
        if (!existingEvent) {
            throw new Error('Event not found');
        }

        // Only creator can delete
        if (existingEvent.createdBy !== userId) {
            throw new Error('Only event creator can delete');
        }

        // Delete event
        await this.calendarEventRepository.delete(eventId);

        return { success: true };
    }
}

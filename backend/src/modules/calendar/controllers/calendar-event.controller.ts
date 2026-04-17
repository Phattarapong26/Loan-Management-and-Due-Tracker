import { FastifyRequest, FastifyReply } from 'fastify';
import { CalendarEventService } from '../services/calendar-event.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import {
    CreateCalendarEventInput,
    UpdateCalendarEventInput,
    ListCalendarEventsQuery,
} from '../models/calendar-event.model';

/**
 * Calendar Event Controller - Request/Response ONLY
 */
export class CalendarEventController {
    private calendarEventService: CalendarEventService;

    constructor() {
        this.calendarEventService = new CalendarEventService();
    }

    /**
     * Create calendar event
     */
    create = async (
        request: FastifyRequest<{ Body: CreateCalendarEventInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.calendarEventService.createEvent(
                request,
                request.body,
                request.user!.branchId || undefined,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get event by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.calendarEventService.getEvent(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List events
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListCalendarEventsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const role = request.user!.role;
            const userBranchId = request.user!.branchId;
            
            // Admin can see all branches, others see only their branch
            const filterBranchId = role === 'ADMIN' 
                ? request.query.branchId  // Admin: use query param (undefined = all branches)
                : (request.query.branchId || userBranchId);  // Others: use their branch
            
            const result = await this.calendarEventService.listEvents({
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                branchId: filterBranchId,
                eventType: request.query.eventType,
                category: request.query.category,
                dateFrom: request.query.dateFrom,
                dateTo: request.query.dateTo,
                loanId: request.query.loanId,
                customerId: request.query.customerId,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update event
     */
    update = async (
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateCalendarEventInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.calendarEventService.updateEvent(
                request,
                request.params.id,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Delete event
     */
    delete = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.calendarEventService.deleteEvent(
                request.params.id,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

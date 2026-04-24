import { FastifyRequest, FastifyReply } from 'fastify';
import { ContactLogService } from '../services/contact-log.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import {
    CreateContactLogInput,
    ListContactLogsQuery,
    GetRemindersQuery,
} from '../models/contact-log.model';

/**
 * Contact Log Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class ContactLogController {
    private contactLogService: ContactLogService;

    constructor() {
        this.contactLogService = new ContactLogService();
    }

    /**
     * Create contact log
     */
    create = async (
        request: FastifyRequest<{ Body: CreateContactLogInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.contactLogService.createContactLog(
                request,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถบันทึกบันทึกการติดต่อได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง', 400, 'VALIDATION_ERROR');
        }
    };

    /**
     * Get contact log by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.contactLogService.getContactLog(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่พบบันทึกการติดต่อที่ต้องการ', 404, 'NOT_FOUND');
        }
    };

    /**
     * List contact logs
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListContactLogsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.contactLogService.listContactLogs({
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                customerId: request.query.customerId,
                loanId: request.query.loanId,
                officerId: request.query.officerId || request.user!.userId,
                contactStatus: request.query.contactStatus,
                contactMethod: request.query.contactMethod,
                dateFrom: request.query.dateFrom,
                dateTo: request.query.dateTo,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถโหลดรายการบันทึกการติดต่อได้', 500, 'LOAD_ERROR');
        }
    };

    /**
     * Get reminders
     */
    getReminders = async (
        request: FastifyRequest<{ Querystring: GetRemindersQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const role = request.user!.role;
            const userBranchId = request.user!.branchId;
            
            // Admin can see all branches, others see only their branch
            const filterBranchId = role === 'ADMIN' ? undefined : userBranchId;
            
            const result = await this.contactLogService.getReminders({
                ...request.query,
                officerId: request.query.officerId || request.user!.userId,
                branchId: filterBranchId,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถโหลดรายการแจ้งเตือนการติดต่อได้', 500, 'LOAD_ERROR');
        }
    };

    /**
     * Get uncontacted customers
     */
    getUncontactedCustomers = async (
        request: FastifyRequest<{ Querystring: { daysWithoutContact?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const role = request.user!.role;
            const userBranchId = request.user!.branchId;
            
            // Admin can see all branches, others see only their branch
            const filterBranchId = role === 'ADMIN' ? undefined : userBranchId;
            
            const result = await this.contactLogService.getUncontactedCustomers({
                officerId: request.user!.userId,
                branchId: filterBranchId,
                daysWithoutContact: request.query.daysWithoutContact
                    ? parseInt(request.query.daysWithoutContact, 10)
                    : 2,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถโหลดรายการลูกค้าที่ยังไม่ได้ติดต่อได้', 500, 'LOAD_ERROR');
        }
    };
}

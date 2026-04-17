import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomerService } from '../services/customer.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import {
    CreateCustomerInput,
    UpdateCustomerInput,
    ListCustomersQuery,
} from '../models/customer.model';

/**
 * Customer Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class CustomerController {
    private customerService: CustomerService;

    constructor() {
        this.customerService = new CustomerService();
    }

    /**
     * Create customer
     */
    create = async (
        request: FastifyRequest<{ Body: CreateCustomerInput }>,
        reply: FastifyReply
    ) => {
        try {
            const role = request.user!.role;
            const userId = request.user!.userId;
            const bodyAny = request.body as any;

            // Determine branchId: ADMIN picks from body, others use their own branch
            const branchId = role === 'ADMIN' ? bodyAny.branchId : request.user!.branchId;

            if (!branchId) {
                return ResponseUtil.error(
                    reply,
                    'กรุณาเลือกสาขาก่อนเพิ่มลูกค้า',
                    400,
                    'BRANCH_ID_REQUIRED'
                );
            }

            // Determine responsible officer (createdBy):
            // - ADMIN/MANAGER can assign to a specific officer via officerId
            // - OFFICER: always themselves
            let responsibleUserId = userId;
            if ((role === 'ADMIN' || role === 'MANAGER') && bodyAny.officerId) {
                responsibleUserId = bodyAny.officerId;
            }

            const result = await this.customerService.createCustomer(
                request,
                request.body,
                branchId,
                responsibleUserId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            console.error('[Customer Controller] Create error:', error);
            console.error('[Customer Controller] Error message:', error.message);
            console.error('[Customer Controller] Error stack:', error.stack);
            
            // แยก Error Types
            if (error.message.includes('duplicate') || error.message.includes('already exists')) {
                return ResponseUtil.error(reply, error.message, 400, 'DUPLICATE_ENTRY');
            }
            
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get customer by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const userRole = request.user!.role;
            const branchId = request.user!.branchId;
            
            console.log('[Customer Controller] getById:', {
                customerId: request.params.id,
                userRole,
                branchId,
                willFilterByBranch: userRole !== 'ADMIN'
            });
            
            // ADMIN can see all customers, others are restricted to their branch
            const result = userRole === 'ADMIN' 
                ? await this.customerService.getCustomer(request.params.id, undefined)
                : await this.customerService.getCustomer(request.params.id, branchId);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            console.error('[Customer Controller] getById error:', error.message);
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List customers
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListCustomersQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            const userId = request.user!.userId;
            const role = request.user!.role;

            // Determine officerId filter based on role
            let officerId: string | undefined;
            if (role === 'OFFICER' || role === 'USER') {
                // Officers can only see their own customers
                officerId = userId;
            } else if (request.query.officerId) {
                // Managers and admins can filter by specific officer
                officerId = request.query.officerId;
            }

            // Admin can see all branches, optionally filter by branchId. Others see only their branch.
            const filterBranchId = role === 'ADMIN' ? request.query.branchId : branchId;

            const queryParams: {
                branchId?: string;
                officerId?: string;
                page: number;
                limit: number;
                status?: 'ACTIVE' | 'INACTIVE';
                search?: string;
            } = {
                branchId: filterBranchId,
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                status: request.query.status,
                search: request.query.search,
            };

            if (officerId) {
                queryParams.officerId = officerId;
            }

            const result = await this.customerService.listCustomers(queryParams);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update customer
     */
    update = async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: UpdateCustomerInput;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            if (!branchId) {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            const result = await this.customerService.updateCustomer(
                request,
                request.params.id,
                request.body,
                branchId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            console.error('[Customer Controller] Update error:', error);
            console.error('[Customer Controller] Error message:', error.message);
            console.error('[Customer Controller] Customer ID:', request.params.id);
            console.error('[Customer Controller] Request body:', request.body);
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update customer with AI-extracted data
     */
    updateWithAIData = async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: { aiData: any; confidenceScore: number; warnings: string[] };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            if (!branchId) {
                return ResponseUtil.error(reply, 'Branch ID is required', 400);
            }

            const result = await this.customerService.updateWithAIData(
                request.params.id,
                request.body.aiData,
                request.body.confidenceScore,
                request.body.warnings,
                branchId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Generate LINE QR code for customer registration
     */
    generateLINEQR = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            console.log('[generateLINEQR] Customer ID:', request.params.id);
            console.log('[generateLINEQR] User ID:', request.user!.userId);
            
            const { lineQRRegistration } = await import('@line/services/registration/line-qr-registration.service');
            
            const result = await lineQRRegistration.generateCustomerQRCode(
                request.params.id,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            console.error('[generateLINEQR] Error:', error);
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Delete customer
     */
    delete = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            const role = request.user!.role;
            
            // Admin can delete from any branch, others only from their branch
            const filterBranchId = role === 'ADMIN' ? undefined : branchId;

            await this.customerService.deleteCustomer(
                request.params.id,
                filterBranchId
            );

            return ResponseUtil.success(reply, { message: 'Customer deleted successfully' });
        } catch (error: any) {
            console.error('[Customer Controller] Delete error:', error);
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Create customer from document (parsed business profile)
     */
    createFromDocument = async (
        request: FastifyRequest<{ Body: { documentId: string; businessProfile: any } }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            if (!branchId) {
                return ResponseUtil.error(
                    reply,
                    'Branch ID is required',
                    400,
                    'BRANCH_ID_REQUIRED'
                );
            }

            const customer = await this.customerService.createFromDocument(
                request.body.documentId,
                request.body.businessProfile,
                request.user!.userId,
                branchId
            );

            return ResponseUtil.success(reply, customer, 201);
        } catch (error: any) {
            console.error('[CustomerController.createFromDocument] Error:', error);
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

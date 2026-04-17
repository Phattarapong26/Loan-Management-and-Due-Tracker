import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/user.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import {
    CreateUserInput,
    UpdateUserInput,
    ListUsersQuery,
    ResetPasswordInput,
} from '../models/user.model';

/**
 * User Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    /**
     * Create user
     */
    create = async (
        request: FastifyRequest<{ Body: CreateUserInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.userService.createUser(request, request.body);

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get user by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.userService.getUser(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List users
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListUsersQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const role = request.user!.role;
            const userBranchId = request.user!.branchId;
            
            // Admin can see all branches, others see only their branch
            const filterBranchId = role === 'ADMIN' 
                ? request.query.branchId  // Admin: use query param (undefined = all branches)
                : (request.query.branchId || userBranchId);  // Others: use their branch
            
            const result = await this.userService.listUsers({
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                role: request.query.role,
                status: request.query.status,
                branchId: filterBranchId,
                search: request.query.search,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update user
     */
    update = async (
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.userService.updateUser(
                request,
                request.params.id,
                request.body
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Reset password
     */
    resetPassword = async (
        request: FastifyRequest<{ Params: { id: string }; Body: ResetPasswordInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.userService.resetPassword(
                request,
                request.params.id,
                request.body
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Toggle user status
     */
    toggleStatus = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.userService.toggleUserStatus(
                request,
                request.params.id
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

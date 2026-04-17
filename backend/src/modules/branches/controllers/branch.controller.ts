import { FastifyRequest, FastifyReply } from 'fastify';
import { BranchService } from '../services/branch.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { CreateBranchInput, UpdateBranchInput, ListBranchesQuery } from '../models/branch.model';

/**
 * Branch Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class BranchController {
    private branchService: BranchService;

    constructor() {
        this.branchService = new BranchService();
    }

    /**
     * Create branch
     */
    create = async (
        request: FastifyRequest<{ Body: CreateBranchInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.branchService.createBranch(request, request.body);

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get branch by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.branchService.getBranch(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * Get branch with statistics
     */
    getWithStats = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.branchService.getBranchWithStats(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List branches
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListBranchesQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.branchService.listBranches({
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                status: request.query.status,
                search: request.query.search,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update branch
     */
    update = async (
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateBranchInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.branchService.updateBranch(
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
     * Delete branch
     */
    delete = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            await this.branchService.deleteBranch(request.params.id);

            return ResponseUtil.success(reply, null, 204);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get all branches (for dropdowns)
     */
    getAll = async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await this.branchService.getAllBranches();

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get branch employees
     */
    getEmployees = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.branchService.getBranchEmployees(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };
}

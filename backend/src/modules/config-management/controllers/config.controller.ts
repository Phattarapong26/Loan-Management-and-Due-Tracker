import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '../services/config.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import {
    CreateSystemConfigInput,
    UpdateSystemConfigInput,
    CreateProductConfigInput,
    UpdateProductConfigInput,
    ListSystemConfigsQuery,
    ListProductConfigsQuery,
} from '../models/config.model';

/**
 * Config Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class ConfigController {
    private configService: ConfigService;

    constructor() {
        this.configService = new ConfigService();
    }

    // ========== System Config Endpoints ==========

    /**
     * Create system config
     */
    createSystemConfig = async (
        request: FastifyRequest<{ Body: CreateSystemConfigInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.createSystemConfig(
                request,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update system config
     */
    updateSystemConfig = async (
        request: FastifyRequest<{
            Params: { key: string };
            Body: UpdateSystemConfigInput;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.updateSystemConfig(
                request,
                request.params.key,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * Get system config by key
     */
    getSystemConfig = async (
        request: FastifyRequest<{ Params: { key: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.getSystemConfig(request.params.key);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List system configs
     */
    listSystemConfigs = async (
        request: FastifyRequest<{ Querystring: ListSystemConfigsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.listSystemConfigs({
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                category: request.query.category,
                search: request.query.search,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Delete system config
     */
    deleteSystemConfig = async (
        request: FastifyRequest<{ Params: { key: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.deleteSystemConfig(request.params.key);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    // ========== Product Config Endpoints ==========

    /**
     * Create product config
     */
    createProductConfig = async (
        request: FastifyRequest<{ Body: CreateProductConfigInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.createProductConfig(
                request,
                request.body,
                request.user!.userId
            );

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update product config
     */
    updateProductConfig = async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: UpdateProductConfigInput;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.updateProductConfig(
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
     * Get product config by ID
     */
    getProductConfig = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.getProductConfig(request.params.id);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List product configs
     */
    listProductConfigs = async (
        request: FastifyRequest<{ Querystring: ListProductConfigsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.configService.listProductConfigs({
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
     * Get active product configs (for dropdowns)
     */
    getActiveProductConfigs = async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await this.configService.getActiveProductConfigs();

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

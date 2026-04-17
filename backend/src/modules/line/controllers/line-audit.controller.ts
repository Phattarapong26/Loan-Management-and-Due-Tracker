import { FastifyRequest, FastifyReply } from 'fastify';
import { LineAuditService } from '../services/line-audit.service';
import {
    listLineAuditLogsQuerySchema,
    disconnectLineUserSchema,
} from '../models/line-audit.model';

/**
 * LINE Audit Controller - HTTP request handling
 */
export class LineAuditController {
    private lineAuditService: LineAuditService;

    constructor() {
        this.lineAuditService = new LineAuditService();
    }

    /**
     * List LINE audit logs
     */
    listAuditLogs = async (
        request: FastifyRequest<{
            Querystring: any;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const query = listLineAuditLogsQuerySchema.parse(request.query);
            const result = await this.lineAuditService.listAuditLogs(query);

            return reply.code(200).send({
                success: true,
                data: result,
            });
        } catch (error) {
            return reply.code(400).send({
                success: false,
                error: (error as Error).message,
            });
        }
    };

    /**
     * Get user LINE status and audit logs
     */
    getUserLineStatus = async (
        request: FastifyRequest<{
            Params: { userId: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { userId } = request.params;
            const result = await this.lineAuditService.getUserLineStatus(userId);

            return reply.code(200).send({
                success: true,
                data: result,
            });
        } catch (error) {
            return reply.code(400).send({
                success: false,
                error: (error as Error).message,
            });
        }
    };

    /**
     * Get customer LINE status and audit logs
     */
    getCustomerLineStatus = async (
        request: FastifyRequest<{
            Params: { customerId: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { customerId } = request.params;
            const result = await this.lineAuditService.getCustomerLineStatus(customerId);

            return reply.code(200).send({
                success: true,
                data: result,
            });
        } catch (error) {
            return reply.code(400).send({
                success: false,
                error: (error as Error).message,
            });
        }
    };

    /**
     * Get audit logs by LINE User ID
     */
    getLineUserAuditLogs = async (
        request: FastifyRequest<{
            Params: { lineUserId: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { lineUserId } = request.params;
            const result = await this.lineAuditService.getLineUserAuditLogs(lineUserId);

            return reply.code(200).send({
                success: true,
                data: result,
            });
        } catch (error) {
            return reply.code(400).send({
                success: false,
                error: (error as Error).message,
            });
        }
    };

    /**
     * Disconnect user LINE account
     */
    disconnectUserLineAccount = async (
        request: FastifyRequest<{
            Params: { userId: string };
            Body: any;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { userId } = request.params;
            const body = disconnectLineUserSchema.parse(request.body);
            
            const result = await this.lineAuditService.disconnectUserLineAccount(
                request,
                userId,
                body
            );

            return reply.code(200).send({
                success: true,
                data: result,
            });
        } catch (error) {
            return reply.code(400).send({
                success: false,
                error: (error as Error).message,
            });
        }
    };

    /**
     * Disconnect customer LINE account
     */
    disconnectCustomerLineAccount = async (
        request: FastifyRequest<{
            Params: { customerId: string };
            Body: any;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { customerId } = request.params;
            const body = disconnectLineUserSchema.parse(request.body);
            
            const result = await this.lineAuditService.disconnectCustomerLineAccount(
                request,
                customerId,
                body
            );

            return reply.code(200).send({
                success: true,
                data: result,
            });
        } catch (error) {
            return reply.code(400).send({
                success: false,
                error: (error as Error).message,
            });
        }
    };
}
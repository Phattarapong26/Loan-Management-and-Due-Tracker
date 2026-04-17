import { FastifyRequest, FastifyReply } from 'fastify';
import { MonitoringService } from '../services/monitoring.service';
import { ResponseUtil } from '../../../core/utils/formatting/response.util';
import { AuditLogQuery } from '../models/monitoring.model';

export class MonitoringController {
    private monitoringService: MonitoringService;

    constructor() {
        this.monitoringService = new MonitoringService();
    }

    /**
     * Get audit logs
     */
    getAuditLogs = async (
        request: FastifyRequest<{ Querystring: AuditLogQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.monitoringService.listAuditLogs(request.query);
            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get security dashboard summary
     */
    getSecuritySummary = async (
        _request: FastifyRequest,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.monitoringService.getSecuritySummary();
            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Clear all audit logs
     */
    clearAuditLogs = async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {
        try {
            const user = (request as any).user;
            
            // Log this critical action
            console.log(`[AUDIT] User ${user?.email} (${user?.id}) is clearing all audit logs`);
            
            const deletedCount = await this.monitoringService.clearAllAuditLogs();
            
            return ResponseUtil.success(reply, {
                message: 'All audit logs have been cleared successfully',
                deletedCount
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

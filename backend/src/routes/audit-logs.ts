import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auditLogService } from '../modules/monitoring/services/audit-log.service';

interface DataAccessBody {
  userId: string;
  customerId: string;
  accessType: 'VIEW' | 'EDIT' | 'DELETE' | 'EXPORT' | 'PRINT';
  resourceType: 'CUSTOMER' | 'LOAN' | 'PAYMENT' | 'DOCUMENT' | 'REPORT';
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  accessReason?: string;
  dataAccessed?: any;
}

interface InvoiceAccessBody {
  customerId: string;
  invoiceId?: string;
  accessType: 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'EMAIL' | 'GENERATE';
  accessedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

interface SuspiciousActivityBody {
  customerId: string;
  transactionId?: string;
  activityType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedBy: string;
  detectionMethod: 'AUTOMATED' | 'MANUAL' | 'EXTERNAL';
  indicators?: any;
  recommendedAction?: string;
}

interface UpdateReportBody {
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  investigatedBy?: string;
  resolution?: string;
}

interface CustomerParams {
  customerId: string;
}

interface UserParams {
  userId: string;
}

interface ResourceParams {
  resourceType: string;
  resourceId: string;
}

interface ReportParams {
  id: string;
}

interface StatsQuery {
  startDate?: string;
  endDate?: string;
}

interface ReportQuery {
  customerId?: string;
  severity?: string;
  status?: string;
  limit?: string;
}

export default async function auditLogRoutes(fastify: FastifyInstance) {
  // Log data access
  fastify.post<{ Body: DataAccessBody }>(
    '/audit-logs/data-access',
    async (request: FastifyRequest<{ Body: DataAccessBody }>, reply: FastifyReply) => {
      try {
        const log = await auditLogService.logDataAccess(request.body);
        return reply.code(201).send(log);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to log data access' });
      }
    }
  );

  // Get customer access logs
  fastify.get<{ Params: CustomerParams }>(
    '/audit-logs/customer/:customerId',
    async (request: FastifyRequest<{ Params: CustomerParams }>, reply: FastifyReply) => {
      try {
        const logs = await auditLogService.getCustomerAccessLogs(request.params.customerId);
        return reply.send(logs);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch access logs' });
      }
    }
  );

  // Get user access logs
  fastify.get<{ Params: UserParams }>(
    '/audit-logs/user/:userId',
    async (request: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply) => {
      try {
        const logs = await auditLogService.getUserAccessLogs(request.params.userId);
        return reply.send(logs);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch user logs' });
      }
    }
  );

  // Get resource access logs
  fastify.get<{ Params: ResourceParams }>(
    '/audit-logs/resource/:resourceType/:resourceId',
    async (request: FastifyRequest<{ Params: ResourceParams }>, reply: FastifyReply) => {
      try {
        const { resourceType, resourceId } = request.params;
        const logs = await auditLogService.getResourceAccessLogs(resourceType, resourceId);
        return reply.send(logs);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch resource logs' });
      }
    }
  );

  // Log invoice access
  fastify.post<{ Body: InvoiceAccessBody }>(
    '/audit-logs/invoice-access',
    async (request: FastifyRequest<{ Body: InvoiceAccessBody }>, reply: FastifyReply) => {
      try {
        const log = await auditLogService.logInvoiceAccess(request.body);
        return reply.code(201).send(log);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to log invoice access' });
      }
    }
  );

  // Get invoice access logs
  fastify.get<{ Params: { invoiceId: string } }>(
    '/audit-logs/invoice/:invoiceId',
    async (request: FastifyRequest<{ Params: { invoiceId: string } }>, reply: FastifyReply) => {
      try {
        const logs = await auditLogService.getInvoiceAccessLogs(request.params.invoiceId);
        return reply.send(logs);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch invoice logs' });
      }
    }
  );

  // Get customer invoice access history
  fastify.get<{ Params: CustomerParams }>(
    '/audit-logs/customer/:customerId/invoices',
    async (request: FastifyRequest<{ Params: CustomerParams }>, reply: FastifyReply) => {
      try {
        const logs = await auditLogService.getCustomerInvoiceAccessHistory(request.params.customerId);
        return reply.send(logs);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch invoice history' });
      }
    }
  );

  // Report suspicious activity
  fastify.post<{ Body: SuspiciousActivityBody }>(
    '/audit-logs/suspicious',
    async (request: FastifyRequest<{ Body: SuspiciousActivityBody }>, reply: FastifyReply) => {
      try {
        const report = await auditLogService.reportSuspiciousActivity(request.body as any);
        return reply.code(201).send(report);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to report suspicious activity' });
      }
    }
  );

  // Get suspicious reports
  fastify.get<{ Querystring: ReportQuery }>(
    '/audit-logs/suspicious',
    async (request: FastifyRequest<{ Querystring: ReportQuery }>, reply: FastifyReply) => {
      try {
        const filters = {
          customerId: request.query.customerId,
          severity: request.query.severity,
          status: request.query.status,
          limit: request.query.limit ? parseInt(request.query.limit) : undefined
        };
        const reports = await auditLogService.getSuspiciousReports(filters);
        return reply.send(reports);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch suspicious reports' });
      }
    }
  );

  // Update suspicious report
  fastify.put<{ Params: ReportParams; Body: UpdateReportBody }>(
    '/audit-logs/suspicious/:id',
    async (request: FastifyRequest<{ Params: ReportParams; Body: UpdateReportBody }>, reply: FastifyReply) => {
      try {
        const { status, investigatedBy, resolution } = request.body;
        const report = await auditLogService.updateSuspiciousReport(
          request.params.id,
          status,
          investigatedBy,
          resolution
        );
        return reply.send(report);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to update report' });
      }
    }
  );

  // Get audit statistics
  fastify.get<{ Querystring: StatsQuery }>(
    '/audit-logs/stats',
    async (request: FastifyRequest<{ Querystring: StatsQuery }>, reply: FastifyReply) => {
      try {
        const startDate = request.query.startDate ? new Date(request.query.startDate) : undefined;
        const endDate = request.query.endDate ? new Date(request.query.endDate) : undefined;
        
        const stats = await auditLogService.getAuditStatistics(startDate, endDate);
        return reply.send(stats);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch statistics' });
      }
    }
  );

  // Get customer access timeline
  fastify.get<{ Params: CustomerParams; Querystring: { days?: string } }>(
    '/audit-logs/customer/:customerId/timeline',
    async (request: FastifyRequest<{ Params: CustomerParams; Querystring: { days?: string } }>, reply: FastifyReply) => {
      try {
        const days = request.query.days ? parseInt(request.query.days) : 30;
        const timeline = await auditLogService.getCustomerAccessTimeline(request.params.customerId, days);
        return reply.send(timeline);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch timeline' });
      }
    }
  );

  // Export audit logs
  fastify.post<{ Body: { startDate: string; endDate: string; customerId?: string } }>(
    '/audit-logs/export',
    async (request: FastifyRequest<{ Body: { startDate: string; endDate: string; customerId?: string } }>, reply: FastifyReply) => {
      try {
        const { startDate, endDate, customerId } = request.body;
        const logs = await auditLogService.exportAuditLogs(
          new Date(startDate),
          new Date(endDate),
          customerId
        );
        return reply.send(logs);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to export logs' });
      }
    }
  );
}

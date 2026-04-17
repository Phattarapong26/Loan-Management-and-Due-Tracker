import { FastifyRequest, FastifyReply } from 'fastify';
import { auditLogService } from '../../modules/monitoring/services/audit-log.service';

interface AuditConfig {
  resourceType: 'CUSTOMER' | 'LOAN' | 'PAYMENT' | 'DOCUMENT' | 'REPORT';
  accessType?: 'VIEW' | 'EDIT' | 'DELETE' | 'EXPORT' | 'PRINT';
  getResourceId?: (request: FastifyRequest) => string;
  getCustomerId?: (request: FastifyRequest) => string;
}

/**
 * Middleware to automatically log data access
 */
export function auditLogger(config: AuditConfig) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      // Get user from request (assumes auth middleware sets this)
      const userId = (request as any).user?.id;
      if (!userId) {
        // Skip logging if no user (public endpoints)
        return;
      }

      // Determine access type from HTTP method if not specified
      const accessType = config.accessType || getAccessTypeFromMethod(request.method);

      // Get resource and customer IDs
      const resourceId = config.getResourceId 
        ? config.getResourceId(request)
        : (request.params as any).id;

      const customerId = config.getCustomerId
        ? config.getCustomerId(request)
        : (request.params as any).customerId || (request.body as any)?.customerId;

      if (!customerId || !resourceId) {
        // Skip if we can't determine what was accessed
        return;
      }

      // Log the access asynchronously (don't block the request)
      setImmediate(async () => {
        try {
          await auditLogService.logDataAccess({
            userId,
            customerId,
            accessType,
            resourceType: config.resourceType,
            resourceId,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            dataAccessed: {
              method: request.method,
              url: request.url,
              params: request.params,
              query: request.query
            }
          });
        } catch (error) {
          // Log error but don't fail the request
          console.error('Failed to log audit trail:', error);
        }
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('Audit middleware error:', error);
    }
  };
}

/**
 * Determine access type from HTTP method
 */
function getAccessTypeFromMethod(method: string): 'VIEW' | 'EDIT' | 'DELETE' | 'EXPORT' | 'PRINT' {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'VIEW';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'EDIT';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'VIEW';
  }
}

/**
 * Middleware to log invoice access
 */
export function invoiceAuditLogger() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const invoiceId = (request.params as any).invoiceId || (request.params as any).id;
      const customerId = (request.params as any).customerId || (request.body as any)?.customerId;

      if (!customerId) return;

      const accessType = getInvoiceAccessType(request);
      const accessedBy = (request as any).user?.id;

      setImmediate(async () => {
        try {
          await auditLogService.logInvoiceAccess({
            customerId,
            invoiceId,
            accessType,
            accessedBy,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            metadata: {
              method: request.method,
              url: request.url
            }
          });
        } catch (error) {
          console.error('Failed to log invoice access:', error);
        }
      });
    } catch (error) {
      console.error('Invoice audit middleware error:', error);
    }
  };
}

/**
 * Determine invoice access type
 */
function getInvoiceAccessType(request: FastifyRequest): 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'EMAIL' | 'GENERATE' {
  const url = request.url.toLowerCase();
  
  if (url.includes('download')) return 'DOWNLOAD';
  if (url.includes('print')) return 'PRINT';
  if (url.includes('email') || url.includes('send')) return 'EMAIL';
  if (request.method === 'POST') return 'GENERATE';
  
  return 'VIEW';
}

/**
 * Middleware to detect and report suspicious activity
 */
export function suspiciousActivityDetector() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id;
      if (!userId) return;

      // Check for unusual access patterns
      const isUnusual = await auditLogService.detectUnusualAccess(userId, 60);
      
      if (isUnusual) {
        const customerId = (request.params as any).customerId || (request.body as any)?.customerId;
        
        if (customerId) {
          setImmediate(async () => {
            try {
              await auditLogService.reportSuspiciousActivity({
                customerId,
                activityType: 'VELOCITY_CHECK',
                severity: 'MEDIUM',
                description: `User ${userId} exceeded normal access velocity (>50 accesses in 60 minutes)`,
                detectedBy: 'SYSTEM',
                detectionMethod: 'AUTOMATED',
                indicators: {
                  userId,
                  timeWindow: '60 minutes',
                  threshold: 50
                }
              });
            } catch (error) {
              console.error('Failed to report suspicious activity:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Suspicious activity detector error:', error);
    }
  };
}

export default {
  auditLogger,
  invoiceAuditLogger,
  suspiciousActivityDetector
};

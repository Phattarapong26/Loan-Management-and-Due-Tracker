// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DataAccessLogInput {
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

export interface InvoiceAccessLogInput {
  customerId: string;
  invoiceId?: string;
  accessType: 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'EMAIL' | 'GENERATE';
  accessedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface SuspiciousActivityInput {
  customerId: string;
  transactionId?: string;
  activityType: 'UNUSUAL_AMOUNT' | 'UNUSUAL_FREQUENCY' | 'UNUSUAL_PATTERN' | 'BLACKLIST_MATCH' | 'VELOCITY_CHECK' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedBy: string;
  detectionMethod: 'AUTOMATED' | 'MANUAL' | 'EXTERNAL';
  indicators?: any;
  recommendedAction?: string;
}

export class AuditLogService {
  /**
   * Log data access
   */
  async logDataAccess(data: DataAccessLogInput) {
    return await prisma.data_access_logs.create({
      data: {
        user_id: data.userId,
        customer_id: data.customerId,
        access_type: data.accessType,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        access_reason: data.accessReason,
        data_accessed: data.dataAccessed,
        accessed_at: new Date(),
        created_at: new Date()
      }
    });
  }

  /**
   * Get data access logs for customer
   */
  async getCustomerAccessLogs(customerId: string, limit = 50) {
    return await prisma.data_access_logs.findMany({
      where: { customer_id: customerId },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { accessed_at: 'desc' },
      take: limit
    });
  }

  /**
   * Get data access logs by user
   */
  async getUserAccessLogs(userId: string, limit = 50) {
    return await prisma.data_access_logs.findMany({
      where: { user_id: userId },
      include: {
        customers: {
          select: {
            id: true,
            business_name: true,
            tax_id: true
          }
        }
      },
      orderBy: { accessed_at: 'desc' },
      take: limit
    });
  }

  /**
   * Get access logs by resource
   */
  async getResourceAccessLogs(resourceType: string, resourceId: string) {
    return await prisma.data_access_logs.findMany({
      where: {
        resource_type: resourceType,
        resource_id: resourceId
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: { accessed_at: 'desc' }
    });
  }

  /**
   * Log invoice access
   */
  async logInvoiceAccess(data: InvoiceAccessLogInput) {
    return await prisma.invoice_access_logs.create({
      data: {
        customer_id: data.customerId,
        invoice_id: data.invoiceId,
        access_type: data.accessType,
        accessed_by: data.accessedBy,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        metadata: data.metadata,
        accessed_at: new Date(),
        created_at: new Date()
      }
    });
  }

  /**
   * Get invoice access logs
   */
  async getInvoiceAccessLogs(invoiceId: string) {
    return await prisma.invoice_access_logs.findMany({
      where: { invoice_id: invoiceId },
      include: {
        customers: {
          select: {
            id: true,
            business_name: true
          }
        }
      },
      orderBy: { accessed_at: 'desc' }
    });
  }

  /**
   * Get customer invoice access history
   */
  async getCustomerInvoiceAccessHistory(customerId: string, limit = 50) {
    return await prisma.invoice_access_logs.findMany({
      where: { customer_id: customerId },
      orderBy: { accessed_at: 'desc' },
      take: limit
    });
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(data: SuspiciousActivityInput) {
    return await prisma.suspicious_transaction_reports.create({
      data: {
        customer_id: data.customerId,
        transaction_id: data.transactionId,
        activity_type: data.activityType,
        severity: data.severity,
        description: data.description,
        detected_by: data.detectedBy,
        detection_method: data.detectionMethod,
        indicators: data.indicators,
        recommended_action: data.recommendedAction,
        status: 'PENDING',
        reported_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Get suspicious activity reports
   */
  async getSuspiciousReports(filters?: {
    customerId?: string;
    severity?: string;
    status?: string;
    limit?: number;
  }) {
    const where: any = {};
    
    if (filters?.customerId) where.customer_id = filters.customerId;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.status) where.status = filters.status;

    return await prisma.suspicious_transaction_reports.findMany({
      where,
      include: {
        customers: {
          select: {
            id: true,
            business_name: true,
            tax_id: true
          }
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        },
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            created_at: true
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { reported_at: 'desc' }
      ],
      take: filters?.limit || 50
    });
  }

  /**
   * Update suspicious report status
   */
  async updateSuspiciousReport(
    reportId: string,
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE',
    investigatedBy?: string,
    resolution?: string
  ) {
    return await prisma.suspicious_transaction_reports.update({
      where: { id: reportId },
      data: {
        status,
        investigated_by: investigatedBy,
        investigated_at: investigatedBy ? new Date() : undefined,
        resolution,
        updated_at: new Date()
      }
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const [
      totalDataAccess,
      totalInvoiceAccess,
      totalSuspicious,
      suspiciousByStatus,
      suspiciousBySeverity,
      accessByType
    ] = await Promise.all([
      prisma.data_access_logs.count({
        where: dateFilter.gte ? { accessed_at: dateFilter } : undefined
      }),
      prisma.invoice_access_logs.count({
        where: dateFilter.gte ? { accessed_at: dateFilter } : undefined
      }),
      prisma.suspicious_transaction_reports.count({
        where: dateFilter.gte ? { reported_at: dateFilter } : undefined
      }),
      prisma.suspicious_transaction_reports.groupBy({
        by: ['status'],
        _count: true,
        where: dateFilter.gte ? { reported_at: dateFilter } : undefined
      }),
      prisma.suspicious_transaction_reports.groupBy({
        by: ['severity'],
        _count: true,
        where: dateFilter.gte ? { reported_at: dateFilter } : undefined
      }),
      prisma.data_access_logs.groupBy({
        by: ['access_type'],
        _count: true,
        where: dateFilter.gte ? { accessed_at: dateFilter } : undefined
      })
    ]);

    return {
      totalDataAccess,
      totalInvoiceAccess,
      totalSuspicious,
      suspiciousByStatus: suspiciousByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      suspiciousBySeverity: suspiciousBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      accessByType: accessByType.reduce((acc, item) => {
        acc[item.access_type] = item._count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Detect unusual access patterns
   */
  async detectUnusualAccess(userId: string, timeWindowMinutes = 60): Promise<boolean> {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const recentAccess = await prisma.data_access_logs.count({
      where: {
        user_id: userId,
        accessed_at: { gte: since }
      }
    });

    // Flag if more than 50 accesses in time window
    return recentAccess > 50;
  }

  /**
   * Get access timeline for customer
   */
  async getCustomerAccessTimeline(customerId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [dataAccess, invoiceAccess] = await Promise.all([
      prisma.data_access_logs.findMany({
        where: {
          customer_id: customerId,
          accessed_at: { gte: since }
        },
        select: {
          accessed_at: true,
          access_type: true,
          resource_type: true,
          users: {
            select: {
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: { accessed_at: 'desc' }
      }),
      prisma.invoice_access_logs.findMany({
        where: {
          customer_id: customerId,
          accessed_at: { gte: since }
        },
        select: {
          accessed_at: true,
          access_type: true
        },
        orderBy: { accessed_at: 'desc' }
      })
    ]);

    return {
      dataAccess,
      invoiceAccess,
      totalEvents: dataAccess.length + invoiceAccess.length
    };
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(startDate: Date, endDate: Date, customerId?: string) {
    const where: any = {
      accessed_at: {
        gte: startDate,
        lte: endDate
      }
    };

    if (customerId) where.customer_id = customerId;

    const logs = await prisma.data_access_logs.findMany({
      where,
      include: {
        users: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
            role: true
          }
        },
        customers: {
          select: {
            business_name: true,
            tax_id: true
          }
        }
      },
      orderBy: { accessed_at: 'asc' }
    });

    return logs;
  }
}

export const auditLogService = new AuditLogService();

import { prisma } from '../../../core/config/database.config';
import { Prisma } from '@prisma/client';
import { AuditLogQuery } from '../models/monitoring.model';

export class MonitoringService {
    /**
     * List audit logs with filters (includes security events)
     */
    async listAuditLogs(query: AuditLogQuery) {
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '20');
        const skip = (page - 1) * limit;

        const where: Prisma.AuditLogWhereInput = {};

        if (query.userId) where.userId = query.userId;
        if (query.action) where.action = query.action;
        if (query.entity) where.entity = query.entity;

        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) where.createdAt.gte = new Date(query.startDate);
            if (query.endDate) where.createdAt.lte = new Date(query.endDate);
        }

        if (query.search) {
            where.OR = [
                { action: { contains: query.search, mode: 'insensitive' } },
                { entity: { contains: query.search, mode: 'insensitive' } },
                { ipAddress: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.severity) {
            where.metadata = {
                path: ['severity'],
                equals: query.severity
            };
        }

        // Get audit logs
        const [auditLogs, auditTotal] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        // Also get security events if no specific filters that don't apply
        let securityEvents: any[] = [];
        if (!query.entity) { // Security events don't have entity field
            const securityWhere: any = {};
            
            if (query.action) {
                // Map action to threatType
                securityWhere.threatType = query.action;
            }
            
            if (query.startDate || query.endDate) {
                securityWhere.createdAt = {};
                if (query.startDate) securityWhere.createdAt.gte = new Date(query.startDate);
                if (query.endDate) securityWhere.createdAt.lte = new Date(query.endDate);
            }
            
            if (query.search) {
                securityWhere.OR = [
                    { threatType: { contains: query.search, mode: 'insensitive' } },
                    { endpoint: { contains: query.search, mode: 'insensitive' } },
                    { ipAddress: { contains: query.search, mode: 'insensitive' } },
                ];
            }
            
            if (query.severity) {
                securityWhere.severity = query.severity.toUpperCase();
            }

            securityEvents = await prisma.securityEvent.findMany({
                where: securityWhere,
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: Math.min(limit, 50), // Limit security events
            });

            // Transform security events to audit log format
            securityEvents = securityEvents.map(event => ({
                id: event.id,
                userId: event.userId,
                action: event.threatType,
                resource: event.endpoint,
                entity: 'SecurityEvent',
                entityId: event.id,
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
                metadata: {
                    severity: event.severity,
                    description: event.description,
                    method: event.method,
                    blocked: event.blocked,
                    payload: event.payload
                },
                createdAt: event.createdAt,
                user: event.user
            }));
        }

        // Combine and sort by date
        const allLogs = [...auditLogs, ...securityEvents].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Apply pagination to combined results
        const paginatedLogs = allLogs.slice(0, limit);
        const total = auditTotal + securityEvents.length;

        return {
            logs: paginatedLogs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get security dashboard summary
     */
    async getSecuritySummary() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [
            suspiciousActivities,
            highSeverityAlerts,
            failedLogins,
            totalActions24h,
            recentAlerts
        ] = await Promise.all([
            // Suspicious activity from security_events
            prisma.securityEvent.count({
                where: {
                    createdAt: { gte: last24h }
                }
            }),
            // High severity alerts from security_alerts
            prisma.securityAlert.count({
                where: {
                    severity: { in: ['HIGH', 'CRITICAL'] },
                    createdAt: { gte: last24h }
                }
            }),
            // Failed logins from audit_logs
            prisma.auditLog.count({
                where: {
                    action: 'LOGIN_FAILED',
                    createdAt: { gte: last24h }
                }
            }),
            // Total actions in 24h
            prisma.auditLog.count({
                where: { createdAt: { gte: last24h } }
            }),
            // Most recent critical alerts from security_events
            prisma.securityEvent.findMany({
                where: {
                    severity: { in: ['HIGH', 'CRITICAL'] },
                    createdAt: { gte: last24h }
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    user: {
                        select: { 
                            id: true,
                            email: true, 
                            firstName: true, 
                            lastName: true 
                        }
                    }
                }
            })
        ]);

        // Transform security events to audit log format for frontend compatibility
        const recentAlertsFormatted = recentAlerts.map(event => ({
            id: event.id,
            userId: event.userId,
            action: event.threatType, // Use threat type as action
            resource: event.endpoint,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            metadata: {
                severity: event.severity,
                description: event.description,
                path: event.endpoint,
                method: event.method,
                blocked: event.blocked
            },
            createdAt: event.createdAt,
            user: event.user
        }));

        return {
            summary: {
                suspiciousActivities,
                highSeverityAlerts,
                failedLogins,
                totalActions24h
            },
            recentAlerts: recentAlertsFormatted,
            activityOverTime: await this.getActivityOverTime()
        };
    }

    private async getActivityOverTime() {
        // Daily aggregation for last 7 days (UTC-based)
        const now = new Date();
        const last7d = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - 7
        ));

        const rows = await prisma.$queryRawUnsafe<Array<{ day: Date; count: bigint }>>(
            `SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) AS count
             FROM audit_logs WHERE created_at >= $1
             GROUP BY DATE_TRUNC('day', created_at) ORDER BY day ASC`,
            last7d
        );

        // Fill in missing days with 0 — always return 7 UTC-day data points
        const result: Array<{ createdAt: string; _count: number }> = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() - i
            ));
            const dayStr = d.toISOString().slice(0, 10); // YYYY-MM-DD in UTC

            const found = rows.find(r =>
                new Date(r.day).toISOString().slice(0, 10) === dayStr
            );

            result.push({
                createdAt: d.toISOString(),
                _count: found ? Number(found.count) : 0,
            });
        }

        return result;
    }

    /**
     * Clear all audit logs
     * WARNING: This is a destructive operation
     */
    async clearAllAuditLogs(): Promise<number> {
        try {
            const result = await prisma.auditLog.deleteMany({});
            
            console.log(`[MONITORING] Cleared ${result.count} audit logs from database`);
            
            return result.count;
        } catch (error) {
            console.error('[MONITORING] Error clearing audit logs:', error);
            throw new Error('Failed to clear audit logs');
        }
    }
}

import { prisma } from '../../../core/config/database.config';

export enum ThreatType {
    XSS = 'XSS',
    SQL_INJECTION = 'SQL_INJECTION',
    LFI = 'LFI',
    RFI = 'RFI',
    SSRF = 'SSRF',
    DOS = 'DOS',
    IDOR = 'IDOR',
    COMMAND_INJECTION = 'COMMAND_INJECTION',
    PATH_TRAVERSAL = 'PATH_TRAVERSAL',
    XXE = 'XXE',
    CSRF = 'CSRF',
    BRUTE_FORCE = 'BRUTE_FORCE',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN'
}

export enum ThreatSeverity {
    CRITICAL = 'CRITICAL',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
    INFO = 'INFO'
}

interface ThreatDetection {
    type: ThreatType;
    severity: ThreatSeverity;
    description: string;
    payload?: string;
    blocked: boolean;
}

interface SecurityEvent {
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    endpoint: string;
    method: string;
    threat: ThreatDetection;
    metadata?: any;
}

export class SecurityMonitorService {
    private readonly MAX_EVENTS_PER_IP = 1000; // จำกัดจำนวน events ต่อ IP
    private readonly CLEANUP_DAYS = 30; // เก็บข้อมูลแค่ 30 วัน
    private readonly CRITICAL_CLEANUP_DAYS = 90; // เก็บ critical events นานกว่า

    /**
     * บันทึก security event
     */
    async logSecurityEvent(event: SecurityEvent): Promise<void> {
        try {
            await prisma.securityEvent.create({
                data: {
                    userId: event.userId || null,
                    ipAddress: event.ipAddress,
                    userAgent: event.userAgent || null,
                    endpoint: event.endpoint,
                    method: event.method,
                    threatType: event.threat.type,
                    severity: event.threat.severity,
                    description: event.threat.description,
                    payload: event.threat.payload || null,
                    blocked: event.threat.blocked,
                    metadata: event.metadata || {},
                }
            });

            // ถ้าเป็น threat ระดับ CRITICAL หรือ HIGH ให้สร้าง alert
            if (event.threat.severity === ThreatSeverity.CRITICAL || 
                event.threat.severity === ThreatSeverity.HIGH) {
                await this.createSecurityAlert(event);
            }

            // Auto cleanup เมื่อมี events เยอะเกินไป
            await this.autoCleanupIfNeeded(event.ipAddress);
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * สร้าง security alert สำหรับ threats ที่ร้ายแรง
     */
    private async createSecurityAlert(event: SecurityEvent): Promise<void> {
        await prisma.securityAlert.create({
            data: {
                type: event.threat.type,
                severity: event.threat.severity,
                title: `${event.threat.type} Detected`,
                description: event.threat.description,
                ipAddress: event.ipAddress,
                userId: event.userId || null,
                endpoint: event.endpoint,
                status: 'OPEN',
                metadata: {
                    method: event.method,
                    userAgent: event.userAgent,
                    payload: event.threat.payload,
                    ...event.metadata
                }
            }
        });
    }

    /**
     * ตรวจสอบและทำความสะอาดอัตโนมัติถ้า events เยอะเกินไป
     */
    private async autoCleanupIfNeeded(ipAddress: string): Promise<void> {
        const count = await prisma.securityEvent.count({
            where: { ipAddress }
        });

        if (count > this.MAX_EVENTS_PER_IP) {
            // ลบ events เก่าที่ไม่ critical
            await prisma.securityEvent.deleteMany({
                where: {
                    ipAddress,
                    severity: { in: [ThreatSeverity.LOW, ThreatSeverity.INFO] },
                    createdAt: {
                        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // เก่ากว่า 7 วัน
                    }
                }
            });
        }
    }

    /**
     * ทำความสะอาด security events เก่า (ควรรันเป็น cron job)
     */
    async cleanupOldEvents(): Promise<{ deleted: number }> {
        const cutoffDate = new Date(Date.now() - this.CLEANUP_DAYS * 24 * 60 * 60 * 1000);
        const criticalCutoffDate = new Date(Date.now() - this.CRITICAL_CLEANUP_DAYS * 24 * 60 * 60 * 1000);

        // ลบ events ที่ไม่ critical และเก่ากว่า CLEANUP_DAYS
        const result = await prisma.securityEvent.deleteMany({
            where: {
                OR: [
                    {
                        severity: { in: [ThreatSeverity.LOW, ThreatSeverity.MEDIUM, ThreatSeverity.INFO] },
                        createdAt: { lt: cutoffDate }
                    },
                    {
                        severity: { in: [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL] },
                        createdAt: { lt: criticalCutoffDate }
                    }
                ]
            }
        });

        return { deleted: result.count };
    }

    /**
     * ดึง security events พร้อม pagination และ filters
     */
    async getSecurityEvents(params: {
        page?: number;
        limit?: number;
        threatType?: ThreatType;
        severity?: ThreatSeverity;
        ipAddress?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
        blocked?: boolean;
    }) {
        const page = params.page || 1;
        const limit = Math.min(params.limit || 50, 100); // จำกัดไม่เกิน 100
        const skip = (page - 1) * limit;

        const where: any = {};

        if (params.threatType) where.threatType = params.threatType;
        if (params.severity) where.severity = params.severity;
        if (params.ipAddress) where.ipAddress = params.ipAddress;
        if (params.userId) where.userId = params.userId;
        if (params.blocked !== undefined) where.blocked = params.blocked;

        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) where.createdAt.gte = params.startDate;
            if (params.endDate) where.createdAt.lte = params.endDate;
        }

        const [events, total] = await Promise.all([
            prisma.securityEvent.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.securityEvent.count({ where })
        ]);

        return {
            events,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * ดึง security alerts
     */
    async getSecurityAlerts(params: {
        page?: number;
        limit?: number;
        status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
        severity?: ThreatSeverity;
    }) {
        const page = params.page || 1;
        const limit = Math.min(params.limit || 50, 100);
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.status) where.status = params.status;
        if (params.severity) where.severity = params.severity;

        const [alerts, total] = await Promise.all([
            prisma.securityAlert.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.securityAlert.count({ where })
        ]);

        return {
            alerts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * อัพเดทสถานะของ alert
     */
    async updateAlertStatus(
        alertId: string,
        status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE',
        notes?: string
    ) {
        return await prisma.securityAlert.update({
            where: { id: alertId },
            data: {
                status,
                resolvedAt: status === 'RESOLVED' ? new Date() : null,
                metadata: notes ? {
                    notes,
                    updatedAt: new Date().toISOString()
                } : undefined
            }
        });
    }

    /**
     * ดึงสถิติ security dashboard
     */
    async getSecurityDashboard(hours: number = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const [
            totalEvents,
            blockedEvents,
            criticalAlerts,
            openAlerts,
            topThreats,
            topIPs,
            threatsBySeverity
        ] = await Promise.all([
            prisma.securityEvent.count({
                where: { createdAt: { gte: since } }
            }),
            prisma.securityEvent.count({
                where: { createdAt: { gte: since }, blocked: true }
            }),
            prisma.securityAlert.count({
                where: {
                    createdAt: { gte: since },
                    severity: ThreatSeverity.CRITICAL
                }
            }),
            prisma.securityAlert.count({
                where: { status: 'OPEN' }
            }),
            prisma.securityEvent.groupBy({
                by: ['threatType'],
                _count: true,
                where: { createdAt: { gte: since } },
                orderBy: { _count: { threatType: 'desc' } },
                take: 10
            }),
            prisma.securityEvent.groupBy({
                by: ['ipAddress'],
                _count: true,
                where: { createdAt: { gte: since } },
                orderBy: { _count: { ipAddress: 'desc' } },
                take: 10
            }),
            prisma.securityEvent.groupBy({
                by: ['severity'],
                _count: true,
                where: { createdAt: { gte: since } }
            })
        ]);

        return {
            summary: {
                totalEvents,
                blockedEvents,
                criticalAlerts,
                openAlerts,
                blockRate: totalEvents > 0 ? (blockedEvents / totalEvents * 100).toFixed(2) : '0'
            },
            topThreats: topThreats.map((t: any) => ({
                type: t.threatType,
                count: t._count
            })),
            topIPs: topIPs.map((ip: any) => ({
                ipAddress: ip.ipAddress,
                count: ip._count
            })),
            threatsBySeverity: threatsBySeverity.map((s: any) => ({
                severity: s.severity,
                count: s._count
            }))
        };
    }

    /**
     * ตรวจสอบ IP ที่น่าสงสัย (มี events เยอะผิดปกติ)
     */
    async getSuspiciousIPs(threshold: number = 50, hours: number = 1) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const suspiciousIPs = await prisma.securityEvent.groupBy({
            by: ['ipAddress'],
            _count: true,
            where: {
                createdAt: { gte: since }
            },
            having: {
                ipAddress: {
                    _count: {
                        gte: threshold
                    }
                }
            },
            orderBy: {
                _count: {
                    ipAddress: 'desc'
                }
            }
        });

        return suspiciousIPs.map((ip: any) => ({
            ipAddress: ip.ipAddress,
            eventCount: ip._count,
            riskLevel: ip._count > threshold * 2 ? 'HIGH' : 'MEDIUM'
        }));
    }

    /**
     * Block IP (เพิ่มเข้า blacklist)
     */
    async blockIP(ipAddress: string, reason: string, blockedBy?: string) {
        return await prisma.blockedIP.create({
            data: {
                ipAddress,
                reason,
                blockedBy,
                expiresAt: null // permanent block, หรือกำหนดเวลาหมดอายุได้
            }
        });
    }

    /**
     * Unblock IP
     */
    async unblockIP(ipAddress: string) {
        return await prisma.blockedIP.deleteMany({
            where: { ipAddress }
        });
    }

    /**
     * ตรวจสอบว่า IP ถูก block หรือไม่
     */
    async isIPBlocked(ipAddress: string): Promise<boolean> {
        const blocked = await prisma.blockedIP.findFirst({
            where: {
                ipAddress,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });

        return !!blocked;
    }

    /**
     * ดึงรายการ blocked IPs
     */
    async getBlockedIPs() {
        const blockedIps = await prisma.blockedIP.findMany({
            where: {
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                blocker: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { blockedIps };
    }

    /**
     * 🆕 ตรวจจับ IP Anomaly - การเข้าถึงข้อมูลจำนวนมากผิดปกติ
     */
    async detectAnomalousIPBehavior(hours: number = 1): Promise<{
        ipAddress: string;
        eventCount: number;
        uniqueEndpoints: number;
        uniqueUsers: number;
        riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
        reason: string;
    }[]> {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        // ดึง IP ที่มี activity สูง
        const ipActivity = await prisma.securityEvent.groupBy({
            by: ['ipAddress'],
            _count: {
                id: true,
                endpoint: true,
                userId: true
            },
            where: {
                createdAt: { gte: since }
            },
            having: {
                id: {
                    _count: {
                        gte: 100 // มากกว่า 100 events ใน 1 ชั่วโมง
                    }
                }
            }
        });

        const anomalies = [];

        for (const activity of ipActivity) {
            // นับ unique endpoints และ users
            const details = await prisma.securityEvent.findMany({
                where: {
                    ipAddress: activity.ipAddress,
                    createdAt: { gte: since }
                },
                select: {
                    endpoint: true,
                    userId: true
                }
            });

            const uniqueEndpoints = new Set(details.map(d => d.endpoint)).size;
            const uniqueUsers = new Set(details.filter(d => d.userId).map(d => d.userId)).size;

            // ตรวจจับ anomaly patterns
            let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
            let reason = '';

            if (activity._count.id > 500) {
                riskLevel = 'CRITICAL';
                reason = `Excessive requests: ${activity._count.id} events in ${hours}h`;
            } else if (uniqueEndpoints > 50) {
                riskLevel = 'HIGH';
                reason = `Scanning behavior: ${uniqueEndpoints} different endpoints accessed`;
            } else if (uniqueUsers > 10) {
                riskLevel = 'HIGH';
                reason = `Multiple user access: ${uniqueUsers} different users from same IP`;
            } else if (activity._count.id > 200) {
                riskLevel = 'HIGH';
                reason = `High activity: ${activity._count.id} events in ${hours}h`;
            }

            if (reason) {
                anomalies.push({
                    ipAddress: activity.ipAddress,
                    eventCount: activity._count.id,
                    uniqueEndpoints,
                    uniqueUsers,
                    riskLevel,
                    reason
                });
            }
        }

        return anomalies.sort((a, b) => b.eventCount - a.eventCount);
    }

    /**
     * 🆕 ตรวจจับการทำงานนอกเวลา (Off-Hours Activity)
     */
    async detectOffHoursActivity(): Promise<{
        userId: string;
        userEmail: string;
        userName: string;
        activityCount: number;
        lastActivity: Date;
        riskLevel: 'HIGH' | 'MEDIUM';
        reason: string;
    }[]> {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // ดึง activities ที่มี userId (logged in users)
        const activities = await prisma.securityEvent.findMany({
            where: {
                userId: { not: null },
                createdAt: { gte: last24h }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by user และตรวจสอบเวลา
        const userActivities = new Map<string, any[]>();
        
        for (const activity of activities) {
            if (!activity.userId || !activity.user) continue;

            if (!userActivities.has(activity.userId)) {
                userActivities.set(activity.userId, []);
            }
            userActivities.get(activity.userId)!.push(activity);
        }

        const offHoursUsers: {
            userId: string;
            userEmail: string;
            userName: string;
            activityCount: number;
            lastActivity: Date;
            riskLevel: 'HIGH' | 'MEDIUM';
            reason: string;
        }[] = [];

        for (const [userId, userEvents] of userActivities) {
            // นับจำนวน events ที่เกิดนอกเวลา (2 AM - 5 AM)
            const offHoursEvents = userEvents.filter(event => {
                const hour = event.createdAt.getHours();
                return hour >= 2 && hour < 5;
            });

            if (offHoursEvents.length > 0) {
                const user = userEvents[0].user;
                const riskLevel: 'HIGH' | 'MEDIUM' = offHoursEvents.length > 10 ? 'HIGH' : 'MEDIUM';

                offHoursUsers.push({
                    userId,
                    userEmail: user.email,
                    userName: `${user.firstName} ${user.lastName}`,
                    activityCount: offHoursEvents.length,
                    lastActivity: offHoursEvents[0].createdAt,
                    riskLevel,
                    reason: `${offHoursEvents.length} activities during off-hours (2-5 AM)`
                });
            }
        }

        return offHoursUsers.sort((a, b) => b.activityCount - a.activityCount);
    }

    /**
     * 🆕 ตรวจจับการเข้าถึงข้อมูลจำนวนมาก (Mass Data Access)
     */
    async detectMassDataAccess(hours: number = 1): Promise<{
        userId: string;
        userEmail: string;
        userName: string;
        accessCount: number;
        uniqueCustomers: number;
        uniqueLoans: number;
        riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
        reason: string;
    }[]> {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        // ดึง data access logs
        const accessLogs = await prisma.data_access_logs.findMany({
            where: {
                created_at: { gte: since }
            },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // Group by user
        const userAccess = new Map<string, any[]>();
        
        for (const log of accessLogs) {
            if (!log.user_id) continue;

            if (!userAccess.has(log.user_id)) {
                userAccess.set(log.user_id, []);
            }
            userAccess.get(log.user_id)!.push(log);
        }

        const massAccessUsers: {
            userId: string;
            userEmail: string;
            userName: string;
            accessCount: number;
            uniqueCustomers: number;
            uniqueLoans: number;
            riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
            reason: string;
        }[] = [];

        for (const [userId, logs] of userAccess) {
            const uniqueCustomers = new Set(
                logs.filter(l => l.access_type === 'customer').map(l => l.customer_id)
            ).size;

            const uniqueLoans = new Set(
                logs.filter(l => l.access_type === 'loan').map(l => l.customer_id)
            ).size;

            // ตรวจจับ mass access patterns
            let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | null = null;
            let reason = '';

            if (uniqueCustomers > 100 || uniqueLoans > 100) {
                riskLevel = 'CRITICAL';
                reason = `Mass data access: ${uniqueCustomers} customers, ${uniqueLoans} loans in ${hours}h`;
            } else if (uniqueCustomers > 50 || uniqueLoans > 50) {
                riskLevel = 'HIGH';
                reason = `High data access: ${uniqueCustomers} customers, ${uniqueLoans} loans in ${hours}h`;
            } else if (logs.length > 200) {
                riskLevel = 'MEDIUM';
                reason = `Frequent access: ${logs.length} data access events in ${hours}h`;
            }

            if (riskLevel) {
                const user = logs[0].users;
                massAccessUsers.push({
                    userId,
                    userEmail: user.email,
                    userName: `${user.firstName} ${user.lastName}`,
                    accessCount: logs.length,
                    uniqueCustomers,
                    uniqueLoans,
                    riskLevel,
                    reason
                });
            }
        }

        return massAccessUsers.sort((a, b) => b.accessCount - a.accessCount);
    }

    /**
     * 🆕 ตรวจจับ Brute Force Login Attempts
     */
    async detectBruteForceAttempts(minutes: number = 15): Promise<{
        ipAddress: string;
        failedAttempts: number;
        targetEmails: string[];
        riskLevel: 'CRITICAL' | 'HIGH';
        reason: string;
    }[]> {
        const since = new Date(Date.now() - minutes * 60 * 1000);

        // ดึง failed login attempts จาก audit logs
        const failedLogins = await prisma.auditLog.findMany({
            where: {
                action: 'LOGIN_FAILED',
                createdAt: { gte: since }
            },
            select: {
                ipAddress: true,
                metadata: true,
                createdAt: true
            }
        });

        // Group by IP
        const ipAttempts = new Map<string, any[]>();
        
        for (const login of failedLogins) {
            const ip = login.ipAddress || 'unknown';
            if (!ipAttempts.has(ip)) {
                ipAttempts.set(ip, []);
            }
            ipAttempts.get(ip)!.push(login);
        }

        const bruteForceIPs: {
            ipAddress: string;
            failedAttempts: number;
            targetEmails: string[];
            riskLevel: 'CRITICAL' | 'HIGH';
            reason: string;
        }[] = [];

        for (const [ipAddress, attempts] of ipAttempts) {
            if (attempts.length >= 5) { // 5+ failed attempts
                const targetEmails = Array.from(new Set(
                    attempts
                        .map(a => a.metadata?.email)
                        .filter(Boolean)
                )) as string[];

                const riskLevel: 'CRITICAL' | 'HIGH' = attempts.length >= 10 ? 'CRITICAL' : 'HIGH';

                bruteForceIPs.push({
                    ipAddress,
                    failedAttempts: attempts.length,
                    targetEmails,
                    riskLevel,
                    reason: `${attempts.length} failed login attempts in ${minutes} minutes`
                });
            }
        }

        return bruteForceIPs.sort((a, b) => b.failedAttempts - a.failedAttempts);
    }

    /**
     * 🆕 Auto-block IP based on threat level
     */
    async autoBlockIP(
        ipAddress: string,
        reason: string,
        duration?: number // minutes, null = permanent
    ): Promise<void> {
        const expiresAt = duration 
            ? new Date(Date.now() + duration * 60 * 1000)
            : null;

        await prisma.blockedIP.create({
            data: {
                ipAddress,
                reason: `[AUTO-BLOCKED] ${reason}`,
                blockedBy: null, // system auto-block
                expiresAt
            }
        });

        // Log security event
        await this.logSecurityEvent({
            ipAddress,
            endpoint: '/system/auto-block',
            method: 'SYSTEM',
            threat: {
                type: ThreatType.DOS,
                severity: ThreatSeverity.CRITICAL,
                description: `IP auto-blocked: ${reason}`,
                blocked: true
            },
            metadata: {
                autoBlock: true,
                duration: duration || 'permanent'
            }
        });
    }

    /**
     * 🆕 Get comprehensive security report
     */
    async getSecurityReport(hours: number = 24) {
        const [
            dashboard,
            anomalousIPs,
            offHoursActivity,
            massDataAccess,
            bruteForceAttempts,
            suspiciousIPs
        ] = await Promise.all([
            this.getSecurityDashboard(hours),
            this.detectAnomalousIPBehavior(Math.min(hours, 1)),
            this.detectOffHoursActivity(),
            this.detectMassDataAccess(Math.min(hours, 1)),
            this.detectBruteForceAttempts(15),
            this.getSuspiciousIPs(50, Math.min(hours, 1))
        ]);

        return {
            dashboard,
            threats: {
                anomalousIPs,
                offHoursActivity,
                massDataAccess,
                bruteForceAttempts,
                suspiciousIPs
            },
            generatedAt: new Date(),
            period: `${hours} hours`
        };
    }
}

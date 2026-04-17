import { FastifyRequest, FastifyReply } from 'fastify';
import { ThreatDetectorService } from '../services/threat-detector.service';
import { SecurityMonitorService, ThreatType, ThreatSeverity } from '../services/security-monitor.service';

export class SecurityScannerMiddleware {
    private threatDetector: ThreatDetectorService;
    private securityMonitor: SecurityMonitorService;
    private requestCounts: Map<string, { count: number; resetAt: number }>;

    constructor() {
        this.threatDetector = new ThreatDetectorService();
        this.securityMonitor = new SecurityMonitorService();
        this.requestCounts = new Map();
    }

    /**
     * Middleware หลักสำหรับสแกนทุก request
     */
    scanRequest = async (request: FastifyRequest, reply: FastifyReply) => {
        const ipAddress = this.getClientIP(request);
        
        // 🔒 SECURITY: Only allow load test bypass in development + localhost + with secret
        const isLoadTest = this.isValidLoadTestRequest(request);
        if (isLoadTest) {
            console.log(`[Load Test] Authorized request from ${ipAddress} to ${request.url}`);
            return; // Skip security checks for authorized load tests only
        }
        
        // 1. ตรวจสอบว่า IP ถูก block หรือไม่
        const isBlocked = await this.securityMonitor.isIPBlocked(ipAddress);
        if (isBlocked) {
            await this.securityMonitor.logSecurityEvent({
                ipAddress,
                userAgent: request.headers['user-agent'],
                endpoint: request.url,
                method: request.method,
                threat: {
                    type: ThreatType.SUSPICIOUS_PATTERN,
                    severity: ThreatSeverity.HIGH,
                    description: 'Request from blocked IP',
                    blocked: true
                }
            });

            return reply.status(403).send({
                success: false,
                message: 'Access denied'
            });
        }

        // 2. ตรวจสอบ Rate Limiting (DOS protection)
        const rateLimitExceeded = this.checkRateLimit(ipAddress);
        if (rateLimitExceeded) {
            await this.securityMonitor.logSecurityEvent({
                userId: (request as any).user?.id,
                ipAddress,
                userAgent: request.headers['user-agent'],
                endpoint: request.url,
                method: request.method,
                threat: {
                    type: ThreatType.RATE_LIMIT_EXCEEDED,
                    severity: ThreatSeverity.MEDIUM,
                    description: 'Rate limit exceeded',
                    blocked: true
                }
            });

            return reply.status(429).send({
                success: false,
                message: 'Too many requests'
            });
        }

        // 3. ตรวจสอบ Payload Size (DOS protection)
        if (request.body) {
            const isValidSize = this.threatDetector.validatePayloadSize(request.body, 10240); // 10MB max
            if (!isValidSize) {
                await this.securityMonitor.logSecurityEvent({
                    userId: (request as any).user?.id,
                    ipAddress,
                    userAgent: request.headers['user-agent'],
                    endpoint: request.url,
                    method: request.method,
                    threat: {
                        type: ThreatType.DOS,
                        severity: ThreatSeverity.HIGH,
                        description: 'Payload size exceeds limit',
                        blocked: true
                    }
                });

                return reply.status(413).send({
                    success: false,
                    message: 'Payload too large'
                });
            }
        }

        // 4. สแกนหา threats ใน query parameters
        if (request.query) {
            const queryThreats = this.scanObject(request.query);
            if (queryThreats.detected) {
                await this.handleThreatsDetected(request, reply, queryThreats.threats, 'query');
                return;
            }
        }

        // 5. สแกนหา threats ใน body
        if (request.body) {
            const bodyThreats = this.scanObject(request.body);
            if (bodyThreats.detected) {
                await this.handleThreatsDetected(request, reply, bodyThreats.threats, 'body');
                return;
            }
        }

        // 6. สแกนหา threats ใน headers (บางตัว)
        const suspiciousHeaders = ['referer', 'x-forwarded-for', 'x-real-ip'];
        for (const header of suspiciousHeaders) {
            const value = request.headers[header];
            if (value && typeof value === 'string') {
                // Skip threat detection for legitimate referer URLs from our own frontend
                if (header === 'referer' && this.isLegitimateReferer(value)) {
                    continue;
                }
                
                const headerThreats = this.threatDetector.detectThreats(value);
                if (headerThreats.detected) {
                    await this.handleThreatsDetected(request, reply, headerThreats.threats, 'headers');
                    return;
                }
            }
        }

        // 7. ตรวจสอบ IDOR ถ้ามี user ID ใน params
        if (request.params && (request.params as any).id) {
            const isValidAccess = await this.checkIDORProtection(request);
            if (!isValidAccess) {
                await this.securityMonitor.logSecurityEvent({
                    userId: (request as any).user?.id,
                    ipAddress,
                    userAgent: request.headers['user-agent'],
                    endpoint: request.url,
                    method: request.method,
                    threat: {
                        type: ThreatType.IDOR,
                        severity: ThreatSeverity.HIGH,
                        description: 'Insecure Direct Object Reference (IDOR) attempt',
                        blocked: true
                    },
                    metadata: {
                        requestedId: (request.params as any).id,
                        userId: (request as any).user?.id
                    }
                });

                return reply.status(403).send({
                    success: false,
                    message: 'Access denied'
                });
            }
        }
    };

    /**
     * สแกน object แบบ recursive
     */
    private scanObject(obj: unknown): { detected: boolean; threats: any[] } {
        const allThreats: any[] = [];

        const scan = (value: unknown) => {
            if (typeof value === 'string') {
                const result = this.threatDetector.detectThreats(value);
                if (result.detected) {
                    allThreats.push(...result.threats);
                }
            } else if (Array.isArray(value)) {
                value.forEach(scan);
            } else if (typeof value === 'object' && value !== null) {
                Object.values(value).forEach(scan);
            }
        };

        scan(obj);

        return {
            detected: allThreats.length > 0,
            threats: allThreats
        };
    }

    /**
     * จัดการเมื่อพบ threats
     */
    private async handleThreatsDetected(
        request: FastifyRequest,
        reply: FastifyReply,
        threats: any[],
        location: string
    ) {
        const ipAddress = this.getClientIP(request);
        const highestSeverity = threats.reduce((max, t) => {
            const severityOrder: Record<ThreatSeverity, number> = {
                [ThreatSeverity.CRITICAL]: 4,
                [ThreatSeverity.HIGH]: 3,
                [ThreatSeverity.MEDIUM]: 2,
                [ThreatSeverity.LOW]: 1,
                [ThreatSeverity.INFO]: 0
            };
            return severityOrder[t.severity as ThreatSeverity] > severityOrder[max as ThreatSeverity] ? t.severity : max;
        }, ThreatSeverity.INFO);

        // Log ทุก threat ที่เจอ
        for (const threat of threats) {
            await this.securityMonitor.logSecurityEvent({
                userId: (request as any).user?.id,
                ipAddress,
                userAgent: request.headers['user-agent'],
                endpoint: request.url,
                method: request.method,
                threat: {
                    type: threat.type,
                    severity: threat.severity,
                    description: threat.description,
                    payload: `Detected in ${location}`,
                    blocked: true
                },
                metadata: {
                    location,
                    pattern: threat.pattern
                }
            });
        }

        // ถ้าเป็น CRITICAL หรือมี threats เยอะ ให้ block IP ชั่วคราว
        if (highestSeverity === ThreatSeverity.CRITICAL || threats.length >= 3) {
            // อาจจะ block IP ได้ แต่ควรระวังเรื่อง false positive
            console.warn(`Multiple threats detected from IP: ${ipAddress}`);
        }

        return reply.status(400).send({
            success: false,
            message: 'Invalid input detected',
            code: 'SECURITY_THREAT_DETECTED'
        });
    }

    /**
     * ตรวจสอบ Rate Limiting
     */
    private checkRateLimit(ipAddress: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
        const now = Date.now();
        const record = this.requestCounts.get(ipAddress);

        if (!record || now > record.resetAt) {
            this.requestCounts.set(ipAddress, {
                count: 1,
                resetAt: now + windowMs
            });
            return false;
        }

        record.count++;
        
        if (record.count > maxRequests) {
            return true;
        }

        return false;
    }

    /**
     * ตรวจสอบ IDOR protection
     */
    private async checkIDORProtection(request: FastifyRequest): Promise<boolean> {
        const user = (request as any).user;
        const requestedId = (request.params as any).id;

        // ถ้าไม่มี user = ให้ผ่านไปก่อน (จะถูกเช็คโดย authorize middleware ต่อ)
        // เพราะ security scanner ทำงานก่อน JWT authentication
        if (!user) return true;

        // Admin ผ่านทุกอย่าง
        if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;

        // ถ้า endpoint เป็น /users/:id ต้องเป็น user เดียวกัน
        if (request.url.includes('/users/') && requestedId !== user.id) {
            return false;
        }

        // ถ้า endpoint เป็น /customers/:id ต้องเป็น officer ที่ดูแล customer นั้น
        if (request.url.includes('/customers/')) {
            // ควรเช็คจาก database ว่า user นี้มีสิทธิ์เข้าถึง customer นี้หรือไม่
            // แต่เพื่อความเร็ว อาจจะให้ผ่านไปก่อนแล้วเช็คใน service layer
            return true;
        }

        return true;
    }

    /**
     * ตรวจสอบว่าเป็น load test request ที่ถูกต้องหรือไม่
     * ต้องผ่านเงื่อนไขทั้งหมด:
     * 1. ต้องเป็น development environment
     * 2. ต้องมา localhost เท่านั้น
     * 3. ต้องมี secret token ที่ถูกต้อง
     */
    private isValidLoadTestRequest(request: FastifyRequest): boolean {
        // ❌ ห้ามใช้ใน production
        if (process.env.NODE_ENV === 'production') {
            return false;
        }

        // ✅ ต้องมา localhost เท่านั้น
        const ipAddress = this.getClientIP(request);
        const isLocalhost = ipAddress === '127.0.0.1' || 
                           ipAddress === '::1' || 
                           ipAddress === 'localhost';
        
        if (!isLocalhost) {
            return false;
        }

        // ✅ ต้องมี secret token ที่ถูกต้อง
        const loadTestSecret = process.env.LOAD_TEST_SECRET;
        if (!loadTestSecret) {
            return false; // ถ้าไม่มี secret ใน env ก็ไม่อนุญาต
        }

        const providedToken = request.headers['x-load-test-token'];
        if (providedToken !== loadTestSecret) {
            return false;
        }

        return true;
    }

    /**
     * ดึง IP address ของ client
     */
    private getClientIP(request: FastifyRequest): string {
        return (
            (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (request.headers['x-real-ip'] as string) ||
            request.ip ||
            'unknown'
        );
    }

    /**
     * Check if referer URL is legitimate (from our own frontend)
     */
    private isLegitimateReferer(referer: string): boolean {
        try {
            const url = new URL(referer);
            
            // Allow localhost with common development ports
            if (url.hostname === 'localhost') {
                const allowedPorts = ['3000', '5173', '3001', '8080', '4000'];
                return allowedPorts.includes(url.port) || url.port === '';
            }
            
            // Allow 127.0.0.1 with common development ports
            if (url.hostname === '127.0.0.1') {
                const allowedPorts = ['3000', '5173', '3001', '8080', '4000'];
                return allowedPorts.includes(url.port) || url.port === '';
            }
            
            // In production, you would check against your actual domain
            // For now, we'll be restrictive and only allow localhost/127.0.0.1
            return false;
        } catch (error) {
            // Invalid URL format
            return false;
        }
    }

    /**
     * ทำความสะอาด rate limit cache
     */
    cleanupRateLimitCache() {
        const now = Date.now();
        for (const [ip, record] of this.requestCounts.entries()) {
            if (now > record.resetAt) {
                this.requestCounts.delete(ip);
            }
        }
    }
}

// Export singleton instance
export const securityScanner = new SecurityScannerMiddleware();

// Cleanup cache ทุก 5 นาที
setInterval(() => {
    securityScanner.cleanupRateLimitCache();
}, 5 * 60 * 1000);

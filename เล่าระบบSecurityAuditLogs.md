# ระบบ Security + Audit Logs (ความปลอดภัยและบันทึกการใช้งาน) แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์สถาปัตยกรรมความปลอดภัยและระบบตรวจสอบสำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรมความปลอดภัย

### 1.1 Security Layers
```
┌─────────────────────────────────────────────────────────────────┐
│                      PERIMETER SECURITY                         │
│  • Rate Limiting (express-rate-limit)                          │
│  • Helmet Headers (CSP, HSTS, X-Frame-Options)                  │
│  • CORS Configuration                                            │
│  • IP Whitelist (optional)                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                       │
│  • JWT Token Validation                                          │
│  • Refresh Token Rotation                                        │
│  • Session Management (Redis)                                    │
│  • MFA Support (extensible)                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHORIZATION LAYER                        │
│  • RBAC (Role-Based Access Control)                              │
│  • Permission Middleware                                         │
│  • Branch Scoping                                                  │
│  • Resource Ownership Checks                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INPUT VALIDATION                           │
│  • Zod Schema Validation                                         │
│  • SQL Injection Prevention (Prisma)                              │
│  • XSS Prevention (Sanitization)                                 │
│  • File Upload Validation (MIME, Size)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUDIT & MONITORING                       │
│  • Request Logging (Pino)                                        │
│  • Audit Trail (Database + Queue)                                │
│  • Suspicious Activity Detection                                 │
│  • Security Scanning (Input Scan)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Audit Logging System

### 2.1 Audit Log Types
| Type | Purpose | Storage |
|------|---------|---------|
| **Request Audit** | Log all HTTP requests | Database + Pino logs |
| **Data Access Audit** | Track who accessed what data | Database (data_access_logs) |
| **Invoice Access Audit** | Track invoice/document access | Database (invoice_access_logs) |
| **Suspicious Activity** | Security incidents & alerts | Database (suspicious_transaction_reports) |
| **Async Audit Queue** | High-volume audit processing | BullMQ + Redis |

### 2.2 Audit Middleware Architecture
```typescript
/**
 * Main Audit Middleware - Logs all requests
 * Attached to Fastify 'onRequest' hook
 */
export const auditLog = async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    // Log request start
    logger.info({
        method: request.method,
        url: request.url,
        userId: request.user?.userId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
    }, 'Request received');

    // Hook into response finish
    reply.raw.on('finish', () => {
        const duration = Date.now() - startTime;

        // Only audit non-GET operations on sensitive paths
        if (request.method !== 'GET' && shouldAudit(request.url)) {
            prisma.auditLog.create({
                data: {
                    userId: request.user?.userId || null,
                    action: `${request.method} ${request.url}`,
                    entity: extractEntity(request.url),      // e.g., 'customers'
                    entityId: extractEntityId(request.url),  // e.g., 'uuid'
                    changes: request.body as any,
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                    metadata: {
                        statusCode: reply.statusCode,
                        duration,
                        requestUserId: request.user?.userId,
                        requestEmail: request.user?.email,
                        requestRole: request.user?.role,
                    },
                },
            });
        }

        logger.info({
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            duration,
        }, 'Request completed');
    });
};
```

### 2.3 Data Access Audit Logger
```typescript
/**
 * Specialized middleware for data access tracking
 * Used on specific routes to track who viewed/edited customer data
 */
export function auditLogger(config: AuditConfig) {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
        const userId = (request as any).user?.id;
        if (!userId) return; // Skip for public endpoints

        // Determine access type from HTTP method
        const accessType = config.accessType || getAccessTypeFromMethod(request.method);
        // GET → VIEW, POST/PUT/PATCH → EDIT, DELETE → DELETE

        const resourceId = config.getResourceId 
            ? config.getResourceId(request)
            : (request.params as any).id;

        const customerId = config.getCustomerId
            ? config.getCustomerId(request)
            : (request.params as any).customerId;

        // Log asynchronously (don't block request)
        setImmediate(async () => {
            await auditLogService.logDataAccess({
                userId,
                customerId,
                accessType,      // VIEW | EDIT | DELETE | EXPORT | PRINT
                resourceType: config.resourceType,  // CUSTOMER | LOAN | PAYMENT
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
        });
    };
}
```

### 2.4 Async Audit Log Service (BullMQ)
```typescript
/**
 * High-volume audit logging via BullMQ queue
 * Prevents audit logging from blocking main requests
 */
export class AsyncAuditLogService {
    private queue: Queue<AuditLogData>;
    private worker: Worker<AuditLogData>;

    constructor() {
        // BullMQ queue configuration
        this.queue = new Queue<AuditLogData>('audit-logs', {
            connection: redis,
            defaultJobOptions: {
                attempts: 3,                    // Retry 3 times
                backoff: {
                    type: 'exponential',
                    delay: 1000,               // Start with 1s delay
                },
                removeOnComplete: {
                    count: 1000,              // Keep last 1000
                    age: 24 * 3600,           // Remove after 24h
                },
                removeOnFail: {
                    count: 5000,              // Keep last 5000 failed
                },
            },
        });

        // Worker processes logs concurrently
        this.worker = new Worker<AuditLogData>(
            'audit-logs',
            async (job) => {
                await this.processAuditLog(job.data);
            },
            {
                connection: redis,
                concurrency: 10,               // Process 10 logs at once
            }
        );
    }

    async log(data: Omit<AuditLogData, 'timestamp'>): Promise<void> {
        try {
            await this.queue.add('audit-log', {
                ...data,
                timestamp: new Date(),
            });
        } catch (error) {
            // Never throw - audit logging shouldn't break the app
            logger.error({ error, data }, 'Failed to queue audit log');
        }
    }

    private async processAuditLog(data: AuditLogData): Promise<void> {
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entity: data.entity || 'UNKNOWN',
                entityId: data.entityId,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                metadata: data.metadata,
                createdAt: data.timestamp,
            },
        });
    }
}
```

---

## 3. Suspicious Activity Detection

### 3.1 Velocity Check
```typescript
/**
 * Detect unusual access patterns
 * Flags users with > 50 accesses in 60 minutes
 */
async detectUnusualAccess(userId: string, timeWindowMinutes = 60): Promise<boolean> {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const recentAccess = await prisma.data_access_logs.count({
        where: {
            user_id: userId,
            accessed_at: { gte: since }
        }
    });

    return recentAccess > 50;  // Threshold
}
```

### 3.2 Suspicious Activity Reporter
```typescript
async reportSuspiciousActivity(data: SuspiciousActivityInput) {
    return await prisma.suspicious_transaction_reports.create({
        data: {
            customer_id: data.customerId,
            transaction_id: data.transactionId,
            activity_type: data.activityType,
            // Types: UNUSUAL_AMOUNT | UNUSUAL_FREQUENCY | UNUSUAL_PATTERN | 
            //        BLACKLIST_MATCH | VELOCITY_CHECK | OTHER
            severity: data.severity,  // LOW | MEDIUM | HIGH | CRITICAL
            description: data.description,
            detected_by: data.detectedBy,
            detection_method: data.detectionMethod,  // AUTOMATED | MANUAL | EXTERNAL
            indicators: data.indicators,
            recommended_action: data.recommendedAction,
            status: 'PENDING',
            reported_at: new Date(),
        }
    });
}
```

### 3.3 Suspicious Activity Middleware
```typescript
export function suspiciousActivityDetector() {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
        const userId = (request as any).user?.id;
        if (!userId) return;

        // Check for unusual patterns
        const isUnusual = await auditLogService.detectUnusualAccess(userId, 60);
        
        if (isUnusual) {
            const customerId = (request.params as any).customerId;
            
            setImmediate(async () => {
                await auditLogService.reportSuspiciousActivity({
                    customerId,
                    activityType: 'VELOCITY_CHECK',
                    severity: 'MEDIUM',
                    description: `User ${userId} exceeded normal access (>50 in 60 min)`,
                    detectedBy: 'SYSTEM',
                    detectionMethod: 'AUTOMATED',
                    indicators: {
                        userId,
                        timeWindow: '60 minutes',
                        threshold: 50
                    }
                });
            });
        }
    };
}
```

---

## 4. Security Scanning

### 4.1 Request Security Scanner
```typescript
// Applied to all requests except health/metrics
app.addHook('preHandler', async (request, reply) => {
    const skipPaths = ['/api/health', '/api/metrics', '/uploads', '/api/config'];
    const shouldSkip = skipPaths.some(path => request.url.startsWith(path));
    
    if (!shouldSkip) {
        await securityScanner.scanRequest(request, reply);
    }
});
```

### 4.2 Input Sanitization Middleware
```typescript
/**
 * XSS and injection prevention
 */
export const sanitizeInputMiddleware = async (
    request: FastifyRequest,
    _reply: FastifyReply
) => {
    if (request.body) {
        // Recursively sanitize all string fields
        request.body = sanitizeObject(request.body);
    }
};

function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        // Remove script tags and dangerous patterns
        return obj
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    }
    return obj;
}
```

---

## 5. Database Schema (Audit)

### 5.1 Audit Log Tables
```sql
-- Main audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data access logs (fine-grained)
CREATE TABLE data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    access_type VARCHAR(50) NOT NULL,  -- VIEW, EDIT, DELETE, EXPORT, PRINT
    resource_type VARCHAR(50) NOT NULL, -- CUSTOMER, LOAN, PAYMENT, DOCUMENT
    resource_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    access_reason TEXT,
    data_accessed JSONB,
    accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Invoice access logs
CREATE TABLE invoice_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    invoice_id VARCHAR(255),
    access_type VARCHAR(50) NOT NULL,  -- VIEW, DOWNLOAD, PRINT, EMAIL, GENERATE
    accessed_by UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Suspicious activity reports
CREATE TABLE suspicious_transaction_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    transaction_id UUID,
    activity_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,  -- LOW, MEDIUM, HIGH, CRITICAL
    description TEXT NOT NULL,
    detected_by VARCHAR(255) NOT NULL,
    detection_method VARCHAR(50) NOT NULL,  -- AUTOMATED, MANUAL, EXTERNAL
    indicators JSONB,
    recommended_action TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- PENDING, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    investigated_by UUID,
    investigated_at TIMESTAMP,
    resolution TEXT,
    reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 6. API Endpoints

### 6.1 Audit & Security Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/audit/logs` | Admin | Get all audit logs |
| GET | `/api/audit/logs/user/:id` | Admin | Get user audit trail |
| GET | `/api/audit/logs/customer/:id` | Admin/Manager | Get customer access logs |
| GET | `/api/audit/logs/resource/:type/:id` | Admin | Get resource access history |
| GET | `/api/audit/statistics` | Admin | Get audit statistics |
| POST | `/api/audit/export` | Admin | Export audit logs for compliance |
| GET | `/api/security/suspicious` | Admin | Get suspicious activity reports |
| POST | `/api/security/suspicious/:id/resolve` | Admin | Resolve suspicious report |
| GET | `/api/security/alerts` | Admin | Get security alerts |

---

## 7. Key Design Decisions

### 7.1 Why Async Audit Logging?
- **Performance**: Don't block main request flow
- **Reliability**: Queue ensures logs are saved even under load
- **Retry Logic**: Failed logs are retried automatically
- **Scalability**: Can handle high volume of audit events

### 7.2 Why SetImmediate?
```typescript
// Using setImmediate for audit logging
setImmediate(async () => {
    await auditLogService.logDataAccess(data);
});
```
- Defers execution to next event loop iteration
- Ensures request response isn't delayed
- Still runs on same thread (no thread hopping cost)

### 7.3 Why Skip GET Requests?
```typescript
// Optimization: Only audit non-GET requests
if (request.method !== 'GET' && shouldAudit(request.url)) {
    // Create audit log
}
```
- GET requests are read-only and numerous
- Reduces audit log volume by ~70%
- Still captures data access via specialized middleware

### 7.4 Suspicious Activity Severity Levels
| Level | Criteria | Action |
|-------|----------|--------|
| **LOW** | Minor anomaly | Log only |
| **MEDIUM** | Velocity check failed | Alert admin |
| **HIGH** | Pattern match blacklisted | Block + Alert |
| **CRITICAL** | Confirmed fraud | Immediate lock |

---

## 8. Files สำคัญ

### Backend
| File | Responsibility |
|------|---------------|
| `audit.middleware.ts` | Main request audit logging |
| `audit-logger.middleware.ts` | Specialized data access tracking |
| `audit-log.service.ts` | Audit log CRUD and statistics |
| `async-audit-log.service.ts` | BullMQ queue for high-volume logs |
| `security-monitor.service.ts` | Security scanning and alerts |
| `sanitize.middleware.ts` | XSS/injection prevention |
| `app.ts` | Middleware registration hooks |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

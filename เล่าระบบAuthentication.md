# ระบบ Authentication แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์ระบบ Authentication ทั้ง Frontend และ Backend สำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

### 1.1 Stack Technology
| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Fastify (Node.js) | ^5.2.0 |
| **Frontend** | React + Vite | ^18.3.1 |
| **Database** | PostgreSQL | - |
| **ORM** | Prisma | ^6.1.0 |
| **Cache/Session** | Redis | ioredis ^5.4.2 |
| **Queue** | BullMQ | ^5.28.2 |

### 1.2 Authentication Pattern
ใช้ **JWT-based Authentication** แบบ **Dual Token** (Access Token + Refresh Token) พร้อม **Session Tracking** ในฐานข้อมูล

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │──────▶│   Backend   │──────▶│  Database   │
│  (React)    │◀──────│  (Fastify)  │◀──────│ (PostgreSQL)│
└─────────────┘      └─────────────┘      └─────────────┘
       │                    │
       │              ┌─────┴─────┐
       │              │   Redis   │
       │              │  (Cache)  │
       │              └───────────┘
```

---

## 2. Libraries & Dependencies

### 2.1 Backend Dependencies (`/backend/package.json`)

```json
{
  "@fastify/jwt": "^9.0.1",        // JWT signing/verification
  "@fastify/cookie": "^10.0.1",    // Cookie handling
  "@fastify/helmet": "^12.0.1",    // Security headers
  "@fastify/rate-limit": "^10.1.1", // Rate limiting
  "bcrypt": "^6.0.0",              // Password hashing
  "ioredis": "^5.4.2",             // Redis client
  "bullmq": "^5.28.2",             // Job queue (email queue)
  "zod": "^3.24.1"                 // Schema validation
}
```

### 2.2 Frontend Dependencies (`/frontend/package.json`)

```json
{
  "react-router-dom": "^6.30.1",   // Routing + navigation guards
  "zod": "^3.25.76",               // Form validation
  "@hookform/resolvers": "^3.10.0", // React Hook Form + Zod
  "sonner": "^1.7.4"               // Toast notifications
}
```

**หมายเหตุ:** Frontend ไม่มี dependency สำหรับ JWT decoding (ใช้ native `atob` function)

---

## 3. โครงสร้างระบบ Authentication

### 3.1 Backend File Structure

```
backend/src/
├── modules/auth/
│   ├── controllers/auth.controller.ts      # HTTP layer (Request/Response)
│   ├── services/auth.service.ts             # Business logic
│   ├── repositories/session.repository.ts   # Data access layer
│   └── models/auth.model.ts                 # Validation schemas (Zod)
│
├── core/utils/security/
│   ├── jwt.util.ts                          # JWT generation/verification
│   └── encryption.util.ts                   # Password hashing & AES encryption
│
├── core/middleware/security/
│   ├── auth.middleware.ts                   # JWT verification middleware
│   └── brute-force-protection.middleware.ts # Anti-brute force
│
└── core/config/
    ├── env.config.ts                        # Environment validation
    └── redis.config.ts                      # Redis connection
```

### 3.2 Frontend File Structure

```
frontend/src/
├── shared/
│   ├── contexts/
│   │   └── AuthContext.tsx                  # Global auth state
│   ├── hooks/
│   │   └── useSessionManager.ts             # Session expiry warning
│   └── lib/
│       ├── api-client.ts                    # HTTP client with token refresh
│       └── api-endpoints.ts                  # API definitions
│
└── features/auth/
    ├── api/
    │   └── auth.api.ts                      # Auth API wrappers
    └── pages/
        ├── Login.tsx                        # Login page
        └── ResetPassword.tsx                # Password reset
```

---

## 4. Database Schema (Authentication-related)

### 4.1 User Table (`prisma/schema.prisma`)
```prisma
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  passwordHash       String    @map("password_hash")
  firstName          String
  lastName           String
  phoneNumber        String?
  role               UserRole  @default(CUSTOMER)  // ADMIN, MANAGER, OFFICER
  status             UserStatus @default(ACTIVE)
  branchId           String?
  mustChangePassword Boolean   @default(false)
  passwordChangedAt  DateTime?
  nationalId         String?   // AES-256-GCM encrypted
  lineUserId         String?   @unique
  lastLoginAt        DateTime?
  sessions           Session[]
  
  @@index([branchId])
  @@map("users")
}
```

### 4.2 Session Table (สำคัญมาก!)
```prisma
model Session {
  id                     String    @id @default(uuid())
  userId                 String
  token                  String    @unique        // Current access token
  refreshToken           String?   @unique        // Current refresh token
  previousToken          String?                  // Grace period: old token
  previousTokenExpiresAt DateTime?                // Grace period expiry
  previousRefreshToken   String?                  // Old refresh token
  ipAddress              String?
  userAgent              String?
  isValid                Boolean   @default(true)
  expiresAt              DateTime                 // Sliding window expiry
  createdAt              DateTime  @default(now())
  
  @@index([userId])
  @@index([expiresAt])
  @@index([previousToken])
  @@index([previousTokenExpiresAt])
  @@map("sessions")
}
```

**หมายเหตุ:** มี `token_refresh_audit` table สำหรับบันทึกการ refresh token ทั้งหมด (security audit trail)

---

## 5. Authentication Workflow

### 5.1 Login Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Client │────▶│  AuthController │──▶│ AuthService  │──▶│ UserRepository│
└─────────┘     └─────────────┘     └──────────────┘     └─────────────┘
                                                                            │
     ┌──────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ EncryptionUtil│────▶│  JWTUtil     │──▶│SessionRepository│
│  (bcrypt)    │     │ (sign token) │     │ (create session)│
└──────────────┘     └─────────────┘     └──────────────┘
```

**ขั้นตอน:**
1. Client ส่ง `email`, `password`
2. `AuthController.login` → `AuthService.login`
3. `UserRepository.findByEmail()` หา user
4. `EncryptionUtil.verifyPassword()` ตรวจสอบ bcrypt hash
5. `JWTUtil.generateAccessToken()` + `generateRefreshToken()` สร้าง token
6. `SessionRepository.create()` บันทึก session ในฐานข้อมูล
7. ส่ง token กลับ พร้อม set HTTP-only cookie

### 5.2 Token Structure (JWT Payload)

```typescript
// Access Token Payload
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  branchId?: string;    // Multi-tenancy: branch isolation
  sessionId: string;    // Link to specific DB session
  jti: string;          // JWT ID (random UUID สำหรับ blacklist)
}

// Refresh Token Payload  
interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  jti: string;
}
```

### 5.3 API Request Flow (Authenticated)

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐
│ Request │────▶│  Auth Middleware │──▶│ JWTUtil.verifyAccessToken()
└─────────┘     └─────────────┘     └─────────────────┘
                                              │
     ┌────────────────────────────────────────┘
     │
     ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│SessionRepository.│───▶│  Check User Status│──▶│ Controller  │
│findActiveSession │     │ (prevent zombie users)│               │
└─────────────────┘     └─────────────────┘     └─────────────┘
```

---

## 6. Security Features (Production-Grade)

### 6.1 Password Security
- **Hashing:** bcrypt ด้วย **12 rounds** (`SALT_ROUNDS = 12`)
- **Requirements:** 
  - Minimum 8 characters
  - 1 uppercase letter
  - 1 lowercase letter
  - 1 number
  - 1 special character

```typescript
// @/backend/src/core/utils/security/encryption.util.ts
static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);  // 12 rounds
}
```

### 6.2 Sensitive Data Encryption
ใช้ **AES-256-GCM** สำหรับ encrypt sensitive data (เช่น nationalId)

```typescript
static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

### 6.3 Brute Force Protection
- **Redis-based tracking** (ไม่ใช้ in-memory Map → ป้องกัน memory leak)
- **Max failed attempts:** 5 ครั้ง / 15 นาที
- **Auto-block:** 1 ชั่วโมง
- **Validation failures tracking:** 20 ครั้ง → block (ป้องกัน bot scanning)

```typescript
// @/backend/src/core/middleware/security/brute-force-protection.middleware.ts
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;  // 15 minutes
const BLOCK_DURATION_MINUTES = 60;       // 1 hour
```

### 6.4 Token Rotation & Grace Period
- **Refresh Token Rotation:** สร้าง refresh token ใหม่ทุกครั้งที่ refresh
- **Grace Period:** 30 วินาที สำหรับ token เก่า (ป้องกัน race condition)
- **Sliding Window:** ต่ออายุ session ทุกครั้งที่ refresh token

```typescript
// SessionRepository.updateToken()
const updateData = {
    previousToken: currentSession?.token,              // Keep old token
    previousTokenExpiresAt: new Date(Date.now() + 30 * 1000),  // 30s grace
    expiresAt: new Date(Date.now() + SESSION_EXPIRES_IN),  // Extend session
};
```

### 6.5 Zombie User Prevention
ตรวจสอบ user status ทุกครั้งที่มี API request:

```typescript
// @/backend/src/core/middleware/security/auth.middleware.ts
const user = await userRepository.findById(payload.userId);
if (!user || user.status !== 'ACTIVE') {
    await sessionRepository.invalidate(session.id);
    return ResponseUtil.unauthorized(reply, 'Account is not active');
}
```

### 6.6 Session Limit (FIFO)
- **Max concurrent sessions:** 5 sessions per user (configurable)
- **Overflow handling:** ลบ session เก่าสุด (FIFO) เมื่อเกิน limit

```typescript
// @/backend/src/modules/auth/services/auth.service.ts
private async enforceSessionLimit(userId: string): Promise<void> {
    const activeCount = await this.sessionRepository.countActiveSessionsByUserId(userId);
    if (activeCount >= env.MAX_SESSIONS_PER_USER) {
        await this.sessionRepository.deleteOldestSessions(userId, env.MAX_SESSIONS_PER_USER - 1);
    }
}
```

### 6.7 Rate Limiting
- **Fastify rate-limit:** 100 requests / 60 seconds (default)
- **Key generator:** By user ID (if authenticated) หรือ IP

```typescript
// @/backend/src/app.ts
await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,           // 100
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,  // 60000ms
    keyGenerator: (request) => {
        return request.user?.userId || request.ip;  // Rate limit by user
    },
});
```

### 6.8 Security Headers (Helmet)
```typescript
await app.register(helmet, {
    contentSecurityPolicy: { /* ... */ },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
});
```

### 6.9 Token Blacklist (Emergency Revocation)
```typescript
// @/backend/src/core/utils/security/jwt.util.ts
static async revokeToken(token: string): Promise<void> {
    const decoded = this.decodeToken(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
        await redis.setex(`blacklist:${decoded.jti}`, ttl, '1');
    }
}
```

---

## 7. Token & Session Configuration

### 7.1 Environment Variables
```env
# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h              # Access token expiry
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d      # Refresh token expiry

# Session
SESSION_SECRET=session-secret
SESSION_EXPIRES_IN=7d          # Session sliding window
MAX_SESSIONS_PER_USER=5        # Max concurrent sessions

# Encryption
ENCRYPTION_KEY=64-character-hex-key  # 32 bytes for AES-256
ENCRYPTION_ALGORITHM=aes-256-gcm
```

### 7.2 Token Lifetimes
| Token Type | Default | Usage |
|-----------|---------|-------|
| **Access Token** | 1 hour | API requests |
| **Refresh Token** | 7 days | Get new access token |
| **Session** | 7 days (sliding) | Database session record |
| **Reset Token** | 1 hour | Password reset link |
| **Grace Period** | 30 seconds | Accept old token after rotation |

---

## 8. Frontend Implementation

### 8.1 AuthContext (Global State)
```typescript
// @/frontend/src/shared/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  currentRole: UserRole | null;
}

// Storage keys
const SESSION_KEY = 'unity_auth_session';      // sessionStorage (user data)
const TOKEN_KEY = 'accessToken';               // localStorage
const REFRESH_TOKEN_KEY = 'refreshToken';    // localStorage
```

### 8.2 API Client with Auto-Refresh
```typescript
// @/frontend/src/shared/lib/api-client.ts
class ApiClient {
    private refreshTokenPromise: Promise<string | null> | null = null;
    
    // Preemptive refresh: ถ้า token จะหมดอายุใน 5 นาที
    private async checkAndRefreshToken(): Promise<void> {
        const token = this.getAuthToken();
        const fiveMinutes = 5 * 60 * 1000;
        if ((expiryTime - now) < fiveMinutes) {
            await this.refreshAccessToken();
        }
    }
    
    // 401 handler: ลอง refresh ก่อน redirect
    private async request<T>(endpoint: string, options: RequestOptions): Promise<ApiResponse<T>> {
        if (response.status === 401 && !isPublicEndpoint) {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
                // Retry with new token
                forcedToken = newToken;
                continue;
            }
        }
    }
}
```

### 8.3 Token Storage Strategy
| Storage | Data | Reason |
|---------|------|--------|
| **localStorage** | accessToken, refreshToken | Persist across tabs |
| **sessionStorage** | user data (parsed) | Tab-specific, auto-clear on close |
| **Cookies** | accessToken, refreshToken (httpOnly) | Backend compatibility |

### 8.4 Session Expiry Warning
```typescript
// @/frontend/src/shared/hooks/useSessionManager.ts
export function useSessionManager(config: SessionConfig = {}) {
  const {
    sessionTimeout = 30 * 60 * 1000,  // 30 minutes
    warningTime = 5 * 60 * 1000,      // Warn 5 min before
    inactivityTimeout = 15 * 60 * 1000, // 15 min inactivity
  } = config;
  
  // Auto-detect activity (mouse, keyboard, scroll, touch)
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
  }, []);
}
```

---

## 9. API Endpoints

### 9.1 Auth Endpoints (`/backend/src/routes/index.ts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | Yes | Logout + invalidate session |
| POST | `/api/auth/refresh` | No | Refresh access token |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/forgot-password` | No | Send reset link |
| POST | `/api/auth/reset-password` | No | Reset with token |

### 9.2 Frontend API Wrappers (`/frontend/src/shared/lib/api-endpoints.ts`)

```typescript
export const authApi = {
    login: (email: string, password: string) =>
        apiClient.post<AuthResponse>('/api/auth/login', { email, password }),
    
    logout: () => apiClient.post('/api/auth/logout'),
    
    refresh: (refreshToken: string) =>
        apiClient.post<{ accessToken: string }>('/api/auth/refresh', { refreshToken }),
    
    me: (silent = false) =>
        apiClient.get<User>('/api/auth/me', undefined, { silent }),
};
```

---

## 10. Key Design Decisions

### 10.1 ทำไมใช้ Session Table แทน Stateless JWT?
✅ **ข้อดี:**
- สามารถ revoke session ได้ทันที (force logout)
- Track concurrent sessions (enforce limit)
- Audit trail ทุกการใช้งาน
- Grace period สำหรับ token rotation

❌ **Trade-off:**
- ต้อง query database ทุก request (แต่ใช้ index + lightweight query)

### 10.2 ทำไมใช้ Token Rotation?
✅ **ข้อดี:**
- ลด risk จาก stolen refresh token
- สามารถ detect token reuse (indicate theft)
- Grace period ป้องกัน race condition

### 10.3 ทำไมใช้ Redis แทน In-Memory?
✅ **ข้อดี:**
- รองรับ horizontal scaling (multiple backend instances)
- Persist ข้าม restart
- Auto-TTL (ไม่ต้อง cleanup manually)
- ป้องกัน memory leak

---

## 11. Security Checklist

- [x] Password hashing (bcrypt, 12 rounds)
- [x] Sensitive data encryption (AES-256-GCM)
- [x] Brute force protection (Redis-based)
- [x] Rate limiting (by user ID)
- [x] Token rotation + grace period
- [x] Session limit (FIFO)
- [x] Zombie user prevention (real-time status check)
- [x] Token blacklist (emergency revocation)
- [x] HTTP-only cookies
- [x] CORS with credentials
- [x] Security headers (Helmet)
- [x] Input sanitization
- [x] Audit logging (token refresh)
- [x] Correlation ID tracking

---

## 12. Files สำคัญที่ควรรู้จัก

### Backend Core Files
| File | Responsibility |
|------|---------------|
| `auth.service.ts` | Business logic (login, register, refresh, password reset) |
| `auth.middleware.ts` | JWT verification, session validation, zombie user check |
| `jwt.util.ts` | Token generation, verification, blacklist |
| `encryption.util.ts` | bcrypt, AES-256-GCM |
| `session.repository.ts` | Session CRUD, grace period handling |
| `brute-force-protection.middleware.ts` | Failed login tracking, auto-block |
| `env.config.ts` | Environment validation |

### Frontend Core Files
| File | Responsibility |
|------|---------------|
| `AuthContext.tsx` | Global auth state, login/logout, user mapping |
| `api-client.ts` | HTTP client, auto-refresh, error handling |
| `api-endpoints.ts` | Type-safe API wrappers |
| `useSessionManager.ts` | Session expiry warning, inactivity detection |

---

## 13. สรุป

ระบบ Authentication นี้ออกแบบมาสำหรับ **Enterprise Banking Application** ด้วยความปลอดภัยระดับสูง:

1. **Layered Security:** Token + Session + Cookie + Redis
2. **Defense in Depth:** Multiple security layers (helmet, rate limit, brute force, input sanitization)
3. **Audit Trail:** ทุกการ refresh token ถูกบันทึก
4. **Graceful Degradation:** Grace period, sliding window, error handling
5. **Production Ready:** Horizontal scaling, memory leak prevention, auto-cleanup

---

*เอกสารนี้จัดทำเมื่อ: April 2026*
*Project: DueTracker2026 - SME Banking Loan Management System*

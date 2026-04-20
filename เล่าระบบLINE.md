# ระบบ LINE Integration แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์ระบบ LINE Official Account Integration สำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

### 1.1 Stack Technology
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **LINE API** | LINE Messaging API v2 | ส่งข้อความ, Rich Menu |
| **LINE SDK** | LINE Frontend Framework | Web App บน LINE |
| **Backend** | Fastify + axios | Webhook handler, push message |
| **Frontend** | React + TanStack Query | LINE Registration UI |
| **Security** | HMAC-SHA256 | Webhook signature verification |
| **Queue** | BullMQ | ส่งข้อความแบบ rate-limit safe |

### 1.2 Integration Pattern
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   LINE OA   │◀────▶│   Backend   │◀────▶│  Database   │
│  (Official) │      │  (Fastify)  │      │ (PostgreSQL)│
└─────────────┘      └──────┬──────┘      └─────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
         │ Webhook │   │  Push   │   │  Rich   │
         │ Handler │   │ Message │   │  Menu   │
         └─────────┘   └─────────┘   └─────────┘
```

---

## 2. โครงสร้างโปรเจค (Project Structure)

### 2.1 Backend Structure (`/backend/src/modules/line/`)
```
line/
├── controllers/
│   ├── line.controller.ts           # HTTP endpoints
│   └── line-audit.controller.ts     # Audit logging
│
├── services/
│   ├── core/
│   │   ├── line.service.ts          # Base LINE API wrapper
│   │   ├── line-webhook.service.ts  # Webhook event handler
│   │   └── line-session.service.ts  # Session management
│   │
│   ├── messaging/
│   │   ├── line-messages.service.ts     # Message builder
│   │   ├── line-notification.service.ts # Daily notifications
│   │   ├── line-invoice.service.ts      # Invoice messaging
│   │   └── line-notification-queue.service.ts # BullMQ queue
│   │
│   ├── registration/
│   │   ├── line-registration.service.ts     # User linking
│   │   └── line-qr-registration.service.ts  # QR Code flow
│   │
│   ├── rich-menu/
│   │   ├── line-rich-menu.service.ts         # Basic Rich Menu
│   │   ├── line-rich-menu-manager.service.ts # Role-based menus
│   │   └── line-rich-menu-enhanced.service.ts # Enhanced features
│   │
│   ├── files/
│   │   └── line-file-upload.service.ts  # File handling
│   │
│   ├── line-audit.service.ts        # Audit trail
│   └── overpayment-link-token.service.ts
│
├── messages/                        # Role-based message templates
│   ├── admin.messages.ts
│   ├── manager.messages.ts
│   ├── officer.messages.ts
│   ├── customer.messages.ts
│   └── common.messages.ts
│
├── middleware/
│   ├── line-signature.middleware.ts # HMAC verification
│   └── line-rate-limit.middleware.ts
│
├── repositories/
│   └── line-audit.repository.ts
│
├── utils/
│   └── line-sanitization.util.ts    # Input sanitization
│
└── models/
    └── line.model.ts
```

### 2.2 Frontend Structure
```
frontend/src/
├── features/auth/
│   ├── pages/
│   │   └── LineRegistration.tsx     # LINE linking page
│   └── api/
│       └── line.api.ts              # LINE API wrappers
│
├── features/settings/components/settings/
│   ├── LineIntegrationCard.tsx      # Admin test panel
│   └── LineQRCodeCard.tsx           # QR Code display
│
└── features/users/components/
    └── LineAuditDialog.tsx          # Audit log viewer
```

---

## 3. Environment Configuration

### 3.1 Required Environment Variables
```env
# LINE Official Account
LINE_CHANNEL_ACCESS_TOKEN=your_long_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_OA_ID=@your_line_oa_id

# Payment Webhook (optional)
PAYMENT_WEBHOOK_SECRET=optional_webhook_secret
```

### 3.2 LINE Credentials Validation
```typescript
// @/backend/src/core/config/line-credentials.config.ts
export async function validateLineCredentials(options: {
    testConnectivity?: boolean;
    failOnConnectivityError?: boolean;
} = {}): Promise<void> {
    // 1. Validate token format (50+ characters)
    // 2. Validate channel secret format (20+ characters)
    // 3. Optional: Test LINE API connectivity
    // 4. Throw error if invalid (prevent server startup)
}
```

---

## 4. Database Schema (LINE-related)

### 4.1 User Table
```prisma
model User {
  id                       String    @id @default(uuid())
  lineUserId               String?   @unique
  lineLinkedAt             DateTime?
  lineActive               Boolean   @default(true)
  lineNotificationsEnabled Boolean   @default(true)
  
  // Relations
  lineAuditLogsAsUser      LineAuditLog[]
  lineAuditLogsAsPerformer LineAuditLog[]
}
```

### 4.2 Customer Table
```prisma
model Customer {
  id           String    @id @default(uuid())
  lineUserId   String?   @unique
  lineLinkedAt DateTime?
  
  lineAuditLogs LineAuditLog[]
}
```

### 4.3 Registration Token Table
```prisma
model RegistrationToken {
  id         String   @id @default(uuid())
  lineUserId String
  userId     String?  // For OTP linking
  token      String
  used       Boolean  @default(false)
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  
  @@index([lineUserId])
  @@index([token])
  @@index([expiresAt])
}
```

### 4.4 Line Audit Log Table
```prisma
model LineAuditLog {
  id          String   @id @default(uuid())
  action      String   // LINK, UNLINK, MESSAGE_SENT, etc.
  userId      String?
  customerId  String?
  lineUserId  String
  performedBy String?
  details     Json?
  ipAddress   String?
  createdAt   DateTime @default(now())
}
```

---

## 5. Authentication & Security

### 5.1 Webhook Signature Verification
```typescript
// @/backend/src/modules/line/middleware/line-signature.middleware.ts
export const verifyLineSignature = async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-line-signature'] as string;
    const rawBody = JSON.stringify(request.body);
    
    // HMAC-SHA256 verification
    const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(rawBody)
        .digest('base64');
    
    if (hash !== signature) {
        // Log security alert
        return reply.status(401).send({ success: false, error: 'Invalid signature' });
    }
};
```

### 5.2 Input Sanitization
```typescript
// @/backend/src/modules/line/utils/line-sanitization.util.ts
export function sanitizeLineMessage(text: string, userId: string): string {
    // Remove dangerous characters
    // Prevent injection attacks
    // Log sanitization events
}

export function isDangerousLineMessage(text: string): boolean {
    // Check for malicious patterns
    // Block suspicious content
}
```

---

## 6. LINE Registration Flow

### 6.1 User Registration Flow (เจ้าหน้าที่)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   User      │────▶│   LINE OA   │────▶│  Webhook:follow   │
└─────────────┘     └─────────────┘     └─────────────────┘
                                                │
     ┌──────────────────────────────────────────┘
     │
     ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Send "ลงทะเบียน"  │────▶│   Generate URL    │────▶│   Web App   │
│                 │     │   with lineUserId │     │  (React)    │
└─────────────────┘     └─────────────────┘     └──────┬──────┘
                                                      │
     ┌────────────────────────────────────────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│  Auto-link  │────▶│  Rich Menu  │
│  (if needed)│     │  with token │     │  assigned   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 6.2 Customer Registration Flow (QR Code)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Officer   │────▶│  Generate   │────▶│  Customer   │
│             │     │  QR Code    │     │  scans QR   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
     ┌──────────────────────────────────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Webhook:   │────▶│   linkCustomer  │────▶│  Send Flex  │
│  follow with│     │   ToLine()    │     │  message    │
│  QR token   │     │               │     │  (success)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 6.3 Registration Service API
```typescript
// @/backend/src/modules/line/services/registration/line-registration.service.ts
export class LineRegistrationService {
    // Token generation (15-min expiry)
    async generateRegistrationToken(lineUserId: string): Promise<RegistrationToken>
    
    // OTP generation (6-digit, 5-min expiry, max 3/hour)
    async generateOTP(userId: string, lineUserId: string): Promise<string>
    
    // Verify and link account
    async verifyOTPAndLink(userId: string, lineUserId: string, otp: string): Promise<boolean>
    
    // Handle unfollow/refollow
    async handleUnfollow(lineUserId: string): Promise<void>
    async handleRefollow(lineUserId: string): Promise<void>
}
```

---

## 7. Webhook Event Handling

### 7.1 Supported Events
| Event Type | Handler | Description |
|-----------|---------|-------------|
| **follow** | `handleFollowEvent()` | New follower or QR scan |
| **unfollow** | `handleUnfollowEvent()` | User blocked/unfollowed |
| **message** | `handleTextMessage()` | Text message received |
| **postback** | `handlePostback()` | Rich menu button clicked |

### 7.2 Webhook Service Flow
```typescript
// @/backend/src/modules/line/services/core/line-webhook.service.ts
export class LineWebhookService {
    async handleWebhook(body: LineWebhookBody) {
        for (const event of body.events) {
            switch (event.type) {
                case 'follow':
                    // Check for QR token
                    const qrToken = event.params?.token;
                    messages = await this.handleFollowEvent(userId, qrToken);
                    break;
                    
                case 'unfollow':
                    await this.handleUnfollowEvent(userId);
                    break;
                    
                case 'message':
                    // Sanitize input
                    const sanitizedText = sanitizeLineMessage(text, userId);
                    // Check for registration token (8-char hex)
                    if (/^[A-F0-9]{8}$/i.test(text)) {
                        await this.handleRegistrationToken(text, userId);
                    }
                    messages = await this.handleTextMessage(sanitizedText, userId);
                    break;
                    
                case 'postback':
                    messages = await this.handlePostback(event, userId);
                    break;
            }
            
            // Reply to user
            await this.replyMessage(event.replyToken, messages);
        }
    }
}
```

---

## 8. Rich Menu System (Role-Based)

### 8.1 Rich Menu Configurations

#### Customer Menu (6 buttons)
```typescript
// Layout: 2 rows x 3 columns
[
    ['ยอดคงเหลือ', 'กำหนดชำระ', 'ตารางชำระ'],
    ['ประวัติ', 'ใบแจ้งหนี้', 'สัญญา']
]
```

#### Officer Menu (6 buttons)
```typescript
// Layout: 2 rows x 3 columns
[
    ['งานวันนี้', 'บันทึก', 'แดชบอร์ด'],
    ['ลูกค้า', 'สินเชื่อ', 'เมนู']
]
```

#### Manager Menu (6 buttons)
```typescript
[
    ['แดชบอร์ด', 'KPI', 'NPL'],
    ['อนุมัติ', 'ผลงานทีม', 'เมนู']
]
```

#### Admin Menu (6 buttons)
```typescript
[
    ['แดชบอร์ด', 'สถานะระบบ', 'ตั้งค่า'],
    ['จัดการผู้ใช้', 'รายชื่อติดต่อ', 'เมนู']
]
```

### 8.2 Rich Menu Manager Service
```typescript
// @/backend/src/modules/line/services/rich-menu/line-rich-menu-manager.service.ts
export class RichMenuManager {
    // Initialize all role menus on startup
    async initializeRichMenus(): Promise<void>
    
    // Assign menu based on user role
    async assignRichMenu(lineUserId: string, role: string): Promise<boolean>
    
    // Update when role changes
    async updateUserRichMenu(lineUserId: string, newRole: string): Promise<boolean>
    
    // Remove menu on unlink
    async unlinkRichMenu(lineUserId: string): Promise<void>
    
    // Create PNG image programmatically
    private createSimpleRichMenuImage(role: string): Buffer
}
```

---

## 9. Message Templates (Flex Messages)

### 9.1 Message Service Structure
```typescript
// @/backend/src/modules/line/services/messaging/line-messages.service.ts
export class LineMessagesService {
    // Menu by role
    static createMenuMessage(role?: string): any[]
    
    // Customer messages
    static async createBalanceMessage(userId?: string): Promise<any[]>
    static async createNextDueMessage(userId?: string): Promise<any[]>
    static async createHistoryMessage(userId?: string): Promise<any[]>
    
    // Officer messages
    static createTaskListMessage(tasks: any[]): any[]
    static createContactTypeSelectionMessage(...): any[]
    
    // Manager messages
    static createKPIDashboardMessage(kpis: any): any
    
    // Common messages
    static createPaymentReminderMessage(reminder: any): any
    static createWelcomeMessage(): any[]
}
```

### 9.2 K-Bank Theme Colors
```typescript
const colors = {
    CUSTOMER: '#06C755',  // LINE Green
    OFFICER:  '#0066CC',  // Blue
    MANAGER:  '#FF6B35',  // Orange
    ADMIN:    '#8B5CF6',  // Purple
};
```

---

## 10. Notification System

### 10.1 Daily Notification Queue
```typescript
// @/backend/src/modules/line/services/messaging/line-notification-queue.service.ts
export const lineNotificationQueue = {
    // Enqueue with priority
    async enqueue(
        lineUserId: string,
        message: any,
        priority: 'high' | 'normal' | 'low' = 'normal'
    ): Promise<void>
    
    // Process queue (rate limit: 1000 msgs/second)
    async processQueue(): Promise<void>
}
```

### 10.2 Daily Notification Content by Role
| Role | Morning Content (08:00) |
|------|------------------------|
| **OFFICER** | งานวันนี้, ลูกหนี้ค้างชำระ, เป้าเก็บเงิน |
| **MANAGER** | KPI สาขา, NPL Ratio, รออนุมัติ |
| **ADMIN** | System health, Active users, Failed jobs |
| **CUSTOMER** | ใบแจ้งหนี้, กำหนดชำระ, ยอดคงเหลือ |

---

## 11. Frontend Integration

### 11.1 LINE Registration Page
```typescript
// @/frontend/src/features/auth/pages/LineRegistration.tsx
export default function LineRegistration(): JSX.Element {
    // Features:
    // - Show LINE OA QR Code
    // - Auto-link from URL params (?lineUserId=xxx&token=yyy)
    // - Manual LINE ID input
    // - Link/Unlink functionality
    // - Status display
}
```

### 11.2 Admin Test Panel
```typescript
// @/frontend/src/features/settings/components/settings/LineIntegrationCard.tsx
export function LineIntegrationCard({ ... }) {
    // Features:
    // - Test daily notification (by user/lineUserId)
    // - Test customer notification (by contract/lineUserId)
    // - Webhook URL display
    // - LINE connection status
}
```

### 11.3 API Endpoints (Frontend)
```typescript
// @/frontend/src/features/auth/api/line.api.ts
export const lineApi = {
    // Registration
    getLineConfig: () => apiClient.get('/api/line/config'),
    linkLineAccount: (data) => apiClient.post('/api/line/link', data),
    unlinkLineAccount: (userId) => apiClient.post(`/api/line/unlink/${userId}`),
    checkLineLinked: (userId) => apiClient.get(`/api/line/check-link/${userId}`),
    
    // Admin testing
    sendTestDailyNotification: (payload) => apiClient.post('/api/line/test-daily', payload),
    sendTestCustomerNotification: (payload) => apiClient.post('/api/line/test-customer', payload),
};
```

---

## 12. API Endpoints (Backend)

### 12.1 Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/line/webhook` | LINE webhook receiver |
| GET | `/api/line/config` | Get LINE OA info + QR Code |

### 12.2 Authenticated Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/line/link` | User | Link LINE account |
| POST | `/api/line/unlink/:userId` | User/Admin | Unlink account |
| GET | `/api/line/check-link/:userId` | User | Check link status |
| POST | `/api/line/generate-qr/:customerId` | Officer | Generate customer QR |
| GET | `/api/line/qr-status/:token` | - | Check QR status |

### 12.3 Admin Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/line/test-daily` | Admin | Test staff notification |
| POST | `/api/line/test-customer` | Admin | Test customer notification |
| POST | `/api/line/send-message` | Admin | Send custom message |
| POST | `/api/line/rich-menu` | Admin | Manage Rich Menus |

---

## 13. Security Checklist

- [x] Webhook signature verification (HMAC-SHA256)
- [x] Input sanitization (prevent injection)
- [x] Dangerous message detection
- [x] Rate limiting (OTP: 3/hour)
- [x] Token expiry (Registration: 15min, OTP: 5min)
- [x] Audit logging (all LINE actions)
- [x] SQL injection prevention (Prisma ORM)
- [x] URL validation (safe redirect)
- [x] User ID format validation

---

## 14. Key Design Decisions

### 14.1 ทำไมใช้ Role-Based Rich Menu?
✅ **ข้อดี:**
- UI เหมาะสมกับแต่ละ Role (Staff vs Customer)
- ลด confusion จากปุ่มที่ไม่ใช้งาน
- Quick access ถึงฟีเจอร์ที่ใช้บ่อย
- Professional look

### 14.2 ทำไมใช้ Queue สำหรับ Push Message?
✅ **ข้อดี:**
- Rate limiting อัตโนมัติ (ไม่เกิน LINE limit)
- Retry on failure
- ไม่ block main thread
- ส่งนอกเวลาทำงานได้ (scheduled)

### 14.3 ทำไมมี 2 Registration Flows?
| Flow | ใช้สำหรับ | ขั้นตอน |
|------|-----------|---------|
| **Staff Flow** | Officer/Manager/Admin | LINE → Web App → Auto-link |
| **Customer Flow** | Borrower | Officer generates QR → Customer scans → Auto-link |

---

## 15. Files สำคัญที่ควรรู้จัก

### Backend Core
| File | Responsibility |
|------|---------------|
| `line-webhook.service.ts` | Handle all LINE webhook events |
| `line-registration.service.ts` | User linking, OTP, unfollow/refollow |
| `line-rich-menu-manager.service.ts` | Role-based menu assignment |
| `line-messages.service.ts` | Flex message builder |
| `line-signature.middleware.ts` | Security: HMAC verification |
| `line-credentials.config.ts` | Startup validation |

### Frontend Core
| File | Responsibility |
|------|---------------|
| `LineRegistration.tsx` | User linking UI |
| `LineIntegrationCard.tsx` | Admin test panel |
| `line.api.ts` | Frontend API wrappers |

---

## 16. Testing & Debugging

### 16.1 Admin Test Commands
```
# Test staff notification (in LINE chat)
POST /api/line/test-daily
{ "targetUserId": "xxx" }

# Test customer notification
POST /api/line/test-customer
{ "contractNumber": "LN-XXX" }

# Send test message
POST /api/line/send-message
{ "lineUserId": "Uxxx", "message": "Test" }
```

### 16.2 Debug Logs
```typescript
// Enable debug logging
console.log('[Webhook] Event received:', event);
console.log('[Registration] Token generated:', token);
console.log('[RichMenu] Assigned to user:', lineUserId);
```

---

## 17. สรุป

ระบบ LINE Integration นี้ออกแบบมาสำหรับ **Enterprise Banking** ด้วยความปลอดภัยและความสะดวก:

1. **Multi-Role Support:** Staff (Admin/Manager/Officer) + Customer
2. **Dual Registration:** Web App flow (staff) + QR Code flow (customer)
3. **Rich Menu:** Role-based adaptive UI
4. **Security:** HMAC verification, input sanitization, audit trail
5. **Scalability:** Queue-based messaging, rate limiting
6. **Monitoring:** Webhook metrics, delivery tracking

---

*เอกสารนี้จัดทำเมื่อ: April 2026*
*Project: DueTracker2026 - SME Banking Loan Management System*

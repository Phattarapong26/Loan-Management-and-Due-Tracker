# ระบบ Notifications + Calendar แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์ระบบการแจ้งเตือนและปฏิทิน สำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

### 1.1 Stack Technology
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Scheduler** | node-cron | Automated daily notifications |
| **Queue** | BullMQ | Async notification processing |
| **Backend** | Fastify + Prisma | Notification & Calendar APIs |
| **Frontend** | React + TanStack Query | Real-time notification UI |
| **LINE Integration** | LINE Messaging API | Push notifications to LINE |
| **Timezone** | date-fns + Asia/Bangkok | Thai timezone handling |

### 1.2 System Components
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Scheduler  │─────▶│  LINE API   │─────▶│   Users     │
│  (cron)     │      │  (Push)     │      │  (Mobile)   │
└──────┬──────┘      └─────────────┘      └─────────────┘
       │
       │              ┌─────────────┐      ┌─────────────┐
       └─────────────▶│   Queue     │─────▶│  In-App     │
                      │  (BullMQ)   │      │  Notification│
                      └─────────────┘      └─────────────┘

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Users     │─────▶│   Backend   │─────▶│  Calendar   │
│  (Create)   │      │  (Fastify)  │      │  Events     │
└─────────────┘      └─────────────┘      └─────────────┘
       │                                    │
       └────────────────────────────────────┘
                    LINE Notifications
```

---

## 2. โครงสร้างโปรเจค (Project Structure)

### 2.1 Backend Structure
```
backend/src/modules/
├── notifications/
│   ├── services/
│   │   ├── notification.service.ts          # Core notification logic
│   │   ├── notification-scheduler.service.ts  # Cron jobs for daily notifications
│   │   ├── notification-helper.service.ts     # Business logic helpers
│   │   └── notification-queue.service.ts      # BullMQ queue processing
│   │
│   ├── repositories/
│   │   └── notification.repository.ts         # Database operations
│   │
│   ├── controllers/
│   │   └── notification.controller.ts         # HTTP endpoints
│   │
│   └── models/
│       └── notification.model.ts              # Zod schemas & types
│
├── calendar/
│   ├── services/
│   │   └── calendar-event.service.ts          # Calendar CRUD + LINE notifications
│   │
│   ├── repositories/
│   │   └── calendar-event.repository.ts        # Database operations
│   │
│   ├── controllers/
│   │   └── calendar-event.controller.ts        # HTTP endpoints
│   │
│   └── models/
│       └── calendar-event.model.ts             # Zod schemas & types
│
└── line/services/messaging/
    └── line-daily-notification.service.ts      # Role-based daily notifications
```

### 2.2 Frontend Structure
```
frontend/src/features/
├── notifications/
│   ├── pages/
│   │   └── Notifications.tsx                  # Notification center UI
│   ├── components/
│   │   └── NotificationStatsCards.tsx          # Statistics display
│   ├── hooks/
│   │   └── useNotifications.ts               # TanStack Query hooks
│   └── api/
│       └── notifications.api.ts              # API wrappers
│
├── calendar/
│   ├── pages/
│   │   └── CalendarPage.tsx                   # Calendar view + event creation
│   └── api/
│       └── calendar.api.ts                     # API wrappers
│
└── shared/components/layout/
    └── TopNavbar.tsx                          # Real-time notification bell
```

---

## 3. Database Schema

### 3.1 Notification Table
```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String
  type        NotificationType  // PAYMENT, APPROVAL, NPL, SYSTEM, etc.
  title       String
  message     String
  link        String?   // Deep link to relevant page
  priority    Priority  // LOW, MEDIUM, HIGH, URGENT
  read        Boolean   @default(false)
  archived    Boolean   @default(false)
  metadata    Json?     // Additional data
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  user        User      @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([userId, read])
  @@index([createdAt])
}
```

### 3.2 Calendar Event Table
```prisma
model CalendarEvent {
  id            String   @id @default(uuid())
  title         String
  description   String?
  startDate     DateTime
  endDate       DateTime?
  allDay        Boolean  @default(false)
  eventType     EventType  // PAYMENT_DUE, APPOINTMENT, MEETING, etc.
  category      EventCategory
  location      String?
  loanId        String?
  customerId    String?
  branchId      String?
  createdBy     String
  assignedTo    String?    // For task assignment
  attendees     String[]   // Array of user IDs
  recurring     Boolean   @default(false)
  recurrenceRule String?  // iCal RRULE format
  reminderMinutes Int?    // Minutes before event to remind
  
  // Relations
  loan          Loan?     @relation(fields: [loanId], references: [id])
  customer      Customer? @relation(fields: [customerId], references: [id])
  branch        Branch?   @relation(fields: [branchId], references: [id])
  creator       User      @relation(fields: [createdBy], references: [id], name: "createdEvents")
  assignee      User?     @relation(fields: [assignedTo], references: [id], name: "assignedEvents")
  
  @@index([startDate])
  @@index([branchId])
  @@index([createdBy])
  @@index([assignedTo])
}
```

### 3.3 Task Assignment Table
```prisma
model TaskAssignment {
  id            String   @id @default(uuid())
  taskId        String
  taskType      String   // CALENDAR_EVENT, LOAN_FOLLOWUP, etc.
  assignedTo    String
  assignedBy    String
  priority      Priority
  dueDate       DateTime
  status        TaskStatus  // PENDING, IN_PROGRESS, COMPLETED
  notes         String?
  completedAt   DateTime?
  createdAt     DateTime    @default(now())
  
  assignedUser  User    @relation(fields: [assignedTo], references: [id], name: "assignedTasks")
  assigner      User    @relation(fields: [assignedBy], references: [id], name: "createdTasks")
  
  @@index([assignedTo, status])
  @@index([dueDate])
}
```

---

## 4. Notification Scheduler (Cron Jobs)

### 4.1 Daily Notification Schedule
```typescript
// @/backend/src/modules/notifications/services/notification-scheduler.service.ts

export class NotificationSchedulerService {
    initialize(): void {
        // 6:00 AM - Query payment schedules
        this.scheduleJob('payment-schedule-query', '0 6 * * *', async () => {
            await this.queryPaymentSchedules();
        });

        // 7:00 AM - Customer notifications
        this.scheduleJob('customer-notifications', '0 7 * * *', async () => {
            await this.sendCustomerNotifications();
        });

        // 8:00 AM - Loan officer notifications
        this.scheduleJob('officer-notifications', '0 8 * * *', async () => {
            await this.sendOfficerNotifications();
        });

        // 9:00 AM - Branch manager notifications
        this.scheduleJob('manager-notifications', '0 9 * * *', async () => {
            await this.sendManagerNotifications();
        });

        // 10:00 AM - Admin notifications
        this.scheduleJob('admin-notifications', '0 10 * * *', async () => {
            await this.sendAdminNotifications();
        });

        // 11:00 AM - NPL check
        this.scheduleJob('npl-check', '0 11 * * *', async () => {
            await this.checkNPLs();
        });
    }
}
```

### 4.2 Cron Schedule Format
| Job | Schedule | Time (Bangkok) | Purpose |
|-----|----------|----------------|---------|
| payment-schedule-query | `0 6 * * *` | 06:00 | Query upcoming payments |
| customer-notifications | `0 7 * * *` | 07:00 | Payment reminders to customers |
| officer-notifications | `0 8 * * *` | 08:00 | Daily task summary for officers |
| manager-notifications | `0 9 * * *` | 09:00 | KPI summary for managers |
| admin-notifications | `0 10 * * *` | 10:00 | System health for admins |
| npl-check | `0 11 * * *` | 11:00 | Check new NPL alerts |

---

## 5. Notification Content by Role

### 5.1 Customer Notifications
```typescript
private async getCustomerNotifications(customerId: string): Promise<any[]> {
    // Get customer's active loans with unpaid schedules
    const loans = await prisma.loan.findMany({
        where: { customerId, status: 'ACTIVE' },
        include: {
            paymentSchedule: {
                where: { status: 'UNPAID' },
                orderBy: { paymentDate: 'asc' },
                take: 5,
            },
        },
    });

    // Send reminders at 7, 3, 1 days before due date
    for (const payment of loan.paymentSchedule) {
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if ([7, 3, 1].includes(daysUntil)) {
            notifications.push({
                type: 'text',
                text: `📅 แจ้งเตือนชำระเงิน\n\nครบกำหนดใน ${daysUntil} วัน\nยอดชำระ: ฿${payment.totalPayment.toLocaleString()}",
            });
        }
    }
}
```

### 5.2 Officer Notifications
```typescript
private async getOfficerNotifications(officerId: string): Promise<any[]> {
    // Get today's tasks
    const tasks = await this.taskService.getTasksForOfficer(officerId);
    
    const highPriority = tasks.filter(t => t.priority === 'high').length;
    
    return [{
        type: 'text',
        text: `📋 งานวันนี้\n\nทั้งหมด: ${tasks.length} รายการ\nด่วน: ${highPriority} รายการ`,
    }];
}
```

### 5.3 Manager Notifications
```typescript
private async getManagerNotifications(managerId: string, branchId: string): Promise<any[]> {
    const kpis = await this.kpiService.getBranchKPIs(branchId);
    
    let summary = `📊 สรุป KPI วันนี้\n\n`;
    summary += `สินเชื่อทั้งหมด: ${kpis.totalLoans} รายการ\n`;
    summary += `Collection Rate: ${kpis.collectionRate.toFixed(2)}%\n`;
    summary += `NPL Ratio: ${kpis.nplRatio.toFixed(2)}%\n`;
    
    return [{ type: 'text', text: summary }];
}
```

---

## 6. Calendar Event System

### 6.1 Event Types
| Type | Description | LINE Notification |
|------|-------------|-------------------|
| **PAYMENT_DUE** | Payment deadline | ✅ Auto-reminder |
| **APPOINTMENT** | Customer appointment | ✅ New event notify |
| **CUSTOMER_VISIT** | Site visit | ✅ New event notify |
| **FOLLOW_UP** | Debt collection follow-up | ✅ Task assignment |
| **COLLECTION** | Money collection | ✅ Task assignment |
| **MEETING** | Internal meeting | ✅ New event notify |
| **INTERNAL_MEETING** | Branch meeting | ✅ New event notify |
| **REMINDER** | General reminder | ❌ No auto-notify |
| **HOLIDAY** | Public holiday | ❌ No auto-notify |

### 6.2 Task Assignment Flow
```typescript
// @/backend/src/modules/calendar/services/calendar-event.service.ts

async createEvent(request, input, branchId, createdBy) {
    // 1. Create calendar event
    const event = await this.calendarEventRepository.create({
        ...input,
        branchId,
        createdBy,
    });

    // 2. Create task assignment if assignedTo provided
    if (input.assignedTo) {
        await this.calendarEventRepository.createTaskAssignment({
            taskId: event.id,
            taskType: 'CALENDAR_EVENT',
            assignedTo: input.assignedTo,
            assignedBy: createdBy,
            priority: input.priority || 'MEDIUM',
            dueDate: startDate,
            status: 'PENDING',
        });

        // 3. Send notification to assigned user
        await this.sendTaskAssignmentNotification(event, input.assignedTo, createdBy);
    }

    // 4. Send LINE notifications to branch staff
    await this.sendEventNotificationToStaff(event, branchId);

    return event;
}
```

### 6.3 LINE Notification Priority Levels
```typescript
const priorityConfig: Record<string, { label: string; color: string; emoji: string }> = {
    'LOW':    { label: 'ปกติ',   color: '#999999', emoji: '📋' },
    'MEDIUM': { label: 'ปานกลาง', color: '#FFA500', emoji: '⚠️' },
    'HIGH':   { label: 'สูง',     color: '#FF6B6B', emoji: '🔴' },
    'URGENT': { label: 'เร่งด่วน', color: '#DC143C', emoji: '🚨' },
};
```

---

## 7. Frontend Integration

### 7.1 Real-time Notification Bell
```typescript
// @/frontend/src/shared/components/layout/TopNavbar.tsx
// Uses useNotifications hook with 60-second polling

export function useNotifications(params?: ListNotificationsParams) {
    const { data: unreadCountData } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const result = await notificationsApi.getUnreadCount();
            return result.data;
        },
        refetchInterval: 60000, // Refresh every minute
    });

    return {
        unreadCount: unreadCountData?.count || 0,
        // ... other returns
    };
}
```

### 7.2 Notification Center Features
- **Filter by Type**: All, Unread, Payment, Approval, NPL, Document, System
- **Bulk Actions**: Mark all as read, Delete all
- **Individual Actions**: Mark as read, Delete, Archive
- **Auto-refresh**: Every 60 seconds
- **Deep Links**: Click notification → Navigate to relevant page

### 7.3 Calendar Page Features
- **Month/Week/Day Views**: Standard calendar navigation
- **Event Creation**: Dialog with form
- **Task Assignment**: Manager can assign to staff
- **Priority Selection**: LOW, MEDIUM, HIGH, URGENT
- **Branch Filter**: Admin can filter by branch
- **LINE Notifications**: Auto-send on event creation

---

## 8. Retry Logic & Error Handling

### 8.1 Exponential Backoff for LINE Push
```typescript
private async sendNotificationWithRetry(
    lineUserId: string,
    messages: any[]
): Promise<boolean> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                { to: lineUserId, messages },
                { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
            );
            return true;
        } catch (error: any) {
            // Check if user blocked the bot
            if (error.response?.status === 403) {
                await this.handleBlockedUser(lineUserId);
                return false;
            }

            // Exponential backoff: 2s, 4s, 8s
            if (attempt < this.MAX_RETRIES) {
                const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                await this.sleep(delay);
            }
        }
    }
    return false;
}
```

### 8.2 Blocked User Handling
```typescript
private async handleBlockedUser(lineUserId: string): Promise<void> {
    await prisma.user.updateMany({
        where: { lineUserId },
        data: { lineActive: false },
    });
    console.log(`User marked as inactive (blocked): ${lineUserId}`);
}
```

---

## 9. API Endpoints

### 9.1 Notification Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications (with filters) |
| POST | `/api/notifications` | Create notification |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |
| POST | `/api/notifications/:id/archive` | Archive notification |
| DELETE | `/api/notifications/:id` | Delete notification |
| GET | `/api/notifications/unread-count` | Get unread count |

### 9.2 Calendar Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar/events` | List events |
| POST | `/api/calendar/events` | Create event |
| GET | `/api/calendar/events/:id` | Get event by ID |
| PATCH | `/api/calendar/events/:id` | Update event |
| DELETE | `/api/calendar/events/:id` | Delete event |

---

## 10. Key Design Decisions

### 10.1 Why Staggered Notification Times?
✅ **Prevents System Overload**: Spread load across 5 hours
✅ **User Experience**: Users get notifications at appropriate times
✅ **Priority Order**: Customers (debtors) first, then staff

### 10.2 Why 7/3/1 Day Reminders?
✅ **Psychology**: Gives enough time to prepare payment
✅ **Not Annoying**: Not too frequent (no daily spam)
✅ **Effective**: Proven collection strategy

### 10.3 Why Task Assignment on Calendar?
✅ **Manager Visibility**: Can track who's doing what
✅ **Accountability**: Clear ownership
✅ **Integration**: Calendar + Task management in one place
✅ **LINE Integration**: Instant notification to assignee

### 10.4 Why 60-Second Polling?
✅ **Near Real-time**: Users see updates quickly
✅ **Not Too Aggressive**: Won't overload server
✅ **Simple**: No WebSocket complexity needed

---

## 11. Files สำคัญที่ควรรู้จัก

### Backend Core
| File | Responsibility |
|------|---------------|
| `notification-scheduler.service.ts` | Cron jobs for daily notifications |
| `notification.service.ts` | Core notification CRUD + LINE push |
| `notification-helper.service.ts` | Business logic (payment reminders, approvals) |
| `calendar-event.service.ts` | Calendar CRUD + task assignment |
| `line-daily-notification.service.ts` | Role-based daily notification content |

### Frontend Core
| File | Responsibility |
|------|---------------|
| `Notifications.tsx` | Notification center UI |
| `useNotifications.ts` | Real-time notification hooks |
| `CalendarPage.tsx` | Calendar view + event management |
| `TopNavbar.tsx` | Notification bell with badge |

---

## 12. Testing & Debugging

### 12.1 Manual Test Commands
```bash
# Trigger daily notifications manually
curl -X POST http://localhost:3000/api/line/test-daily \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"targetUserId": "user-uuid"}'

# Check notification status
GET /api/notifications/unread-count
```

### 12.2 Debug Logs
```typescript
console.log('[Calendar Event] Creator info:', { userId, role, branchId });
console.log('[Notification] Sent to:', user.email, 'LINE ID:', lineUserId);
console.log(`[Scheduler] Job ${name} completed: ${sentCount} sent`);
```

---

## 13. สรุป

ระบบ Notifications + Calendar นี้ออกแบบมาสำหรับ **Collection Management**:

1. **Automated Reminders**: 7/3/1 day payment reminders via LINE
2. **Role-Based Content**: Different notifications for each role
3. **Task Assignment**: Managers assign tasks, staff get notified
4. **Real-time UI**: 60-second polling for near real-time updates
5. **Retry Logic**: Exponential backoff for LINE push failures
6. **Blocked User Handling**: Auto-disable notifications for blocked users

---

*เอกสารนี้จัดทำเมื่อ: April 2026*
*Project: DueTracker2026 - SME Banking Loan Management System*

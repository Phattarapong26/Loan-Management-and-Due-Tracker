# ระบบ Branches + Users + RBAC แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์ระบบสาขา ผู้ใช้งาน และ Role-Based Access Control (RBAC)

---

## 1. ภาพรวมสถาปัตยกรรม

### RBAC Model
```
┌─────────────────────────────────────────────────────────┐
│                      ADMIN                               │
│                 (Super User)                            │
│            เห็นทุกสาขา ทำทุกอย่างได้                      │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   MANAGER       │ │   MANAGER       │ │   MANAGER       │
│  (สาขา A)        │ │  (สาขา B)        │ │  (สาขา C)        │
│ เห็นแค่สาขาตัวเอง │ │ เห็นแค่สาขาตัวเอง │ │ เห็นแค่สาขาตัวเอง │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
    ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
    ▼         ▼         ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│OFFICER│ │OFFICER│ │OFFICER│ │OFFICER│ │OFFICER│ │OFFICER│
│(A-1)  │ │(A-2)  │ │(B-1)  │ │(B-2)  │ │(C-1)  │ │(C-2)  │
│เห็นแค่│ │เห็นแค่│ │เห็นแค่│ │เห็นแค่│ │เห็นแค่│ │เห็นแค่│
│ตัวเอง │ │ตัวเอง │ │ตัวเอง │ │ตัวเอง │ │ตัวเอง │ │ตัวเอง │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
```

---

## 2. Role Definitions

| Role | Database Value | Description |
|------|---------------|-------------|
| **Admin** | `ADMIN` | ผู้ดูแลระบบ เห็นทุกสาขา |
| **Manager** | `MANAGER` | ผู้จัดการสาขา เห็นเฉพาะสาขาตนเอง |
| **Officer** | `OFFICER` | เจ้าหน้าที่สินเชื่อ เห็นเฉพาะข้อมูลตนเอง |
| **Customer** | `USER` | ลูกค้า (ผู้กู้) - ผ่าน LINE |

---

## 3. Permission Matrix

### Data Access by Role

| Resource | Admin | Manager | Officer |
|----------|-------|---------|---------|
| **Branches** | จัดการทุกสาขาได้ | ดูสาขาตัวเอง | ดูสาขาตัวเอง |
| **Users** | จัดการทุกคน | ดูคนในสาขา | ดูแค่ตัวเอง |
| **Customers** | เห็นทุกลูกค้า | เห็นลูกค้าในสาขา | เห็นลูกค้าตัวเอง |
| **Loans** | เห็นทุกสินเชื่อ | เห็นสินเชื่อในสาขา | เห็นสินเชื่อตัวเอง |
| **Documents** | เห็นทุกเอกสาร | เห็นเอกสารในสาขา | เห็นเอกสารตัวเอง |
| **Transactions** | เห็นทุกรายการ | เห็นรายการในสาขา | เห็นรายการตัวเอง |

### Action Permissions

| Action | Admin | Manager | Officer |
|--------|-------|---------|---------|
| Create Branch | ✅ | ❌ | ❌ |
| Update Branch | ✅ | แค่สาขาตัวเอง | ❌ |
| Delete Branch | ✅ | ❌ | ❌ |
| Create User | ✅ | แค่ในสาขา | ❌ |
| Update User | ✅ | แค่ในสาขา | แค่ตัวเอง |
| Reset Password | ✅ | แค่ในสาขา | ❌ |
| Toggle User Status | ✅ | แค่ในสาขา | ❌ |

---

## 4. Authorization Service

```typescript
export class AuthorizationService {
  static getDataAccessFilter(user: AuthorizedUser): DataAccessFilter {
    switch (user.role) {
      case 'ADMIN':
        return { allowAll: true };
        
      case 'MANAGER':
        return { branchIds: [user.branchId] };
        
      case 'OFFICER':
        return { userIds: [user.userId] };
    }
  }

  static canAccessBranch(user: AuthorizedUser, branchId: string): boolean {
    if (user.role === 'ADMIN') return true;
    return user.branchId === branchId;
  }

  static canAccessCustomer(user: AuthorizedUser, customerCreatedBy: string, customerBranchId: string): boolean {
    switch (user.role) {
      case 'ADMIN': return true;
      case 'MANAGER': return user.branchId === customerBranchId;
      case 'OFFICER': return user.userId === customerCreatedBy;
    }
  }
}
```

---

## 5. Middleware Chain

### Route Protection
```typescript
// Example route with full protection
app.get('/api/customers', {
  preHandler: [
    authenticate,           // 1. Verify JWT
    requireBranch,          // 2. Check branch assignment
    authorize('ADMIN', 'MANAGER', 'OFFICER'),  // 3. Check role
    filterByRole(),         // 4. Apply data filter
  ]
}, customerController.list);
```

### Middleware Flow
```
Request → authenticate → requireBranch → authorize → filterByRole → Controller
            ↓                ↓              ↓            ↓
         Verify JWT    Check branch    Check role   Apply WHERE clause
                        assigned      permission   to query
```

---

## 6. Branch Management

### Branch Model
```prisma
model Branch {
  id            String    @id @default(uuid())
  code          String    @unique          // BKK, CNX, etc.
  name          String
  address       String?
  phone         String?
  province      String?
  district      String?
  subdistrict   String?
  postalCode    String?
  managerName   String?
  status        BranchStatus @default(ACTIVE)
  
  // Relations
  users         User[]
  customers     Customer[]
  loans         Loan[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Branch Statistics
| Metric | Description |
|--------|-------------|
| `officerCount` | จำนวนเจ้าหน้าที่ในสาขา |
| `totalCustomers` | จำนวนลูกค้า |
| `activeLoans` | จำนวนสินเชื่อกำลังผ่อน |
| `totalOutstanding` | ยอดคงค้างรวม |
| `nplRatio` | อัตราส่วน NPL |

---

## 7. User Management

### User Model
```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  firstName         String
  lastName          String
  phoneNumber       String?
  nationalId        String?   // Encrypted
  role              UserRole  @default(OFFICER)
  status            UserStatus @default(ACTIVE)
  branchId          String?
  
  // Security
  lastLoginAt       DateTime?
  failedLoginAttempts Int     @default(0)
  lockedUntil       DateTime?
  
  // Password Management
  mustChangePassword Boolean @default(false)
  passwordChangedAt DateTime?
  
  // Relations
  branch            Branch?   @relation(fields: [branchId], references: [id])
  customers         Customer[]
  loans             Loan[]
  sessions          Session[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### User Creation Flow
```
1. Admin/Manager กรอกข้อมูล
   - Email, ชื่อ, นามสกุล
   - Role (Officer/Manager)
   - สาขา

2. System generates:
   - Temporary password (12 chars)
   - Password hash (bcrypt)
   - mustChangePassword = true

3. Queue email job:
   - Send temporary password
   - Welcome message

4. First login:
   - ต้องเปลี่ยนรหัสผ่านทันที
```

---

## 8. Frontend Integration

### Role Badge Display
```typescript
const roleConfig = {
  admin: { 
    label: 'ผู้ดูแลระบบ', 
    color: 'bg-primary text-primary-foreground' 
  },
  branch_manager: { 
    label: 'ผู้จัดการสาขา', 
    color: 'bg-info/10 text-info' 
  },
  loan_officer: { 
    label: 'เจ้าหน้าที่สินเชื่อ', 
    color: 'bg-success/10 text-success' 
  },
};
```

### Branch Filter (Admin Only)
```typescript
// Admin sees branch filter
{isAdmin && (
  <Select onValueChange={setBranchFilter}>
    <SelectValue placeholder="เลือกสาขา" />
    {branches.map(b => (
      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
    ))}
  </Select>
)}

// Manager/Officer sees only their branch (hidden filter)
```

---

## 9. API Endpoints

### Branch Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/branches` | Admin | Create branch |
| GET | `/api/branches` | All (role-filtered) | List branches |
| GET | `/api/branches/:id` | All | Get branch details |
| PATCH | `/api/branches/:id` | Admin | Update branch |
| DELETE | `/api/branches/:id` | Admin | Delete branch |
| GET | `/api/branches/:id/employees` | Manager+ | Get branch staff |
| GET | `/api/branches/:id/stats` | Manager+ | Branch statistics |

### User Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users` | Admin/Manager | Create user |
| GET | `/api/users` | All (role-filtered) | List users |
| GET | `/api/users/:id` | All | Get user |
| PATCH | `/api/users/:id` | Admin/Manager | Update user |
| POST | `/api/users/:id/reset-password` | Admin/Manager | Reset password |
| POST | `/api/users/:id/toggle-status` | Admin/Manager | Enable/Disable |

---

## 10. Key Design Decisions

### Why Branch Isolation?
- **Data Privacy**: สาขา A ไม่เห็นข้อมูลสาขา B
- **Clear Ownership**: รู้ว่าใครดูแลลูกค้า/สินเชื่อไหน
- **Performance**: Filter ที่ database level

### Why Officer-Level Access?
- **Competition Protection**: เจ้าหน้าที่ไม่เห็นลูกค้าคนอื่น
- **Incentive Alignment**: Focus ที่ลูกค้าตัวเอง
- **Accountability**: ชัดเจนว่าใครรับผิดชอบ

### Why Must Change Password?
- **Security**: Admin ไม่ควรรู้รหัสผ่านของ user
- **Accountability**: User ต้องตั้งรหัสเอง
- **Compliance**: ตามมาตรฐาน banking

---

## 11. Files สำคัญ

| File | Responsibility |
|------|---------------|
| `authorization.service.ts` | RBAC logic, permission checks |
| `auth.middleware.ts` | authenticate, authorize functions |
| `branch.middleware.ts` | requireBranch, checkBranchAccess |
| `branch.service.ts` | Branch CRUD + stats |
| `user.service.ts` | User CRUD + password mgmt |
| `Branches.tsx` | Branch management UI |
| `Users.tsx` | User management UI |
| `BranchStatsCards.tsx` | Branch statistics display |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

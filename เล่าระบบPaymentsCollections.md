# ระบบ Payments + Collections แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์ระบบการชำระเงินและติดตามทวงถามสำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม

### 1.1 Payment System
ระบบรับชำระเงินที่รองรับ:
- **ON_TIME**: ชำระตรงเวลา
- **EARLY**: ชำระก่อนกำหนด (ได้ส่วนลดดอกเบี้ย)
- **LATE**: ชำระล่าช้า (มีค่าปรับ)

### 1.2 Collections System
ระบบติดตามทวงถาม (Collections) พร้อม:
- **Dynamic Penalty**: ค่าปรับล่าช้าที่ปรับตามระยะเวลา
- **Payment Schedule**: ตารางการผ่อนชำระอัตโนมัติ
- **Receipt Generation**: ใบเสร็จรับเงิน PDF

---

## 2. Payment Types & Flow

### 2.1 Payment Type Matrix

| Type | Condition | Interest | Penalty |
|------|-----------|----------|---------|
| **EARLY** | ชำระก่อน due date | ได้ส่วนลดดอกเบี้ย | ไม่มี |
| **ON_TIME** | ชำระวัน due date | ตามกำหนด | ไม่มี |
| **LATE** | ชำระหลัง due date | ตามกำหนด + ค่าปรับ | มี |

### 2.2 Payment Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   START     │ →  │   VALIDATE  │ →  │   PROCESS   │ →  │   RECEIPT   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   กรอกข้อมูล        ตรวจสอบยอด      บันทึกชำระ       ส่งใบเสร็จ
   - Loan ID         - ไม่ต่ำกว่า     - อัปเดตยอด      - PDF
   - Amount            ดอกเบี้ย      - คำนวณดอก      - LINE
   - Method          - ไม่เกินยอด      - ค่าปรับ       - Email
                       คงเหลือ
```

---

## 3. Payment Schedule System

### 3.1 Schedule Generation
```typescript
// Generate payment schedule on loan approval
const schedule = await generatePaymentSchedule({
  principal: 1000000,
  interestRate: 8.5,
  termMonths: 12,
  firstPaymentDate: new Date('2024-05-15'),
  paymentDay: 15  // ชำระทุกวันที่ 15
});

// Result: 12 installments
[
  { installmentNo: 1, dueDate: '2024-05-15', principal: 80000, interest: 7083, total: 87083 },
  { installmentNo: 2, dueDate: '2024-06-15', principal: 80500, interest: 6583, total: 87083 },
  ...
]
```

### 3.2 Schedule Status
| Status | Meaning |
|--------|---------|
| `UNPAID` | ยังไม่ได้ชำระ |
| `PARTIAL` | ชำระบางส่วน |
| `PAID` | ชำระครบแล้ว |
| `OVERDUE` | เกินกำหนด |
| `WAIVED` | ยกเว้น |

---

## 4. Dynamic Penalty System

### 4.1 Penalty Rules (Tiered)
```typescript
// Default penalty rules by overdue days
const penaltyRules = [
  {
    name: 'Early Overdue (1-30 days)',
    daysFrom: 1,
    daysTo: 30,
    rate: 0.03,  // 0.03% per day (10.95% per year)
    type: 'DAILY'
  },
  {
    name: 'Medium Overdue (31-90 days)',
    daysFrom: 31,
    daysTo: 90,
    rate: 0.04,  // 0.04% per day (14.6% per year)
    type: 'DAILY'
  },
  {
    name: 'Severe Overdue (90+ days)',
    daysFrom: 91,
    daysTo: null,  // No upper limit
    rate: 0.0493,  // 0.0493% per day (18% per year - max cap)
    type: 'DAILY',
    compound: true,
    compoundRate: 0.01  // 1% compound monthly
  }
];
```

### 4.2 Penalty Calculation
```typescript
// Formula: outstandingBalance × dailyRate × overdueDays
const penalty = {
  baseCalculation: `${outstandingBalance} × ${penaltyRate}% × ${overdueDays} days`,
  baseAmount: outstandingBalance * (penaltyRate / 100) * overdueDays,
  
  // Apply max cap (18% per year)
  maxAnnualPenalty: outstandingBalance * 0.18,
  maxDailyPenalty: outstandingBalance * 0.18 / 365,
  maxPenaltyForDays: maxDailyPenalty * overdueDays,
  
  // Use lower of calculated or capped
  cappedAmount: Math.min(basePenalty, maxPenaltyForDays),
  
  // Add collection fee if applicable
  totalPenalty: cappedAmount + collectionFee
};
```

### 4.3 Rate Limiting (Security)
```typescript
// Rate limit for penalty preview API
const rateLimit = {
  maxAttempts: 5,      // 5 attempts
  windowMinutes: 15,   // per 15 minutes
  blockMinutes: 30     // block for 30 min if exceeded
};
```

---

## 5. Safe Payment Processing

### 5.1 Optimistic Locking
```typescript
// Prevent race conditions with version field
const result = await prisma.$transaction(async (tx) => {
  // 1. Get loan with current version
  const loan = await tx.loan.findUnique({
    where: { id: loanId },
    select: { id, outstandingBalance, version }
  });
  
  // 2. Process payment logic
  const newBalance = loan.outstandingBalance - paymentAmount;
  
  // 3. Update with optimistic lock check
  await tx.loan.update({
    where: { 
      id: loanId,
      version: loan.version  // Must match current version
    },
    data: {
      outstandingBalance: newBalance,
      version: { increment: 1 }  // Increment version
    }
  });
});
```

### 5.2 Idempotency
```typescript
// Prevent duplicate payments
const idempotencyKey = generateIdempotencyKey('payment', `${loanId}-${Date.now()}`);

// Check if already processed
const existingPayment = await prisma.payment.findUnique({
  where: { idempotencyKey }
});

if (existingPayment) {
  return { isIdempotent: true, payment: existingPayment };
}
```

### 5.3 Validation Rules
```typescript
// 1. Minimum payment (must cover interest)
const minimumPayment = scheduleInterestAmount;
if (input.amount < minimumPayment) {
  throw new Error(`Must pay at least ${minimumPayment} (minimum interest)`);
}

// 2. Maximum payment (cannot exceed outstanding)
if (input.amount > currentOutstanding + 1) {
  throw new Error(`Cannot exceed outstanding balance: ${currentOutstanding}`);
}

// 3. Reasonable amount check
const maxReasonable = currentOutstanding * 1.1;
if (input.amount > maxReasonable) {
  throw new Error(`Amount too high, please verify: ${currentOutstanding}`);
}
```

---

## 6. Receipt System

### 6.1 Receipt Security
```typescript
// Verify customer identity before viewing receipt
const verifyReceiptAccess = async (receiptId, nationalId) => {
  // 1. Check rate limit
  const rateLimit = await securityService.checkRateLimit(receiptId);
  if (!rateLimit.allowed) {
    throw new Error(`Too many attempts, wait ${rateLimit.resetMinutes} minutes`);
  }
  
  // 2. Verify national ID matches loan
  const isValid = await securityService.verifyNationalIdForLoan(
    receipt.loanId,
    nationalId
  );
  
  if (!isValid) {
    throw new Error(`Invalid national ID (${rateLimit.remainingAttempts} attempts left)`);
  }
  
  // 3. Return receipt data
  return { verified: true, receipt };
};
```

### 6.2 Receipt PDF Generation
```typescript
const receiptData = {
  receiptNumber: 'RCP-2024-001',
  loanContract: 'LN-2024-001',
  customer: {
    name: 'บริษัท ABC จำกัด',
    address: '...',
    taxId: '...'
  },
  payment: {
    date: '2024-04-18',
    amount: 87083,
    principal: 80000,
    interest: 7083,
    penalty: 0,
    method: 'BANK_TRANSFER'
  },
  outstandingAfter: 920000,
  nextPaymentDate: '2024-05-15'
};
```

---

## 7. Collections Workflow

### 7.1 Automated Collection Triggers
```typescript
// Daily cron job to identify overdue loans
const overdueLoans = await prisma.loan.findMany({
  where: {
    status: 'ACTIVE',
    paymentSchedules: {
      some: {
        status: { in: ['UNPAID', 'OVERDUE'] },
        paymentDate: { lt: today }
      }
    }
  }
});

// For each overdue loan:
// 1. Calculate overdue days
// 2. Calculate penalty
// 3. Send LINE notification to customer
// 4. Create collection task for officer
// 5. Update loan status if severely overdue
```

### 7.2 Collection Actions
| Days Overdue | Action | Responsible |
|--------------|--------|-------------|
| 1-7 | LINE reminder | Auto |
| 8-15 | Phone call | Officer |
| 16-30 | Formal letter | Manager |
| 31-60 | Legal notice | Manager + Legal |
| 60+ | NPL classification | Admin |

---

## 8. API Endpoints

### 8.1 Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments` | Officer+ | Process payment |
| GET | `/api/payments/:id` | Officer+ | Get payment details |
| GET | `/api/loans/:id/payments` | Officer+ | List loan payments |
| POST | `/api/payments/webhook` | System | Payment gateway webhook |

### 8.2 Payment Schedules
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/loans/:id/schedule` | Manager+ | Generate schedule |
| GET | `/api/loans/:id/schedule` | Officer+ | View schedule |
| PATCH | `/api/schedules/:id` | Manager+ | Update schedule |

### 8.3 Penalties
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/loans/:id/penalty-preview` | Officer+ | Preview penalty |
| GET | `/api/loans/:id/penalty-rate` | Officer+ | Get penalty rate |
| GET | `/api/loan-products/:id/penalty-rules` | Admin | View penalty rules |

### 8.4 Receipts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/receipts/:id/verify` | Public | Verify receipt access |
| GET | `/api/receipts/:id` | Customer | View receipt (after verify) |
| GET | `/api/receipts/:id/download` | Customer | Download PDF |

---

## 9. Database Schema

### 9.1 Payment Table
```prisma
model Payment {
  id                String   @id @default(uuid())
  loanId            String
  paymentScheduleId String?
  
  amount            Float                    // ยอดชำระ
  principalAmount   Float                    // เงินต้น
  interestAmount    Float                    // ดอกเบี้ย
  penaltyAmount     Float    @default(0)    // ค่าปรับ
  
  paymentMethod     PaymentMethod            // CASH, TRANSFER, CHECK
  paymentType       PaymentType              // EARLY, ON_TIME, LATE
  
  receivedDate      DateTime                 // วันที่รับเงิน
  effectiveDate     DateTime                 // วันที่มีผล
  
  receiptNumber     String?   @unique
  receiptPdfUrl     String?
  
  // Idempotency
  idempotencyKey    String    @unique
  
  // Relations
  loan              Loan      @relation(fields: [loanId], references: [id])
  paymentSchedule   PaymentSchedule? @relation(fields: [paymentScheduleId], references: [id])
  createdBy         String
  
  createdAt         DateTime  @default(now())
}
```

### 9.2 PaymentSchedule Table
```prisma
model PaymentSchedule {
  id                String   @id @default(uuid())
  loanId            String
  
  installmentNo     Int                      // งวดที่
  paymentDate       DateTime                 // วันกำหนดชำระ
  
  principalAmount   Float                    // เงินต้น
  interestAmount    Float                    // ดอกเบี้ย
  totalAmount       Float                    // รวม
  
  paidAmount        Float    @default(0)     // ชำระแล้ว
  remainingAmount   Float                    // คงเหลือ
  
  status            ScheduleStatus @default(UNPAID)
  
  // Relations
  loan              Loan      @relation(fields: [loanId], references: [id])
  payments          Payment[]
  
  createdAt         DateTime  @default(now())
}
```

### 9.3 PenaltyRule Table
```prisma
model PenaltyRule {
  id                String   @id @default(uuid())
  loanProductId     String?
  
  ruleName          String                   // ชื่อกฎ
  daysOverdueFrom   Int                      // วันล่าช้าตั้งแต่
  daysOverdueTo     Int?                     // วันล่าช้าถึง
  
  penaltyType       String                   // DAILY, MONTHLY, ANNUAL
  penaltyRate       Float                    // อัตรา %
  
  compoundInterest  Boolean  @default(false)
  compoundRate      Float?
  
  isDefault         Boolean  @default(false)
  status            String   @default('ACTIVE')
  
  createdBy         String
  createdAt         DateTime @default(now())
}
```

---

## 10. Key Design Decisions

### 10.1 Why Optimistic Locking?
- **Race Condition Prevention**: ป้องกันการชำระซ้อนกัน
- **Data Integrity**: ยอดคงเหลือถูกต้องเสมอ
- **Performance**: ไม่ต้อง lock database นาน

### 10.2 Why Dynamic Penalty?
- **Fairness**: ค่าปรับตามระดับความล่าช้า
- **Configurable**: ตั้งค่าตามผลิตภัณฑ์
- **Legal Compliance**: ไม่เกิน 18% ต่อปี (กฎหมาย)

### 10.3 Why Receipt Security?
- **Privacy**: ลูกค้าเห็นแค่ข้อมูลตัวเอง
- **Verification**: ต้องยืนยันตัวตนก่อนดู
- **Rate Limiting**: ป้องกัน brute force

### 10.4 Why Idempotency?
- **No Double Charging**: กันการชำระซ้ำ
- **Retry Safety**: กดซ้ำได้ไม่มีปัญหา
- **Audit Trail**: รู้ว่าเป็นคำขอเดิม

---

## 11. Files สำคัญ

### Backend
| File | Responsibility |
|------|---------------|
| `payment-safe.service.ts` | Safe payment processing |
| `payment-schedule.service.ts` | Schedule generation |
| `dynamic-penalty.service.ts` | Penalty calculation |
| `payment-receipt.service.ts` | Receipt generation |
| `payment-timeline.service.ts` | Payment history |

### Frontend
| File | Responsibility |
|------|---------------|
| `Payments.tsx` | Payment processing UI |
| `PaymentSchedule.tsx` | Schedule display |
| `Collections.tsx` | Collections management |
| `PenaltyCalculator.tsx` | Penalty preview |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

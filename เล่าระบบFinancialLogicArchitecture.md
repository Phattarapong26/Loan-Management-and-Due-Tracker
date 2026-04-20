# ระบบ Financial Logic & Architecture แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์โครงสร้างและตรรกะทางการเงินหลังบ้านสำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรมทางการเงิน

### 1.1 Architecture Layers
```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                            │
│  (React Components, UI Forms, Charts, Reports)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│  (Controllers, Business Logic, Validation)                       │
│  • LoanService • PaymentService • CalculationService             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CALCULATION LAYER                           │
│  (Financial Engines, Interest Calculators)                       │
│  • InterestRateService • DynamicInterestCalculator              │
│  • TieredInterestCalculator • PenaltyCalculator                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REPOSITORY LAYER                            │
│  (Database Access, ORM, Query Builders)                          │
│  • Prisma Client • Transaction Management                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│  (PostgreSQL, Schema, Relations, Indexes)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Interest Rate Systems

### 2.1 Interest Rate Types
| Type | Description | Formula | Use Case |
|------|-------------|---------|----------|
| **FIXED** | อัตราคงที่ตลอดสัญญา | Fixed % | สินเชื่อระยะสั้น |
| **VARIABLE** | ผันแปบตาม MLR/MRR | MLR + Spread | สินเชื่อระยะยาว |
| **TIERED** | ขั้นบันไดตามปี/ยอด | Tier-based | SME, วงเงินหมุนเวียน |
| **MIXED** | ผสม FIXED + VARIABLE | ปี 1-3 Fixed, ปี 4+ Variable | สินเชื่อโครงการ |

### 2.2 MLR/MRR System
```typescript
// Base rates configured by admin
interface BaseRates {
  MLR: number;  // Minimum Loan Rate (Corporate)
  MRR: number;  // Minimum Retail Rate (Consumer)
}

// Formula: "MLR + 1.5%" → 8.0 + 1.5 = 9.5%
async calculateRateFromFormula(formula: string): Promise<number> {
  const extractMatch = formula.match(/(MLR|MRR)\s*([+-])\s*([\d.]+)%?/i);
  const [, baseType, operator, marginStr] = extractMatch;
  
  const baseRate = baseType.toUpperCase() === 'MLR' 
    ? await this.getMLR()  // e.g., 8.0
    : await this.getMRR(); // e.g., 7.5
    
  const margin = parseFloat(marginStr || '0'); // e.g., 1.5
  
  return operator === '+' 
    ? baseRate + margin  // 9.5
    : baseRate - margin;
}
```

### 2.3 Tiered Interest Calculation
```typescript
// Tiered by Year (Year-based Tiers)
const yearTiers = [
  { startYear: 1, endYear: 3, rate: 8.5 },    // ปี 1-3: 8.5%
  { startYear: 4, endYear: 6, rate: 9.0 },    // ปี 4-6: 9.0%
  { startYear: 7, endYear: 'END', rate: 9.5 } // ปี 7+: 9.5%
];

// Tiered by Amount (Amount-based Tiers)
const amountTiers = [
  { minAmount: 100000, maxAmount: 500000, rate: 9.0 },   // 1-5 แสน: 9%
  { minAmount: 500000, maxAmount: 1000000, rate: 8.5 }, // 5-10 แสน: 8.5%
  { minAmount: 1000000, maxAmount: null, rate: 8.0 }    // 1M+: 8%
];
```

---

## 3. Dynamic Interest Calculator

### 3.1 Core Algorithm
```typescript
/**
 * Dynamic Principal Method
 * - Interest recalculated after each disbursement
 * - Based on total disbursed amount (current principal)
 */
async recalculatePaymentSchedule(loanId: string): Promise<InterestCalculationResult> {
  // 1. Get loan with disbursements
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      disbursements: {
        where: { status: 'DISBURSED' },
        orderBy: { disbursedAt: 'asc' }
      }
    }
  });

  // 2. Calculate current principal
  const currentPrincipal = loan.totalDisbursed;

  // 3. Get applicable interest rate tier
  const yearNumber = Math.floor(monthsFromStart / 12) + 1;
  const applicableTier = interestTiers.find(
    tier => yearNumber >= tier.yearFrom && 
           (tier.yearTo === null || yearNumber <= tier.yearTo)
  );

  // 4. Calculate amortization schedule
  const schedules = this.calculateDynamicSchedule({
    currentPrincipal,
    termMonths: loan.termMonths,
    interestRate: applicableTier.interestRate,
    firstPaymentDate: loan.firstPaymentDate,
    paymentDay: loan.paymentDay
  });

  return { currentPrincipal, monthlyPayment, totalInterest, schedules };
}
```

### 3.2 Amortization Formula
```typescript
/**
 * Calculate principal payment using amortization formula
 * PMT = P × r × (1+r)^n / [(1+r)^n - 1]
 */
private calculatePrincipalPayment(
  remainingBalance: number,
  monthlyRate: number,
  remainingPayments: number
): number {
  if (monthlyRate === 0) {
    return remainingBalance / remainingPayments;
  }

  const factor = Math.pow(1 + monthlyRate, remainingPayments);
  const monthlyPayment = (remainingBalance * (monthlyRate * factor)) / (factor - 1);
  
  return monthlyPayment - (remainingBalance * monthlyRate);
}
```

---

## 4. DSCR Calculation (Debt Service Coverage Ratio)

### 4.1 Formula
```
DSCR = Monthly Net Income / Monthly Debt Service

Where:
- Monthly Net Income = Revenue - COGS - Opex
- Monthly Debt Service = Monthly Payment (Principal + Interest)
```

### 4.2 Implementation
```typescript
export function calculateDSCR(params: {
  monthlyRevenue: number;
  monthlyCogs: number;
  monthlyOpex: number;
  loanAmount: number;
  interestRate: number;
  durationMonths: number;
}): DSCRResult {
  // 1. Calculate monthly net income
  const netIncome = monthlyRevenue - monthlyCogs - monthlyOpex;

  // 2. Calculate monthly payment (PMT formula)
  const monthlyRate = interestRate / 12 / 100;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, durationMonths);
  const denominator = Math.pow(1 + monthlyRate, durationMonths) - 1;
  const monthlyPayment = loanAmount * (numerator / denominator);

  // 3. Calculate DSCR
  const dscr = netIncome / monthlyPayment;

  // 4. Determine status
  let status: 'excellent' | 'warning' | 'risk';
  if (dscr >= 1.5) status = 'excellent';
  else if (dscr >= 1.25) status = 'warning';
  else if (dscr >= 1.2) status = 'warning';
  else status = 'risk';

  return { dscr, status, netIncome, monthlyPayment };
}
```

### 4.3 DSCR Criteria
| DSCR | Status | Recommendation |
|------|--------|----------------|
| ≥ 1.50 | 🟢 Excellent | Approve |
| 1.25 - 1.49 | 🟡 Good | Approve with monitoring |
| 1.20 - 1.24 | 🟡 Warning | Minimum threshold, close monitoring |
| < 1.20 | 🔴 Risk | Reject or reduce amount |

---

## 5. Penalty Calculation System

### 5.1 Dynamic Penalty Rules
```typescript
// Tiered penalty by overdue days
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
    daysTo: null,
    rate: 0.0493,  // 0.0493% per day (18% per year - max cap)
    type: 'DAILY',
    compound: true
  }
];
```

### 5.2 Penalty Formula
```typescript
/**
 * Penalty = min(Base Penalty, Max Cap) + Collection Fee
 * 
 * Base Penalty = Outstanding × Daily Rate × Overdue Days
 * Max Cap = Outstanding × 18% × (Overdue Days / 365)
 */
function calculatePenalty(
  outstandingBalance: number,
  penaltyRate: number,  // Daily rate %
  overdueDays: number,
  maxAnnualRate: number = 18  // Legal max
): number {
  // Calculate base penalty
  const dailyPenalty = outstandingBalance * (penaltyRate / 100);
  const basePenalty = dailyPenalty * overdueDays;

  // Apply max cap (18% per year)
  const maxAnnualPenalty = outstandingBalance * (maxAnnualRate / 100);
  const maxDailyPenalty = maxAnnualPenalty / 365;
  const maxPenaltyForDays = maxDailyPenalty * overdueDays;

  // Use lower of calculated or capped
  const cappedPenalty = Math.min(basePenalty, maxPenaltyForDays);

  return Math.round(cappedPenalty * 100) / 100;
}
```

---

## 6. Timezone Handling (Thailand)

### 6.1 Timezone Architecture
```typescript
/**
 * Thailand Timezone Utility (UTC+7)
 * - All dates stored as UTC in database
 - Convert to Thailand time for display
 - Convert back to UTC for storage
 */
class TimezoneUtil {
  static THAILAND_TZ = 'Asia/Bangkok';
  static OFFSET = '+07:00';

  // Get current Thailand time
  static now(): Date {
    return this.toThailandTime(new Date());
  }

  // Convert UTC to Thailand time
  static toThailandTime(date: Date): Date {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    // ... parse and return Date object
  }

  // Convert Thailand time to UTC
  static toUTC(date: Date): Date {
    const THAILAND_OFFSET = 7 * 60 * 60 * 1000; // 7 hours in ms
    return new Date(date.getTime() - THAILAND_OFFSET);
  }

  // Format for display
  static format(date: Date, format: string): string {
    const thaiDate = this.toThailandTime(date);
    // Support: yyyy (2024), YYYY (2567), MM (01), MMM (มกราคม)
    return formatStr
      .replace('yyyy', year.toString())
      .replace('YYYY', (year + 543).toString())  // Buddhist year
      .replace('MMM', thaiMonth);
  }
}
```

### 6.2 Timezone Best Practices
| Operation | Method | Example |
|-----------|--------|---------|
| Store in DB | `toUTC()` | `createdAt: TimezoneUtil.toUTC(thailandDate)` |
| Display UI | `toThailandTime()` | `displayDate: TimezoneUtil.toThailandTime(utcDate)` |
| Compare dates | `toThailandTime()` | `isOverdue: today > dueDate` |
| Format LINE msg | `formatForLine()` | `18/07/2024 14:30` |

---

## 7. Payment Allocation Logic

### 7.1 Payment Application Order
```
1. Penalty (if any)
2. Interest (current period)
3. Principal (remaining after interest)
```

### 7.2 Implementation
```typescript
interface PaymentAllocation {
  penaltyAmount: number;
  interestAmount: number;
  principalAmount: number;
  totalAmount: number;
}

function allocatePayment(
  totalPayment: number,
  schedule: PaymentSchedule,
  existingPenalty: number
): PaymentAllocation {
  let remaining = totalPayment;

  // 1. Deduct penalty first
  const penaltyAmount = Math.min(remaining, existingPenalty);
  remaining -= penaltyAmount;

  // 2. Deduct interest
  const interestAmount = Math.min(remaining, schedule.interestAmount);
  remaining -= interestAmount;

  // 3. Remaining goes to principal
  const principalAmount = Math.min(remaining, schedule.principalAmount);

  return {
    penaltyAmount,
    interestAmount,
    principalAmount,
    totalAmount: totalPayment
  };
}
```

---

## 8. Early Payment Interest Calculation

### 8.1 Formula
```
Interest Saved = Outstanding Balance × Daily Rate × Days Early

Where:
- Daily Rate = Annual Rate / 365
- Days Early = Due Date - Payment Date
```

### 8.2 Implementation
```typescript
export function calculateEarlyPaymentInterest(params: {
  outstandingBalance: number;
  interestRate: number;  // Annual rate %
  daysEarly: number;
}): number {
  if (daysEarly <= 0) return 0;

  // Calculate daily interest rate
  const dailyRate = interestRate / 365 / 100;

  // Interest saved
  const interestSaved = outstandingBalance * dailyRate * daysEarly;

  return Math.round(interestSaved * 100) / 100;
}
```

---

## 9. Transaction Safety

### 9.1 Optimistic Locking Pattern
```typescript
/**
 * Prevent race conditions in concurrent payments
 */
async processPaymentWithLock(input: ProcessPaymentInput): Promise<Payment> {
  return prisma.$transaction(async (tx) => {
    // 1. Get loan with version
    const loan = await tx.loan.findUnique({
      where: { id: input.loanId },
      select: { id, outstandingBalance, version }
    });

    // 2. Process payment logic
    const newBalance = loan.outstandingBalance - input.amount;

    // 3. Update with version check
    await tx.loan.update({
      where: { 
        id: input.loanId,
        version: loan.version  // Must match
      },
      data: {
        outstandingBalance: newBalance,
        version: { increment: 1 }
      }
    });

    // 4. Create payment record
    return tx.payment.create({ data: input });
  });
}
```

### 9.2 Idempotency Pattern
```typescript
/**
 * Prevent duplicate payments
 */
async processPaymentIdempotent(input: ProcessPaymentInput): Promise<Payment> {
  // Generate idempotency key
  const idempotencyKey = input.idempotencyKey || 
    generateIdempotencyKey('payment', `${input.loanId}-${Date.now()}`);

  // Check existing
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey }
  });

  if (existing) {
    return { isIdempotent: true, payment: existing };
  }

  // Process new payment
  return processPaymentWithLock({ ...input, idempotencyKey });
}
```

---

## 10. Key Files & Architecture

### 10.1 Calculation Services
| File | Responsibility |
|------|---------------|
| `interest-rate.service.ts` | MLR/MRR management, formula calculation |
| `dynamic-interest-calculator.service.ts` | Dynamic principal, amortization |
| `tiered-interest-calculator.service.ts` | Tier-based interest, grace period |
| `dynamic-penalty.service.ts` | Penalty calculation, rules engine |
| `calculation.util.ts` | DSCR, payment schedule, utilities |

### 10.2 Core Utilities
| File | Responsibility |
|------|---------------|
| `timezone.util.ts` | Thailand timezone conversion (UTC+7) |
| `optimistic-locking.util.ts` | Version-based locking |
| `reference-number.util.ts` | Generate receipt/contract numbers |

### 10.3 Database Schema (Financial)
| Table | Purpose |
|-------|---------|
| `LoanProduct` | Product config, interest rules |
| `Loan` | Loan data, balance, status |
| `PaymentSchedule` | Installment schedule |
| `Payment` | Payment transactions |
| `PenaltyRule` | Penalty configuration |
| `InterestRateTier` | Tier-based rates |
| `SystemConfig` | MLR/MRR rates |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

# ระบบ Loan Products + Expenses แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์ระบบผลิตภัณฑ์สินเชื่อและค่าใช้จ่ายสำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม

### 1.1 Loan Products
ระบบจัดการผลิตภัณฑ์สินเชื่อ (Loan Products) ที่รองรับหลายประเภทอัตราดอกเบี้ย:
- **FIXED**: อัตราคงที่
- **VARIABLE**: อัตราผันแปบตาม MLR/MRR
- **TIERED**: อัตราแบบขั้นบันไดตามปีที่กู้

### 1.2 Expenses (Disbursements)
ระบบจัดการค่าใช้จ่ายและการเบิกจ่ายสินเชื่อ (Loan Disbursements) พร้อม workflow อนุมัติ

---

## 2. Loan Products

### 2.1 Interest Rate Types

| Type | Description | Use Case |
|------|-------------|----------|
| **FIXED** | อัตราคงที่ตลอดสัญญา | สินเชื่อระยะสั้น |
| **VARIABLE** | อัตราผันแปบตาม MLR/MRR + Spread | สินเชื่อระยะยาว |
| **TIERED** | อัตราเปลี่ยนตามปีที่กู้ | สินเชื่อ SME |

### 2.2 Database Schema
```prisma
model LoanProduct {
  id              String    @id @default(uuid())
  productCode     String    @unique        // SME-LOAN-001
  productName     String                   // สินเชื่อ SME วงเงินหมุนเวียน
  description     String?
  
  // Loan Terms
  minLoanAmount   Float?                   // 100,000
  maxLoanAmount   Float?                   // 10,000,000
  minTermMonths   Int?                     // 6
  maxTermMonths   Int?                     // 60
  
  // Interest Rate Configuration
  interestRateType String                  // FIXED, VARIABLE, TIERED
  
  // For FIXED type
  interestRateYear1_3   Float?             // 8.5%
  interestRateYear4Plus Float?             // 9.0%
  
  // For VARIABLE type
  interestRateFormula   String?            // MLR + 1.5%
  
  // For TIERED type
  yearInterestTiers     YearInterestTier[] // Relation
  
  // Eligibility
  minRevenue      Float?                   // 1,000,000
  maxRevenue      Float?                   // 50,000,000
  requiredDocuments String[]               // ["VAT", "FINANCIAL"]
  
  // Status
  status          ProductStatus @default(ACTIVE)
  isPopular       Boolean      @default(false)
  displayOrder    Int          @default(0)
  
  // Project Period (for special programs)
  projectStartDate DateTime?
  projectEndDate   DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdBy       String
}

model YearInterestTier {
  id            String    @id @default(uuid())
  loanProductId String
  tierType      String                    // FIXED, VARIABLE
  startYear     Int                       // 1, 4, 7
  endYear       String                    // 3, 6, "END"
  rate          Float?                    // 8.5
  formula       String?                   // MLR + 1.0%
  minRate       Float?                    // Floor rate
  maxRate       Float?                    // Cap rate
  
  loanProduct   LoanProduct @relation(fields: [loanProductId], references: [id], onDelete: Cascade)
}
```

### 2.3 Interest Rate Calculation

```typescript
// FIXED Rate
if (years <= 3) return product.interestRateYear1_3;
else return product.interestRateYear4Plus;

// VARIABLE Rate
const rate = await calculateRateFromFormula("MLR + 1.5%");
// MLR = 8.0% → Rate = 9.5%

// TIERED Rate
const tiers = [
  { startYear: 1, endYear: 3, rate: 8.5 },    // ปี 1-3: 8.5%
  { startYear: 4, endYear: 6, rate: 9.0 },    // ปี 4-6: 9.0%
  { startYear: 7, endYear: "END", rate: 9.5 } // ปี 7+: 9.5%
];
```

### 2.4 Validation Rules
```typescript
private validateProductData(data: any): void {
  // 1. Min/Max Validation
  if (data.minLoanAmount > data.maxLoanAmount) {
    throw new Error('Min Amount > Max Amount');
  }
  
  // 2. Date Validation
  if (data.projectEndDate < data.projectStartDate) {
    throw new Error('End Date < Start Date');
  }
  
  // 3. Tiers Validation
  if (data.interestRateType === 'TIERED') {
    // First tier must start at year 1
    if (sortedTiers[0].startYear !== 1) {
      throw new Error('First tier must start at year 1');
    }
    
    // Check for gaps between tiers
    if (next.startYear > currentEnd + 1) {
      throw new Error('Gap between tiers');
    }
    
    // Check for overlaps
    if (next.startYear <= currentEnd) {
      throw new Error('Tiers overlap');
    }
  }
}
```

### 2.5 Caching Strategy
```typescript
// Loan products rarely change - cache for 1 hour
const CACHE_TTL = 60 * 60; // 1 hour

export const cachedLoanProductService = {
  async getAllProducts(filters) {
    const cacheKey = `products:${JSON.stringify(filters)}`;
    const cached = await CacheUtil.get(cacheKey);
    if (cached) return cached;
    
    const products = await loanProductService.getAllProducts(filters);
    await CacheUtil.set(cacheKey, products, CACHE_TTL);
    return products;
  }
};
```

---

## 3. Expenses (Loan Disbursements)

### 3.1 Disbursement Workflow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  DRAFT   │ →  │ PENDING  │ →  │ APPROVED │ →  │DISBURSED │ →  │COMPLETED │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     ↑               │               │               │
     │               ↓               │               │
     │          ┌──────────┐        │               │
     └───────── │ REJECTED │ ←────┘               │
                └──────────┘                        │
                                                    ↓
                                               ┌──────────┐
                                               │ CANCELLED│
                                               └──────────┘
```

### 3.2 Database Schema
```prisma
model LoanDisbursement {
  id                String    @id @default(uuid())
  loanId            String
  disbursementNo    Int                      // 1, 2, 3...
  
  amount            Float                    // จำนวนเงิน
  purpose           String                   // วัตถุประสงค์
  
  // Dates
  requestedDate     DateTime                 // วันที่ขอเบิก
  approvedAt        DateTime?                // วันที่อนุมัติ
  disbursedAt       DateTime?                // วันที่จ่ายจริง
  
  // Status
  status            DisbursementStatus @default(PENDING)
  
  // Relations
  loan              Loan      @relation(fields: [loanId], references: [id])
  createdBy         String
  creator           User      @relation("CreatedDisbursements", fields: [createdBy], references: [id])
  approvedBy        String?
  approver          User?     @relation("ApprovedDisbursements", fields: [approvedBy], references: [id])
  disbursedBy       String?
  disburser         User?     @relation("DisbursedDisbursements", fields: [disbursedBy], references: [id])
  
  // Documents
  receiptPath       String?                  // หลักฐานการจ่าย
  notes             String?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### 3.3 Disbursement Rules
```typescript
async createDisbursement(input, userId, branchId) {
  // 1. Check loan exists and belongs to branch
  const loan = await loanRepository.findById(input.loanId);
  if (loan.branchId !== branchId) {
    throw new Error('Loan not found');
  }
  
  // 2. Check loan status
  if (loan.status !== 'APPROVED' && loan.status !== 'ACTIVE') {
    throw new Error('Loan must be approved first');
  }
  
  // 3. Check remaining amount
  const remaining = loan.principal - loan.totalDisbursed;
  if (input.amount > remaining) {
    throw new Error(`Amount exceeds remaining: ${remaining}`);
  }
  
  // 4. First disbursement validation
  if (loan.status === 'APPROVED') {
    // Must set payment schedule
    if (!input.firstPaymentDate || !input.paymentDay) {
      throw new Error('First disbursement requires payment schedule');
    }
    
    // First payment must be at least 7 days after disbursement
    const minFirstPayment = new Date(requestedDate);
    minFirstPayment.setDate(minFirstPayment.getDate() + 7);
    if (firstPaymentDate < minFirstPayment) {
      throw new Error('First payment must be at least 7 days after disbursement');
    }
  }
  
  // 5. Create disbursement
  return await disbursementRepository.create({
    ...input,
    disbursementNo: await getNextDisbursementNo(input.loanId),
    status: 'PENDING'
  });
}
```

### 3.4 Business Expenses (Operational)
```prisma
model Expense {
  id            String    @id @default(uuid())
  branchId      String
  
  category      ExpenseCategory          // RENT, SALARY, UTILITIES, etc.
  amount        Float
  description   String
  expenseDate   DateTime
  
  // Status
  status        ExpenseStatus @default(PENDING)
  
  // Relations
  branch        Branch    @relation(fields: [branchId], references: [id])
  createdBy     String
  creator       User      @relation(fields: [createdBy], references: [id])
  approvedBy    String?
  approver      User?     @relation(fields: [approvedBy], references: [id])
  
  // Receipt
  receiptPath   String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum ExpenseCategory {
  RENT           // ค่าเช่า
  SALARY         // ค่าเเรง
  UTILITIES      // ค่าน้ำไฟ
  MARKETING      // ค่าโฆษณา
  MAINTENANCE    // ค่าซ่อมแซม
  OFFICE         // ค่าอุปกรณ์สำนักงาน
  TRAVEL         // ค่าเดินทาง
  OTHER          // อื่นๆ
}
```

---

## 4. Interest Rate Management

### 4.1 MLR/MRR System
```typescript
// Base rates updated by admin
const baseRates = {
  MLR: 8.0,  // Minimum Loan Rate
  MRR: 7.5,  // Minimum Retail Rate
};

// Calculate variable rate
function calculateVariableRate(formula: string): number {
  // Formula: "MLR + 1.5%"
  const base = formula.includes('MLR') ? baseRates.MLR : baseRates.MRR;
  const spread = parseFloat(formula.match(/[+-]\s*([\d.]+)%/)?.[1] || 0);
  return base + spread;
}

// Example
"MLR + 1.5%" → 8.0 + 1.5 = 9.5%
"MRR + 2.0%" → 7.5 + 2.0 = 9.5%
```

### 4.2 Rate Change Notifications
When MLR/MRR changes:
1. Update base rate in database
2. Notify all affected loan officers
3. Recalculate variable rate loans
4. Send LINE notifications to customers (if enabled)

---

## 5. API Endpoints

### 5.1 Loan Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/loan-products` | All | List products (cached) |
| GET | `/api/loan-products/:id` | All | Get product details |
| POST | `/api/loan-products` | Admin | Create product |
| PATCH | `/api/loan-products/:id` | Admin | Update product |
| DELETE | `/api/loan-products/:id` | Admin | Delete product |
| GET | `/api/loan-products/stats` | Admin | Product usage stats |

### 5.2 Interest Rates
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/interest-rates` | All | Get current MLR/MRR |
| POST | `/api/interest-rates/mlr` | Admin | Update MLR |
| POST | `/api/interest-rates/mrr` | Admin | Update MRR |
| POST | `/api/interest-rates/calculate` | All | Preview formula calculation |
| GET | `/api/interest-rates/history` | Admin | Rate change history |

### 5.3 Disbursements
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/disbursements` | Officer+ | Create disbursement request |
| GET | `/api/disbursements` | Manager+ | List disbursements |
| POST | `/api/disbursements/:id/approve` | Manager+ | Approve disbursement |
| POST | `/api/disbursements/:id/reject` | Manager+ | Reject disbursement |
| POST | `/api/disbursements/:id/disburse` | Manager+ | Execute disbursement |
| GET | `/api/disbursements/stats` | Manager+ | Disbursement statistics |

### 5.4 Expenses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/expenses` | Officer+ | Create expense |
| GET | `/api/expenses` | Manager+ | List expenses |
| POST | `/api/expenses/:id/approve` | Manager+ | Approve expense |
| POST | `/api/expenses/:id/reject` | Manager+ | Reject expense |

---

## 6. Key Design Decisions

### 6.1 Why TIERED Interest?
- **Risk Management**: อัตราสูงขึ้นตามความเสี่ยงระยะยาว
- **Competitive**: ดอกเบี้ยต่ำช่วงแรกดึงลูกค้า
- **Flexible**: ปรับตามนโยบายแบงก์

### 6.2 Why Separate Disbursement Workflow?
- **Control**: Manager ตรวจสอบก่อนจ่ายจริง
- **Audit Trail**: รู้ว่าใครสร้าง/อนุมัติ/จ่าย
- **Partial Disbursement**: จ่ายเป็นงวดได้

### 6.3 Why MLR/MRR System?
- **Standard**: ตามธนาคารกลาง
- **Transparent**: ลูกค้าเข้าใจ
- **Flexible**: ปรับตามตลาด

---

## 7. Files สำคัญ

### Backend
| File | Responsibility |
|------|---------------|
| `loan-product.service.ts` | Product CRUD + validation |
| `loan-product-cached.service.ts` | Caching layer |
| `interest-rate.service.ts` | MLR/MRR management |
| `disbursement.service.ts` | Disbursement workflow |
| `expense.service.ts` | Expense management |
| `dynamic-interest-calculator.service.ts` | Rate calculation |

### Frontend
| File | Responsibility |
|------|---------------|
| `LoanProducts.tsx` | Product management UI |
| `InterestRates.tsx` | MLR/MRR configuration |
| `Disbursements.tsx` | Disbursement workflow |
| `Expenses.tsx` | Expense management |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

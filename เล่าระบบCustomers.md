# ระบบ Customer Management แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์ระบบจัดการลูกค้า (SME Borrowers) สำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

### 1.1 Stack Technology
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Fastify + Prisma | Customer CRUD + AI data processing |
| **Frontend** | React + TanStack Query | Customer list + detail views |
| **Encryption** | AES-256-GCM | Sensitive data (Tax ID, Phone, Address) |
| **AI Processing** | Document Parser + LLM | Excel/Document data extraction |
| **Cache** | Redis | Customer list caching (60s) |
| **LINE** | QR Code Integration | Customer LINE linking |

### 1.2 System Components
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Officer   │─────▶│   Backend   │─────▶│  Database   │
│  (Create)   │      │  (Fastify)  │      │ (PostgreSQL)│
└─────────────┘      └──────┬──────┘      └─────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
         │   AI    │   │  Cache  │   │  LINE   │
         │ Parser  │   │ (Redis) │   │   QR    │
         └─────────┘   └─────────┘   └─────────┘
```

---

## 2. โครงสร้างโปรเจค (Project Structure)

### 2.1 Backend Structure
```
backend/src/modules/customers/
├── controllers/
│   └── customer.controller.ts           # HTTP endpoints (CRUD + AI update)
│
├── services/
│   └── customer.service.ts              # Business logic + encryption
│
├── repositories/
│   └── customer.repository.ts           # Database operations
│
├── models/
│   └── customer.model.ts                # Zod schemas (create/update)
│
└── middleware/
    └── customer-ownership.middleware.ts # Access control
```

### 2.2 Frontend Structure
```
frontend/src/features/customers/
├── pages/
│   ├── Customers.tsx                    # Customer list view
│   └── CustomerDetail.tsx              # Customer detail + tabs
│
├── components/
│   ├── CustomerStatsCards.tsx          # Statistics display
│   ├── QuickStatsCards.tsx             # Quick stats on detail
│   ├── sections/                        # Detail page sections
│   │   ├── CompanyInfoSection.tsx
│   │   ├── FinancialSection.tsx
│   │   ├── CreditBureauSection.tsx
│   │   ├── LoanSummarySection.tsx
│   │   ├── ContactLogsSection.tsx
│   │   ├── ShareholdersSection.tsx
│   │   ├── InvestmentSection.tsx
│   │   ├── WorkingCapitalSection.tsx
│   │   ├── RevenueProjectionSection.tsx
│   │   ├── DSCRSection.tsx
│   │   ├── ProductSection.tsx
│   │   ├── VATSection.tsx
│   │   ├── BankStatementSection.tsx
│   │   ├── CollateralSection.tsx
│   │   └── RecommendationSection.tsx
│   │
│   └── BusinessProfile/
│       ├── BusinessProfileViewer.tsx
│       └── sections/
│
├── api/
│   └── customers.api.ts                # API wrappers
│
└── utils/
    └── normalize-customer.ts           # Data normalization
```

---

## 3. Database Schema

### 3.1 Customer Table
```prisma
model Customer {
  id                  String    @id @default(uuid())
  customerCode        String    @unique  // CUST{BRANCH}{DATE}{SEQ}
  branchId            String
  createdBy           String            // Officer who created
  
  // Business Info
  businessName        String
  businessType          String?
  
  // Contact Info (ENCRYPTED)
  phone               String            // AES-256-GCM encrypted
  email               String?
  address             String?           // AES-256-GCM encrypted
  thaiId              String?           // AES-256-GCM encrypted
  taxId               String            // AES-256-GCM encrypted
  
  // Financial Summary
  annualRevenue       Float?
  netProfit           Float?
  totalAssets         Float?
  totalLiabilities    Float?
  debtToEquityRatio   Float?
  
  // AI Processing
  aiExtractedData     Json?
  aiConfidenceScore   Float?
  aiProcessedAt       DateTime?
  aiWarnings          String[]
  
  // Status
  status              CustomerStatus    @default(ACTIVE)
  documentComplete    Boolean           @default(false)
  
  // LINE Integration
  lineUserId          String?
  lineLinkedAt        DateTime?
  
  // Relations
  branch              Branch            @relation(fields: [branchId], references: [id])
  loans               Loan[]
  contactLogs         ContactLog[]
  calendarEvents      CalendarEvent[]
  documents           Document[]
  
  // Related Data (from Excel)
  vatRecords          CustomerVATRecord[]
  financialStatements CustomerFinancialStatement[]
  investments         CustomerInvestment[]
  workingCapital      CustomerWorkingCapital[]
  projections         CustomerProjection[]
  creditBureau        CustomerCreditBureau[]
  bankStatements      CustomerBankStatement[]
  comments            CustomerComment[]
  businessHistory     CustomerBusinessHistory[]
  
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  
  @@index([branchId])
  @@index([createdBy])
  @@index([customerCode])
  @@index([status])
}
```

### 3.2 Related Data Tables (AI Extracted)
| Table | Data |
|-------|------|
| `CustomerVATRecord` | Monthly VAT sales/purchase records |
| `CustomerFinancialStatement` | P&L + Balance Sheet by year |
| `CustomerInvestment` | Investment structure items |
| `CustomerWorkingCapital` | Working capital analysis |
| `CustomerProjection` | Revenue projections |
| `CustomerCreditBureau` | Credit bureau data (borrower + guarantors) |
| `CustomerBankStatement` | Bank account statements |
| `CustomerComment` | Approval comments |
| `CustomerBusinessHistory` | Executives & shareholding |

---

## 4. Data Encryption

### 4.1 Encrypted Fields
```typescript
// Fields encrypted with AES-256-GCM
const ENCRYPTED_FIELDS = [
    'phone',
    'address',
    'thaiId',
    'taxId'
];

// Encryption flow
const encryptedTaxId = EncryptionUtil.encrypt(data.taxId);
const encryptedPhone = EncryptionUtil.encrypt(data.phone);
// ... store in database
```

### 4.2 Decryption Pattern
```typescript
// Safe decryption with legacy fallback
private safeDecryptMaybe(value?: string | null) {
    if (!value) return value;
    try {
        return EncryptionUtil.decrypt(value);
    } catch {
        // Some legacy rows may store plain text
        return value;
    }
}

// Usage in customer response
return {
    ...customer,
    phone: safeDecryptMaybe(customer.phone) || '',
    taxId: safeDecryptMaybe(customer.taxId) || '',
    address: safeDecryptMaybe(customer.address) || null,
    thaiId: safeDecryptMaybe(customer.thaiId) || null,
};
```

---

## 5. Customer Code Generation

### 5.1 Format
```
CUST{BRANCH_CODE}{YYYYMMDD}{SEQUENCE}

Example:
CUSTBKK202404180001
│   │   │       └── Sequence (0001-9999)
│   │   └── Date (2024-04-18)
│   └── Branch Code (BKK)
└── Prefix
```

### 5.2 Generation Logic
```typescript
async generateCustomerCode(branchCode: string): Promise<string> {
    const prefix = `CUST${branchCode}`;
    const dateStr = `${year}${month}${day}`;
    
    // Find last customer code for today
    const lastCustomer = await this.db.customer.findFirst({
        where: {
            customerCode: {
                startsWith: `${prefix}${dateStr}`,
            },
        },
        orderBy: { customerCode: 'desc' },
    });

    let sequence = 1;
    if (lastCustomer) {
        const lastSeq = parseInt(lastCustomer.customerCode.slice(-4), 10);
        sequence = lastSeq + 1;
    }

    return `${prefix}${dateStr}${String(sequence).padStart(4, '0')}`;
}
```

---

## 6. Role-Based Access Control

### 6.1 Permission Matrix
| Action | Admin | Manager | Officer |
|--------|-------|---------|---------|
| **Create Customer** | ✅ Any branch | ✅ Own branch | ✅ Own branch only |
| **View Customer** | ✅ All | ✅ Own branch | ✅ Own customers only |
| **Update Customer** | ✅ All | ✅ Own branch | ✅ Own customers only |
| **Delete Customer** | ✅ Any branch | ✅ Own branch | ❌ No |
| **Assign Officer** | ✅ Yes | ✅ Yes | ❌ No (self only) |
| **Export Data** | ✅ All | ✅ Own branch | ✅ Own customers |

### 6.2 Middleware Implementation
```typescript
// Routes with ownership enforcement
app.post('/api/customers', [
    authenticate,
    requireBranch,
    authorize('ADMIN', 'MANAGER', 'OFFICER'),
    enforceCustomerOwnership(), // NEW
    validateBody(createCustomerSchema),
], customerController.create);

app.get('/api/customers/:id', [
    authenticate,
    requireBranch,
    authorize('ADMIN', 'MANAGER', 'OFFICER'),
    canAccessCustomer(), // NEW: Check ownership
], customerController.getById);
```

### 6.3 Officer Assignment Logic
```typescript
// Create customer
let responsibleUserId = userId; // Default: self

// ADMIN/MANAGER can assign to specific officer
if ((role === 'ADMIN' || role === 'MANAGER') && bodyAny.officerId) {
    responsibleUserId = bodyAny.officerId;
}

// OFFICER: always themselves
if (role === 'OFFICER') {
    responsibleUserId = userId;
}
```

---

## 7. AI Data Processing

### 7.1 Excel Document Parsing
```typescript
// Save parsed Excel data (9 categories)
async saveParsedExcelData(customerId: string, data: any): Promise<void> {
    await this.db.$transaction(async (tx) => {
        // 1. Update core customer data
        await tx.customer.update({
            where: { id: customerId },
            data: {
                aiExtractedData: extractedData,
                aiConfidenceScore: data.confidenceScore,
                aiProcessedAt: new Date(),
                // Extract financial summary
                annualRevenue: latestFinancial?.revenue,
                netProfit: latestFinancial?.netProfit,
                totalAssets: latestBalance?.totalAssets,
                // ...
            }
        });

        // 2. Clear old detailed records
        await tx.customerVATRecord.deleteMany({ where: { customerId } });
        await tx.customerFinancialStatement.deleteMany({ where: { customerId } });
        // ... clear other tables

        // 3. Insert new detailed data
        // 3.1 VAT Records
        // 3.2 Financial Statements
        // 3.3 Investments
        // 3.4 Working Capital
        // 3.5 Projections
        // 3.6 Credit Bureau
        // 3.7 Bank Statements
        // 3.8 Comments
        // 3.9 Business History
    });
}
```

### 7.2 AI Confidence Score
| Score | Meaning |
|-------|---------|
| 90-100% | High confidence - data reliable |
| 70-89% | Medium confidence - review recommended |
| 50-69% | Low confidence - manual verification needed |
| <50% | Very low - data may be incorrect |

---

## 8. Customer Detail Page Sections

### 8.1 Dashboard Tab
- **Overview Cards**: Total loans, outstanding balance, credit limit
- **Quick Stats**: NPL status, payment history, risk score
- **Recent Activities**: Contact logs, document uploads

### 8.2 Company Info Tab
- Business registration details
- Contact information
- Shareholders structure
- Executives

### 8.3 Financial Data Tab
- **Financial Statements**: Revenue, profit, assets, liabilities by year
- **VAT Records**: Monthly sales/purchase tax records
- **Credit Bureau**: Borrower + guarantor credit data
- **Bank Statements**: Account activity

### 8.4 Loan Info Tab
- Active loans list
- Payment schedules
- Outstanding balances
- Loan history

### 8.5 Documents Tab
- Uploaded documents list
- AI processing status
- Document preview

### 8.6 Contact History Tab
- Contact logs (phone, LINE, email, visit)
- Follow-up history
- Outcomes

---

## 9. LINE QR Code Integration

### 9.1 Customer LINE Linking Flow
```
Officer opens Customer Detail
       │
       ▼
Click "สร้าง QR Code"
       │
       ▼
Backend generates token (10-min expiry)
       │
       ▼
Customer scans QR with LINE
       │
       ▼
LINE OA sends welcome message
       │
       ▼
Customer account linked!
```

### 9.2 API Endpoint
```typescript
// Generate QR for customer LINE linking
POST /api/customers/:id/line-qr

Response:
{
    token: string;
    qrCodeUrl: string;
    expiresAt: Date;
}
```

---

## 10. Caching Strategy

### 10.1 Customer List Cache
```typescript
// Cache key generation
const cacheKey = CacheUtil.customerListKey(params);

// Try cache first
try {
    const cached = await CacheUtil.get(cacheKey);
    if (cached) return cached;
} catch (error) {
    // Continue without cache
}

// Fetch from database
const result = await this.customerRepository.list(params);

// Cache for 60 seconds
try {
    await CacheUtil.set(cacheKey, response, 60);
} catch (error) {
    // Continue without caching
}
```

### 10.2 Cache Invalidation
- Customer created → Invalidate list cache
- Customer updated → Invalidate detail + list cache
- Customer deleted → Invalidate all

---

## 11. Validation Rules

### 11.1 Create Customer Schema (Zod)
```typescript
export const createCustomerSchema = z.object({
    businessName: z.string().min(1).max(255),
    taxId: z.string().min(1),              // 13 digits
    phone: z.string().min(1),              // 10 digits, starts with 0
    thaiId: z.string().optional(),         // 13 digits with checksum
    email: z.string().email().optional(),
    branchId: z.string().uuid().optional(), // Admin only
    officerId: z.string().uuid().optional(), // Admin/Manager only
}).refine((data) => validateTaxId(data.taxId).valid, {
    message: 'Tax ID must be 13 digits',
    path: ['taxId'],
}).refine((data) => validatePhone(data.phone).valid, {
    message: 'Phone must be 10 digits starting with 0',
    path: ['phone'],
});
```

### 11.2 Duplicate Detection
```typescript
// Check Tax ID duplicate
async taxIdExists(taxId: string, excludeCustomerId?: string): Promise<boolean> {
    const customer = await this.findByTaxId(taxId);
    if (!customer) return false;
    
    // Allow same customer (for updates)
    if (excludeCustomerId && customer.id === excludeCustomerId) {
        return false;
    }
    
    return true;
}
```

---

## 12. API Endpoints

### 12.1 Customer CRUD
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/customers` | Admin/Manager/Officer | Create customer |
| GET | `/api/customers` | All | List customers (role-filtered) |
| GET | `/api/customers/:id` | All | Get customer detail |
| PATCH | `/api/customers/:id` | All | Update customer |
| DELETE | `/api/customers/:id` | Admin/Manager | Delete customer |
| POST | `/api/customers/from-document` | All | Create from parsed document |
| POST | `/api/customers/:id/ai-data` | All | Update with AI data |
| POST | `/api/customers/:id/line-qr` | All | Generate LINE QR code |

---

## 13. Key Design Decisions

### 13.1 Why Encrypt Sensitive Data?
✅ **Compliance**: PDPA (Personal Data Protection Act)
✅ **Security**: Even if database is compromised, data is protected
✅ **Audit**: Can prove to regulators that data is encrypted

### 13.2 Why Separate Related Tables?
✅ **Performance**: Don't load all data for list view
✅ **Flexibility**: Can query specific data types
✅ **Clean Schema**: Each data type has proper structure

### 13.3 Why Officer Ownership?
✅ **Accountability**: Clear who is responsible
✅ **Privacy**: Officers can't see other officers' customers
✅ **Incentive**: Officers focus on their own portfolio

### 13.4 Why AI Confidence Score?
✅ **Transparency**: Users know data quality
✅ **Risk Management**: Low confidence = manual review
✅ **Improvement**: Track AI performance over time

---

## 14. Files สำคัญที่ควรรู้จัก

### Backend Core
| File | Responsibility |
|------|---------------|
| `customer.service.ts` | Business logic, encryption, ownership |
| `customer.repository.ts` | Database access, AI data storage |
| `customer.controller.ts` | HTTP endpoints |
| `customer-ownership.middleware.ts` | Access control |

### Frontend Core
| File | Responsibility |
|------|---------------|
| `Customers.tsx` | Customer list + CRUD operations |
| `CustomerDetail.tsx` | Detail view with tabs |
| `sections/*.tsx` | Individual data sections |
| `customers.api.ts` | API wrappers |

---

## 15. Testing & Debugging

### 15.1 Test Commands
```bash
# Create test customer
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "businessName": "Test Company",
    "taxId": "1234567890123",
    "phone": "0812345678",
    "branchId": "..."
  }'

# Generate LINE QR
curl -X POST http://localhost:3000/api/customers/:id/line-qr \
  -H "Authorization: Bearer ${TOKEN}"
```

### 15.2 Debug Logs
```typescript
console.log('[Customer Service] Creating customer:', data);
console.log('[Customer Controller] Create error:', error);
console.log('[AI Processing] Confidence score:', score);
```

---

## 16. สรุป

ระบบ Customer Management นี้ออกแบบมาสำหรับ **SME Lending**:

1. **Security First**: AES-256-GCM encryption for sensitive data
2. **Role-Based**: Officers see only their customers
3. **AI-Powered**: Automatic data extraction from documents
4. **Integrated**: LINE linking, loan management, contact tracking
5. **Scalable**: Caching, pagination, efficient queries

---

*เอกสารนี้จัดทำเมื่อ: April 2026*
*Project: DueTracker2026 - SME Banking Loan Management System*

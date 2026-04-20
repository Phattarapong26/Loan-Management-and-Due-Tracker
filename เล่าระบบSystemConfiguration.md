# ระบบ System Configuration (ตั้งค่าระบบ) แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์สถาปัตยกรรมการตั้งค่าระบบสำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม

### 1.1 Configuration Types
```
┌─────────────────────────────────────────────────────────────────┐
│                 SYSTEM CONFIGURATION TYPES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  INTEREST RATES (อัตราดอกเบี้ยอ้างอิง)                  │   │
│  │  • MLR (Minimum Loan Rate)                              │   │
│  │  • MRR (Minimum Retail Rate)                            │   │
│  │  • Rate change history                                  │   │
│  │  • LINE notifications on change                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  APPROVAL LIMITS (ขีดจำกัดการอนุมัติ)                  │   │
│  │  • Role-based limits (OFFICER/MANAGER/HQ)               │   │
│  │  • Amount ranges (min/max)                              │   │
│  │  • Dynamic configuration                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SYSTEM CONFIG (ตั้งค่าทั่วไป)                          │   │
│  │  • Key-value pairs with categories                      │   │
│  │  • Data type validation (STRING/NUMBER/BOOLEAN)         │   │
│  │  • Version tracking (createdBy/updatedBy)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PRODUCT CONFIG (ตั้งค่าสินค้า)                        │   │
│  │  • Product-specific settings                            │   │
│  │  • Interest formulas                                    │   │
│  │  • Fee structures                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. System Config Architecture

### 2.1 Repository Pattern
```typescript
/**
 * System Config Repository - Database access ONLY
 * For dynamic configuration values (no hardcoding)
 */
export class SystemConfigRepository {
    private db: PrismaClient;

    // Core CRUD operations
    async getByKey(key: string): Promise<SystemConfig | null>
    async getValue(key: string, defaultValue: string): Promise<string>
    async getByCategory(category: string): Promise<SystemConfig[]>
    async setValue(key, value, category, description?, updatedBy?): Promise<SystemConfig>
}
```

### 2.2 Database Schema
```sql
-- System configuration table
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    data_type VARCHAR(20) NOT NULL DEFAULT 'STRING',  -- STRING, NUMBER, BOOLEAN
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Approval limits table
CREATE TABLE approval_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,              -- OFFICER, MANAGER, HQ
    approval_level VARCHAR(50) NOT NULL,  -- OFFICER, MANAGER, HQ
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),               -- NULL = unlimited
    currency VARCHAR(3) DEFAULT 'THB',
    status VARCHAR(20) DEFAULT 'ACTIVE',    -- ACTIVE, INACTIVE
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 3. Interest Rate Configuration

### 3.1 MLR/MRR Management
```typescript
export class InterestRateService {
    // Get current rates from system config
    async getMLR(): Promise<number> {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'interest_rate.mlr' }
        });
        return parseFloat(config?.value || '0');
    }

    async getMRR(): Promise<number> {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'interest_rate.mrr' }
        });
        return parseFloat(config?.value || '0');
    }

    // Update with validation and notifications
    async updateMLR(rate: number, userId: string): Promise<void> {
        // Validation: 0-20% range
        if (rate < 0 || rate > 20) {
            throw new Error('Interest rate must be between 0 and 20');
        }

        // Get old rate for comparison
        let oldRate: number | null = null;
        try {
            oldRate = await this.getMLR();
        } catch (error) {
            // Rate not configured yet
        }

        // Upsert MLR config
        await prisma.systemConfig.upsert({
            where: { key: 'interest_rate.mlr' },
            create: {
                key: 'interest_rate.mlr',
                value: rate.toString(),
                description: 'Minimum Loan Rate (MLR)',
                category: 'INTEREST_RATE',
                dataType: 'NUMBER',
                createdBy: userId,
            },
            update: {
                value: rate.toString(),
                updatedBy: userId,
            },
        });

        // Update timestamp
        await prisma.systemConfig.upsert({
            where: { key: 'interest_rate.last_updated' },
            create: {
                key: 'interest_rate.last_updated',
                value: new Date().toISOString(),
                category: 'INTEREST_RATE',
                dataType: 'STRING',
                createdBy: userId,
            },
            update: {
                value: new Date().toISOString(),
                updatedBy: userId,
            },
        });

        // Send LINE notification if rate changed
        if (oldRate !== null && oldRate !== rate) {
            await this.notifyRateChange('MLR', oldRate, rate, updater);
        }

        // Audit logging
        logger.info({
            type: 'MLR_UPDATE',
            oldRate,
            newRate: rate,
            updatedBy: userId,
        }, 'MLR rate updated');
    }
}
```

### 3.2 Interest Rate Controller
```typescript
export class InterestRateController {
    // Get current rates (public)
    getCurrentRates = async (_request, reply) => {
        const rates = await interestRateService.getAllRates();
        return ResponseUtil.success(reply, rates);
    };

    // Update MLR (Admin only)
    updateMLR = async (request, reply) => {
        const { rate } = request.body;
        const userId = request.user?.userId;

        if (!userId) return ResponseUtil.unauthorized(reply);
        if (typeof rate !== 'number' || isNaN(rate)) {
            return ResponseUtil.error(reply, 'Invalid rate value', 400);
        }

        await interestRateService.updateMLR(rate, userId);
        return ResponseUtil.success(reply, {
            message: 'MLR updated successfully and notifications sent',
            rate,
        });
    };

    // Update MRR (Admin only)
    updateMRR = async (request, reply) => {
        // Same pattern as updateMLR
    };

    // Calculate rate from formula (preview)
    calculateFromFormula = async (request, reply) => {
        const { formula } = request.body;
        const rate = await interestRateService.calculateRateFromFormula(formula);
        return ResponseUtil.success(reply, { formula, calculatedRate: rate });
    };

    // Get rate history
    getRateHistory = async (request, reply) => {
        const { limit } = request.query;
        const history = await interestRateService.getRateHistory(
            limit ? parseInt(limit) : 10
        );
        return ResponseUtil.success(reply, history);
    };
}
```

---

## 4. Approval Limits Configuration

### 4.1 Approval Level Logic
```typescript
export class LoanApprovalService {
    /**
     * Get required approval level based on loan amount
     * 
     * Default hierarchy:
     * - ≤ 500,000: OFFICER
     * - ≤ 15,000,000: MANAGER
     * - > 15,000,000: HQ
     */
    async getRequiredApprovalLevel(
        loanAmount: number, 
        userRole?: UserRole
    ): Promise<ApprovalLevel> {
        try {
            // Check user's specific approval limit
            if (userRole) {
                const limit = await prisma.approvalLimit.findFirst({
                    where: {
                        role: userRole,
                        status: 'ACTIVE',
                        minAmount: { lte: loanAmount },
                        OR: [
                            { maxAmount: { gte: loanAmount } },
                            { maxAmount: null }  // No max = unlimited
                        ]
                    },
                    orderBy: { maxAmount: 'desc' }
                });

                if (limit) {
                    return limit.approvalLevel as ApprovalLevel;
                }
            }

            // Get all active limits and find matching range
            const limits = await prisma.approvalLimit.findMany({
                where: { status: 'ACTIVE' },
                orderBy: { maxAmount: 'asc' },
            });

            for (const limit of limits) {
                const minAmount = Number(limit.minAmount);
                const maxAmount = limit.maxAmount ? Number(limit.maxAmount) : null;

                if (loanAmount >= minAmount && (maxAmount === null || loanAmount <= maxAmount)) {
                    return limit.approvalLevel as ApprovalLevel;
                }
            }

            // Fallback defaults
            if (loanAmount <= 500000) return 'OFFICER';
            else if (loanAmount <= 15000000) return 'MANAGER';
            else return 'HQ';

        } catch (error) {
            // Fallback on error
            if (loanAmount <= 500000) return 'OFFICER';
            else if (loanAmount <= 15000000) return 'MANAGER';
            else return 'HQ';
        }
    }
}
```

### 4.2 Approval Limit Configuration
| Role | Min Amount | Max Amount | Approval Level |
|------|------------|------------|----------------|
| OFFICER | 0 | 500,000 | OFFICER |
| MANAGER | 500,001 | 15,000,000 | MANAGER |
| HQ | 15,000,001 | NULL (unlimited) | HQ |

---

## 5. General System Config

### 5.1 Config Service
```typescript
export class ConfigService {
    private systemConfigRepository: SystemConfigRepository;

    // CRUD operations
    async createSystemConfig(request, input, userId) {
        // Check for duplicate key
        const existing = await this.systemConfigRepository.getByKey(input.key);
        if (existing) {
            throw new Error(`Config key '${input.key}' already exists`);
        }

        return this.systemConfigRepository.setValue(
            input.key,
            input.value,
            input.category,
            input.description,
            userId
        );
    }

    async updateSystemConfig(request, key, input, userId) {
        const existing = await this.systemConfigRepository.getByKey(key);
        if (!existing) {
            throw new Error(`Config key '${key}' not found`);
        }

        return this.systemConfigRepository.setValue(
            key,
            input.value || existing.value,
            input.category || existing.category,
            input.description ?? existing.description,
            userId
        );
    }

    async listSystemConfigs(params: { page, limit, category?, search? }) {
        if (params.category) {
            // Filter by category
            const configs = await this.systemConfigRepository.getByCategory(params.category);
            return { configs, total: configs.length, ...pagination };
        } else {
            // Search across all fields
            const allConfigs = await prisma.systemConfig.findMany({
                where: params.search ? {
                    OR: [
                        { key: { contains: params.search, mode: 'insensitive' } },
                        { value: { contains: params.search, mode: 'insensitive' } },
                        { description: { contains: params.search, mode: 'insensitive' } },
                    ],
                } : {},
                orderBy: { key: 'asc' },
            });

            // Manual pagination
            const start = (params.page - 1) * params.limit;
            const end = start + params.limit;
            return {
                configs: allConfigs.slice(start, end),
                total: allConfigs.length,
                page: params.page,
                limit: params.limit,
                totalPages: Math.ceil(allConfigs.length / params.limit),
            };
        }
    }
}
```

### 5.2 Common Config Keys
| Key | Category | Description | Example |
|-----|----------|-------------|---------|
| `interest_rate.mlr` | INTEREST_RATE | Minimum Loan Rate | 8.00 |
| `interest_rate.mrr` | INTEREST_RATE | Minimum Retail Rate | 7.50 |
| `interest_rate.last_updated` | INTEREST_RATE | Last update timestamp | 2026-04-18T14:32:00Z |
| `system.timezone` | SYSTEM | Default timezone | Asia/Bangkok |
| `system.locale` | SYSTEM | Default locale | th-TH |
| `payment.grace_period_days` | PAYMENT | Grace period for payments | 7 |
| `notification.daily_reminder_time` | NOTIFICATION | Daily reminder time | 08:00 |

---

## 6. API Endpoints

### 6.1 Config Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/config` | Admin | List all configs |
| GET | `/api/config/:key` | Admin | Get specific config |
| POST | `/api/config` | Admin | Create new config |
| PUT | `/api/config/:key` | Admin | Update config |
| DELETE | `/api/config/:key` | Admin | Delete config |

### 6.2 Interest Rate Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/interest-rates` | Any | Get current MLR/MRR |
| PUT | `/api/interest-rates/mlr` | Admin | Update MLR |
| PUT | `/api/interest-rates/mrr` | Admin | Update MRR |
| GET | `/api/interest-rates/history` | Admin | Get rate history |
| POST | `/api/interest-rates/calculate` | Any | Preview formula calculation |

### 6.3 Approval Limit Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/approval-limits` | Admin | List all limits |
| POST | `/api/approval-limits` | Admin | Create limit |
| PUT | `/api/approval-limits/:id` | Admin | Update limit |
| DELETE | `/api/approval-limits/:id` | Admin | Delete limit |

---

## 7. Key Design Decisions

### 7.1 Upsert Pattern
```typescript
// Using upsert for idempotent updates
await prisma.systemConfig.upsert({
    where: { key: 'interest_rate.mlr' },
    create: { /* initial values */ },
    update: { /* update values */ }
});
```
- Creates if not exists, updates if exists
- Prevents duplicate key errors
- Simplifies "create or update" logic

### 7.2 Fallback Defaults
```typescript
// Always have fallback defaults
async getRequiredApprovalLevel(loanAmount) {
    try {
        // Try dynamic config first
        const limit = await getFromDatabase();
        if (limit) return limit;
    } catch (error) {
        // Log but don't throw
        console.error('Error getting approval limit:', error);
    }

    // Fallback to hardcoded defaults
    if (loanAmount <= 500000) return 'OFFICER';
    else if (loanAmount <= 15000000) return 'MANAGER';
    else return 'HQ';
}
```
- System works even if config is missing
- Hardcoded defaults as safety net
- Database config takes precedence

### 7.3 LINE Notifications on Change
```typescript
// Notify all users when interest rates change
if (oldRate !== null && oldRate !== rate) {
    await this.notifyRateChange('MLR', oldRate, rate, updater);
}

// Notification includes:
// - Old rate and new rate
// - Who made the change
// - Timestamp
// - Impact on existing loans (if any)
```

---

## 8. Files สำคัญ

| File | Responsibility |
|------|---------------|
| `system-config.repository.ts` | Database access for system config |
| `config.service.ts` | Business logic for config CRUD |
| `config.controller.ts` | API endpoints for system config |
| `interest-rate.service.ts` | MLR/MRR management |
| `interest-rate.controller.ts` | API endpoints for interest rates |
| `loan-approval.service.ts` | Approval limit logic |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

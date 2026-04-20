# ระบบ Loan Lifecycle (วงจรชีวิตสินเชื่อ) แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์วงจรชีวิตสินเชื่อตั้งแต่สร้างจนปิดบัญชีสำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวม Loan Lifecycle

### 1.1 State Diagram
```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐    ┌─────────────┐
│    START    │ →  │ PENDING_APPROVAL │ →  │   APPROVED  │ →  │  DISBURSED  │
└─────────────┘    └──────────────────┘    └─────────────┘    └─────────────┘
                            │                      │                  │
                            ↓                      ↓                  ↓
                    ┌─────────────┐         ┌─────────────┐    ┌─────────────┐
                    │   REJECTED  │         │   CANCELLED │    │    ACTIVE   │
                    └─────────────┘         └─────────────┘    └──────┬──────┘
                                                                       │
                            ┌──────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
        ┌─────────┐   ┌─────────┐   ┌─────────┐
        │  CLOSED │   │ DEFAULT │   │   NPL   │
        │(ปกติ)   │   │(ค้าง)   │   │(เสีย)   │
        └─────────┘   └─────────┘   └─────────┘
```

### 1.2 Status Definitions
| Status | Description | สามารถเปลี่ยนเป็น |
|--------|-------------|-------------------|
| **PENDING_APPROVAL** | รออนุมัติ | APPROVED, REJECTED, CANCELLED |
| **APPROVED** | อนุมัติแล้ว รอเบิกจ่าย | DISBURSED, CANCELLED |
| **REJECTED** | ปฏิเสธ | - (จบ) |
| **DISBURSED** | เบิกจ่ายแล้ว (ครั้งแรก) | ACTIVE |
| **ACTIVE** | กำลังผ่อนชำระ | CLOSED, DEFAULTED |
| **CLOSED** | ปิดบัญชี (ชำระครบ) | - (จบ) |
| **DEFAULTED** | ค้างชำระ | NPL, CLOSED (if settled) |
| **NPL** | หนี้เสีย (Non-Performing Loan) | - (จบ) |
| **CANCELLED** | ยกเลิก | - (จบ) |

---

## 2. Loan Creation Flow

### 2.1 Validation Steps
```typescript
async createLoan(input, branchId, officerId) {
  // 1. Validate branch access
  const branch = await branchRepository.findById(branchId);
  
  // 2. Validate customer (RBAC)
  const customer = await customerRepository.findById(input.customerId);
  if (role === 'OFFICER' && customer.createdBy !== userId) {
    throw new Error('Can only create loans for your own customers');
  }
  
  // 3. 🔴 CRITICAL: Blacklist Check
  if (customer.status === 'BLACKLISTED') {
    throw new Error('CUSTOMER_BLACKLISTED');
  }
  
  // 4. 🔴 CRITICAL: Duplicate Loan Detection
  const pendingLoans = await loanRepository.findPendingByCustomer(customerId);
  if (pendingLoans.length > 0) {
    throw new Error('DUPLICATE_LOAN_APPLICATION');
  }
  
  // 5. 🔴 CRITICAL: Budget Check
  const budgetCheck = await budgetService.checkAvailability(
    input.loanProductId,
    input.principal
  );
  if (!budgetCheck.available) {
    throw new Error('BUDGET_EXCEEDED');
  }
  
  // 6. Calculate Interest Rate from Product
  const interestRate = await calculateInterestRateFromProduct(
    input.loanProductId,
    input.termMonths,
    input.principal
  );
  
  // 7. Calculate DSCR
  const dscrResult = calculateDSCR({
    monthlyRevenue: input.annualRevenue / 12,
    monthlyCogs: input.annualCogs / 12,
    monthlyOpex: input.annualOpex / 12,
    loanAmount: input.principal,
    interestRate: interestRate,
    durationMonths: input.termMonths,
  });
  
  // 8. Check DSCR threshold (min 1.2)
  if (dscrResult.dscr < 1.2) {
    throw new Error(`DSCR ${dscrResult.dscr} is below minimum threshold 1.2`);
  }
  
  // 9. Determine approval level
  const approvalLevel = getRequiredApprovalLevel(input.principal);
  // ≤500,000: OFFICER, ≤15,000,000: MANAGER, >15,000,000: HQ
  
  // 10. Generate contract number
  const contractNumber = await generateContractNumber(branchId, productId);
  // Format: SME-{BRANCH}-{PRODUCT}-{YYYY}-{SEQ}
  
  // 11. Create loan (via queue to prevent race conditions)
  const loan = await loanRepository.create({
    ...input,
    contractNumber,
    interestRate,
    dscr: dscrResult.dscr,
    dscrStatus: dscrResult.status,
    monthlyPayment: dscrResult.monthlyPayment,
    approvalLevel,
    status: 'PENDING_APPROVAL',
  });
  
  // 12. Generate preliminary payment schedule
  await generatePaymentSchedule(loan);
  
  // 13. Send notification to manager
  await notificationHelper.sendLoanApprovalRequest({
    loanId: loan.id,
    branchId,
    customerName: customer.businessName,
    amount: input.principal,
    officerName: officer.fullName,
  });
  
  return loan;
}
```

---

## 3. Approval Workflow

### 3.1 Approval Hierarchy
| Loan Amount | Required Level | Can Approve |
|-------------|---------------|-------------|
| ≤ 500,000 | OFFICER | Officer, Manager, Admin |
| ≤ 15,000,000 | MANAGER | Manager, Admin |
| > 15,000,000 | HQ | Admin only |

### 3.2 Approval Flow
```typescript
async approveLoan(loanId, managerId, approverRole) {
  return withRetryAndJitter(async () => {
    await prisma.$transaction(async (tx) => {
      // 1. Get loan with lock
      const loan = await loanRepository.findById(loanId, branchId, tx);
      
      // 2. Check status
      if (loan.status !== 'PENDING_APPROVAL') {
        throw new Error('Loan is not pending approval');
      }
      
      // 3. Check approval authority
      if (approverRole === 'MANAGER' && loan.principal > 15_000_000) {
        throw new Error('MANAGER_APPROVAL_LIMIT_EXCEEDED');
      }
      
      // 4. Check budget availability (inside transaction)
      const budgetCheck = await budgetService.checkAvailability(
        loan.loanProductId,
        loan.principal,
        tx
      );
      if (!budgetCheck.available) {
        throw new Error('BUDGET_EXCEEDED');
      }
      
      // 5. Reserve budget
      await budgetService.reserveBudget(
        loan.loanProductId,
        loanId,
        loan.principal,
        branchId,
        tx
      );
      
      // 6. Update loan status
      await loanRepository.update(loanId, {
        status: 'APPROVED',
        approvedBy: managerId,
        approvedAt: new Date(),
      }, branchId, tx);
      
      // 7. Auto-create disbursement request
      await disbursementRepository.create({
        loanId,
        disbursementNo: 1,
        amount: loan.principal,
        purpose: 'Initial disbursement',
        requestedDate: new Date(),
        status: 'PENDING',
        createdBy: managerId,
      }, tx);
      
    }, { isolationLevel: 'SERIALIZABLE', timeout: 10000 });
    
    // 8. Send notifications (outside transaction)
    await loanStatusNotification.notifyLoanApproved(loanId);
    await notificationHelper.sendLoanApprovalResult({
      loanId,
      customerName,
      approved: true,
      managerName,
    });
    
    return loan;
  }, { maxRetries: 3 });
}
```

### 3.3 Rejection Flow
```typescript
async rejectLoan(loanId, managerId, reason) {
  // 1. Get loan
  const loan = await loanRepository.findById(loanId);
  
  // 2. Release budget if reserved
  if (loan.loanProductId) {
    await budgetService.releaseBudget(
      loan.loanProductId,
      loanId,
      loan.principal,
      loan.branchId
    );
  }
  
  // 3. Update status
  await loanRepository.update(loanId, {
    status: 'REJECTED',
    rejectedBy: managerId,
    rejectedAt: new Date(),
    rejectedReason: reason,
  });
  
  // 4. Send notifications
  await loanStatusNotification.notifyLoanRejected(loanId, reason);
  await notificationHelper.sendLoanApprovalResult({
    loanId,
    customerName,
    approved: false,
    reason,
  });
}
```

---

## 4. Disbursement Flow

### 4.1 First Disbursement (APPROVED → DISBURSED)
```typescript
async executeFirstDisbursement(disbursementId, userId, branchId) {
  // 1. Get disbursement
  const disbursement = await disbursementRepository.findById(disbursementId);
  const loan = disbursement.loan;
  
  // 2. Validate
  if (loan.status !== 'APPROVED') {
    throw new Error('Loan must be approved');
  }
  
  // 3. Calculate dates
  const disbursementDate = new Date();
  const maturityDate = new Date(disbursementDate);
  maturityDate.setMonth(maturityDate.getMonth() + loan.termMonths);
  
  // 4. Update loan
  await loanRepository.update(loan.id, {
    status: 'DISBURSED',
    disbursementDate,
    maturityDate,
    outstandingBalance: loan.principal,
  });
  
  // 5. Recalculate payment schedule with actual dates
  await dynamicInterestCalculator.recalculatePaymentSchedule(loan.id);
  
  // 6. Update disbursement
  await disbursementRepository.update(disbursementId, {
    status: 'DISBURSED',
    disbursedAt: new Date(),
    disbursedBy: userId,
  });
  
  // 7. Send notifications
  await loanStatusNotification.notifyLoanDisbursed(loan.id);
}
```

### 4.2 Subsequent Disbursements (Multi-tranche)
```typescript
async executeSubsequentDisbursement(disbursementId) {
  const disbursement = await disbursementRepository.findById(disbursementId);
  const loan = disbursement.loan;
  
  // Check if partial disbursement
  const totalDisbursed = await calculateTotalDisbursed(loan.id);
  const newPrincipal = totalDisbursed + disbursement.amount;
  
  // Update loan principal
  await loanRepository.update(loan.id, {
    totalDisbursed: newPrincipal,
    outstandingBalance: newPrincipal,
  });
  
  // Recalculate payment schedule (dynamic principal)
  await dynamicInterestCalculator.recalculatePaymentSchedule(loan.id);
}
```

---

## 5. Active Loan Management

### 5.1 Payment Processing → Status Updates
```typescript
async processPayment(paymentInput) {
  // 1. Record payment
  const payment = await paymentRepository.create(paymentInput);
  
  // 2. Update loan balance
  const loan = await loanRepository.findById(paymentInput.loanId);
  const newBalance = loan.outstandingBalance - payment.principalAmount;
  
  // 3. Update next payment info
  const nextSchedule = await getNextUnpaidSchedule(loan.id);
  
  // 4. Check if loan is fully paid
  if (newBalance <= 0) {
    await closeLoan(loan.id, 'FULLY_PAID');
  } else {
    await loanRepository.update(loan.id, {
      outstandingBalance: newBalance,
      nextPaymentDate: nextSchedule?.paymentDate,
      nextPaymentAmount: nextSchedule?.totalPayment,
      lastPaymentDate: new Date(),
    });
  }
}
```

### 5.2 Overdue Detection (Daily Cron)
```typescript
async detectOverdueLoans() {
  const today = TimezoneUtil.now();
  
  // Find loans with overdue schedules
  const overdueLoans = await prisma.loan.findMany({
    where: {
      status: 'ACTIVE',
      paymentSchedules: {
        some: {
          status: { in: ['UNPAID', 'OVERDUE'] },
          paymentDate: { lt: today },
        },
      },
    },
    include: {
      paymentSchedules: {
        where: {
          status: { in: ['UNPAID', 'OVERDUE'] },
          paymentDate: { lt: today },
        },
        orderBy: { paymentDate: 'asc' },
        take: 1, // First overdue
      },
    },
  });
  
  for (const loan of overdueLoans) {
    const firstOverdue = loan.paymentSchedules[0];
    const overdueDays = daysDifference(today, firstOverdue.paymentDate);
    
    // Update loan overdue info
    await loanRepository.update(loan.id, {
      overdueDays,
    });
    
    // Send notifications based on days
    if (overdueDays === 1) {
      await notifyFirstOverdue(loan);
    } else if (overdueDays === 7) {
      await notifyWeekOverdue(loan);
    } else if (overdueDays === 30) {
      await markAsDefaulted(loan.id);
    } else if (overdueDays === 90) {
      await markAsNPL(loan.id);
    }
  }
}
```

---

## 6. Loan Closure

### 6.1 Normal Closure (Fully Paid)
```typescript
async closeLoan(loanId, reason: 'FULLY_PAID' | 'SETTLED' | 'WRITTEN_OFF') {
  const loan = await loanRepository.findById(loanId);
  
  // 1. Validate all schedules are paid
  const unpaidCount = await prisma.paymentSchedule.count({
    where: {
      loanId,
      status: { in: ['UNPAID', 'OVERDUE'] },
    },
  });
  
  if (unpaidCount > 0 && reason === 'FULLY_PAID') {
    throw new Error('Cannot close: unpaid schedules exist');
  }
  
  // 2. Release remaining budget
  if (loan.loanProductId) {
    const remainingBudget = loan.principal - loan.totalDisbursed;
    if (remainingBudget > 0) {
      await budgetService.releaseBudget(
        loan.loanProductId,
        loanId,
        remainingBudget,
        loan.branchId
      );
    }
  }
  
  // 3. Update loan status
  await loanRepository.update(loanId, {
    status: 'CLOSED',
    closedAt: new Date(),
    closedReason: reason,
    outstandingBalance: 0,
  });
  
  // 4. Send completion notification
  await loanStatusNotification.notifyLoanClosed(loanId, reason);
}
```

### 6.2 NPL (Non-Performing Loan)
```typescript
async markAsNPL(loanId) {
  const loan = await loanRepository.findById(loanId);
  
  // 1. Validate overdue days >= 90
  if (loan.overdueDays < 90) {
    throw new Error('Loan must be overdue for at least 90 days');
  }
  
  // 2. Update status
  await loanRepository.update(loanId, {
    status: 'NPL',
    nplDate: new Date(),
  });
  
  // 3. Create NPL record for reporting
  await nplRepository.create({
    loanId,
    principal: loan.principal,
    outstandingBalance: loan.outstandingBalance,
    overdueDays: loan.overdueDays,
    classifiedAt: new Date(),
  });
  
  // 4. Notify stakeholders
  await notifyNPLClassification(loan);
}
```

---

## 7. SLA (Service Level Agreement)

### 7.1 Approval SLA by Level
| Level | SLA | Action if Exceeded |
|-------|-----|-------------------|
| OFFICER | 24 hours | Escalate to MANAGER |
| MANAGER | 48 hours | Escalate to HQ |
| HQ | 72 hours | Escalate to EXECUTIVE |

### 7.2 SLA Monitoring
```typescript
async checkApprovalSLA(loanId): Promise<SLAStatus> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { createdAt, currentApprovalLevel },
  });
  
  const slaMap = { OFFICER: 24, MANAGER: 48, HQ: 72 };
  const slaHours = slaMap[loan.currentApprovalLevel];
  
  const hoursElapsed = (Date.now() - loan.createdAt.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = slaHours - hoursElapsed;
  
  return {
    exceeded: hoursRemaining < 0,
    hoursRemaining: Math.round(hoursRemaining),
    slaHours,
  };
}
```

---

## 8. API Endpoints

### 8.1 Loan Lifecycle Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/loans` | Officer+ | Create loan application |
| POST | `/api/loans/:id/approve` | Manager+ | Approve loan |
| POST | `/api/loans/:id/reject` | Manager+ | Reject loan |
| POST | `/api/loans/:id/cancel` | Officer+ | Cancel application |
| POST | `/api/loans/:id/close` | Manager+ | Close loan |

### 8.2 Workflow Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/loans/pending-approvals` | Manager+ | List pending approvals |
| GET | `/api/loans/:id/sla` | Manager+ | Check SLA status |
| POST | `/api/loans/:id/request-documents` | Manager+ | Request additional docs |

---

## 9. Key Design Decisions

### 9.1 Why SERIALIZABLE Transaction?
- **Budget Race Condition Prevention**: ป้องกันการอนุมัติเกินงบประมาณ
- **Idempotency**: อนุมัติซ้ำไม่ได้
- **Consistency**: ข้อมูลสถานะตรงกันเสมอ

### 9.2 Why Queue for Loan Creation?
- **Race Condition Prevention**: ป้องกันสร้างสินเชื่อซ้อนกัน
- **Retry Mechanism**: ลองใหม่ถ้าล้มเหลว
- **Audit Trail**: บันทึกทุกขั้นตอน

### 9.3 Why Dynamic Principal?
- **Partial Disbursement Support**: รองรับเบิกจ่ายหลายงวด
- **Accurate Interest**: ดอกเบี้ยคิดจากยอดที่เบิกจริง
- **Flexible**: ปรับตามความต้องการ

---

## 10. Files สำคัญ

### Backend
| File | Responsibility |
|------|---------------|
| `loan.service.ts` | Main loan lifecycle logic |
| `loan-approval.service.ts` | Approval workflow, SLA |
| `loan-workflow.service.ts` | Workflow management |
| `disbursement.service.ts` | Disbursement handling |
| `dynamic-interest-calculator.service.ts` | Schedule recalculation |

### Frontend
| File | Responsibility |
|------|---------------|
| `LoanApplication.tsx` | Create loan form |
| `LoanApproval.tsx` | Approval interface |
| `LoanDetails.tsx` | Loan status, timeline |
| `Disbursement.tsx` | Disbursement workflow |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

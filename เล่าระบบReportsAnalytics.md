# ระบบ Reports + Analytics แบบละเอียด - DueTracker2026

## 1. ภาพรวมสถาปัตยกรรม

### Report Types
| Type | Reports | Purpose |
|------|---------|---------|
| **Summary** | Branch Summary, Officer Performance | Aggregated KPIs |
| **Detail** | Loan Register, Payment Register, NPL | Tabular data |
| **Analytics** | DPD Buckets, Collection Rate, NPL Ratio | Risk metrics |

---

## 2. Report Service

### 2.1 Core Methods
```typescript
export class ReportService {
  async generateBranchSummaryReport(params: ReportFilters)
  async generateNPLReport(params: ReportFilters) 
  async generateOfficerPerformanceReport(params: ReportFilters)
  async generateLoanReport(params: ReportFilters)
  async generatePaymentReport(params: ReportFilters)
}

type ReportFilters = {
  branchId?: string;
  officerId?: string;
  productId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};
```

### 2.2 Filter Building
```typescript
private buildLoanWhere(params): Prisma.LoanWhereInput {
  const where: Prisma.LoanWhereInput = {};
  if (params.branchId) where.branchId = params.branchId;
  if (params.officerId) where.officerId = params.officerId;
  if (params.productId) where.loanProductId = params.productId;
  return where;
}

private buildDateRange(range) {
  if (!range?.dateFrom && !range?.dateTo) return undefined;
  return {
    ...(range.dateFrom ? { gte: range.dateFrom } : {}),
    ...(range.dateTo ? { lte: range.dateTo } : {}),
  };
}
```

---

## 3. Branch Summary Report

### 3.1 Portfolio Definition
```typescript
// Portfolio = DISBURSED/ACTIVE/NPL/DEFAULTED
const portfolioStatuses = ['DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED'];
```

### 3.2 Key Metrics
```typescript
async generateBranchSummaryReport(params) {
  const loanWhere = this.buildLoanWhere(params);
  const portfolioWhere = { ...loanWhere, status: { in: portfolioStatuses } };

  const [
    portfolioLoans,
    activeLoans,
    outstandingResult,
    disbursedResult,
    collectedResult,
    expectedResult,
    nplLoans,
    ...dpdBuckets
  ] = await Promise.all([
    // Counts
    prisma.loan.count({ where: portfolioWhere }),
    prisma.loan.count({ where: { ...loanWhere, status: { in: ['DISBURSED', 'ACTIVE'] } } }),
    
    // Aggregates
    prisma.loan.aggregate({ where: portfolioWhere, _sum: { outstandingBalance: true } }),
    prisma.loanDisbursement.aggregate({ where: { status: 'DISBURSED', loan: loanWhere }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { loan: loanWhere }, _sum: { amount: true } }),
    prisma.paymentSchedule.aggregate({ where: { loan: loanWhere }, _sum: { totalPayment: true } }),
    
    // NPL count (30+ DPD or status NPL/DEFAULTED)
    prisma.loan.count({
      where: {
        ...portfolioWhere,
        OR: [{ status: 'NPL' }, { status: 'DEFAULTED' }, { overdueDays: { gte: 30 } }],
      },
    }),
    
    // DPD Buckets
    prisma.loan.count({ where: { ...portfolioWhere, overdueDays: 0 } }),
    prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 1, lte: 7 } } }),
    prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 8, lte: 29 } } }),
    prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 30, lte: 89 } } }),
    prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 90 } } }),
  ]);

  const totalOutstanding = Number(outstandingResult._sum.outstandingBalance || 0);
  const totalDisbursed = Number(disbursedResult._sum.amount || 0);
  const totalCollected = Number(collectedResult._sum.amount || 0);
  const totalExpected = Number(expectedResult._sum.totalPayment || 0);
  
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
  const nplRatio = portfolioLoans > 0 ? (nplLoans / portfolioLoans) * 100 : 0;

  return {
    summary: {
      portfolioLoans,
      activeLoans,
      nplLoans,
      totalDisbursed,
      totalCollected,
      totalExpected,
      collectionRate: Number(collectionRate.toFixed(2)),
      totalOutstanding,
      nplRatio: Number(nplRatio.toFixed(2)),
    },
    dpdBuckets: {
      current: dpdBuckets[0],
      dpd1to7: dpdBuckets[1],
      dpd8to29: dpdBuckets[2],
      dpd30to89: dpdBuckets[3],
      dpd90plus: dpdBuckets[4],
    },
  };
}
```

---

## 4. NPL Report

### 4.1 NPL Criteria (30+ DPD)
```typescript
async generateNPLReport(params) {
  const nplLoans = await prisma.loan.findMany({
    where: {
      ...loanWhere,
      OR: [
        { status: 'NPL' },
        { status: 'DEFAULTED' },
        { overdueDays: { gte: 30 } }  // 30+ days past due
      ],
    },
    include: {
      customer: { select: { businessName: true, customerCode: true } },
      branch: { select: { name: true, code: true } },
      officer: { select: { firstName: true, lastName: true } },
      loanProduct: { select: { productName: true, productCode: true } },
    },
    orderBy: { overdueDays: 'desc' },  // Worst first
    take: 2000,
  });

  return nplLoans.map((loan) => ({
    loanId: loan.id,
    contractNumber: loan.contract_number,
    customerName: loan.customer.businessName,
    customerCode: loan.customer.customerCode,
    branchName: loan.branch?.name,
    officerName: loan.officer ? `${loan.officer.firstName} ${loan.officer.lastName}` : undefined,
    productName: loan.loanProduct?.productName,
    status: loan.status,
    outstandingAmount: Number(loan.outstandingBalance),
    overdueDays: loan.overdueDays || 0,
    lastPaymentDate: loan.lastPaymentDate?.toISOString(),
  }));
}
```

---

## 5. Officer Performance Report

### 5.1 Performance Metrics
```typescript
async generateOfficerPerformanceReport(params) {
  // Get all officers (or specific one)
  const officers = await prisma.user.findMany({
    where: {
      role: 'OFFICER',
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.officerId ? { id: params.officerId } : {}),
    },
    select: { id: true, firstName: true, lastName: true },
  });

  // Calculate performance for each officer
  const performanceData = await Promise.all(
    officers.map(async (officer) => {
      const officerWhere = { ...baseLoanWhere, officerId: officer.id };

      const [
        portfolioLoans,
        activeLoans,
        nplLoans,
        collectedResult,
        expectedResult,
        disbursedResult,
      ] = await Promise.all([
        prisma.loan.count({ where: { ...officerWhere, status: { in: portfolioStatuses } } }),
        prisma.loan.count({ where: { ...officerWhere, status: { in: ['DISBURSED', 'ACTIVE'] } } }),
        prisma.loan.count({
          where: {
            ...officerWhere,
            OR: [{ status: 'NPL' }, { status: 'DEFAULTED' }, { overdueDays: { gte: 30 } }],
          },
        }),
        prisma.payment.aggregate({ where: { loan: officerWhere }, _sum: { amount: true } }),
        prisma.paymentSchedule.aggregate({ where: { loan: officerWhere }, _sum: { totalPayment: true } }),
        prisma.loanDisbursement.aggregate({ where: { status: 'DISBURSED', loan: officerWhere }, _sum: { amount: true } }),
      ]);

      const totalCollected = Number(collectedResult._sum.amount || 0);
      const totalExpected = Number(expectedResult._sum.totalPayment || 0);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

      return {
        officerId: officer.id,
        officerName: `${officer.firstName} ${officer.lastName}`,
        portfolioLoans,
        activeLoans,
        nplLoans,
        disbursementAmount: Number(disbursedResult._sum.amount || 0),
        totalCollected,
        totalExpected,
        collectionRate: Number(collectionRate.toFixed(2)),
      };
    })
  );

  return performanceData;
}
```

---

## 6. Loan & Payment Register Reports

### 6.1 Loan Register
```typescript
async generateLoanReport(params) {
  const loans = await prisma.loan.findMany({
    where: {
      ...loanWhere,
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
    include: {
      customer: { select: { businessName: true, customerCode: true } },
      branch: { select: { name: true, code: true } },
      officer: { select: { firstName: true, lastName: true } },
      loanProduct: { select: { productName: true, productCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  return loans.map((loan) => ({
    loanId: loan.id,
    contractNumber: loan.contract_number,
    customerName: loan.customer.businessName,
    customerCode: loan.customer.customerCode,
    branchName: loan.branch?.name,
    officerName: loan.officer ? `${loan.officer.firstName} ${loan.officer.lastName}` : undefined,
    productName: loan.loanProduct?.productName,
    principal: Number(loan.principal),
    outstandingBalance: Number(loan.outstandingBalance),
    status: loan.status,
    disbursementDate: loan.disbursementDate?.toISOString(),
    overdueDays: loan.overdueDays || 0,
    createdAt: loan.createdAt.toISOString(),
  }));
}
```

### 6.2 Payment Register
```typescript
async generatePaymentReport(params) {
  const payments = await prisma.payment.findMany({
    where: {
      ...(dateRange ? { paymentDate: dateRange } : {}),
      loan: loanWhere,
    },
    include: {
      loan: {
        select: {
          contract_number: true,
          officer: { select: { firstName: true, lastName: true } },
          branch: { select: { name: true, code: true } },
          customer: { select: { businessName: true, customerCode: true } },
          loanProduct: { select: { productName: true, productCode: true } },
        },
      },
      paymentReceipts: { select: { receiptNumber: true } },
      creator: { select: { firstName: true, lastName: true } },
    },
    orderBy: { paymentDate: 'desc' },
    take: 5000,
  });

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    summary: {
      totalPayments: payments.length,
      totalCollected: Number(totalCollected.toFixed(2)),
    },
    payments: payments.map((p) => ({
      paymentId: p.id,
      paymentDate: p.paymentDate.toISOString(),
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      paymentType: p.paymentType,
      contractNumber: p.loan.contract_number,
      customerName: p.loan.customer.businessName,
      branchName: p.loan.branch?.name,
      officerName: p.loan.officer ? `${p.loan.officer.firstName} ${p.loan.officer.lastName}` : undefined,
      productName: p.loan.loanProduct?.productName,
      receiptNumber: p.paymentReceipts?.[0]?.receiptNumber,
      recordedBy: p.creator ? `${p.creator.firstName} ${p.creator.lastName}` : undefined,
    })),
  };
}
```

---

## 7. API Endpoints

### 7.1 Report Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/branch-summary` | Admin/Manager | Portfolio overview |
| GET | `/api/reports/npl-report` | Admin/Manager | NPL list (30+ DPD) |
| GET | `/api/reports/officer-performance` | Admin/Manager | KPI by officer |
| GET | `/api/reports/loans` | Admin/Manager | Loan register |
| GET | `/api/reports/payments` | Admin/Manager | Payment register |

### 7.2 Controller Pattern
```typescript
export class ReportController {
  private reportService: ReportService;

  // Role-based branch scoping
  private getScopedBranchId(request, requestedBranchId?: string) {
    const role = request.user!.role;
    if (role === 'ADMIN') return requestedBranchId;
    return request.user!.branchId || undefined;
  }

  generateBranchSummary = async (request, reply) => {
    const result = await this.reportService.generateBranchSummaryReport({
      branchId: this.getScopedBranchId(request, request.query.branchId),
      officerId: request.query.officerId,
      productId: request.query.productId,
      dateFrom: request.query.dateFrom ? new Date(request.query.dateFrom) : undefined,
      dateTo: request.query.dateTo ? new Date(request.query.dateTo) : undefined,
    });
    return ResponseUtil.success(reply, result);
  };
}
```

---

## 8. Key Metrics Reference

### 8.1 DPD Buckets (Days Past Due)
| Bucket | Days | Status |
|--------|------|--------|
| Current | 0 | On time |
| DPD 1-7 | 1-7 | Grace period |
| DPD 8-29 | 8-29 | Warning |
| DPD 30-89 | 30-89 | Default |
| DPD 90+ | 90+ | NPL |

### 8.2 NPL Definition
- **30+ DPD** (Days Past Due) OR
- Status = **NPL** OR
- Status = **DEFAULTED**

### 8.3 Collection Rate Formula
```
Collection Rate = (Total Collected / Total Expected) × 100
```

### 8.4 NPL Ratio Formula
```
NPL Ratio = (NPL Loans / Portfolio Loans) × 100
```

---

## 9. Files สำคัญ

| File | Responsibility |
|------|---------------|
| `report.service.ts` | Report generation logic |
| `report.controller.ts` | API endpoints |
| `report.routes.ts` | Route definitions |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*

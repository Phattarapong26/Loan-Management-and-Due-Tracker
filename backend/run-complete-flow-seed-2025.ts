/**
 * Complete System Seed Script 2025-2026 (Fixed)
 *
 * Bug fixes:
 * 1. firstPaymentDate = วันที่ 1 ของเดือนถัดจากวันเบิกจ่าย (ไม่ใช่ disbursementDate + 1 month)
 * 2. NPL scenario ใช้ daysSinceDue >= 90 จริงๆ แทนที่จะ set OVERDUE เมื่อ month >= 4
 * 3. applicationMonth ของ NPL ไม่เกิน 12 เพื่อให้ loan เริ่มก่อน currentDate เสมอ
 * 4. สร้าง schedule ทุกงวดตลอด term (ไม่ break กลาง loop) และ mark FUTURE สำหรับงวดที่ยังไม่ถึง
 * 5. Update loan.outstandingBalance และ schedule.paidAmount หลังสร้าง payment
 * 6. Collection actions filter จาก actual overdue status แทนที่จะใช้ scenario
 *
 * Flow:
 * 1. Products → 2. Branches → 3. Branch Managers → 4. Officers → 5. Customers
 * 6. Loan Contracts → 7. Disbursements → 8. Payment Schedules → 9. Payments → 10. Collections
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EncryptionUtil } from '../src/core/utils/security/encryption.util';

const prisma = new PrismaClient();

// ─── Date utilities ────────────────────────────────────────────────────────────

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * FIX 1: คืนวันที่ 1 ของเดือนถัดจากวันเบิกจ่าย
 * เช่น เบิกจ่าย 15 ม.ค. → return 1 ก.พ.
 *      เบิกจ่าย 1 มี.ค.  → return 1 เม.ย.
 */
function getFirstDayOfNextMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.floor((Math.random() * (max - min) + min) * factor) / factor;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const REAL_EMAILS = [
  'dearnull88@gmail.com',
  'drpattarapong66@gmail.com',
  'garenathailanded@gmail.com',
  'hundaithailand@gmail.com',
  'janesitjanrated@gmail.com',
  'kuycsihahare@gmail.com',
  'mulacompany447@gmail.com',
  'mulamedlab@gmail.com',
  'mynameisathitayanotathi@gmail.com',
  'nreftihta@gmail.com',
  'phattaraponh44@gmail.com',
  'prapundeejintana@gmail.com',
  'testergologu@gmail.com',
  'worldseccehellos@gmail.com',
];

const BRANCH_DATA = [
  {
    code: 'BKK001',
    name: 'สาขากรุงเทพฯ สีลม',
    province: 'กรุงเทพมหานคร',
    district: 'บางรัก',
    address: '123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
    phone: '02-234-5678',
    postalCode: '10500',
  },
  {
    code: 'CNX001',
    name: 'สาขาเชียงใหม่ นิมมานเหมินท์',
    province: 'เชียงใหม่',
    district: 'เมืองเชียงใหม่',
    address: '456 ถนนนิมมานเหมินท์ ตำบลสุเทพ อำเภอเมือง เชียงใหม่ 50200',
    phone: '053-123-4567',
    postalCode: '50200',
  },
  {
    code: 'HDY001',
    name: 'สาขาหาดใหญ่ ลีการ์ดัน',
    province: 'สงขลา',
    district: 'หาดใหญ่',
    address: '789 ถนนลีการ์ดัน ตำบลหาดใหญ่ อำเภอหาดใหญ่ สงขลา 90110',
    phone: '074-567-8901',
    postalCode: '90110',
  },
];

// ─── Main seed function ────────────────────────────────────────────────────────

async function seedCompleteSystem2025() {
  console.log('🌱 Starting Complete System Seed 2025-2026 (Fixed)...\n');

  const projectStartDate = new Date('2025-01-01');
  const currentDate = new Date('2026-03-10');

  console.log(`📅 Project period: ${projectStartDate.toDateString()} → ${currentDate.toDateString()}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 1: ADMIN
  // ══════════════════════════════════════════════════════════════
  console.log('👑 Step 1: Creating or getting system admin...');

  const adminPassword = await bcrypt.hash('1234567890', 10);

  let admin = await prisma.user.findUnique({
    where: { email: 'phattarapong.phe@gmail.com' },
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'phattarapong.phe@gmail.com',
        firstName: 'Phattarapong',
        lastName: 'Administrator',
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash: adminPassword,
      },
    });
    console.log(`  ✓ Created admin: ${admin.email}`);
  } else {
    console.log(`  ✓ Found existing admin: ${admin.email}`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2: LOAN PRODUCTS
  // ══════════════════════════════════════════════════════════════
  console.log('\n💼 Step 2: Creating loan products...');

  const productsData = [
    {
      productCode: 'SME-WC-001',
      productName: 'สินเชื่อเงินทุนหมุนเวียน SME',
      description: 'สินเชื่อสำหรับเงินทุนหมุนเวียนในธุรกิจ SME',
      minLoanAmount: 500000,
      maxLoanAmount: 10000000,
      maxTermMonths: 60,
      interestRateType: 'FIXED' as any,
      interestRateYear1_3: 7.5,
      loanType: 'MEDIUM_TERM' as any,
      status: 'ACTIVE' as any,
      displayOrder: 1,
      createdBy: admin.id,
    },
    {
      productCode: 'SME-EXP-002',
      productName: 'สินเชื่อขยายธุรกิจ SME',
      description: 'สินเชื่อสำหรับการขยายธุรกิจและการลงทุน',
      minLoanAmount: 1000000,
      maxLoanAmount: 25000000,
      maxTermMonths: 84,
      interestRateType: 'FIXED' as any,
      interestRateYear1_3: 8.0,
      loanType: 'LONG_TERM' as any,
      status: 'ACTIVE' as any,
      displayOrder: 2,
      createdBy: admin.id,
    },
    {
      productCode: 'SME-EQUIP-003',
      productName: 'สินเชื่อซื้อเครื่องจักร SME',
      description: 'สินเชื่อสำหรับการซื้อเครื่องจักรและอุปกรณ์',
      minLoanAmount: 2000000,
      maxLoanAmount: 50000000,
      maxTermMonths: 120,
      interestRateType: 'FIXED' as any,
      interestRateYear1_3: 8.5,
      loanType: 'LONG_TERM' as any,
      status: 'ACTIVE' as any,
      displayOrder: 3,
      createdBy: admin.id,
    },
  ];

  const createdProducts = [];
  for (const pd of productsData) {
    const product = await prisma.loanProduct.create({ data: pd });
    createdProducts.push(product);
    console.log(`  ✓ ${product.productCode} — ${product.productName}`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2.5: PENALTY RULES
  // ══════════════════════════════════════════════════════════════
  console.log('\n⚖️  Step 2.5: Creating penalty rules...');

  const penaltyRules = [];

  for (const product of createdProducts) {
    const tiers = [
      {
        loanProductId: product.id,
        ruleName: `Early Overdue (1-30 days) — ${product.productCode}`,
        daysOverdueFrom: 1,
        daysOverdueTo: 30,
        penaltyType: 'DAILY',
        penaltyRate: 0.03,
        compoundInterest: false,
        status: 'ACTIVE',
        isDefault: false,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        loanProductId: product.id,
        ruleName: `Medium Overdue (31-90 days) — ${product.productCode}`,
        daysOverdueFrom: 31,
        daysOverdueTo: 90,
        penaltyType: 'DAILY',
        penaltyRate: 0.04,
        compoundInterest: false,
        status: 'ACTIVE',
        isDefault: false,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        loanProductId: product.id,
        ruleName: `Severe Overdue (90+ days) — ${product.productCode}`,
        daysOverdueFrom: 91,
        daysOverdueTo: null,
        penaltyType: 'DAILY',
        penaltyRate: 0.0493,
        compoundInterest: true,
        compoundRate: 0.01,
        status: 'ACTIVE',
        isDefault: false,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const t of tiers) {
      const r = await prisma.penaltyRule.create({ data: t });
      penaltyRules.push(r);
      console.log(`  ✓ ${r.ruleName}`);
    }
  }

  // System-default fallback rules (loanProductId = null)
  const systemDefaults = [
    {
      loanProductId: null,
      ruleName: 'System Default — Early Overdue (1-30 days)',
      daysOverdueFrom: 1,
      daysOverdueTo: 30,
      penaltyType: 'DAILY',
      penaltyRate: 0.03,
      compoundInterest: false,
      status: 'ACTIVE',
      isDefault: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      loanProductId: null,
      ruleName: 'System Default — Medium Overdue (31-90 days)',
      daysOverdueFrom: 31,
      daysOverdueTo: 90,
      penaltyType: 'DAILY',
      penaltyRate: 0.04,
      compoundInterest: false,
      status: 'ACTIVE',
      isDefault: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      loanProductId: null,
      ruleName: 'System Default — Severe Overdue (90+ days)',
      daysOverdueFrom: 91,
      daysOverdueTo: null,
      penaltyType: 'DAILY',
      penaltyRate: 0.0493,
      compoundInterest: true,
      compoundRate: 0.01,
      status: 'ACTIVE',
      isDefault: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  for (const sd of systemDefaults) {
    const r = await prisma.penaltyRule.create({ data: sd });
    penaltyRules.push(r);
    console.log(`  ✓ ${r.ruleName}`);
  }

  console.log(`  → Total penalty rules: ${penaltyRules.length}`);

  // ══════════════════════════════════════════════════════════════
  // STEP 3: PRODUCT BUDGETS
  // ══════════════════════════════════════════════════════════════
  console.log('\n💰 Step 3: Creating product budgets (2025-2026)...');

  const productBudgets = [];

  for (const product of createdProducts) {
    for (const year of [2025, 2026]) {
      let annualBudget = 0;
      if (Number(product.maxLoanAmount) <= 10_000_000) {
        annualBudget = randomBetween(200_000_000, 400_000_000);
      } else if (Number(product.maxLoanAmount) <= 25_000_000) {
        annualBudget = randomBetween(400_000_000, 800_000_000);
      } else {
        annualBudget = randomBetween(800_000_000, 1_500_000_000);
      }

      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterBudget = Math.floor(annualBudget / 4);

        let utilizationRate = 0;
        if (year === 2025) {
          utilizationRate = randomDecimal(0.6, 0.95);
        } else {
          if (quarter === 1) utilizationRate = randomDecimal(0.7, 0.9);
          else if (quarter === 2) utilizationRate = randomDecimal(0.1, 0.3);
          else utilizationRate = 0;
        }

        const usedAmount = Math.floor(quarterBudget * utilizationRate);
        const disbursedAmount = Math.floor(usedAmount * 0.85);
        const pendingAmount = usedAmount - disbursedAmount;
        const availableAmount = quarterBudget - usedAmount;

        const budget = await prisma.product_budgets.create({
          data: {
            product_id: product.id,
            product_code: product.productCode,
            product_name: product.productName,
            fiscal_year: year,
            quarter,
            total_budget_amount: quarterBudget,
            committed_amount: usedAmount,
            disbursed_amount: disbursedAmount,
            pending_amount: pendingAmount,
            available_amount: availableAmount,
            utilization_rate: utilizationRate * 100,
            warning_threshold: 80.0,
            critical_threshold: 95.0,
            budget_status:
              utilizationRate > 0.95 ? 'CRITICAL' : utilizationRate > 0.8 ? 'WARNING' : 'ACTIVE',
            budget_owner: admin.id,
            notes: `${year} Q${quarter} budget for ${product.productName}`,
            created_by: admin.id,
          },
        });

        productBudgets.push(budget);
      }
    }
  }

  console.log(`  → Total budgets: ${productBudgets.length}`);

  // ══════════════════════════════════════════════════════════════
  // STEP 4: BRANCHES
  // ══════════════════════════════════════════════════════════════
  console.log('\n🏢 Step 4: Creating branches...');

  const createdBranches = [];
  for (const bd of BRANCH_DATA) {
    const branch = await prisma.branch.create({ data: { ...bd, status: 'ACTIVE' } });
    createdBranches.push(branch);
    console.log(`  ✓ ${branch.code} — ${branch.name}`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 5: USERS (MANAGERS + OFFICERS)
  // ══════════════════════════════════════════════════════════════
  console.log('\n👥 Step 5: Creating branch managers and officers...');

  const createdUsers = [];
  let emailIndex = 0;

  for (let i = 0; i < createdBranches.length; i++) {
    const branch = createdBranches[i];

    // Manager
    if (emailIndex < REAL_EMAILS.length) {
      const managerPw = await bcrypt.hash('manager123', 10);
      const manager = await prisma.user.create({
        data: {
          email: REAL_EMAILS[emailIndex++],
          firstName: `Manager${i + 1}`,
          lastName: `Branch${branch.code}`,
          role: 'MANAGER',
          status: 'ACTIVE',
          passwordHash: managerPw,
          branchId: branch.id,
        },
      });
      createdUsers.push(manager);
      console.log(`  ✓ MANAGER ${manager.email} → ${branch.name}`);
    }

    // Officers (2-3 per branch)
    const officerCount = randomBetween(2, 3);
    for (let j = 0; j < officerCount && emailIndex < REAL_EMAILS.length; j++) {
      const officerPw = await bcrypt.hash('officer123', 10);
      const officer = await prisma.user.create({
        data: {
          email: REAL_EMAILS[emailIndex++],
          firstName: `Officer${j + 1}`,
          lastName: `Branch${branch.code}`,
          role: 'OFFICER',
          status: 'ACTIVE',
          passwordHash: officerPw,
          branchId: branch.id,
        },
      });
      createdUsers.push(officer);
      console.log(`  ✓ OFFICER  ${officer.email} → ${branch.name}`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 6: CUSTOMERS
  // ══════════════════════════════════════════════════════════════
  console.log('\n👤 Step 6: Creating customers...');

  /**
   * FIX 3: applicationMonth ของ NPL ลดลงเหลือ max 12
   * เพื่อให้ startDate (projectStartDate + applicationMonth) ≤ currentDate (มี.ค. 2026)
   * เสมอ — ป้องกัน loan ที่ "ยังไม่เริ่ม" มี OVERDUE schedules
   */
  const customerTemplates = [
    // ── Good payers (60%) ─────────────────────────────────────
    ...Array(12)
      .fill(null)
      .map((_, i) => ({
        businessName: `บริษัท ธุรกิจดี ${i + 1} จำกัด`,
        businessType: ['WHOLESALE', 'RETAIL', 'SERVICE', 'MANUFACTURING'][i % 4],
        industry_code: ['4610', '5610', '6201', '2511'][i % 4],
        business_size: ['SMALL', 'MEDIUM', 'LARGE'][i % 3],
        annualRevenue: randomBetween(5_000_000, 50_000_000),
        scenario: Math.random() < 0.3 ? 'EARLY_PAYER' : 'GOOD_PAYER',
        loanAmount: randomBetween(1_000_000, 10_000_000),
        termMonths: [24, 36, 48, 60][i % 4],
        applicationMonth: randomBetween(0, 12),
        riskLevel: 'LOW',
      })),

    // ── Late payers (25%) ─────────────────────────────────────
    ...Array(5)
      .fill(null)
      .map((_, i) => ({
        businessName: `ห้างหุ้นส่วน ช้าจ่าย ${i + 1}`,
        businessType: ['WHOLESALE', 'RETAIL'][i % 2],
        industry_code: ['4610', '5610'][i % 2],
        business_size: ['SMALL', 'MEDIUM'][i % 2],
        annualRevenue: randomBetween(3_000_000, 20_000_000),
        scenario: 'LATE_PAYER',
        loanAmount: randomBetween(800_000, 5_000_000),
        termMonths: [36, 48][i % 2],
        applicationMonth: randomBetween(3, 15),
        riskLevel: 'MEDIUM',
      })),

    // ── NPL cases (15%) ───────────────────────────────────────
    // FIX 3: applicationMonth max เปลี่ยนจาก 20 → 12
    ...Array(3)
      .fill(null)
      .map((_, i) => ({
        businessName: `บริษัท มีปัญหา ${i + 1} จำกัด`,
        businessType: ['SERVICE', 'MANUFACTURING', 'RETAIL'][i % 3],
        industry_code: ['6201', '2511', '5610'][i % 3],
        business_size: ['SMALL', 'MEDIUM'][i % 2],
        annualRevenue: randomBetween(2_000_000, 12_000_000),
        scenario: ['NPL_EARLY', 'NPL_GRADUAL', 'NPL_SUDDEN'][i % 3],
        loanAmount: randomBetween(1_500_000, 6_000_000),
        termMonths: [36, 48, 60][i % 3],
        applicationMonth: randomBetween(3, 12), // ← FIX 3
        riskLevel: 'HIGH',
      })),
  ];

  const createdCustomers = [];
  const officers = createdUsers.filter((u) => u.role === 'OFFICER');

  for (let i = 0; i < customerTemplates.length; i++) {
    const cd = customerTemplates[i];
    const officer = officers[i % officers.length];
    const ts = Date.now().toString().slice(-6);

    const customer = await prisma.customer.create({
      data: {
        customerCode: `CUST${ts}${String(i + 1).padStart(3, '0')}`,
        businessName: cd.businessName,
        businessType: cd.businessType as any,
        industry_code: cd.industry_code,
        business_size: cd.business_size as any,
        phone: `081234${String(i + 1000).padStart(4, '0')}`,
        email: `customer${i + 1}@business.com`,
        thaiId: EncryptionUtil.encrypt(`1234567890${String(i).padStart(3, '0')}`),
        taxId: `0123456789${String(i).padStart(3, '0')}${ts.slice(-1)}`,
        status: 'ACTIVE',
        createdBy: officer.id,
        branchId: officer.branchId!,
      },
    });

    createdCustomers.push({ ...customer, scenario: cd, officer });
    console.log(`  ✓ [${cd.scenario}] ${cd.businessName}`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 7: LOAN CONTRACTS
  // ══════════════════════════════════════════════════════════════
  console.log('\n📋 Step 7: Creating loan contracts...');

  const createdLoans = [];

  for (let i = 0; i < createdCustomers.length; i++) {
    const cr = createdCustomers[i];
    const cd = cr.scenario;
    const officer = cr.officer;
    const product = createdProducts[i % createdProducts.length];
    const contractDate = addMonths(projectStartDate, cd.applicationMonth);
    const ts = Date.now().toString().slice(-6);

    const loan = await prisma.loan.create({
      data: {
        contract_number: `L${ts}${String(i + 1).padStart(3, '0')}`,
        customerId: cr.id,
        loanProductId: product.id,
        branchId: officer.branchId!,
        officerId: officer.id,
        principal: cd.loanAmount,
        interestRate: Number(product.interestRateYear1_3) || 8.5,
        termMonths: cd.termMonths,
        currentPrincipal: cd.loanAmount,
        status: 'APPROVED',
        startDate: contractDate,
        maturityDate: addMonths(contractDate, cd.termMonths),
        approvedBy: officer.id,
        approvedAt: contractDate,
        approvalLevel: 'OFFICER',
        outstandingBalance: cd.loanAmount,
        dscr:
          cd.riskLevel === 'LOW' ? 2.0 : cd.riskLevel === 'MEDIUM' ? 1.5 : 1.2,
        dscrStatus:
          cd.riskLevel === 'LOW'
            ? 'GOOD'
            : cd.riskLevel === 'MEDIUM'
            ? 'ACCEPTABLE'
            : 'POOR',
      },
    });

    createdLoans.push({ ...loan, customerData: cd, officer });
    console.log(
      `  ✓ ${loan.contract_number} — ${cd.businessName} (${cd.scenario})`
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 8: DISBURSEMENTS & TRANSACTIONS
  // ══════════════════════════════════════════════════════════════
  console.log('\n💸 Step 8: Creating disbursements and transactions...');

  const createdDisbursements = [];
  const createdTransactions = [];

  for (let i = 0; i < createdLoans.length; i++) {
    const lr = createdLoans[i];
    const cd = lr.customerData;
    const officer = lr.officer;
    const disbursementDate = addDays(lr.startDate, randomBetween(1, 14));

    const disbursement = await prisma.loanDisbursement.create({
      data: {
        loanId: lr.id,
        disbursementNo: 1,
        amount: lr.principal,
        purpose: 'WORKING_CAPITAL',
        requestedDate: addDays(lr.startDate, -1),
        status: 'DISBURSED',
        approvedBy: officer.id,
        approvedAt: disbursementDate,
        disbursedBy: officer.id,
        disbursedAt: disbursementDate,
        disbursementMethod: 'BANK_TRANSFER',
        referenceNo: `DISB${lr.contract_number}`,
        createdBy: officer.id,
        notes: `Disbursement for ${cd.businessName}`,
      },
    });
    createdDisbursements.push(disbursement);

    const txn = await prisma.transaction.create({
      data: {
        userId: officer.id,
        loanId: lr.id,
        type: 'LOAN_DISBURSEMENT' as any,
        amount: lr.principal,
        status: 'COMPLETED',
        description: `เบิกจ่ายเงินกู้ ${lr.contract_number}`,
        reference: disbursement.referenceNo,
        processedAt: disbursementDate,
        metadata: {
          disbursementId: disbursement.id,
          disbursementMethod: disbursement.disbursementMethod,
        },
      },
    });
    createdTransactions.push(txn);

    // Activate loan
    await prisma.loan.update({
      where: { id: lr.id },
      data: {
        status: 'ACTIVE',
        disbursementDate,
        totalDisbursed: lr.principal,
      },
    });

    // Budget consumption
    const loanDate = disbursementDate;
    const year = loanDate.getFullYear();
    const quarter = Math.ceil((loanDate.getMonth() + 1) / 3);
    const budget = productBudgets.find(
      (b) =>
        b.product_id === lr.loanProductId &&
        b.fiscal_year === year &&
        b.quarter === quarter
    );
    if (budget) {
      await prisma.budget_consumption.create({
        data: {
          product_budget_id: budget.id,
          loan_id: lr.id,
          branch_id: lr.branchId,
          requested_amount: Number(lr.principal),
          approved_amount: Number(lr.principal),
          disbursed_amount: Number(lr.principal),
          consumption_type: 'DISBURSEMENT',
          status: 'ACTIVE',
          consumption_date: loanDate,
          processed_by: officer.id,
        },
      });
    }

    // Cache disbursementDate back onto loan record for Step 9
    (lr as any).disbursementDate = disbursementDate;
  }

  console.log(`  → Disbursements: ${createdDisbursements.length}`);
  console.log(`  → Transactions:  ${createdTransactions.length}`);

  // ══════════════════════════════════════════════════════════════
  // STEP 9: PAYMENT SCHEDULES
  // FIX 1: งวดแรก = วันที่ 1 ของเดือนถัดจากวันเบิกจ่าย
  // FIX 2: NPL OVERDUE ต้องมี daysSinceDue >= 90 จริงๆ
  // ══════════════════════════════════════════════════════════════
  console.log('\n📅 Step 9: Creating payment schedules...');

  const createdSchedules = [];

  for (let i = 0; i < createdLoans.length; i++) {
    const lr = createdLoans[i];
    const cd = lr.customerData;

    const loanAmount = Number(lr.principal);
    const interestRate = lr.interestRate;
    const termMonths = lr.termMonths;

    const disbursedOn: Date = (lr as any).disbursementDate ?? addDays(lr.startDate, 7);

    /**
     * FIX 1: firstPaymentDate = วันที่ 1 ของเดือนถัดจากวันเบิกจ่าย
     * งวดที่ n มี dueDate = firstPaymentDate + (n-1) เดือน
     */
    const firstPaymentDate = getFirstDayOfNextMonth(disbursedOn);

    const monthlyRate = interestRate / 100 / 12;
    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    let remainingPrincipal = loanAmount;

    for (let month = 1; month <= termMonths; month++) {
      // FIX 1: dueDate คำนวณจาก firstPaymentDate ไม่ใช่ disbursedOn
      const dueDate = addMonths(firstPaymentDate, month - 1);

      const interestPayment = remainingPrincipal * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingPrincipal -= principalPayment;

      const daysSinceDue = Math.floor(
        (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // ── Determine payment status ──────────────────────────────
      let paymentStatus = 'UNPAID';
      let daysOverdue = 0;

      // FIX: สร้างทุกงวดตลอด term แล้ว mark status ให้ถูกต้อง
      if (dueDate > currentDate) {
        // งวดที่ยังไม่ถึงกำหนด
        paymentStatus = 'FUTURE';
      } else if (daysSinceDue <= 0) {
        // งวดที่เพิ่งครบกำหนดวันนี้หรือยังไม่ครบ
        paymentStatus = 'UNPAID';
      } else if (cd.scenario === 'GOOD_PAYER' || cd.scenario === 'EARLY_PAYER') {
        paymentStatus = 'PAID';
      } else if (cd.scenario === 'LATE_PAYER') {
        if (Math.random() < 0.7) {
          paymentStatus = 'PAID';
        } else {
          paymentStatus = daysSinceDue > 30 ? 'OVERDUE' : 'UNPAID';
          daysOverdue = daysSinceDue > 30 ? daysSinceDue : 0;
        }
      } else if (cd.scenario.startsWith('NPL')) {
        /**
         * FIX 2: NPL จะเป็น OVERDUE ก็ต่อเมื่อ
         *   - ค้างชำระมาแล้ว >= 90 วัน
         *   - และเป็นงวดที่ 4 เป็นต้นไป (3 งวดแรกยังชำระปกติ)
         * ระหว่าง 0-90 วันหลัง due → PARTIAL หรือ UNPAID เท่านั้น
         */
        if (month <= 3) {
          // 3 งวดแรก: ลูกค้ายังพอชำระได้
          paymentStatus = Math.random() < 0.5 ? 'PAID' : 'PARTIAL';
        } else if (daysSinceDue >= 90) {
          // ค้างเกิน 90 วัน → OVERDUE จริงๆ
          paymentStatus = 'OVERDUE';
          daysOverdue = daysSinceDue;
        } else {
          // ค้างแต่ยังไม่ถึง 90 วัน → LATE / PARTIAL ยังไม่ใช่ NPL
          paymentStatus = Math.random() < 0.4 ? 'PARTIAL' : 'UNPAID';
          daysOverdue = daysSinceDue;
        }
      }

      const schedule = await prisma.paymentSchedule.create({
        data: {
          loanId: lr.id,
          paymentNumber: month,
          paymentDate: dueDate,
          principalAmount: principalPayment,
          interestAmount: interestPayment,
          totalPayment: monthlyPayment,
          remainingBalance: Math.max(0, remainingPrincipal),
          status: paymentStatus as any,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          paidAmount: 0, // เริ่มต้นที่ 0 จะ update ใน Step 10
        },
      });

      createdSchedules.push({ ...schedule, customerData: cd, loanRecord: lr });
    }
  }

  console.log(`  → Payment schedules: ${createdSchedules.length}`);

  // ══════════════════════════════════════════════════════════════
  // STEP 10: PAYMENT RECORDS
  // ══════════════════════════════════════════════════════════════
  console.log('\n💳 Step 10: Creating payment records...');

  const createdPayments = [];

  for (const sr of createdSchedules) {
    const cd = sr.customerData;
    const lr = sr.loanRecord;
    const officer = lr.officer;

    if (sr.status !== 'PAID' && sr.status !== 'PARTIAL') continue;

    let paymentAmount = Number(sr.totalPayment);
    let paymentDate: Date = sr.paymentDate;

    if (sr.status === 'PARTIAL') {
      paymentAmount = paymentAmount * randomDecimal(0.3, 0.8);
    }

    if (cd.scenario === 'LATE_PAYER') {
      paymentDate = addDays(sr.paymentDate, randomBetween(1, 15));
    } else if (cd.scenario === 'EARLY_PAYER') {
      paymentDate = addDays(sr.paymentDate, -randomBetween(1, 5));
    }

    const payment = await prisma.payment.create({
      data: {
        loanId: lr.id,
        paymentScheduleId: sr.id,
        amount: paymentAmount,
        paymentDate,
        paymentMethod: ['BANK_TRANSFER', 'CASH', 'CHECK'][
          Math.floor(Math.random() * 3)
        ],
        paymentType: (sr.status === 'PAID' ? 'ON_TIME' : 'LATE') as any,
        reference: `PAY${lr.contract_number}${String(sr.paymentNumber).padStart(2, '0')}`,
        createdBy: officer.id,
        notes: sr.status === 'PARTIAL' ? 'ชำระบางส่วน' : undefined,
      },
    });
    createdPayments.push(payment);

    // FIX: Update schedule.paidAmount
    await prisma.paymentSchedule.update({
      where: { id: sr.id },
      data: { paidAmount: paymentAmount },
    });

    // FIX: Update loan.outstandingBalance
    await prisma.loan.update({
      where: { id: lr.id },
      data: {
        outstandingBalance: {
          decrement: paymentAmount,
        },
      },
    });

    await prisma.transaction.create({
      data: {
        userId: officer.id,
        loanId: lr.id,
        type: 'LOAN_PAYMENT' as any,
        amount: paymentAmount,
        status: 'COMPLETED',
        description: `ชำระงวดที่ ${sr.paymentNumber} — ${lr.contract_number}`,
        reference: payment.reference,
        processedAt: paymentDate,
        metadata: {
          paymentId: payment.id,
          scheduleId: sr.id,
          paymentNumber: sr.paymentNumber,
        },
      },
    });
  }

  console.log(`  → Payment records: ${createdPayments.length}`);

  // ══════════════════════════════════════════════════════════════
  // STEP 11: COLLECTION ACTIONS
  // ══════════════════════════════════════════════════════════════
  console.log('\n📞 Step 11: Creating collection actions for overdue accounts...');

  const createdCollectionActions = [];
  
  // FIX: Filter เฉพาะ schedules ที่มี actual overdue status และ daysOverdue > 0
  const overdueSchedules = createdSchedules.filter(
    (s) => (s.status === 'OVERDUE' || s.status === 'UNPAID') && s.daysOverdue > 0
  );

  const actionTypes = ['CALL', 'SMS', 'EMAIL', 'VISIT', 'LEGAL'];

  for (const sr of overdueSchedules) {
    const cd = sr.customerData;
    const lr = sr.loanRecord;
    const officer = lr.officer;
    
    // จำนวน action ขึ้นอยู่กับ daysOverdue จริงๆ ไม่ใช่ scenario
    let numActions = 1;
    if (sr.daysOverdue >= 90) {
      numActions = randomBetween(4, 6); // NPL level
    } else if (sr.daysOverdue >= 30) {
      numActions = randomBetween(2, 4); // Medium overdue
    } else {
      numActions = randomBetween(1, 2); // Early overdue
    }

    for (let j = 0; j < numActions; j++) {
      const actionDate = addDays(sr.paymentDate, randomBetween(sr.daysOverdue / 2, sr.daysOverdue));
      if (actionDate > currentDate) continue;

      const priority = sr.daysOverdue >= 90 ? 'HIGH' : sr.daysOverdue >= 30 ? 'MEDIUM' : 'LOW';

      const action = await prisma.collectionAction.create({
        data: {
          customerId: lr.customerId,
          loanId: lr.id,
          scheduleId: sr.id,
          actionType: actionTypes[j % actionTypes.length] as any,
          agentId: officer.id,
          status: 'COMPLETED',
          priority: priority as any,
          notes: `การติดตาม ${actionTypes[j % actionTypes.length]} ครั้งที่ ${j + 1} — ${cd.businessName} (ค้าง ${sr.daysOverdue} วัน)`,
          result:
            j < numActions - 1
              ? 'NO_RESPONSE'
              : sr.daysOverdue >= 90
              ? 'NO_RESPONSE'
              : Math.random() < 0.3
              ? 'PAYMENT_PROMISE'
              : 'NO_RESPONSE',
          followUpDate: addDays(actionDate, randomBetween(7, 30)),
          completedAt: actionDate,
        },
      });
      createdCollectionActions.push(action);
    }
  }

  console.log(`  → Collection actions: ${createdCollectionActions.length}`);

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  const totalLoanAmount = createdLoans.reduce(
    (s, l) => s + Number(l.principal),
    0
  );
  const totalDisbursed = createdDisbursements.reduce(
    (s, d) => s + Number(d.amount),
    0
  );
  const totalPaymentsReceived = createdPayments.reduce(
    (s, p) => s + Number(p.amount),
    0
  );

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Seed Summary');
  console.log('═'.repeat(60));
  console.log(`  Admin users        : 1`);
  console.log(`  Branches           : ${createdBranches.length}`);
  console.log(`  Staff (mgr+officer): ${createdUsers.length}`);
  console.log(`  Customers          : ${createdCustomers.length}`);
  console.log(`  Loan products      : ${createdProducts.length}`);
  console.log(`  Product budgets    : ${productBudgets.length}`);
  console.log(`  Penalty rules      : ${penaltyRules.length}`);
  console.log(`  Loan contracts     : ${createdLoans.length}`);
  console.log(`  Disbursements      : ${createdDisbursements.length}`);
  console.log(`  Payment schedules  : ${createdSchedules.length}`);
  console.log(`  Payment records    : ${createdPayments.length}`);
  console.log(`  Collection actions : ${createdCollectionActions.length}`);
  console.log('─'.repeat(60));
  console.log(`  Total loan amount  : ${totalLoanAmount.toLocaleString()} THB`);
  console.log(`  Total disbursed    : ${totalDisbursed.toLocaleString()} THB`);
  console.log(`  Total received     : ${totalPaymentsReceived.toLocaleString()} THB`);
  console.log(
    `  Outstanding        : ${(totalDisbursed - totalPaymentsReceived).toLocaleString()} THB`
  );
  console.log('─'.repeat(60));

  // Scenario breakdown
  const scenarioCount = createdCustomers.reduce((acc, c) => {
    const s = c.scenario.scenario as string;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('  Customer scenarios:');
  for (const [scenario, count] of Object.entries(scenarioCount)) {
    console.log(`    ${scenario.padEnd(18)}: ${count}`);
  }

  // Schedule status breakdown
  const statusCount = createdSchedules.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('  Schedule statuses:');
  for (const [status, count] of Object.entries(statusCount)) {
    console.log(`    ${status.padEnd(18)}: ${count}`);
  }

  console.log('═'.repeat(60));
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Fixes applied:');
  console.log('  ✅ งวดแรก = วันที่ 1 ของเดือนถัดจากวันเบิกจ่ายเสมอ');
  console.log('  ✅ NPL จะเป็น OVERDUE ก็ต่อเมื่อค้างชำระ >= 90 วันจริงๆ');
  console.log('  ✅ applicationMonth ของ NPL ≤ 12 (loan เริ่มก่อน currentDate)');
  console.log('  ✅ สร้าง schedule ทุกงวดตลอด term (ไม่ break กลาง loop)');
  console.log('  ✅ Update loan.outstandingBalance หลังรับ payment');
  console.log('  ✅ Update schedule.paidAmount หลังรับ payment');
  console.log('  ✅ Collection actions filter จาก actual overdue status');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  try {
    await seedCompleteSystem2025();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule =
  process.argv[1] &&
  process.argv[1].endsWith('seed-complete-system-2025.ts');

if (isMainModule) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedCompleteSystem2025 };
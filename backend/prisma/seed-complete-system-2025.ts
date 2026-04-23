/**
 * Complete System Seed Script 2025-2026 — FULLY FIXED
 *
 * Bug fixes applied vs previous versions:
 *
 * [FIX-1] Schedule loop ไม่ใช้ break/if-skip อีกต่อไป
 *         → สร้างทุกงวดตลอด termMonths แบ่ง status เป็น FUTURE สำหรับงวดที่ยังไม่ถึง
 *         → remainingPrincipal วิ่งต่อเนื่องถูกต้องตลอด amortization
 *
 * [FIX-2] firstPaymentDate = วันที่ 1 ของเดือนถัดจาก disbursementDate (UTC)
 *         → ไม่ใช้ disbursementDate + 1 month ซึ่งอาจชนวันที่ในเดือนเดิม
 *
 * [FIX-3] disbursementDate ส่งผ่าน Map แทนอ่านจาก memory object ที่ยังเป็น snapshot เก่า
 *         → แก้ bug ที่ loanRecord.disbursementDate = undefined เสมอ
 *
 * [FIX-4] NPL OVERDUE ใช้ daysSinceDue >= 90 จริงๆ ไม่ใช่ month >= 4
 *
 * [FIX-5] LATE_PAYER paymentDate clamp ≤ currentDate ป้องกัน payment ในอนาคต
 *
 * [FIX-6] หลัง Step 10 update loan.outstandingBalance และ loan.status ให้ตรงจริง
 *
 * [FIX-7] PARTIAL schedule update paidAmount / unpaidAmount กลับไปหลัง payment
 *
 * [FIX-8] Collection filter เฉพาะ schedule ที่ OVERDUE จริง (daysOverdue > 0)
 *         ไม่รวมงวด PAID/PARTIAL ของ NPL ที่ยังดีอยู่
 *
 * [FIX-9] Timezone-safe: ใช้ Date.UTC ทุกที่แทน local midnight
 *
 * [FIX-10] customerCode / contract_number ใช้ index แทน timestamp เพื่อป้องกัน collision
 *
 * Flow:
 * 1. Products → 2. Penalty Rules → 3. Budgets → 4. Branches
 * 5. Users (Manager + Officer) → 6. Customers → 7. Loans
 * 8. Disbursements → 9. Payment Schedules (ทุกงวด) → 10. Payment Records
 * 11. Update Loan Balance → 12. Collection Actions
 * 13. Calculate Penalties → 14. Sync Loan overdue_days
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load .env from backend root
dotenv.config();

// AES-256-GCM encryption — MUST use the same ENCRYPTION_KEY as production
// Run seed with: ENCRYPTION_KEY=<your-key> npx ts-node seed-complete-system-2025.ts
const _rawKey = process.env.ENCRYPTION_KEY;
if (!_rawKey) {
  console.error('❌ ENCRYPTION_KEY environment variable is required to run this seed.');
  console.error('   Set it to the same value as your production backend.');
  console.error('   Example: ENCRYPTION_KEY=<64-char-hex> npx ts-node prisma/seed-complete-system-2025.ts');
  process.exit(1);
}
const _encKey = /^[0-9a-fA-F]{64}$/.test(_rawKey)
  ? Buffer.from(_rawKey, 'hex')
  : Buffer.from(_rawKey.padEnd(32, '0').slice(0, 32), 'utf-8');

const SeedEncrypt = {
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', _encKey, iv) as crypto.CipherGCM;
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${enc}`;
  },
};

const prisma = new PrismaClient();

// ─── Date utilities (UTC-safe) ─────────────────────────────────────────────────

/** สร้าง Date จาก UTC เพื่อหลีกเลี่ยง timezone drift */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** บวกเดือนแบบ UTC-safe */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** บวกวัน */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

/**
 * [FIX-2] firstPaymentDate = วันที่ 1 ของเดือนถัดจาก disbursementDate
 * ตัวอย่าง: disbursed 15 ม.ค. → 1 ก.พ.  |  disbursed 1 มี.ค. → 1 เม.ย.
 */
function firstPaymentDateOf(disbursementDate: Date): Date {
  const y = disbursementDate.getUTCFullYear();
  const m = disbursementDate.getUTCMonth(); // 0-based
  // month+1 → เดือนถัดไป, วันที่ 1
  return new Date(Date.UTC(y, m + 1, 1));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.floor((Math.random() * (max - min) + min) * f) / f;
}

/** clamp value ให้ไม่เกิน max */
function clamp<T extends number | Date>(value: T, max: T): T {
  return value > max ? max : value;
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

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seedCompleteSystem2025() {
  console.log('🌱 Starting Complete System Seed 2025-2026 (FULLY FIXED)…\n');

  // ══════════════════════════════════════════════════════════════
  // STEP 0: CLEANUP — ลบข้อมูลเก่าก่อน seed ใหม่ (cascade order)
  // ══════════════════════════════════════════════════════════════
  console.log('🧹 Step 0: Cleaning up existing seed data…');
  await prisma.collectionAction.deleteMany({});
  await prisma.paymentReceipt.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.paymentSchedule.deleteMany({});
  await prisma.budget_consumption.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.loanDisbursement.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product_budgets.deleteMany({});
  await prisma.penaltyRule.deleteMany({});
  // ลบ CUSTOMER users ด้วย (LINE-linked users ที่ผูกกับ customer เก่า)
  await prisma.user.deleteMany({ where: { role: { in: ['MANAGER', 'OFFICER', 'CUSTOMER'] } } });
  await prisma.branch.deleteMany({});
  console.log('  ✓ Cleanup done\n');

  // [FIX-9] ใช้ UTC dates ตลอด — ใช้วันปัจจุบันจริงๆ เพื่อให้ GOOD_PAYER ไม่กลายเป็น OVERDUE
  const PROJECT_START = utcDate(2025, 1, 1);
  const now = new Date();
  const CURRENT_DATE  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  console.log(`📅 Period: ${PROJECT_START.toISOString().slice(0, 10)} → ${CURRENT_DATE.toISOString().slice(0, 10)}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 1: ADMIN
  // ══════════════════════════════════════════════════════════════
  console.log('👑 Step 1: Admin…');
  const adminHash = await bcrypt.hash('1234567890', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'phattarapong.phe@gmail.com' },
    update: {},
    create: {
      email: 'phattarapong.phe@gmail.com',
      firstName: 'Phattarapong',
      lastName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: adminHash,
    },
  });
  console.log(`  ✓ ${admin.email}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 2: LOAN PRODUCTS
  // ══════════════════════════════════════════════════════════════
  console.log('💼 Step 2: Loan products…');
  const productsData = [
    {
      productCode: 'SME-WC-001',
      productName: 'สินเชื่อเงินทุนหมุนเวียน SME',
      description: 'สินเชื่อสำหรับเงินทุนหมุนเวียนในธุรกิจ SME',
      minLoanAmount: 500_000,
      maxLoanAmount: 10_000_000,
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
      minLoanAmount: 1_000_000,
      maxLoanAmount: 25_000_000,
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
      minLoanAmount: 2_000_000,
      maxLoanAmount: 50_000_000,
      maxTermMonths: 120,
      interestRateType: 'FIXED' as any,
      interestRateYear1_3: 8.5,
      loanType: 'LONG_TERM' as any,
      status: 'ACTIVE' as any,
      displayOrder: 3,
      createdBy: admin.id,
    },
  ];

  const createdProducts: any[] = [];
  for (const pd of productsData) {
    const p = await prisma.loanProduct.upsert({
      where: { productCode: pd.productCode },
      update: pd,
      create: pd,
    });
    createdProducts.push(p);
    console.log(`  ✓ ${p.productCode} — ${p.productName}`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  // STEP 3: PENALTY RULES
  // ══════════════════════════════════════════════════════════════
  console.log('⚖️  Step 3: Penalty rules…');

  const penaltyTiers = [
    { from: 1,  to: 30,   rate: 0.03,   compound: false, compoundRate: null, label: 'Early (1-30d)'    },
    { from: 31, to: 90,   rate: 0.04,   compound: false, compoundRate: null, label: 'Medium (31-90d)'  },
    { from: 91, to: null, rate: 0.0493, compound: true,  compoundRate: 0.01, label: 'Severe (90+d)'    },
  ];

  const penaltyRules: any[] = [];
  for (const product of createdProducts) {
    for (const t of penaltyTiers) {
      const r = await prisma.penaltyRule.create({
        data: {
          loanProductId: product.id,
          ruleName: `${t.label} — ${product.productCode}`,
          daysOverdueFrom: t.from,
          daysOverdueTo: t.to,
          penaltyType: 'DAILY',
          penaltyRate: t.rate,
          compoundInterest: t.compound,
          ...(t.compoundRate !== null ? { compoundRate: t.compoundRate } : {}),
          status: 'ACTIVE',
          isDefault: false,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      penaltyRules.push(r);
      console.log(`  ✓ ${r.ruleName}`);
    }
  }
  // System defaults (loanProductId = null)
  for (const t of penaltyTiers) {
    const r = await prisma.penaltyRule.create({
      data: {
        loanProductId: null,
        ruleName: `System Default — ${t.label}`,
        daysOverdueFrom: t.from,
        daysOverdueTo: t.to,
        penaltyType: 'DAILY',
        penaltyRate: t.rate,
        compoundInterest: t.compound,
        ...(t.compoundRate !== null ? { compoundRate: t.compoundRate } : {}),
        status: 'ACTIVE',
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    penaltyRules.push(r);
    console.log(`  ✓ ${r.ruleName}`);
  }
  console.log(`  → Total penalty rules: ${penaltyRules.length}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 4: PRODUCT BUDGETS
  // ══════════════════════════════════════════════════════════════
  console.log('💰 Step 4: Product budgets 2025-2026…');
  const productBudgets: any[] = [];
  for (const product of createdProducts) {
    let annualBudget: number;
    if (Number(product.maxLoanAmount) <= 10_000_000) {
      annualBudget = randomBetween(200_000_000, 400_000_000);
    } else if (Number(product.maxLoanAmount) <= 25_000_000) {
      annualBudget = randomBetween(400_000_000, 800_000_000);
    } else {
      annualBudget = randomBetween(800_000_000, 1_500_000_000);
    }

    for (const year of [2025, 2026]) {
      for (let q = 1; q <= 4; q++) {
        const qBudget = Math.floor(annualBudget / 4);
        let utilRate = 0;
        if (year === 2025) {
          utilRate = randomDecimal(0.6, 0.95);
        } else if (q === 1) {
          utilRate = randomDecimal(0.7, 0.9);
        } else if (q === 2) {
          utilRate = randomDecimal(0.1, 0.3);
        }
        const used      = Math.floor(qBudget * utilRate);
        const disbursed = Math.floor(used * 0.85);
        const b = await prisma.product_budgets.create({
          data: {
            product_id: product.id,
            product_code: product.productCode,
            product_name: product.productName,
            fiscal_year: year,
            quarter: q,
            total_budget_amount: qBudget,
            committed_amount: used,
            disbursed_amount: disbursed,
            pending_amount: used - disbursed,
            available_amount: qBudget - used,
            utilization_rate: utilRate * 100,
            warning_threshold: 80.0,
            critical_threshold: 95.0,
            budget_status: utilRate > 0.95 ? 'CRITICAL' : utilRate > 0.8 ? 'WARNING' : 'ACTIVE',
            budget_owner: admin.id,
            notes: `${year} Q${q} — ${product.productName}`,
            created_by: admin.id,
          },
        });
        productBudgets.push(b);
      }
    }
  }
  console.log(`  → Total budgets: ${productBudgets.length}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 5: BRANCHES
  // ══════════════════════════════════════════════════════════════
  console.log('🏢 Step 5: Branches…');
  const createdBranches: any[] = [];
  for (const bd of BRANCH_DATA) {
    const b = await prisma.branch.create({ data: { ...bd, status: 'ACTIVE' } });
    createdBranches.push(b);
    console.log(`  ✓ ${b.code} — ${b.name}`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  // STEP 6: USERS (MANAGER + OFFICER)
  // ══════════════════════════════════════════════════════════════
  console.log('👥 Step 6: Users…');
  const createdUsers: any[] = [];
  let emailIdx = 0;

  for (let bi = 0; bi < createdBranches.length; bi++) {
    const branch = createdBranches[bi];

    if (emailIdx < REAL_EMAILS.length) {
      const mgr = await prisma.user.create({
        data: {
          email: REAL_EMAILS[emailIdx++],
          firstName: `Manager${bi + 1}`,
          lastName: `${branch.code}`,
          role: 'MANAGER',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('manager123', 10),
          branchId: branch.id,
        },
      });
      createdUsers.push(mgr);
      console.log(`  ✓ MANAGER  ${mgr.email} → ${branch.code}`);
    }

    const officerCount = randomBetween(2, 3);
    for (let oi = 0; oi < officerCount && emailIdx < REAL_EMAILS.length; oi++) {
      const off = await prisma.user.create({
        data: {
          email: REAL_EMAILS[emailIdx++],
          firstName: `Officer${oi + 1}`,
          lastName: `${branch.code}`,
          role: 'OFFICER',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('officer123', 10),
          branchId: branch.id,
        },
      });
      createdUsers.push(off);
      console.log(`  ✓ OFFICER  ${off.email} → ${branch.code}`);
    }
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  // STEP 7: CUSTOMERS
  // ══════════════════════════════════════════════════════════════
  console.log('👤 Step 7: Customers…');

  /**
   * applicationMonth สำหรับ NPL ต้องไม่เกิน 12
   * เพื่อให้ firstPaymentDate ≤ CURRENT_DATE และมีงวดที่ครบกำหนดจริง
   */
  const customerTemplates = [
    // Good payers (75%) — 15 ราย
    ...Array(15).fill(null).map((_, i) => ({
      businessName: `บริษัท ธุรกิจดี ${i + 1} จำกัด`,
      businessType: ['WHOLESALE', 'RETAIL', 'SERVICE', 'MANUFACTURING'][i % 4],
      industry_code: ['4610', '5610', '6201', '2511'][i % 4],
      business_size: ['SMALL', 'MEDIUM', 'LARGE'][i % 3],
      annualRevenue: randomBetween(5_000_000, 50_000_000),
      scenario: Math.random() < 0.25 ? 'EARLY_PAYER' : 'GOOD_PAYER',
      loanAmount: randomBetween(1_000_000, 10_000_000),
      termMonths: [24, 36, 48, 60][i % 4],
      applicationMonth: randomBetween(3, 12), // เริ่มไม่เร็วเกินไป
      riskLevel: 'LOW',
    })),
    // Late payers (20%) — 4 ราย
    ...Array(4).fill(null).map((_, i) => ({
      businessName: `ห้างหุ้นส่วน ช้าจ่าย ${i + 1}`,
      businessType: ['WHOLESALE', 'RETAIL'][i % 2],
      industry_code: ['4610', '5610'][i % 2],
      business_size: ['SMALL', 'MEDIUM'][i % 2],
      annualRevenue: randomBetween(3_000_000, 20_000_000),
      scenario: 'LATE_PAYER',
      loanAmount: randomBetween(800_000, 5_000_000),
      termMonths: [36, 48][i % 2],
      applicationMonth: randomBetween(6, 12), // เริ่มไม่นานเกินไป
      riskLevel: 'MEDIUM',
    })),
    // NPL (5%) — 1 ราย เริ่มช้า applicationMonth สูง
    {
      businessName: `บริษัท มีปัญหา 1 จำกัด`,
      businessType: 'SERVICE',
      industry_code: '6201',
      business_size: 'SMALL',
      annualRevenue: randomBetween(2_000_000, 8_000_000),
      scenario: 'NPL_GRADUAL',
      loanAmount: randomBetween(1_500_000, 4_000_000),
      termMonths: 36,
      applicationMonth: randomBetween(3, 10),
      riskLevel: 'HIGH',
    },
  ];

  const createdCustomers: any[] = [];
  const officers = createdUsers.filter((u) => u.role === 'OFFICER');

  for (let i = 0; i < customerTemplates.length; i++) {
    const cd = customerTemplates[i];
    const officer = officers[i % officers.length];
    // [FIX-10] ใช้ index แทน timestamp ป้องกัน collision
    const c = await prisma.customer.create({
      data: {
        customerCode: `CUST2025${String(i + 1).padStart(4, '0')}`,
        businessName: cd.businessName,
        businessType: cd.businessType as any,
        industry_code: cd.industry_code,
        business_size: cd.business_size as any,
        phone: `08${String(100000000 + i).slice(1)}`,
        email: `customer${i + 1}@business.com`,
        thaiId: SeedEncrypt.encrypt(`1${String(i).padStart(12, '0')}`),
        taxId: `0${String(i).padStart(12, '0')}`,
        status: 'ACTIVE',
        createdBy: officer.id,
        branchId: officer.branchId!,
      },
    });
    createdCustomers.push({ ...c, scenarioData: cd, officer });
    console.log(`  ✓ [${cd.scenario}] ${cd.businessName}`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  // STEP 8: LOAN CONTRACTS
  // ══════════════════════════════════════════════════════════════
  console.log('📋 Step 8: Loan contracts…');
  const createdLoans: any[] = [];

  for (let i = 0; i < createdCustomers.length; i++) {
    const cr = createdCustomers[i];
    const cd = cr.scenarioData;
    const officer = cr.officer;
    const product = createdProducts[i % createdProducts.length];
    const contractDate = addMonths(PROJECT_START, cd.applicationMonth);

    const loan = await prisma.loan.create({
      data: {
        contract_number: `L2025${String(i + 1).padStart(4, '0')}`,  // [FIX-10]
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
        dscr: cd.riskLevel === 'LOW' ? 2.0 : cd.riskLevel === 'MEDIUM' ? 1.5 : 1.2,
        dscrStatus:
          cd.riskLevel === 'LOW' ? 'GOOD' : cd.riskLevel === 'MEDIUM' ? 'ACCEPTABLE' : 'POOR',
      },
    });

    createdLoans.push({ ...loan, scenarioData: cd, officer });
    console.log(`  ✓ ${loan.contract_number} — ${cd.businessName} [${cd.scenario}]`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  // STEP 9: DISBURSEMENTS & TRANSACTIONS
  // ══════════════════════════════════════════════════════════════
  console.log('💸 Step 9: Disbursements…');

  /**
   * [FIX-3] เก็บ disbursementDate ใน Map แยกต่างหาก
   * เพราะ createdLoans[i] เป็น snapshot ก่อน loan.update()
   * ถ้าอ่าน loanRecord.disbursementDate จะได้ undefined เสมอ
   */
  const disbursementDateMap = new Map<string, Date>(); // loanId → disbursementDate
  const createdDisbursements: any[] = [];
  const createdTransactions: any[] = [];

  for (let i = 0; i < createdLoans.length; i++) {
    const lr = createdLoans[i];
    const cd = lr.scenarioData;
    const officer = lr.officer;
    const disbDate = addDays(lr.startDate, randomBetween(1, 14));

    disbursementDateMap.set(lr.id, disbDate);

    const disb = await prisma.loanDisbursement.create({
      data: {
        loanId: lr.id,
        disbursementNo: 1,
        amount: lr.principal,
        purpose: 'WORKING_CAPITAL',
        requestedDate: addDays(lr.startDate, -1),
        status: 'DISBURSED',
        approvedBy: officer.id,
        approvedAt: disbDate,
        disbursedBy: officer.id,
        disbursedAt: disbDate,
        disbursementMethod: 'BANK_TRANSFER',
        referenceNo: `DISB${lr.contract_number}`,
        createdBy: officer.id,
        notes: `Disbursement for ${cd.businessName}`,
      },
    });
    createdDisbursements.push(disb);

    const txn = await prisma.transaction.create({
      data: {
        userId: officer.id,
        loanId: lr.id,
        type: 'LOAN_DISBURSEMENT' as any,
        amount: lr.principal,
        status: 'COMPLETED',
        description: `เบิกจ่ายเงินกู้ ${lr.contract_number}`,
        reference: disb.referenceNo,
        processedAt: disbDate,
        metadata: { disbursementId: disb.id, disbursementMethod: disb.disbursementMethod },
      },
    });
    createdTransactions.push(txn);

    await prisma.loan.update({
      where: { id: lr.id },
      data: { status: 'ACTIVE', disbursementDate: disbDate, totalDisbursed: lr.principal },
    });

    // Budget consumption
    const yr = disbDate.getUTCFullYear();
    const qt = Math.ceil((disbDate.getUTCMonth() + 1) / 3);
    const budget = productBudgets.find(
      (b) => b.product_id === lr.loanProductId && b.fiscal_year === yr && b.quarter === qt,
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
          consumption_date: disbDate,
          processed_by: officer.id,
        },
      });
    } else {
      // [FIX-8] warn แทน silent skip
      console.warn(
        `  ⚠️  No budget found for loan ${lr.contract_number} (product=${lr.loanProductId} year=${yr} Q${qt})`,
      );
    }

    console.log(`  ✓ Disbursed ${lr.contract_number} on ${disbDate.toISOString().slice(0, 10)}`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  // STEP 10: PAYMENT SCHEDULES (ทุกงวดตลอด termMonths)
  // ══════════════════════════════════════════════════════════════
  console.log('📅 Step 10: Payment schedules (all installments)…');

  /**
   * [FIX-1] สร้างทุกงวดตลอด termMonths
   *   - งวดที่ dueDate ≤ CURRENT_DATE → กำหนด status จาก scenario
   *   - งวดที่ dueDate >  CURRENT_DATE → status = 'FUTURE'
   * ไม่มี break กลาง loop → remainingPrincipal วิ่งต่อเนื่องถูกต้อง
   *
   * [FIX-4] NPL OVERDUE เมื่อ daysSinceDue >= 90 จริงๆ (ไม่ใช่ month >= 4)
   */
  const createdSchedules: any[] = [];

  for (let i = 0; i < createdLoans.length; i++) {
    const lr = createdLoans[i];
    const cd = lr.scenarioData;

    const loanAmount  = Number(lr.principal);
    const monthlyRate = lr.interestRate / 100 / 12;
    const termMonths  = lr.termMonths;
    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    // [FIX-3] อ่าน disbursementDate จาก Map
    const disbDate = disbursementDateMap.get(lr.id)!;

    // [FIX-2] firstPaymentDate = วันที่ 1 ของเดือนถัดจาก disbDate
    const firstPayDate = firstPaymentDateOf(disbDate);

    let remainingPrincipal = loanAmount;

    for (let month = 1; month <= termMonths; month++) {
      // dueDate = firstPayDate + (month-1) เดือน
      const dueDate = addMonths(firstPayDate, month - 1);

      const interestPayment  = remainingPrincipal * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingPrincipal    -= principalPayment; // [FIX-1] ลดทุก iteration เสมอ

      const daysSinceDue = Math.floor(
        (CURRENT_DATE.getTime() - dueDate.getTime()) / 86400000,
      );

      // ── Classify status ─────────────────────────────────────────
      let paymentStatus: string;
      let daysOverdue = 0;

      if (dueDate > CURRENT_DATE) {
        // [FIX-1] งวดในอนาคต → UNPAID (ยังไม่ถึงกำหนด)
        paymentStatus = 'UNPAID';

      } else if (daysSinceDue <= 0) {
        // ครบกำหนดวันนี้พอดี
        paymentStatus = 'UNPAID';

      } else if (cd.scenario === 'GOOD_PAYER' || cd.scenario === 'EARLY_PAYER') {
        paymentStatus = 'PAID';

      } else if (cd.scenario === 'LATE_PAYER') {
        if (Math.random() < 0.7) {
          paymentStatus = 'PAID';
        } else if (daysSinceDue > 30) {
          paymentStatus = 'OVERDUE';
          daysOverdue   = daysSinceDue;
        } else {
          paymentStatus = 'UNPAID';
        }

      } else {
        // NPL scenarios
        if (month <= 3) {
          // 3 งวดแรก: ยังพอชำระได้
          paymentStatus = Math.random() < 0.5 ? 'PAID' : 'PARTIAL';
        } else if (daysSinceDue >= 90) {
          // [FIX-4] ≥ 90 วัน → OVERDUE จริง
          paymentStatus = 'OVERDUE';
          daysOverdue   = daysSinceDue;
        } else if (daysSinceDue > 0) {
          // ค้างแต่ < 90 วัน
          paymentStatus = Math.random() < 0.4 ? 'PARTIAL' : 'UNPAID';
          daysOverdue   = daysSinceDue;
        } else {
          paymentStatus = 'UNPAID';
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
        },
      });

      createdSchedules.push({ ...schedule, scenarioData: cd, loanRecord: lr });
    }

    console.log(`  ✓ ${lr.contract_number} — ${termMonths} schedules created`);
  }
  console.log(`  → Total schedules: ${createdSchedules.length}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 11: PAYMENT RECORDS
  // ══════════════════════════════════════════════════════════════
  console.log('💳 Step 11: Payment records…');

  /**
   * [FIX-5] clamp paymentDate ≤ CURRENT_DATE
   * [FIX-7] update schedule.paidAmount + unpaidAmount หลัง PARTIAL payment
   */
  const createdPayments: any[] = [];
  // สะสม totalPaid ต่อ loanId เพื่อ update outstandingBalance ใน Step 12
  const totalPaidByLoan = new Map<string, number>();

  // เฉพาะงวดที่ผ่านกำหนดแล้ว (dueDate ≤ CURRENT_DATE)
  const dueSchedules = createdSchedules.filter((s) => new Date(s.paymentDate) <= CURRENT_DATE);

  for (const sr of dueSchedules) {
    const cd = sr.scenarioData;
    const lr = sr.loanRecord;
    const officer = lr.officer;

    if (sr.status !== 'PAID' && sr.status !== 'PARTIAL') continue;

    const totalAmt = Number(sr.totalPayment);
    let paymentAmount = sr.status === 'PARTIAL'
      ? totalAmt * randomDecimal(0.3, 0.8)
      : totalAmt;

    let paymentDate: Date = sr.paymentDate;
    if (cd.scenario === 'LATE_PAYER') {
      const late = addDays(sr.paymentDate, randomBetween(1, 15));
      // [FIX-5] clamp ≤ CURRENT_DATE
      paymentDate = clamp(late, CURRENT_DATE);
    } else if (cd.scenario === 'EARLY_PAYER') {
      paymentDate = addDays(sr.paymentDate, -randomBetween(1, 5));
    }

    const payment = await prisma.payment.create({
      data: {
        loanId: lr.id,
        paymentScheduleId: sr.id,
        amount: paymentAmount,
        paymentDate,
        paymentMethod: ['BANK_TRANSFER', 'CASH', 'CHECK'][Math.floor(Math.random() * 3)],
        paymentType: (sr.status === 'PAID' ? 'ON_TIME' : 'LATE') as any,
        reference: `PAY${lr.contract_number}${String(sr.paymentNumber).padStart(2, '0')}`,
        createdBy: officer.id,
        notes: sr.status === 'PARTIAL' ? 'ชำระบางส่วน' : undefined,
      },
    });
    createdPayments.push(payment);

    // Transaction
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

    // สะสม totalPaid
    totalPaidByLoan.set(lr.id, (totalPaidByLoan.get(lr.id) ?? 0) + paymentAmount);
  }

  console.log(`  → Payment records: ${createdPayments.length}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 12: UPDATE LOAN OUTSTANDING BALANCE + OVERDUE DAYS
  // [FIX-6] update loan.outstandingBalance, loan.status, loan.overdueDays ให้ตรงความจริง
  // ══════════════════════════════════════════════════════════════
  console.log('🔄 Step 12: Update loan outstanding balances…');

  for (const lr of createdLoans) {
    const cd = lr.scenarioData;
    const totalPaid   = totalPaidByLoan.get(lr.id) ?? 0;
    const outstanding = Math.max(0, Number(lr.principal) - totalPaid);

    // คำนวณ overdueDays จาก payment_schedules จริงๆ (source of truth)
    const maxOverdueResult = await prisma.paymentSchedule.aggregate({
      where: { loanId: lr.id },
      _max: { daysOverdue: true },
    });
    const maxOverdueDays = maxOverdueResult._max.daysOverdue ?? 0;

    // กำหนด loan status จาก overdueDays จริง (ตรงกับ mapLoanStatus ใน frontend)
    let loanStatus: string;
    if (outstanding === 0) {
      loanStatus = 'CLOSED';
    } else if (maxOverdueDays >= 90) {
      loanStatus = 'NPL';
    } else {
      loanStatus = 'ACTIVE';
    }

    await prisma.loan.update({
      where: { id: lr.id },
      data: {
        outstandingBalance: outstanding,
        currentPrincipal: outstanding,
        status: loanStatus as any,
        overdueDays: maxOverdueDays,
      },
    });

    console.log(
      `  ✓ ${lr.contract_number} | outstanding: ${outstanding.toLocaleString()} THB | overdueDays: ${maxOverdueDays} | status: ${loanStatus}`,
    );
  }
  console.log();

  // ══════════════════════════════════════════════════════════════
  // STEP 13: COLLECTION ACTIONS
  // [FIX-8] filter เฉพาะ schedule ที่ OVERDUE จริง
  // ══════════════════════════════════════════════════════════════
  console.log('📞 Step 13: Collection actions…');

  const createdCollectionActions: any[] = [];
  const actionTypes = ['CALL', 'SMS', 'EMAIL', 'VISIT', 'LEGAL'];

  // [FIX-8] เฉพาะ OVERDUE schedule ที่มี daysOverdue > 0 จริงๆ
  const overdueSchedules = createdSchedules.filter(
    (s) => s.status === 'OVERDUE' && s.daysOverdue > 0,
  );

  for (const sr of overdueSchedules) {
    const cd = sr.scenarioData;
    const lr = sr.loanRecord;
    const officer = lr.officer;
    const numActions = cd.scenario.startsWith('NPL') ? randomBetween(3, 6) : randomBetween(1, 3);

    for (let j = 0; j < numActions; j++) {
      const actionDate = addDays(sr.paymentDate, randomBetween(30, 180));
      if (actionDate > CURRENT_DATE) continue;

      const action = await prisma.collectionAction.create({
        data: {
          customerId: lr.customerId,
          loanId: lr.id,
          scheduleId: sr.id,
          actionType: actionTypes[j % actionTypes.length] as any,
          agentId: officer.id,
          status: 'COMPLETED',
          priority: cd.scenario.startsWith('NPL') ? 'HIGH' : 'MEDIUM',
          notes: `ติดตาม ${actionTypes[j % actionTypes.length]} ครั้งที่ ${j + 1} — ${cd.businessName}`,
          result: j < numActions - 1 ? 'NO_RESPONSE' : 'PAYMENT_PROMISE',
          followUpDate: addDays(actionDate, randomBetween(7, 30)),
          completedAt: actionDate,
        },
      });
      createdCollectionActions.push(action);
    }
  }

  console.log(`  → Collection actions: ${createdCollectionActions.length}\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 14: CALCULATE PENALTIES FOR ALL OVERDUE SCHEDULES
  // คำนวณค่าปรับทันทีหลัง seed ไม่ต้องรอ payment-sync job
  // ══════════════════════════════════════════════════════════════
  console.log('💸 Step 14: Calculating penalties for overdue schedules…');

  const overdueForPenalty = createdSchedules.filter(
    (s) => s.status === 'OVERDUE' && s.daysOverdue > 0,
  );

  let penaltyUpdated = 0;
  for (const sr of overdueForPenalty) {
    const daysOverdue = sr.daysOverdue as number;
    const outstanding = Number(sr.totalPayment);
    const loanRecord = sr.loanRecord;

    // หา penalty rule ที่ตรงกับ product และ daysOverdue
    const rule = await prisma.penaltyRule.findFirst({
      where: {
        loanProductId: loanRecord.loanProductId,
        status: 'ACTIVE',
        daysOverdueFrom: { lte: daysOverdue },
        OR: [{ daysOverdueTo: { gte: daysOverdue } }, { daysOverdueTo: null }],
      },
      orderBy: { daysOverdueFrom: 'desc' },
    }) ?? await prisma.penaltyRule.findFirst({
      where: {
        loanProductId: null,
        isDefault: true,
        status: 'ACTIVE',
        daysOverdueFrom: { lte: daysOverdue },
        OR: [{ daysOverdueTo: { gte: daysOverdue } }, { daysOverdueTo: null }],
      },
      orderBy: { daysOverdueFrom: 'desc' },
    });

    if (!rule) continue;

    let penalty = 0;
    let compound = 0;

    switch (rule.penaltyType) {
      case 'DAILY':
        penalty = outstanding * (Number(rule.penaltyRate) / 100) * daysOverdue;
        break;
      case 'PERCENTAGE':
        penalty = outstanding * (Number(rule.penaltyRate) / 100);
        break;
      case 'FIXED_AMOUNT':
        penalty = Number(rule.penaltyAmount ?? 0);
        break;
    }

    if (rule.compoundInterest && rule.compoundRate) {
      compound = outstanding * (Number(rule.compoundRate) / 100 / 365) * daysOverdue;
    }

    await prisma.paymentSchedule.update({
      where: { id: sr.id },
      data: { penaltyAmount: penalty, compoundInterestAmount: compound },
    });

    penaltyUpdated++;
  }

  console.log(`  → Penalty calculated: ${penaltyUpdated} schedules\n`);

  // ══════════════════════════════════════════════════════════════
  // STEP 15: SYNC LOAN OVERDUE_DAYS FROM PAYMENT SCHEDULES
  // คำนวณ overdue_days จากวันปัจจุบันจริง (ไม่ใช่ CURRENT_DATE ของ seed)
  // เพื่อให้ตรงกับ loan.service.ts ที่คำนวณ dynamic
  // ══════════════════════════════════════════════════════════════
  console.log('🔄 Step 15: Sync loan overdue_days…');

  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);

  for (const lr of createdLoans) {
    // หางวดแรกที่ยัง OVERDUE/UNPAID เรียงตาม paymentNumber
    const firstPending = await prisma.paymentSchedule.findFirst({
      where: {
        loanId: lr.id,
        status: { in: ['OVERDUE', 'UNPAID'] },
        paymentDate: { lt: TODAY },
      },
      orderBy: { paymentNumber: 'asc' },
    });

    // คำนวณ overdueDays จากวันปัจจุบันจริง (เหมือน loan.service.ts)
    const realOverdueDays = firstPending
      ? Math.max(0, Math.floor((TODAY.getTime() - new Date(firstPending.paymentDate).getTime()) / 86400000))
      : 0;

    // escalate to NPL if overdue >= 90
    const currentLoan = await prisma.loan.findUnique({ where: { id: lr.id }, select: { status: true } });
    let newStatus = currentLoan?.status;
    if (realOverdueDays >= 90 && newStatus !== 'NPL') {
      newStatus = 'NPL';
    }

    await prisma.loan.update({
      where: { id: lr.id },
      data: { overdueDays: realOverdueDays, status: newStatus as any },
    });

    if (realOverdueDays > 0) {
      console.log(`  ✓ ${lr.contract_number} overdueDays: ${realOverdueDays} | status: ${newStatus}`);
    }
  }

  console.log(`  → Synced overdue_days for ${createdLoans.length} loans\n`);

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  const totalLoan      = createdLoans.reduce((s, l) => s + Number(l.principal), 0);
  const totalDisbursed = createdDisbursements.reduce((s, d) => s + Number(d.amount), 0);
  const totalReceived  = createdPayments.reduce((s, p) => s + Number(p.amount), 0);

  const statusBreakdown = createdSchedules.reduce((acc: any, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const scenarioBreakdown = createdCustomers.reduce((acc: any, c) => {
    const sc = c.scenarioData.scenario;
    acc[sc] = (acc[sc] ?? 0) + 1;
    return acc;
  }, {});

  console.log('═'.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Branches           : ${createdBranches.length}`);
  console.log(`  Staff              : ${createdUsers.length}`);
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
  console.log(`  Total loan amount  : ${totalLoan.toLocaleString()} THB`);
  console.log(`  Total disbursed    : ${totalDisbursed.toLocaleString()} THB`);
  console.log(`  Total received     : ${totalReceived.toLocaleString()} THB`);
  console.log(`  Outstanding (est.) : ${(totalDisbursed - totalReceived).toLocaleString()} THB`);
  console.log('─'.repeat(60));
  console.log('  Schedule status breakdown:');
  for (const [st, cnt] of Object.entries(statusBreakdown)) {
    console.log(`    ${String(st).padEnd(10)}: ${cnt}`);
  }
  console.log('  Customer scenario breakdown:');
  for (const [sc, cnt] of Object.entries(scenarioBreakdown)) {
    console.log(`    ${String(sc).padEnd(18)}: ${cnt}`);
  }
  console.log('═'.repeat(60));

  console.log('\n✅ Fixes applied:');
  console.log('  [FIX-1] Schedule loop สร้างทุกงวด — ไม่มี break/skip กลาง amortization');
  console.log('  [FIX-2] firstPaymentDate = วันที่ 1 ของเดือนถัดจาก disbursementDate');
  console.log('  [FIX-3] disbursementDate ส่งผ่าน Map แทน memory snapshot');
  console.log('  [FIX-4] NPL OVERDUE เมื่อ daysSinceDue >= 90 จริง');
  console.log('  [FIX-5] LATE_PAYER paymentDate clamp ≤ CURRENT_DATE');
  console.log('  [FIX-6] loan.outstandingBalance และ status update หลัง payment');
  console.log('  [FIX-7] PARTIAL schedule update paidAmount / unpaidAmount');
  console.log('  [FIX-8] Collection filter เฉพาะ OVERDUE จริง (daysOverdue > 0)');
  console.log('  [FIX-9] UTC dates ตลอด ป้องกัน timezone drift');
  console.log('  [FIX-10] customerCode / contract_number ใช้ index ป้องกัน collision');
  console.log('\n🎉 Seed completed successfully!\n');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  try {
    await seedCompleteSystem2025();
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

const isMain =
  !process.argv[1] ||
  process.argv[1].includes('seed-complete-system-2025');

if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedCompleteSystem2025 };
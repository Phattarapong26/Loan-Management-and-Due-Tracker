import { PrismaClient, User, UserRole } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

type Scenario =
  | 'GOOD_PAYER'
  | 'EARLY_PAYER'
  | 'LATE_PAYER'
  | 'NPL_EARLY'
  | 'NPL_GRADUAL'
  | 'NPL_SUDDEN'
  | 'RECOVERING';

type SeedContext = {
  admin: User;
  branches: Array<{ id: string; code: string; name: string }>;
  managersByBranchId: Map<string, User[]>;
  officersByBranchId: Map<string, User[]>;
  asOfDate: Date;
  startDate: Date;
  rng: () => number;
};

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : defaultValue;
}

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(raw).trim().toLowerCase());
}

function makeMulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randDecimal(rng: () => number, min: number, max: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.floor((rng() * (max - min) + min) * factor) / factor;
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

function utcDate(iso: string): Date {
  // Force stable parsing; ISO with Z recommended
  return new Date(iso);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function scenarioPlan(totalCustomers: number): Scenario[] {
  // Deterministic-ish distribution suitable for demo
  // 60% GOOD/EARLY, 20% LATE, 15% NPL (mix), 5% RECOVERING
  const good = Math.round(totalCustomers * 0.5);
  const early = Math.round(totalCustomers * 0.1);
  const late = Math.round(totalCustomers * 0.2);
  const npl = Math.round(totalCustomers * 0.15);
  const recovering = Math.max(0, totalCustomers - (good + early + late + npl));

  const scenarios: Scenario[] = [];
  scenarios.push(...Array(good).fill('GOOD_PAYER'));
  scenarios.push(...Array(early).fill('EARLY_PAYER'));
  scenarios.push(...Array(late).fill('LATE_PAYER'));
  scenarios.push(
    ...Array(npl)
      .fill(null)
      .map((_, i) => (i % 3 === 0 ? 'NPL_EARLY' : i % 3 === 1 ? 'NPL_GRADUAL' : 'NPL_SUDDEN'))
  );
  scenarios.push(...Array(recovering).fill('RECOVERING'));

  return scenarios;
}

function seedEncryptThaiId(plainThaiId: string): string {
  // Compatible with EncryptionUtil.decrypt() seed_* handling
  return `seed_${Buffer.from(plainThaiId, 'utf8').toString('base64')}`;
}

function md5_8_upper(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex').substring(0, 8).toUpperCase();
}

function quarterOf(date: Date): 1 | 2 | 3 | 4 {
  const m = date.getUTCMonth(); // 0-11
  const q = Math.floor(m / 3) + 1;
  return (q as 1 | 2 | 3 | 4);
}

function quarterStart(year: number, quarter: 1 | 2 | 3 | 4): Date {
  const month = (quarter - 1) * 3; // 0,3,6,9
  return new Date(Date.UTC(year, month, 1));
}

async function loadSeedContext(): Promise<SeedContext> {
  const seed = envInt('SEED_RANDOM_SEED', 20250311);
  const rng = makeMulberry32(seed);

  const startDate = utcDate('2025-01-01T00:00:00.000Z');
  const asOfDate = utcDate('2026-03-11T00:00:00.000Z');

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) {
    throw new Error('❌ No active ADMIN user found. Please seed users first.');
  }

  const branches = await prisma.branch.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });
  if (branches.length === 0) {
    throw new Error('❌ No branches found. Please seed branches first.');
  }

  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE', role: { in: ['MANAGER', 'OFFICER'] } },
    select: { id: true, firstName: true, lastName: true, role: true, branchId: true, status: true, createdAt: true, updatedAt: true, email: true, passwordHash: true, mustChangePassword: true, phoneNumber: true, avatar: true, monthlyTarget: true, nationalId: true, lineUserId: true, lineLinkedAt: true, lineActive: true, lineNotificationsEnabled: true, passwordChangedAt: true, lastLoginAt: true },
  });

  const managersByBranchId = new Map<string, User[]>();
  const officersByBranchId = new Map<string, User[]>();

  for (const b of branches) {
    managersByBranchId.set(b.id, []);
    officersByBranchId.set(b.id, []);
  }

  for (const u of users as unknown as User[]) {
    if (!u.branchId) continue;
    if (!managersByBranchId.has(u.branchId)) continue;
    if (u.role === 'MANAGER') managersByBranchId.get(u.branchId)?.push(u);
    if (u.role === 'OFFICER') officersByBranchId.get(u.branchId)?.push(u);
  }

  const missingBranches: string[] = [];
  for (const b of branches) {
    const officers = officersByBranchId.get(b.id) || [];
    if (officers.length === 0) missingBranches.push(b.code);
  }
  if (missingBranches.length > 0) {
    throw new Error(
      `❌ Missing OFFICER users in branches: ${missingBranches.join(', ')}.\n` +
        `Seed staff first (or run \`tsx prisma/setup-prerequisites.ts\` with SEED_ALLOW_CREATE_STAFF=true).`
    );
  }

  return { admin, branches, managersByBranchId, officersByBranchId, asOfDate, startDate, rng };
}

async function ensureSystemConfigs(adminId: string, effectiveFrom: Date) {
  const configs = [
    {
      key: 'interest_rate.mlr',
      value: '6.875',
      description: 'Minimum Loan Rate (MLR) - อัตราดอกเบี้ยขั้นต่ำสำหรับสินเชื่อ',
      category: 'INTEREST_RATE',
      dataType: 'NUMBER',
    },
    {
      key: 'interest_rate.mrr',
      value: '7.125',
      description: 'Minimum Retail Rate (MRR) - อัตราดอกเบี้ยขั้นต่ำสำหรับลูกค้ารายย่อย',
      category: 'INTEREST_RATE',
      dataType: 'NUMBER',
    },
    {
      key: 'interest_rate.last_updated',
      value: effectiveFrom.toISOString(),
      description: 'Last time interest rates were updated',
      category: 'INTEREST_RATE',
      dataType: 'STRING',
    },
    {
      key: 'monthly_disbursement_target',
      value: '500000',
      description: 'Monthly disbursement target used for dashboard KPIs',
      category: 'DASHBOARD',
      dataType: 'NUMBER',
    },
  ] as const;

  for (const c of configs) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      create: {
        key: c.key,
        value: c.value,
        description: c.description,
        category: c.category,
        dataType: c.dataType,
        createdBy: adminId,
        updatedBy: adminId,
        effectiveFrom,
      },
      update: {
        value: c.value,
        updatedBy: adminId,
      },
    });
  }

  // Make Settings page show updatedBy
  await prisma.systemConfig.updateMany({
    where: { key: { in: ['interest_rate.mlr', 'interest_rate.mrr'] } },
    data: { updatedBy: adminId },
  });

  // Optional: Seed audit logs so /api/interest-rates/history has data
  const seedAudit = envFlag('SEED_INTEREST_RATE_AUDIT', true);
  if (seedAudit) {
    const existing = await prisma.auditLog.count({
      where: {
        entity: 'SystemConfig',
        action: 'UPDATE',
        entityId: { in: ['interest_rate.mlr', 'interest_rate.mrr'] },
      },
    });
    if (existing === 0) {
      await prisma.auditLog.createMany({
        data: [
          {
            userId: adminId,
            action: 'UPDATE',
            entity: 'SystemConfig',
            entityId: 'interest_rate.mlr',
            changes: { value: '6.875', seededAt: effectiveFrom.toISOString() } as any,
            createdAt: effectiveFrom,
          },
          {
            userId: adminId,
            action: 'UPDATE',
            entity: 'SystemConfig',
            entityId: 'interest_rate.mrr',
            changes: { value: '7.125', seededAt: effectiveFrom.toISOString() } as any,
            createdAt: effectiveFrom,
          },
        ],
      });
    }
  }
}

async function ensureLoanProducts(adminId: string) {
  // Upsert by productCode to avoid duplicates.
  // Keep products "diverse" for interest rules/conditions in UI.
  const products = [
    {
      productCode: 'SME-WC-001',
      productName: 'สินเชื่อเงินทุนหมุนเวียน SME',
      description: 'สินเชื่อสำหรับเงินทุนหมุนเวียนในธุรกิจ SME',
      minLoanAmount: 500000,
      maxLoanAmount: 10000000,
      maxTermMonths: 60,
      interestRateType: 'FIXED' as const,
      interestRateYear1_3: 7.5,
      interestRateYear4Plus: 7.9,
      loanType: 'MEDIUM_TERM' as const,
      displayOrder: 1,
      isPopular: true,
    },
    {
      productCode: 'SME-EXP-002',
      productName: 'สินเชื่อขยายธุรกิจ SME',
      description: 'สินเชื่อสำหรับการขยายธุรกิจและการลงทุน',
      minLoanAmount: 1000000,
      maxLoanAmount: 25000000,
      maxTermMonths: 84,
      interestRateType: 'VARIABLE' as const,
      interestRateFormula: 'MLR + 1.50%',
      loanType: 'LONG_TERM' as const,
      displayOrder: 2,
      isPopular: true,
    },
    {
      productCode: 'SME-EQUIP-003',
      productName: 'สินเชื่อซื้อเครื่องจักร SME',
      description: 'สินเชื่อสำหรับการซื้อเครื่องจักรและอุปกรณ์',
      minLoanAmount: 2000000,
      maxLoanAmount: 50000000,
      maxTermMonths: 120,
      interestRateType: 'VARIABLE' as const,
      interestRateFormula: 'MRR + 2.00%',
      loanType: 'LONG_TERM' as const,
      displayOrder: 3,
      isPopular: false,
    },
    {
      productCode: 'SME-GOV-004',
      productName: 'สินเชื่อโครงการรัฐ (อุดหนุนดอกเบี้ย)',
      description: 'สินเชื่อร่วมโครงการรัฐ พร้อมสิทธิประโยชน์อุดหนุนดอกเบี้ย',
      minLoanAmount: 300000,
      maxLoanAmount: 5000000,
      maxTermMonths: 72,
      interestRateType: 'TIERED' as const,
      interestRateYear1_3: null,
      interestRateYear4Plus: null,
      loanType: 'MEDIUM_TERM' as const,
      displayOrder: 4,
      isPopular: false,
      governmentSubsidy: true,
      subsidyDetails: 'ปีที่ 1-2: อุดหนุน 2%, ปีที่ 3+: อุดหนุน 1%',
    },
    {
      productCode: 'SME-STARTUP-005',
      productName: 'สินเชื่อเริ่มต้นธุรกิจ (Startup)',
      description: 'สินเชื่อสำหรับผู้ประกอบการรายใหม่ที่มีศักยภาพ',
      minLoanAmount: 200000,
      maxLoanAmount: 3000000,
      maxTermMonths: 48,
      interestRateType: 'VARIABLE' as const,
      interestRateFormula: 'MLR + 2.25%',
      loanType: 'SHORT_TERM' as const,
      displayOrder: 5,
      isPopular: false,
    },
    {
      productCode: 'SME-GREEN-006',
      productName: 'สินเชื่อธุรกิจสีเขียว (Green)',
      description: 'สินเชื่อสนับสนุนธุรกิจที่เป็นมิตรต่อสิ่งแวดล้อม',
      minLoanAmount: 1000000,
      maxLoanAmount: 15000000,
      maxTermMonths: 96,
      interestRateType: 'FIXED' as const,
      interestRateYear1_3: 6.9,
      interestRateYear4Plus: 7.2,
      loanType: 'LONG_TERM' as const,
      displayOrder: 6,
      isPopular: false,
    },
  ];

  const created = [];
  for (const p of products) {
    // eslint-disable-next-line no-await-in-loop
    const upserted = await prisma.loanProduct.upsert({
      where: { productCode: p.productCode },
      create: {
        productCode: p.productCode,
        productName: p.productName,
        description: p.description,
        minLoanAmount: p.minLoanAmount,
        maxLoanAmount: p.maxLoanAmount,
        maxTermMonths: p.maxTermMonths,
        interestRateType: p.interestRateType as any,
        interestRateYear1_3: p.interestRateYear1_3 as any,
        interestRateYear4Plus: p.interestRateYear4Plus as any,
        interestRateFormula: (p as any).interestRateFormula ?? null,
        governmentSubsidy: (p as any).governmentSubsidy ?? false,
        subsidyDetails: (p as any).subsidyDetails ?? null,
        loanType: p.loanType as any,
        status: 'ACTIVE' as any,
        displayOrder: p.displayOrder,
        isPopular: p.isPopular,
        createdBy: adminId,
      },
      update: {
        productName: p.productName,
        description: p.description,
        minLoanAmount: p.minLoanAmount as any,
        maxLoanAmount: p.maxLoanAmount as any,
        maxTermMonths: p.maxTermMonths,
        interestRateType: p.interestRateType as any,
        interestRateYear1_3: p.interestRateYear1_3 as any,
        interestRateYear4Plus: p.interestRateYear4Plus as any,
        interestRateFormula: (p as any).interestRateFormula ?? null,
        governmentSubsidy: (p as any).governmentSubsidy ?? false,
        subsidyDetails: (p as any).subsidyDetails ?? null,
        loanType: p.loanType as any,
        status: 'ACTIVE' as any,
        displayOrder: p.displayOrder,
        isPopular: p.isPopular,
      },
    });
    created.push(upserted);
  }

  // Seed tiers for tiered product (if not exists)
  const tiered = created.find((x) => x.productCode === 'SME-GOV-004');
  if (tiered) {
    const tierCount = await prisma.interestRateTier.count({
      where: { loanProductId: tiered.id },
    });
    if (tierCount === 0) {
      await prisma.interestRateTier.createMany({
        data: [
          {
            loanProductId: tiered.id,
            tierName: 'Tier A (0.2-1.0M)',
            minAmount: 200000,
            maxAmount: 1000000,
            interestRate: 0.068,
            gracePeriodDays: 0,
            effectiveFrom: utcDate('2025-01-01T00:00:00.000Z'),
            status: 'ACTIVE',
          },
          {
            loanProductId: tiered.id,
            tierName: 'Tier B (1.0-3.0M)',
            minAmount: 1000000,
            maxAmount: 3000000,
            interestRate: 0.0725,
            gracePeriodDays: 0,
            effectiveFrom: utcDate('2025-01-01T00:00:00.000Z'),
            status: 'ACTIVE',
          },
          {
            loanProductId: tiered.id,
            tierName: 'Tier C (3.0-5.0M)',
            minAmount: 3000000,
            maxAmount: 5000000,
            interestRate: 0.077,
            gracePeriodDays: 0,
            effectiveFrom: utcDate('2025-01-01T00:00:00.000Z'),
            status: 'ACTIVE',
          },
        ],
      });
    }
  }

  // Year-based tiers for VARIABLE products (if not exists)
  for (const p of created.filter((x) => x.interestRateType === ('VARIABLE' as any))) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await prisma.yearInterestTier.count({ where: { loanProductId: p.id } });
    if (existing > 0) continue;

    const formula = (p as any).interestRateFormula || 'MLR + 1.50%';
    // eslint-disable-next-line no-await-in-loop
    await prisma.yearInterestTier.createMany({
      data: [
        {
          loanProductId: p.id,
          tierType: 'VARIABLE',
          startYear: 1,
          endYear: '3',
          formula,
          minRate: 0.04,
          maxRate: 0.18,
        },
        {
          loanProductId: p.id,
          tierType: 'VARIABLE',
          startYear: 4,
          endYear: 'MAX',
          formula,
          minRate: 0.04,
          maxRate: 0.18,
        },
      ],
    });
  }

  return created;
}

async function seedProductBudgets(ctx: SeedContext, products: Array<{ id: string; productCode: string; productName: string; maxLoanAmount: any }>) {
  const budgets: any[] = [];

  for (const product of products) {
    for (const year of [2025, 2026] as const) {
      const maxLoan = Number(product.maxLoanAmount || 0);
      const annualBudget =
        maxLoan <= 5_000_000
          ? randInt(ctx.rng, 100_000_000, 200_000_000)
          : maxLoan <= 20_000_000
            ? randInt(ctx.rng, 200_000_000, 500_000_000)
            : randInt(ctx.rng, 500_000_000, 1_500_000_000);

      for (const quarter of [1, 2, 3, 4] as const) {
        const quarterBudget = Math.floor(annualBudget / 4);
        let utilizationRate = 0;

        if (year === 2025) {
          utilizationRate = randDecimal(ctx.rng, 0.6, 0.95);
        } else if (year === 2026) {
          utilizationRate = quarter === 1 ? randDecimal(ctx.rng, 0.7, 0.9) : quarter === 2 ? randDecimal(ctx.rng, 0.1, 0.3) : 0;
        }

        const usedAmount = Math.floor(quarterBudget * utilizationRate);
        const disbursedAmount = Math.floor(usedAmount * 0.85);
        const pendingAmount = usedAmount - disbursedAmount;
        const availableAmount = quarterBudget - usedAmount;

        // eslint-disable-next-line no-await-in-loop
        const budget = await prisma.product_budgets.upsert({
          where: {
            product_id_fiscal_year_quarter: {
              product_id: product.id,
              fiscal_year: year,
              quarter,
            },
          },
          create: {
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
            budget_owner: ctx.admin.id,
            notes: `${year} Q${quarter} budget for ${product.productName}`,
            created_by: ctx.admin.id,
            created_at: quarterStart(year, quarter),
            updated_at: quarterStart(year, quarter),
          },
          update: {
            total_budget_amount: quarterBudget,
            committed_amount: usedAmount,
            disbursed_amount: disbursedAmount,
            pending_amount: pendingAmount,
            available_amount: availableAmount,
            utilization_rate: utilizationRate * 100,
            budget_status:
              utilizationRate > 0.95 ? 'CRITICAL' : utilizationRate > 0.8 ? 'WARNING' : 'ACTIVE',
            updated_at: ctx.asOfDate,
          },
        });

        budgets.push(budget);
      }
    }
  }

  return budgets;
}

function makeCustomerIdentity(index: number) {
  // Deterministic 13-digit IDs
  const thaiId = `1101700${String(100000 + index).padStart(6, '0')}`.slice(0, 13);
  const taxId = `010556${String(1000000 + index).padStart(7, '0')}`.slice(0, 13);
  return { thaiId, taxId };
}

function makeBusinessName(index: number, scenario: Scenario): string {
  const prefixes = ['บริษัท', 'หจก.', 'ห้างหุ้นส่วน', 'ร้าน'];
  const themes = {
    GOOD_PAYER: 'กิจการมั่นคง',
    EARLY_PAYER: 'จ่ายไว',
    LATE_PAYER: 'จ่ายช้า',
    NPL_EARLY: 'สะดุดเร็ว',
    NPL_GRADUAL: 'เสื่อมค่อย',
    NPL_SUDDEN: 'ล้มกะทันหัน',
    RECOVERING: 'ฟื้นตัว',
  } as const;
  const suffixes = ['จำกัด', 'เทรดดิ้ง', 'โฮลดิ้ง', 'แอนด์ซัน', 'กรุ๊ป'];
  return `${pick(makeMulberry32(index + 1), prefixes)} ${themes[scenario]} ${index + 1} ${pick(makeMulberry32(index + 11), suffixes)}`.trim();
}

function chooseLoanAmounts(rng: () => number, scenario: Scenario, productMax: number): { principal: number; termMonths: number } {
  const max = Math.max(500000, Math.floor(productMax));
  const min = Math.min(1_000_000, max);

  const basePrincipal =
    scenario.includes('NPL') ? randInt(rng, min, Math.min(max, 8_000_000)) : randInt(rng, min, Math.min(max, 12_000_000));
  const principal = Math.max(min, Math.floor(basePrincipal / 10000) * 10000);

  const termOptions = scenario === 'EARLY_PAYER' ? [24, 36, 48] : scenario.includes('NPL') ? [36, 48, 60] : [24, 36, 48, 60, 72];
  const termMonths = pick(rng, termOptions.filter((t) => t <= 120));
  return { principal, termMonths };
}

function paymentBehavior(
  rng: () => number,
  scenario: Scenario,
  installmentNo: number
): { status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UNPAID'; payOffsetDays?: number; paidRatio?: number } {
  if (scenario === 'GOOD_PAYER') return { status: 'PAID', payOffsetDays: randInt(rng, -1, 2), paidRatio: 1 };
  if (scenario === 'EARLY_PAYER') return { status: 'PAID', payOffsetDays: randInt(rng, -5, -1), paidRatio: 1 };
  if (scenario === 'LATE_PAYER') {
    const lateDays = randInt(rng, 5, 30);
    const partial = rng() < 0.25;
    return partial
      ? { status: 'PARTIAL', payOffsetDays: lateDays, paidRatio: randDecimal(rng, 0.85, 0.98) }
      : { status: 'PAID', payOffsetDays: lateDays, paidRatio: 1 };
  }

  if (scenario === 'NPL_EARLY') {
    if (installmentNo <= 3) return { status: 'PAID', payOffsetDays: randInt(rng, 0, 3), paidRatio: 1 };
    if (installmentNo <= 5) return { status: 'PARTIAL', payOffsetDays: randInt(rng, 30, 90), paidRatio: randDecimal(rng, 0.2, 0.6) };
    return { status: 'OVERDUE' };
  }

  if (scenario === 'NPL_GRADUAL') {
    if (installmentNo <= 5) return { status: 'PAID', payOffsetDays: randInt(rng, 0, 5), paidRatio: 1 };
    if (installmentNo <= 9) return { status: 'PARTIAL', payOffsetDays: randInt(rng, 15, 60), paidRatio: randDecimal(rng, 0.6, 0.9) };
    return rng() < 0.2
      ? { status: 'PARTIAL', payOffsetDays: randInt(rng, 60, 180), paidRatio: randDecimal(rng, 0.2, 0.5) }
      : { status: 'OVERDUE' };
  }

  if (scenario === 'NPL_SUDDEN') {
    if (installmentNo <= 7) return { status: 'PAID', payOffsetDays: randInt(rng, 0, 5), paidRatio: 1 };
    return { status: 'OVERDUE' };
  }

  // RECOVERING
  if (installmentNo <= 4) return { status: 'PAID', payOffsetDays: randInt(rng, 0, 7), paidRatio: 1 };
  if (installmentNo <= 8) return { status: 'OVERDUE' };
  return rng() < 0.8
    ? { status: 'PAID', payOffsetDays: randInt(rng, 0, 10), paidRatio: 1 }
    : { status: 'PARTIAL', payOffsetDays: randInt(rng, 5, 20), paidRatio: randDecimal(rng, 0.8, 0.98) };
}

function calculateSchedule(principal: number, annualRatePercent: number, termMonths: number, firstPaymentDate: Date) {
  const monthlyRate = annualRatePercent / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const monthlyPayment = monthlyRate === 0 ? principal / termMonths : (principal * (monthlyRate * factor)) / (factor - 1);

  let remaining = principal;
  const rows: Array<{
    paymentNumber: number;
    paymentDate: Date;
    principalAmount: number;
    interestAmount: number;
    totalPayment: number;
    remainingBalance: number;
  }> = [];

  for (let i = 1; i <= termMonths; i += 1) {
    const paymentDate = addMonths(firstPaymentDate, i - 1);
    const interestAmount = remaining * monthlyRate;
    const principalAmount = monthlyPayment - interestAmount;
    remaining -= principalAmount;

    const isLast = i === termMonths;
    const adjustedPrincipal = isLast ? principalAmount + remaining : principalAmount;
    const adjustedTotal = isLast ? monthlyPayment + remaining : monthlyPayment;
    const adjustedRemaining = isLast ? 0 : remaining;

    rows.push({
      paymentNumber: i,
      paymentDate,
      principalAmount: Math.max(0, adjustedPrincipal),
      interestAmount: Math.max(0, interestAmount),
      totalPayment: Math.max(0, adjustedTotal),
      remainingBalance: Math.max(0, adjustedRemaining),
    });

    if (isLast) remaining = 0;
  }

  return { monthlyPayment, rows };
}

function agingBucketFromDays(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'CURRENT';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

async function seedCustomersAndLoans(ctx: SeedContext, products: Array<any>, productBudgets: Array<any>) {
  const totalCustomers = envInt('SEED_CUSTOMERS', 50);
  const scenarios = scenarioPlan(totalCustomers);
  const createdLoans: Array<any> = [];
  const createdCustomers: Array<any> = [];

  const contractSeqByBranch = new Map<string, number>();
  for (const b of ctx.branches) contractSeqByBranch.set(b.id, 0);

  const activeProducts = products.filter((p) => p.status === 'ACTIVE');
  if (activeProducts.length === 0) throw new Error('No ACTIVE loan products found.');

  for (let i = 0; i < totalCustomers; i += 1) {
    const scenario = scenarios[i] as Scenario;
    const branch = ctx.branches[i % ctx.branches.length]!;
    const officers = ctx.officersByBranchId.get(branch.id) || [];
    const managers = ctx.managersByBranchId.get(branch.id) || [];

    const officer = officers[i % officers.length]!;
    const managerOrAdmin = managers[0] || ctx.admin;

    // Spread customer creation across 2025-2026; NPL skew older
    const maxStartOffsetDays = Math.floor((ctx.asOfDate.getTime() - ctx.startDate.getTime()) / (1000 * 60 * 60 * 24)) - 60;
    const baseOffset = scenario.includes('NPL') ? randInt(ctx.rng, 0, Math.min(420, maxStartOffsetDays)) : randInt(ctx.rng, 0, Math.min(520, maxStartOffsetDays));
    const customerCreatedAt = addDays(ctx.startDate, baseOffset);
    const applicationDate = addDays(customerCreatedAt, randInt(ctx.rng, 1, 10));
    const approvedAt = addDays(applicationDate, randInt(ctx.rng, 7, 21));
    const disbursementDate = addDays(approvedAt, randInt(ctx.rng, 1, 10));
    const firstPaymentDate = addDays(disbursementDate, randInt(ctx.rng, 25, 45)); // within service constraints 7-60

    const product = activeProducts[(i * 7) % activeProducts.length]!;
    const { principal, termMonths } = chooseLoanAmounts(ctx.rng, scenario, Number(product.maxLoanAmount));

    const interestRate =
      product.interestRateType === ('FIXED' as any) && product.interestRateYear1_3
        ? Number(product.interestRateYear1_3)
        : product.interestRateType === ('TIERED' as any)
          ? 7.25
          : 8.5;

    const identity = makeCustomerIdentity(i);
    const businessName = makeBusinessName(i, scenario);

    const customer = await prisma.customer.create({
      data: {
        customerCode: `CUST2025${String(i + 1).padStart(4, '0')}`,
        businessName,
        businessType: pick(ctx.rng, ['WHOLESALE', 'RETAIL', 'SERVICE', 'MANUFACTURING']) as any,
        industry_code: pick(ctx.rng, ['4610', '5610', '6201', '2511']),
        business_size: pick(ctx.rng, ['SMALL', 'MEDIUM', 'LARGE']) as any,
        phone: `08${randInt(ctx.rng, 10000000, 99999999)}`,
        email: `customer${i + 1}@example.com`,
        thaiId: seedEncryptThaiId(identity.thaiId),
        taxId: identity.taxId,
        status: 'ACTIVE',
        address: `${randInt(ctx.rng, 1, 999)} ถนนธุรกิจ เขต/อำเภอ ${branch.code} ประเทศไทย`,
        createdBy: officer.id,
        branch: { connect: { id: branch.id } },
        createdAt: customerCreatedAt,
        businessProfiles: {
          create: {
            sourceFileName: 'seed-production-ready-2025',
            matchConfidence: 1.0,
            sheetsParsed: ['seed'],
            status: 'APPROVED',
            reviewStatus: 'APPROVED',
            reviewedBy: managerOrAdmin.id,
            reviewedAt: addDays(customerCreatedAt, randInt(ctx.rng, 1, 15)),
            enhancedData: {
              annualRevenue: randInt(ctx.rng, 2_000_000, 60_000_000),
              netProfit: randInt(ctx.rng, 150_000, 8_000_000),
              totalAssets: randInt(ctx.rng, 1_000_000, 120_000_000),
              totalLiabilities: randInt(ctx.rng, 500_000, 80_000_000),
              numberOfEmployees: randInt(ctx.rng, 3, 80),
              yearsInBusiness: randInt(ctx.rng, 1, 18),
              businessAddress: `${randInt(ctx.rng, 1, 999)} ถนนพาณิชย์ ${branch.name}`,
            } as any,
          },
        },
      },
    });

    createdCustomers.push(customer);

    const contractSeq = (contractSeqByBranch.get(branch.id) || 0) + 1;
    contractSeqByBranch.set(branch.id, contractSeq);
    const contractYear = disbursementDate.getUTCFullYear();
    const contractNo = `LN-${branch.code}-${contractYear}-${String(contractSeq).padStart(4, '0')}`;

    // Determine loan status snapshot
    const now = ctx.asOfDate;
    const scheduleTemplate = calculateSchedule(principal, interestRate, termMonths, firstPaymentDate);
    const pastInstallments = scheduleTemplate.rows.filter((r) => r.paymentDate <= now);
    const lastPast = pastInstallments[pastInstallments.length - 1];

    let overdueDays = 0;
    if (scenario.includes('NPL')) overdueDays = randInt(ctx.rng, 120, 420);
    else if (scenario === 'LATE_PAYER') overdueDays = randInt(ctx.rng, 1, 25);
    else if (scenario === 'RECOVERING') overdueDays = randInt(ctx.rng, 0, 60);

    const loanStatus: any =
      scenario.includes('NPL') ? 'NPL' : overdueDays >= 1 ? 'ACTIVE' : 'ACTIVE';

    const loan = await prisma.loan.create({
      data: {
        customerId: customer.id,
        branchId: branch.id,
        officerId: officer.id,
        contract_number: contractNo,
        principal,
        interestRate,
        termMonths,
        currentPrincipal: principal,
        status: loanStatus,
        approvalLevel: principal <= 5_000_000 ? ('OFFICER' as any) : principal <= 20_000_000 ? ('MANAGER' as any) : ('HQ' as any),
        approvedBy: managerOrAdmin.id,
        approvedAt,
        disbursementDate,
        maturityDate: addMonths(disbursementDate, termMonths),
        outstandingBalance: principal,
        overdueDays,
        totalDisbursed: principal,
        remainingAmount: 0,
        loanProductId: product.id,
        startDate: applicationDate,
        firstPaymentDate,
        paymentDay: firstPaymentDate.getUTCDate(),
        paymentDayAdjustment: 'LAST_DAY',
        createdAt: applicationDate,
        productConfig: {
          seeded: true,
          seededAt: ctx.asOfDate.toISOString(),
          contractPdfUrl: null,
          disbursementPdfUrl: null,
        } as any,
      },
    });

    createdLoans.push(loan);

    // Disbursement record (reflect real flow)
    const disbursementNo = 1;
    const disbursement = await prisma.loanDisbursement.create({
      data: {
        loanId: loan.id,
        disbursementNo,
        amount: principal,
        purpose: `เบิกจ่ายตามสัญญา ${contractNo}`,
        requestedDate: disbursementDate,
        status: 'DISBURSED',
        approvedBy: managerOrAdmin.id,
        approvedAt: disbursementDate,
        disbursedBy: officer.id,
        disbursedAt: disbursementDate,
        disbursementMethod: 'TRANSFER',
        referenceNo: `DISB-${contractNo}`,
        createdBy: officer.id,
        createdAt: disbursementDate,
      },
    });

    // Transaction for disbursement
    await prisma.transaction.create({
      data: {
        userId: officer.id,
        loanId: loan.id,
        type: 'LOAN_DISBURSEMENT',
        amount: principal,
        status: 'COMPLETED',
        reference: `TXN-${disbursement.referenceNo}`,
        description: `Loan disbursement ${contractNo}`,
        processedAt: disbursementDate,
        createdAt: disbursementDate,
      },
    });

    // Payment schedules + payments + receipts
    let totalPaid = 0;
    let lastPaymentDate: Date | null = null;
    let nextPaymentDate: Date | null = null;
    let nextPaymentAmount: number | null = null;
    let outstanding = principal;
    let maxOverdueFromSchedules = 0; // track real max overdue from actual OVERDUE schedules

    for (const row of scheduleTemplate.rows) {
      const isPast = row.paymentDate <= ctx.asOfDate;
      const behavior = paymentBehavior(ctx.rng, scenario, row.paymentNumber);
      const scheduleStatus: any = isPast ? behavior.status : 'UNPAID';

      let paidAt: Date | null = null;
      let paidAmount = 0;
      let paymentType: any = 'ON_TIME';
      let penaltyAmount = 0;
      let daysLate = 0;

      if (isPast && (behavior.status === 'PAID' || behavior.status === 'PARTIAL')) {
        const offset = behavior.payOffsetDays ?? 0;
        paidAt = addDays(row.paymentDate, offset);
        daysLate = Math.max(0, offset);
        paidAmount = Math.round(row.totalPayment * (behavior.paidRatio ?? 1) * 100) / 100;
        totalPaid += paidAmount;
        lastPaymentDate = paidAt;
        paymentType = offset < 0 ? 'EARLY' : offset === 0 ? 'ON_TIME' : 'LATE';
        penaltyAmount = paymentType === 'LATE' ? Math.round((paidAmount * 0.005 + daysLate * 10) * 100) / 100 : 0;
      }

      if (!nextPaymentDate && scheduleStatus === 'UNPAID') {
        nextPaymentDate = row.paymentDate;
        nextPaymentAmount = Math.round(row.totalPayment * 100) / 100;
      }

      if (scheduleStatus === 'PAID') {
        outstanding = row.remainingBalance;
      } else if (scheduleStatus === 'PARTIAL') {
        // Reduce balance by portion of principal paid
        const principalPaid = row.principalAmount * (behavior.paidRatio ?? 1);
        outstanding = Math.max(0, outstanding - principalPaid);
      }

      // Calculate daysOverdue from actual paymentDate, not random overdueDays
      const actualDaysOverdue = scheduleStatus === 'OVERDUE'
        ? Math.max(0, Math.floor((ctx.asOfDate.getTime() - row.paymentDate.getTime()) / (1000 * 60 * 60 * 24)))
        : scheduleStatus === 'PAID' || scheduleStatus === 'PARTIAL'
          ? 0  // paid schedules never have daysOverdue
          : daysLate;

      // Track max overdue from OVERDUE schedules only
      if (scheduleStatus === 'OVERDUE' && actualDaysOverdue > maxOverdueFromSchedules) {
        maxOverdueFromSchedules = actualDaysOverdue;
      }

      const scheduleRecord = await prisma.paymentSchedule.create({
        data: {
          loanId: loan.id,
          paymentNumber: row.paymentNumber,
          paymentDate: row.paymentDate,
          principalAmount: row.principalAmount,
          interestAmount: row.interestAmount,
          totalPayment: row.totalPayment,
          remainingBalance: row.remainingBalance,
          status: scheduleStatus,
          paidAt: paidAt ?? null,
          daysOverdue: actualDaysOverdue,
          penaltyAmount: scheduleStatus === 'PAID' ? 0 : penaltyAmount,
          createdAt: addDays(disbursementDate, 1),
        },
      });

      if (paidAt && paidAmount > 0) {
        const paymentReference = `PAY-${contractNo}-${String(row.paymentNumber).padStart(3, '0')}`;
        const payment = await prisma.payment.create({
          data: {
            loanId: loan.id,
            paymentScheduleId: scheduleRecord.id,
            amount: paidAmount,
            paymentDate: paidAt,
            paymentMethod: 'TRANSFER',
            paymentType,
            penaltyAmount: penaltyAmount > 0 ? penaltyAmount : null,
            reference: paymentReference,
            createdBy: officer.id,
            createdAt: paidAt,
          },
        });

        const receiptNumber = `RCPT-${branch.code}-${paidAt.getUTCFullYear()}${String(paidAt.getUTCMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}${String(row.paymentNumber).padStart(2, '0')}`;
        const validationCode = md5_8_upper(`${receiptNumber}-${paidAmount}-seed`);

        // Store receiptData compatible with PDF generator
        await prisma.paymentReceipt.create({
          data: {
            receiptNumber,
            paymentId: payment.id,
            loanId: loan.id,
            customerId: customer.id,
            amount: paidAmount,
            paymentDate: paidAt,
            paymentMethod: 'TRANSFER',
            receiptData: {
              receiptId: '',
              receiptNumber,
              paymentId: payment.id,
              loanId: loan.id,
              customerId: customer.id,
              paymentDetails: {
                amount: paidAmount,
                paymentDate: paidAt,
                paymentMethod: 'TRANSFER',
                paymentType,
                penaltyAmount,
              },
              customer: {
                businessName: customer.businessName,
                address: customer.address || '-',
                phone: customer.phone,
                email: customer.email || undefined,
                taxId: customer.taxId,
              },
              loanInfo: {
                contractNumber: contractNo,
                originalPrincipal: principal,
                outstandingBalance: Math.round(outstanding * 100) / 100,
                nextPaymentDate: nextPaymentDate || undefined,
                nextPaymentAmount: nextPaymentAmount || undefined,
              },
              paymentAllocation: {
                principalAmount: row.principalAmount,
                interestAmount: row.interestAmount,
                penaltyAmount,
                totalAmount: paidAmount,
              },
              receiptInfo: {
                issuedAt: paidAt,
                issuedBy: `${officer.firstName} ${officer.lastName}`,
                validationCode,
              },
              loanStatistics: {
                totalPaid,
                remainingInstallments: Math.max(0, termMonths - row.paymentNumber),
                paymentProgress: Math.round(((row.paymentNumber / termMonths) * 100) * 100) / 100,
                isFullyPaid: row.paymentNumber >= termMonths,
              },
            } as any,
            status: 'ISSUED',
            issuedBy: officer.id,
            issuedAt: paidAt,
            createdAt: paidAt,
          },
        });

        // Transaction for payment
        await prisma.transaction.create({
          data: {
            userId: officer.id,
            loanId: loan.id,
            type: 'LOAN_PAYMENT',
            amount: paidAmount,
            status: 'COMPLETED',
            reference: `TXN-${paymentReference}`,
            description: `Loan payment ${contractNo} #${row.paymentNumber}`,
            processedAt: paidAt,
            createdAt: paidAt,
          },
        });
      }
    }

    // Update loan snapshot fields for frontend
    // Use maxOverdueFromSchedules tracked during schedule creation (source of truth)
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        outstandingBalance: Math.round(outstanding * 100) / 100,
        lastPaymentDate: lastPaymentDate ?? null,
        nextPaymentDate: nextPaymentDate ?? null,
        nextPaymentAmount: nextPaymentAmount ?? null,
        overdueDays: maxOverdueFromSchedules,
        status: maxOverdueFromSchedules >= 90 ? 'NPL' : 'ACTIVE',
      },
    });

    // Aging analysis record for collections/reporting
    await prisma.aging_analysis.upsert({
      where: { loan_id: loan.id },
      create: {
        loan_id: loan.id,
        customer_id: customer.id,
        branch_id: branch.id,
        current_age: overdueDays,
        aging_bucket: agingBucketFromDays(overdueDays),
        principal_overdue: overdueDays > 0 ? Math.round(outstanding * 0.05 * 100) / 100 : 0,
        interest_overdue: overdueDays > 0 ? Math.round(outstanding * 0.01 * 100) / 100 : 0,
        penalty_overdue: overdueDays > 0 ? Math.round(outstanding * 0.002 * 100) / 100 : 0,
        total_overdue: overdueDays > 0 ? Math.round(outstanding * 0.062 * 100) / 100 : 0,
        collection_agent_id: officer.id,
        collection_strategy: scenario.includes('NPL') ? 'INTENSIVE' : overdueDays > 0 ? 'STANDARD' : 'NONE',
        next_action_date: overdueDays > 0 ? toDateOnly(addDays(ctx.asOfDate, 7)) : null,
        status: 'ACTIVE',
        created_at: toDateOnly(addDays(disbursementDate, 60)),
        updated_at: ctx.asOfDate,
      },
      update: {
        current_age: overdueDays,
        aging_bucket: agingBucketFromDays(overdueDays),
        updated_at: ctx.asOfDate,
      },
    });

    // Collections & contact logs for problematic loans
    if (scenario.includes('NPL') || overdueDays > 0) {
      const actions = scenario.includes('NPL') ? randInt(ctx.rng, 3, 8) : randInt(ctx.rng, 1, 3);
      for (let j = 0; j < actions; j += 1) {
        const actionDate = addDays(disbursementDate, randInt(ctx.rng, 90, 420));
        if (actionDate > ctx.asOfDate) continue;
        // eslint-disable-next-line no-await-in-loop
        const action = await prisma.collectionAction.create({
          data: {
            customerId: customer.id,
            loanId: loan.id,
            scheduleId: null,
            actionType: pick(ctx.rng, ['CALL', 'VISIT', 'EMAIL', 'LEGAL']) as any,
            agentId: officer.id,
            status: 'COMPLETED',
            notes: `ติดตามหนี้ (${scenario}) ครั้งที่ ${j + 1}`,
            result: scenario === 'RECOVERING' && j === actions - 1 ? 'PAYMENT_PROMISE' : 'NO_RESPONSE',
            followUpDate: addDays(actionDate, randInt(ctx.rng, 7, 30)),
            completedAt: actionDate,
          } as any,
        });

        // eslint-disable-next-line no-await-in-loop
        await prisma.contactLog.create({
          data: {
            customerId: customer.id,
            loanId: loan.id,
            officerId: officer.id,
            contactDate: actionDate,
            contactStatus: 'CONTACTED',
            contactMethod: pick(ctx.rng, ['PHONE', 'LINE', 'EMAIL', 'VISIT']) as any,
            notes: `ติดต่อลูกค้าเกี่ยวกับการชำระเงิน (${action.actionType})`,
            nextFollowUpDate: addDays(actionDate, randInt(ctx.rng, 5, 20)),
            actionId: action.id,
            actionType: String(action.actionType),
          } as any,
        });
      }
    } else {
      // Some "uncontacted" customers for dashboard variety (no contact logs)
      if (ctx.rng() < 0.5) {
        const contactDate = addDays(disbursementDate, randInt(ctx.rng, 15, 90));
        if (contactDate <= ctx.asOfDate) {
          await prisma.contactLog.create({
            data: {
              customerId: customer.id,
              loanId: loan.id,
              officerId: officer.id,
              contactDate,
              contactStatus: 'CONTACTED',
              contactMethod: pick(ctx.rng, ['PHONE', 'LINE']) as any,
              notes: 'ติดตามความพึงพอใจหลังเบิกจ่าย',
              nextFollowUpDate: addDays(contactDate, 30),
              priority: 'LOW',
            } as any,
          });
        }
      }
    }

    // Budget consumption for disbursement
    const year = disbursementDate.getUTCFullYear();
    const quarter = quarterOf(disbursementDate);
    const budget = productBudgets.find(
      (b: any) => b.product_id === product.id && b.fiscal_year === year && b.quarter === quarter
    );
    if (budget) {
      await prisma.budget_consumption.upsert({
        where: {
          loan_id_consumption_type: {
            loan_id: loan.id,
            consumption_type: 'DISBURSEMENT',
          },
        },
        create: {
          product_budget_id: budget.id,
          loan_id: loan.id,
          branch_id: branch.id,
          requested_amount: principal,
          approved_amount: principal,
          disbursed_amount: principal,
          consumption_type: 'DISBURSEMENT',
          status: 'ACTIVE',
          consumption_date: toDateOnly(disbursementDate),
          consumption_time: disbursementDate,
          processed_by: officer.id,
          created_at: disbursementDate,
          updated_at: ctx.asOfDate,
        },
        update: {
          approved_amount: principal,
          disbursed_amount: principal,
          processed_by: officer.id,
          updated_at: ctx.asOfDate,
        },
      });
    }

    // Optionally seed an invoice for next unpaid schedule (not required, but helps demo)
    const seedNextInvoice = envFlag('SEED_NEXT_INVOICE', true);
    if (seedNextInvoice && nextPaymentDate) {
      const invoiceNo = `INV-${branch.code}-${nextPaymentDate.getUTCFullYear()}${String(nextPaymentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;
      const existingInvoice = await prisma.nextPaymentInvoice.findFirst({
        where: { loanId: loan.id },
      });
      if (!existingInvoice) {
        // Find the schedule row by date
        const nextSchedule = await prisma.paymentSchedule.findFirst({
          where: { loanId: loan.id, status: 'UNPAID' },
          orderBy: { paymentNumber: 'asc' },
        });
        if (nextSchedule) {
          await prisma.nextPaymentInvoice.create({
            data: {
              invoiceNumber: invoiceNo,
              loanId: loan.id,
              customerId: customer.id,
              paymentScheduleId: nextSchedule.id,
              invoiceData: {
                invoiceId: '',
                invoiceNumber: invoiceNo,
                loanId: loan.id,
                customerId: customer.id,
                paymentScheduleId: nextSchedule.id,
                customer: {
                  businessName: customer.businessName,
                  address: customer.address || '-',
                  phone: customer.phone,
                  email: customer.email || undefined,
                },
                nextPayment: {
                  installmentNo: nextSchedule.paymentNumber,
                  totalInstallments: termMonths,
                  dueDate: nextSchedule.paymentDate,
                  principalAmount: Number(nextSchedule.principalAmount),
                  interestAmount: Number(nextSchedule.interestAmount),
                  totalAmount: Number(nextSchedule.totalPayment),
                  status: nextSchedule.status,
                },
                loanSummary: {
                  originalPrincipal: principal,
                  currentOutstandingBalance: Math.round(outstanding * 100) / 100,
                  remainingPrincipal: Math.round(outstanding * 100) / 100,
                  totalPaid,
                  paymentProgress: Math.round(((Math.max(0, (nextSchedule.paymentNumber - 1)) / termMonths) * 100) * 100) / 100,
                  interestRate,
                },
                metadata: {
                  generatedAt: ctx.asOfDate,
                  validUntil: addDays(ctx.asOfDate, 30),
                  qrCodeData: `INVOICE:${invoiceNo}:${Number(nextSchedule.totalPayment)}`,
                  bankingInfo: {
                    accountName: 'บริษัท SME Bank จำกัด',
                    accountNumber: '123-456-7890',
                    bankName: 'ธนาคารกรุงเทพ',
                  },
                },
              } as any,
              status: 'PENDING',
              generatedBy: officer.id,
              validUntil: addDays(ctx.asOfDate, 30),
              createdAt: ctx.asOfDate,
            },
          });
        }
      }
    }
  }

  return { createdLoans, createdCustomers };
}

async function seedProductionReady2025() {
  console.log('🌱 Starting Production-Ready Seed for 2025-2026 Data...\n');

  const ctx = await loadSeedContext();

  console.log(`✅ Admin: ${ctx.admin.firstName} ${ctx.admin.lastName} (${ctx.admin.email})`);
  console.log(`✅ Branches: ${ctx.branches.length}`);
  console.log(`📅 Seed period: ${ctx.startDate.toISOString().slice(0, 10)} -> ${ctx.asOfDate.toISOString().slice(0, 10)}\n`);

  await ensureSystemConfigs(ctx.admin.id, ctx.startDate);

  const products = await ensureLoanProducts(ctx.admin.id);
  console.log(`✅ Loan products active: ${products.filter((p) => p.status === 'ACTIVE').length}`);

  const budgets = await seedProductBudgets(ctx, products);
  console.log(`✅ Product budgets: ${budgets.length}`);

  const { createdCustomers, createdLoans } = await seedCustomersAndLoans(ctx, products, budgets);

  console.log('\n📊 Seed Summary');
  console.log(`- Customers: ${createdCustomers.length}`);
  console.log(`- Loans: ${createdLoans.length}`);
  console.log(`- Budgets: ${budgets.length}`);

  const stats = await prisma.loan.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  console.log('- Loan status breakdown:');
  for (const s of stats) {
    console.log(`  ${s.status}: ${s._count.status}`);
  }

  console.log('\n✅ Production-ready seed completed successfully!');
}

async function main() {
  try {
    await seedProductionReady2025();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { seedProductionReady2025 };

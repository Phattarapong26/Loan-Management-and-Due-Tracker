import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type PrereqOptions = {
  /**
   * If true, create missing MANAGER/OFFICER users per branch.
   * Defaults to false to avoid changing "account" seed behavior.
   */
  allowCreateStaff?: boolean;
};

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(raw).trim().toLowerCase());
}

async function ensureInterestRatesSeeded(adminId: string, effectiveFrom: Date) {
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
}

async function ensureStaffPerBranch(options: { allowCreateStaff: boolean }) {
  const branches = await prisma.branch.findMany({ orderBy: { code: 'asc' } });
  const seedPassword = process.env.SEED_STAFF_PASSWORD || 'ChangeMe123!';
  const seedPasswordHash = await bcrypt.hash(seedPassword, 10);

  const missing: Array<{ branchCode: string; needManagers: number; needOfficers: number }> = [];

  for (const b of branches) {
    // eslint-disable-next-line no-await-in-loop
    const managerCount = await prisma.user.count({
      where: { branchId: b.id, role: 'MANAGER' as UserRole, status: 'ACTIVE' },
    });
    // eslint-disable-next-line no-await-in-loop
    const officerCount = await prisma.user.count({
      where: { branchId: b.id, role: 'OFFICER' as UserRole, status: 'ACTIVE' },
    });

    const needManagers = Math.max(0, 1 - managerCount);
    // Keep the prerequisite minimal by default: we only need at least 1 officer per branch
    // so seeded customers can be owned/filtered correctly without forcing account creation.
    const needOfficers = Math.max(0, 1 - officerCount);

    if (needManagers > 0 || needOfficers > 0) {
      missing.push({ branchCode: b.code, needManagers, needOfficers });
      if (!options.allowCreateStaff) continue;

      // Create seed staff with deterministic emails; passwords must be set by existing provisioning flow.
      // These accounts are meant for demo data ownership only.
      if (needManagers > 0) {
        // eslint-disable-next-line no-await-in-loop
        await prisma.user.create({
          data: {
            email: `seed.manager.${b.code.toLowerCase()}@seed.local`,
            passwordHash: seedPasswordHash,
            firstName: 'Seed',
            lastName: `Manager ${b.code}`,
            role: 'MANAGER',
            status: 'ACTIVE',
            branchId: b.id,
            mustChangePassword: true,
          },
        });
      }

      for (let i = 0; i < needOfficers; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await prisma.user.create({
          data: {
            email: `seed.officer.${b.code.toLowerCase()}.${i + 1}@seed.local`,
            passwordHash: seedPasswordHash,
            firstName: 'Seed',
            lastName: `Officer ${b.code} ${i + 1}`,
            role: 'OFFICER',
            status: 'ACTIVE',
            branchId: b.id,
            mustChangePassword: true,
            monthlyTarget: 100000,
          },
        });
      }
    }
  }

  if (missing.length > 0 && !options.allowCreateStaff) {
    const message = missing
      .map((m) => `- ${m.branchCode}: missing MANAGER=${m.needManagers}, OFFICER=${m.needOfficers}`)
      .join('\n');
    throw new Error(
      `Missing staff prerequisites per branch.\n${message}\n\n` +
        `Run your staff/account seed first, or set SEED_ALLOW_CREATE_STAFF=true to auto-create demo staff.`
    );
  }
}

export async function setupPrerequisites(options: PrereqOptions = {}) {
  const allowCreateStaff =
    options.allowCreateStaff ?? envFlag('SEED_ALLOW_CREATE_STAFF', false);

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) {
    throw new Error('No active ADMIN user found. Seed admin/users first.');
  }

  const branchCount = await prisma.branch.count();
  if (branchCount === 0) {
    throw new Error('No branches found. Seed branches first.');
  }

  // Always seed interest rates/configs (safe upserts, no new "accounts")
  await ensureInterestRatesSeeded(admin.id, new Date('2025-01-01T00:00:00.000Z'));

  // Validate staff coverage for portfolio ownership
  await ensureStaffPerBranch({ allowCreateStaff });

  return {
    adminId: admin.id,
    branches: branchCount,
    allowCreateStaff,
  };
}

async function main() {
  try {
    const result = await setupPrerequisites();
    console.log('✅ Prerequisites ready:', result);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ setupPrerequisites failed:', error);
    process.exit(1);
  });
}

/**
 * fix-npl-data-corruption.js
 * Plain JS version — no tsconfig-paths needed
 *
 * Run:
 *   DATABASE_URL="postgresql://..." node scripts/fix-npl-data-corruption.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== NPL Data Corruption Fix ===\n');

  // ── Step 1: Reset dirty fields on PAID schedules ─────────────────────────
  console.log('Step 1: Resetting daysOverdue/penaltyAmount on PAID schedules...');

  const dirtyPaidSchedules = await prisma.paymentSchedule.findMany({
    where: {
      status: 'PAID',
      OR: [
        { daysOverdue: { gt: 0 } },
        { penaltyAmount: { gt: 0 } },
        { compoundInterestAmount: { gt: 0 } },
      ],
    },
    select: { id: true, loanId: true, paymentNumber: true, daysOverdue: true, penaltyAmount: true },
  });

  console.log(`  Found ${dirtyPaidSchedules.length} PAID schedules with dirty data`);

  if (dirtyPaidSchedules.length > 0) {
    const result = await prisma.paymentSchedule.updateMany({
      where: {
        status: 'PAID',
        OR: [
          { daysOverdue: { gt: 0 } },
          { penaltyAmount: { gt: 0 } },
          { compoundInterestAmount: { gt: 0 } },
        ],
      },
      data: {
        daysOverdue: 0,
        penaltyAmount: 0,
        compoundInterestAmount: 0,
      },
    });
    console.log(`  ✅ Reset ${result.count} PAID schedules\n`);
  } else {
    console.log('  ✅ No dirty PAID schedules found\n');
  }

  // ── Step 2: Find loans marked NPL and check if they really are ───────────
  console.log('Step 2: Checking loans with status=NPL...');

  const nplLoans = await prisma.loan.findMany({
    where: { status: 'NPL' },
    select: {
      id: true,
      overdueDays: true,
      paymentSchedule: {
        select: {
          id: true,
          status: true,
          daysOverdue: true,
          paymentDate: true,
        },
      },
    },
  });

  console.log(`  Found ${nplLoans.length} loans with status=NPL`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let revertedCount = 0;
  let trueNplCount = 0;

  for (const loan of nplLoans) {
    // Recalculate maxOverdue from UNPAID/OVERDUE/PARTIAL schedules only
    const activeOverdueSchedules = loan.paymentSchedule.filter(s =>
      ['UNPAID', 'OVERDUE', 'PARTIAL'].includes(s.status) &&
      new Date(s.paymentDate) < today
    );

    const maxOverdue = activeOverdueSchedules.reduce((max, s) => {
      const days = Math.floor(
        (today.getTime() - new Date(s.paymentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return days > max ? days : max;
    }, 0);

    if (maxOverdue < 90) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: 'ACTIVE',
          overdueDays: maxOverdue,
        },
      });
      console.log(`  🔄 Reverted loan ${loan.id}: NPL → ACTIVE (maxOverdue=${maxOverdue})`);
      revertedCount++;
    } else {
      await prisma.loan.update({
        where: { id: loan.id },
        data: { overdueDays: maxOverdue },
      });
      trueNplCount++;
    }
  }

  console.log(`\n  ✅ Reverted ${revertedCount} false-positive NPL loans → ACTIVE`);
  console.log(`  ℹ️  ${trueNplCount} loans remain NPL (genuinely overdue >= 90 days)\n`);

  // ── Step 3: Sync overdueDays on all ACTIVE loans ──────────────────────────
  console.log('Step 3: Syncing overdueDays on all ACTIVE loans...');

  const activeLoans = await prisma.loan.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      overdueDays: true,
      paymentSchedule: {
        where: { status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] } },
        select: { paymentDate: true, status: true },
      },
    },
  });

  let syncedCount = 0;
  for (const loan of activeLoans) {
    const maxOverdue = loan.paymentSchedule
      .filter(s => new Date(s.paymentDate) < today)
      .reduce((max, s) => {
        const days = Math.floor(
          (today.getTime() - new Date(s.paymentDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return days > max ? days : max;
      }, 0);

    if (loan.overdueDays !== maxOverdue) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: { overdueDays: maxOverdue },
      });
      syncedCount++;
    }
  }

  console.log(`  ✅ Synced overdueDays on ${syncedCount} ACTIVE loans\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('=== Summary ===');
  console.log(`  PAID schedules cleaned : ${dirtyPaidSchedules.length}`);
  console.log(`  False NPL reverted     : ${revertedCount}`);
  console.log(`  True NPL kept          : ${trueNplCount}`);
  console.log(`  ACTIVE loans synced    : ${syncedCount}`);
  console.log('\nDone ✅');
}

main()
  .catch(e => {
    console.error('❌ Fix script failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

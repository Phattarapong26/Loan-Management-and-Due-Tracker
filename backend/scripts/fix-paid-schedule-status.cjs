/**
 * fix-paid-schedule-status.cjs
 *
 * Fixes payment_schedules that have Payment records (fully paid)
 * but still show status=OVERDUE/UNPAID in the DB.
 *
 * This is caused by seed data inconsistency — payments were created
 * but schedule status was never updated to PAID.
 *
 * Run:
 *   DATABASE_URL="postgresql://..." node scripts/fix-paid-schedule-status.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Fix Paid Schedule Status ===\n');

  // Find all schedules that are OVERDUE/UNPAID but have enough payment to cover them
  const overdueSchedules = await prisma.paymentSchedule.findMany({
    where: {
      status: { in: ['OVERDUE', 'UNPAID', 'PARTIAL'] },
    },
    select: {
      id: true,
      loanId: true,
      paymentNumber: true,
      totalPayment: true,
      status: true,
      daysOverdue: true,
      payments: {
        select: { amount: true, paymentDate: true },
      },
    },
  });

  console.log(`Found ${overdueSchedules.length} non-PAID schedules to check...\n`);

  let fixedCount = 0;
  const loanIdsToRecheck = new Set();

  for (const schedule of overdueSchedules) {
    const totalPaid = schedule.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDue = Number(schedule.totalPayment);

    if (totalPaid >= totalDue) {
      // This schedule is fully paid — fix it
      const lastPayment = schedule.payments.sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )[0];

      await prisma.paymentSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'PAID',
          daysOverdue: 0,
          penaltyAmount: 0,
          compoundInterestAmount: 0,
          paidAt: lastPayment?.paymentDate ?? new Date(),
        },
      });

      console.log(`  ✅ Fixed schedule #${schedule.paymentNumber} (loan ${schedule.loanId.substring(0, 8)}): ${schedule.status} → PAID`);
      fixedCount++;
      loanIdsToRecheck.add(schedule.loanId);
    }
  }

  console.log(`\nFixed ${fixedCount} schedules\n`);

  // Now recheck loan statuses for affected loans
  console.log(`Rechecking ${loanIdsToRecheck.size} affected loans...\n`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let revertedNpl = 0;

  for (const loanId of loanIdsToRecheck) {
    // Re-fetch fresh schedule data after fixes
    const schedules = await prisma.paymentSchedule.findMany({
      where: {
        loanId,
        status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] },
      },
      select: { paymentDate: true, status: true },
    });

    const overdueOnly = schedules.filter(s => new Date(s.paymentDate) < today);
    const maxOverdue = overdueOnly.reduce((max, s) => {
      const days = Math.floor(
        (today.getTime() - new Date(s.paymentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return days > max ? days : max;
    }, 0);

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: { status: true },
    });

    if (!loan) continue;

    if (loan.status === 'NPL' && maxOverdue < 90) {
      await prisma.loan.update({
        where: { id: loanId },
        data: { status: 'ACTIVE', overdueDays: maxOverdue },
      });
      console.log(`  🔄 Loan ${loanId.substring(0, 8)}: NPL → ACTIVE (maxOverdue=${maxOverdue})`);
      revertedNpl++;
    } else {
      await prisma.loan.update({
        where: { id: loanId },
        data: { overdueDays: maxOverdue },
      });
      console.log(`  ℹ️  Loan ${loanId.substring(0, 8)}: stays ${loan.status} (maxOverdue=${maxOverdue})`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Schedules fixed (OVERDUE→PAID) : ${fixedCount}`);
  console.log(`  Loans reverted (NPL→ACTIVE)    : ${revertedNpl}`);
  console.log('\nDone ✅');
}

main()
  .catch(e => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

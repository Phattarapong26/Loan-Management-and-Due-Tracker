/**
 * test-sync-job.cjs
 * Simulates the fixed syncPaymentSchedule logic against production DB
 * to verify no ACTIVE loans would be incorrectly promoted to NPL.
 *
 * Run:
 *   DATABASE_URL="postgresql://..." node scripts/test-sync-job.cjs
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Snapshot before ──────────────────────────────────────────
  console.log('=== BEFORE SYNC SNAPSHOT ===\n');

  const allLoans = await p.loan.findMany({
    select: {
      id: true, status: true, overdueDays: true,
      customer: { select: { businessName: true } },
    },
  });

  const statusCount = {};
  for (const l of allLoans) {
    statusCount[l.status] = (statusCount[l.status] || 0) + 1;
  }
  console.log('Loan status counts:', JSON.stringify(statusCount));

  const dirtyPaid = await p.paymentSchedule.count({
    where: { status: 'PAID', daysOverdue: { gt: 0 } },
  });
  console.log('PAID schedules with daysOverdue > 0 (dirty):', dirtyPaid);

  // ── Simulate fixed sync logic ─────────────────────────────────
  console.log('\n=== SIMULATING FIXED syncPaymentSchedule ===\n');

  const schedules = await p.paymentSchedule.findMany({
    include: { loan: { select: { id: true, status: true, overdueDays: true } } },
    orderBy: { paymentDate: 'asc' },
  });

  const loanIds = [...new Set(schedules.map(s => s.loanId))];

  let nplPromoted = 0;
  let activeKept = 0;
  let alreadyNpl = 0;
  let overdueDaysMismatch = 0;
  const promotedLoans = [];

  for (const lid of loanIds) {
    const loanSchedules = schedules.filter(s => s.loanId === lid);
    const currentLoan = loanSchedules[0]?.loan;
    if (!currentLoan) continue;

    // FIXED: only count UNPAID/OVERDUE/PARTIAL schedules
    const maxOverdue = loanSchedules
      .filter(s => ['UNPAID', 'OVERDUE', 'PARTIAL'].includes(s.status))
      .filter(s => new Date(s.paymentDate) < today)
      .reduce((max, s) => {
        const days = Math.floor(
          (today.getTime() - new Date(s.paymentDate).getTime()) / 86400000
        );
        return Math.max(max, days);
      }, 0);

    if (currentLoan.status === 'ACTIVE') {
      if (maxOverdue >= 90) {
        nplPromoted++;
        promotedLoans.push({ id: lid, maxOverdue });
      } else {
        activeKept++;
      }
      // Check if stored overdueDays matches what sync would write
      if (currentLoan.overdueDays !== maxOverdue) overdueDaysMismatch++;
    } else if (currentLoan.status === 'NPL') {
      alreadyNpl++;
    }
  }

  console.log('Would promote ACTIVE → NPL :', nplPromoted, '(expected: 0)');
  if (promotedLoans.length > 0) {
    promotedLoans.forEach(l => console.log('  ⚠️  loan', l.id, 'maxOverdue=', l.maxOverdue));
  }
  console.log('Would keep ACTIVE          :', activeKept);
  console.log('Already NPL (unchanged)    :', alreadyNpl);
  console.log('overdueDays would be updated:', overdueDaysMismatch);

  // ── Verify PAID schedules won't affect maxOverdue ─────────────
  console.log('\n=== VERIFYING PAID SCHEDULE ISOLATION ===\n');

  // Find loans where PAID schedules have daysOverdue > 0
  // (these would have caused false NPL before the fix)
  const paidWithOverdue = await p.paymentSchedule.findMany({
    where: { status: 'PAID', daysOverdue: { gt: 0 } },
    select: { loanId: true, paymentNumber: true, daysOverdue: true },
  });

  if (paidWithOverdue.length === 0) {
    console.log('✅ No PAID schedules with daysOverdue > 0 — DB is clean');
  } else {
    console.log('⚠️  Found', paidWithOverdue.length, 'PAID schedules with daysOverdue > 0');
    console.log('   These would have caused false NPL BEFORE the fix.');
    console.log('   With the fix, they are IGNORED in maxOverdue calculation.');
    paidWithOverdue.slice(0, 5).forEach(s =>
      console.log('   loan', s.loanId.substring(0, 8), 'schedule#', s.paymentNumber, 'daysOverdue=', s.daysOverdue)
    );
  }

  // ── Final verdict ─────────────────────────────────────────────
  console.log('\n=== FINAL VERDICT ===\n');

  const pass1 = nplPromoted === 0;
  const pass2 = dirtyPaid === 0;

  console.log(pass1 ? '✅ PASS' : '❌ FAIL', '— sync job will NOT incorrectly promote ACTIVE loans to NPL');
  console.log(pass2 ? '✅ PASS' : '⚠️  WARN', '— PAID schedules dirty data:', dirtyPaid, 'records');
  console.log(overdueDaysMismatch > 0 ? '📝 INFO' : '✅ PASS',
    '—', overdueDaysMismatch, 'loans have stale overdueDays (will be corrected on next sync)');

  if (pass1 && pass2) {
    console.log('\n✅ ALL CHECKS PASSED — safe to push');
  } else {
    console.log('\n⚠️  Some checks need attention before push');
  }
}

main()
  .catch(e => { console.error('Script failed:', e); process.exit(1); })
  .finally(() => p.$disconnect());

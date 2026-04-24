/**
 * check-debt-amounts.cjs
 * Verifies that debt amounts are consistent across all calculation methods.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Portfolio loans
  const portfolioLoans = await p.loan.findMany({
    where: { status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] } },
    select: {
      id: true, status: true,
      outstandingBalance: true,
      principal: true,
      remainingAmount: true,
    }
  });

  const totalOutstanding = portfolioLoans.reduce((s, l) => s + Number(l.outstandingBalance || 0), 0);
  const totalPrincipal = portfolioLoans.reduce((s, l) => s + Number(l.principal || 0), 0);
  const totalRemaining = portfolioLoans.reduce((s, l) => s + Number(l.remainingAmount || 0), 0);

  console.log('=== Portfolio Loan Amounts ===');
  console.log('Total loans:', portfolioLoans.length);
  console.log('Sum outstandingBalance:', totalOutstanding.toFixed(2));
  console.log('Sum principal:', totalPrincipal.toFixed(2));
  console.log('Sum remainingAmount:', totalRemaining.toFixed(2));

  // 2. Aging bucket uses earliest unpaid schedule amount (installment, NOT outstanding)
  const activeLoanIds = portfolioLoans.map(l => l.id);
  const schedules = await p.paymentSchedule.findMany({
    where: {
      loanId: { in: activeLoanIds },
      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
    },
    select: { loanId: true, totalPayment: true, paymentDate: true }
  });

  const earliest = new Map();
  schedules.forEach(s => {
    const ex = earliest.get(s.loanId);
    if (!ex || new Date(s.paymentDate) < new Date(ex.paymentDate)) {
      earliest.set(s.loanId, {
        paymentDate: s.paymentDate,
        amount: Number(s.totalPayment || 0)
      });
    }
  });

  const totalScheduleAmount = Array.from(earliest.values()).reduce((s, v) => s + v.amount, 0);

  console.log('\n=== Aging Bucket totalAmount (earliest unpaid installment) ===');
  console.log('Loans with unpaid schedules:', earliest.size);
  console.log('Sum of earliest installment amounts:', totalScheduleAmount.toFixed(2));
  console.log('NOTE: This is installment amount per period, NOT total outstanding balance');
  console.log('BUG: Aging bucket shows installment amount instead of outstanding balance');

  // 3. What aging bucket SHOULD show (outstanding balance per loan)
  const correctBucketTotal = portfolioLoans.reduce((s, l) => s + Number(l.outstandingBalance || 0), 0);
  console.log('\nCorrect totalAmount for aging bucket should be:', correctBucketTotal.toFixed(2));
  console.log('Currently showing:', totalScheduleAmount.toFixed(2));
  console.log('Difference:', (correctBucketTotal - totalScheduleAmount).toFixed(2));

  // 4. Dashboard vs report consistency
  const dashActive = await p.loan.aggregate({
    where: { status: { in: ['DISBURSED', 'ACTIVE', 'NPL'] } },
    _sum: { outstandingBalance: true }
  });
  const dashAll = await p.loan.aggregate({
    where: { status: { in: ['DISBURSED', 'ACTIVE', 'DEFAULTED', 'NPL'] } },
    _sum: { outstandingBalance: true }
  });

  console.log('\n=== Dashboard Amount Consistency ===');
  console.log('DISBURSED+ACTIVE+NPL (dashboard):', Number(dashActive._sum.outstandingBalance || 0).toFixed(2));
  console.log('DISBURSED+ACTIVE+DEFAULTED+NPL (portfolio):', Number(dashAll._sum.outstandingBalance || 0).toFixed(2));
  console.log('DEFAULTED loans excluded from dashboard:', (Number(dashAll._sum.outstandingBalance || 0) - Number(dashActive._sum.outstandingBalance || 0)).toFixed(2));

  // 5. Per-loan breakdown
  console.log('\n=== Per-loan: outstandingBalance vs installment amount ===');
  portfolioLoans.forEach(l => {
    const sched = earliest.get(l.id);
    const schedAmt = sched ? sched.amount : 0;
    const outstanding = Number(l.outstandingBalance || 0);
    console.log(
      l.id.substring(0, 8),
      l.status.padEnd(10),
      'outstanding:', outstanding.toFixed(0).padStart(12),
      'installment:', schedAmt.toFixed(0).padStart(10),
      sched ? '' : '(no unpaid schedule)'
    );
  });
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => p.$disconnect());

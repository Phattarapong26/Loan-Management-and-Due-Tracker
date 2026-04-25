const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== Payment Data Verification ===\n');

  // 1. Summary counts
  const [payments, schedules, receipts] = await Promise.all([
    p.payment.count(),
    p.paymentSchedule.groupBy({ by: ['status'], _count: true }),
    p.paymentReceipt.count(),
  ]);

  console.log('=== Counts ===');
  console.log('Payment records:', payments);
  console.log('Payment receipts:', receipts);
  console.log('Schedule breakdown:');
  schedules.forEach(s => console.log(`  ${s.status.padEnd(10)}: ${s._count}`));

  // 2. Check: PAID schedules must have at least 1 payment record
  const paidSchedules = await p.paymentSchedule.findMany({
    where: { status: 'PAID' },
    select: { id: true, loanId: true, paymentNumber: true, totalPayment: true, payments: { select: { amount: true } } }
  });

  let missingPayments = 0;
  let underpaid = 0;
  for (const s of paidSchedules) {
    const totalPaid = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (s.payments.length === 0) missingPayments++;
    else if (totalPaid < Number(s.totalPayment) * 0.99) underpaid++; // allow 1% tolerance
  }

  console.log('\n=== PAID Schedule Integrity ===');
  console.log(`Total PAID schedules: ${paidSchedules.length}`);
  console.log(`Missing payment records: ${missingPayments === 0 ? '✅ 0' : '❌ ' + missingPayments}`);
  console.log(`Underpaid schedules: ${underpaid === 0 ? '✅ 0' : '⚠️  ' + underpaid}`);

  // 3. Check: OVERDUE schedules should NOT have full payment
  const overdueWithFullPayment = await p.paymentSchedule.findMany({
    where: { status: 'OVERDUE' },
    select: { id: true, totalPayment: true, daysOverdue: true, payments: { select: { amount: true } } }
  });
  const overdueButPaid = overdueWithFullPayment.filter(s => {
    const paid = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return paid >= Number(s.totalPayment) * 0.99;
  });
  console.log(`\nOVERDUE schedules with full payment (should be 0): ${overdueButPaid.length === 0 ? '✅ 0' : '❌ ' + overdueButPaid.length}`);

  // 4. Check: outstanding balance vs actual remaining
  const loans = await p.loan.findMany({
    where: { status: { in: ['ACTIVE', 'NPL'] } },
    select: {
      id: true, contract_number: true, status: true,
      outstandingBalance: true, principal: true,
      payments: { select: { amount: true } }
    }
  });

  console.log('\n=== Outstanding Balance Check (sample) ===');
  let balanceOk = 0, balanceMismatch = 0;
  for (const loan of loans) {
    const totalPaid = loan.payments.reduce((s, p) => s + Number(p.amount), 0);
    const expectedOutstanding = Number(loan.principal) - totalPaid;
    const actualOutstanding = Number(loan.outstandingBalance);
    const diff = Math.abs(expectedOutstanding - actualOutstanding);
    if (diff > 100) { // allow 100 THB tolerance for rounding
      balanceMismatch++;
      console.log(`  ⚠️  ${loan.contract_number}: expected ${expectedOutstanding.toFixed(0)} got ${actualOutstanding.toFixed(0)} (diff ${diff.toFixed(0)})`);
    } else {
      balanceOk++;
    }
  }
  console.log(`Balance OK: ${balanceOk} | Mismatch: ${balanceMismatch === 0 ? '✅ 0' : '❌ ' + balanceMismatch}`);

  // 5. Sample: show 3 loans with their payment history
  console.log('\n=== Sample Loan Payment History ===');
  const sampleLoans = await p.loan.findMany({
    take: 3,
    orderBy: { contract_number: 'asc' },
    select: {
      contract_number: true, status: true, outstandingBalance: true,
      customer: { select: { businessName: true } },
      paymentSchedule: {
        where: { status: 'PAID' },
        select: { paymentNumber: true, totalPayment: true, paidAt: true },
        orderBy: { paymentNumber: 'asc' },
        take: 3
      },
      payments: { select: { amount: true, paymentDate: true }, orderBy: { paymentDate: 'asc' }, take: 3 }
    }
  });

  for (const loan of sampleLoans) {
    console.log(`\n${loan.contract_number} | ${loan.customer?.businessName} | ${loan.status}`);
    console.log(`  Outstanding: ฿${Number(loan.outstandingBalance).toLocaleString('th-TH')}`);
    console.log(`  PAID schedules (first 3): ${loan.paymentSchedule.map(s => `#${s.paymentNumber}`).join(', ') || 'none'}`);
    console.log(`  Payment records (first 3): ${loan.payments.map(p => `฿${Number(p.amount).toFixed(0)}`).join(', ') || 'none'}`);
  }

  console.log('\n=== RESULT ===');
  const allOk = missingPayments === 0 && overdueButPaid.length === 0 && balanceMismatch === 0;
  console.log(allOk ? '✅ All payment data is consistent' : '⚠️  Some inconsistencies found (see above)');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); }).finally(() => p.$disconnect());

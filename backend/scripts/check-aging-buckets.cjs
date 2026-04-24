/**
 * check-aging-buckets.cjs
 * Simulates the realtime bucket roll rates service calculation
 * to verify aging buckets and roll rates are correct.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function getAgingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'CURRENT';
  if (daysOverdue <= 30) return 'DPD_1_30';
  if (daysOverdue <= 60) return 'DPD_31_60';
  if (daysOverdue <= 90) return 'DPD_61_90';
  return 'NPL';
}

async function getLoanBucketsAsOf(asOfDate, branchId) {
  const today = asOfDate;

  // Get active portfolio loans
  const activeLoans = await p.loan.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] },
    },
    select: { id: true, outstandingBalance: true },
  });

  const activeLoanIds = activeLoans.map(l => l.id);
  const loanBalances = new Map(activeLoans.map(l => [l.id, Number(l.outstandingBalance || 0)]));

  // Get unpaid schedules
  const schedules = await p.paymentSchedule.findMany({
    where: {
      loanId: { in: activeLoanIds },
      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
    },
    select: { id: true, paymentDate: true, totalPayment: true, loanId: true },
  });

  // Earliest unpaid schedule per loan
  const loanEarliestSchedule = new Map();
  schedules.forEach(s => {
    const existing = loanEarliestSchedule.get(s.loanId);
    if (!existing || new Date(s.paymentDate) < new Date(existing.paymentDate)) {
      loanEarliestSchedule.set(s.loanId, { paymentDate: new Date(s.paymentDate), amount: Number(s.totalPayment || 0) });
    }
  });

  const loanBuckets = new Map();
  for (const loanId of activeLoanIds) {
    const earliest = loanEarliestSchedule.get(loanId);
    if (!earliest) {
      loanBuckets.set(loanId, { bucket: 'CURRENT', amount: loanBalances.get(loanId) || 0 });
      continue;
    }
    const msPerDay = 86400000;
    const daysOverdue = Math.floor((today.getTime() - earliest.paymentDate.getTime()) / msPerDay);
    const bucket = getAgingBucket(daysOverdue);
    loanBuckets.set(loanId, { bucket, amount: loanBalances.get(loanId) || 0 });
  }

  // Build distribution
  const bucketMap = new Map();
  loanBuckets.forEach((data, loanId) => {
    if (!bucketMap.has(data.bucket)) bucketMap.set(data.bucket, { count: 0, totalAmount: 0 });
    const b = bucketMap.get(data.bucket);
    b.count++;
    b.totalAmount += data.amount;
  });

  const totalCount = activeLoanIds.length;
  const allBuckets = ['CURRENT', 'DPD_1_30', 'DPD_31_60', 'DPD_61_90', 'NPL'];
  const distribution = allBuckets.map(bucket => {
    const data = bucketMap.get(bucket) || { count: 0, totalAmount: 0 };
    return { bucket, count: data.count, totalAmount: data.totalAmount, percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0 };
  });

  return { loanBuckets, distribution, totalCount };
}

async function main() {
  const today = new Date(); today.setHours(23, 59, 59, 999);

  console.log('=== Simulating Realtime Bucket Service (All Branches) ===\n');
  const { distribution: allDist, totalCount: allTotal } = await getLoanBucketsAsOf(today);
  console.log('Total portfolio loans:', allTotal);
  allDist.forEach(b => console.log(`  ${b.bucket.padEnd(12)}: ${b.count} loans (${b.percentage.toFixed(1)}%) | ฿${b.totalAmount.toLocaleString()}`));

  // Compare with DB loan.overdueDays
  console.log('\n=== DB loan.overdueDays (stored) vs Realtime Calculation ===\n');
  const loans = await p.loan.findMany({
    where: { status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] } },
    select: { id: true, status: true, overdueDays: true, customer: { select: { businessName: true } } }
  });

  const storedBuckets = { CURRENT: 0, DPD_1_30: 0, DPD_31_60: 0, DPD_61_90: 0, NPL: 0 };
  loans.forEach(l => {
    const b = getAgingBucket(l.overdueDays || 0);
    storedBuckets[b]++;
  });

  console.log('From stored overdueDays:');
  Object.entries(storedBuckets).forEach(([b, c]) => console.log(`  ${b.padEnd(12)}: ${c}`));

  // Check discrepancies
  console.log('\n=== Discrepancy Check ===\n');
  const { distribution: realtimeDist } = await getLoanBucketsAsOf(today);
  let hasDiscrepancy = false;
  realtimeDist.forEach(b => {
    const stored = storedBuckets[b.bucket] || 0;
    if (b.count !== stored) {
      console.log(`  ⚠️  ${b.bucket}: realtime=${b.count} vs stored=${stored} (diff=${b.count - stored})`);
      hasDiscrepancy = true;
    }
  });
  if (!hasDiscrepancy) console.log('  ✅ No discrepancies — realtime matches stored overdueDays');

  // Check roll rates data availability
  console.log('\n=== Roll Rates Data Availability ===\n');
  const oneMonthAgo = new Date(today); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const { loanBuckets: prevBuckets } = await getLoanBucketsAsOf(oneMonthAgo);
  const { loanBuckets: currBuckets } = await getLoanBucketsAsOf(today);

  const transitions = new Map();
  const allLoanIds = new Set([...prevBuckets.keys(), ...currBuckets.keys()]);
  allLoanIds.forEach(loanId => {
    const prev = prevBuckets.get(loanId)?.bucket || 'CURRENT';
    const curr = currBuckets.get(loanId)?.bucket || 'CURRENT';
    const key = `${prev}->${curr}`;
    if (!transitions.has(key)) transitions.set(key, 0);
    transitions.set(key, transitions.get(key) + 1);
  });

  console.log('Loan transitions (prev month → now):');
  transitions.forEach((count, key) => console.log(`  ${key}: ${count} loans`));

  const hasRollRates = [...transitions.keys()].some(k => k.includes('->') && k.split('->')[0] !== k.split('->')[1]);
  console.log(hasRollRates ? '\n✅ Roll rates data available' : '\n⚠️  All loans stayed in same bucket — roll rates will show 0%');
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());

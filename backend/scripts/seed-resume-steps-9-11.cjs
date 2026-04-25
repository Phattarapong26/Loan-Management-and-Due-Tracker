/**
 * seed-resume-steps-9-11.cjs
 * Resumes seed from step 9 (payment schedules) using existing loans/disbursements.
 * Run when loans exist but payment schedules/payments are missing.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const CURRENT_DATE = new Date('2026-03-10');

function addMonths(date, months) {
  const r = new Date(date);
  r.setMonth(r.getMonth() + months);
  return r;
}
function addDays(date, days) {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}
function getFirstDayOfNextMonth(date) {
  const r = new Date(date);
  r.setDate(1);
  r.setMonth(r.getMonth() + 1);
  r.setHours(0, 0, 0, 0);
  return r;
}
function clampDate(date, min, max) {
  if (date < min) return new Date(min);
  if (date > max) return new Date(max);
  return date;
}
function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randomDecimal(a, b) { return a + Math.random() * (b - a); }

// Determine scenario from customer name
function getScenario(businessName) {
  if (businessName.includes('ช้าจ่าย')) return 'LATE_PAYER';
  if (businessName.includes('มีปัญหา')) return 'NPL_GRADUAL';
  return 'GOOD_PAYER';
}

async function main() {
  console.log('=== Resume Seed: Steps 9-11 ===\n');

  // Load existing loans with officer info
  const loans = await p.loan.findMany({
    where: { deletedAt: null },
    include: {
      customer: { select: { id: true, businessName: true } },
      officer: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${loans.length} loans to process`);

  // ── STEP 9: Payment Schedules ──────────────────────────────────
  console.log('\n📅 Step 9: Creating payment schedules...');
  const createdSchedules = [];

  for (const lr of loans) {
    const scenario = getScenario(lr.customer?.businessName || '');
    const loanAmount = Number(lr.principal);
    const interestRate = Number(lr.interestRate);
    const termMonths = lr.termMonths;
    const disbursedOn = lr.disbursementDate ? new Date(lr.disbursementDate) : addDays(new Date(lr.createdAt), 7);
    const firstPaymentDate = getFirstDayOfNextMonth(disbursedOn);
    const monthlyRate = interestRate / 100 / 12;
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    let remainingPrincipal = loanAmount;

    for (let month = 1; month <= termMonths; month++) {
      const dueDate = addMonths(firstPaymentDate, month - 1);
      const interestPayment = remainingPrincipal * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);

      const daysSinceDue = Math.floor((CURRENT_DATE.getTime() - dueDate.getTime()) / 86400000);

      let paymentStatus = 'UNPAID';
      let daysOverdue = 0;

      if (dueDate > CURRENT_DATE) {
        paymentStatus = 'UNPAID';
      } else if (scenario === 'GOOD_PAYER' || scenario === 'EARLY_PAYER') {
        paymentStatus = 'PAID';
      } else if (scenario === 'LATE_PAYER') {
        paymentStatus = Math.random() < 0.7 ? 'PAID' : (daysSinceDue > 30 ? 'OVERDUE' : 'UNPAID');
        daysOverdue = paymentStatus === 'OVERDUE' ? daysSinceDue : 0;
      } else if (scenario.startsWith('NPL')) {
        if (month <= 3) {
          paymentStatus = Math.random() < 0.5 ? 'PAID' : 'PARTIAL';
        } else if (daysSinceDue >= 90) {
          paymentStatus = 'OVERDUE';
          daysOverdue = daysSinceDue;
        } else if (daysSinceDue > 0) {
          paymentStatus = Math.random() < 0.4 ? 'PARTIAL' : 'UNPAID';
          daysOverdue = daysSinceDue;
        }
      }

      const schedule = await p.paymentSchedule.create({
        data: {
          loanId: lr.id,
          paymentNumber: month,
          paymentDate: dueDate,
          principalAmount: principalPayment,
          interestAmount: interestPayment,
          totalPayment: monthlyPayment,
          remainingBalance: remainingPrincipal,
          status: paymentStatus,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        }
      });

      createdSchedules.push({ ...schedule, scenario, loanRecord: lr });
    }
  }

  console.log(`  → Payment schedules: ${createdSchedules.length}`);

  // ── STEP 10: Payment Records ───────────────────────────────────
  console.log('\n💳 Step 10: Creating payment records...');
  const createdPayments = [];

  for (const sr of createdSchedules) {
    if (sr.status !== 'PAID' && sr.status !== 'PARTIAL') continue;

    const lr = sr.loanRecord;
    const disbursedOn = lr.disbursementDate ? new Date(lr.disbursementDate) : addDays(new Date(lr.createdAt), 7);
    let paymentAmount = Number(sr.totalPayment);
    let paymentDate = new Date(sr.paymentDate);

    if (sr.status === 'PARTIAL') paymentAmount *= randomDecimal(0.3, 0.8);

    if (sr.scenario === 'LATE_PAYER') {
      paymentDate = clampDate(addDays(sr.paymentDate, randomBetween(1, 15)), disbursedOn, CURRENT_DATE);
    } else if (sr.scenario === 'EARLY_PAYER') {
      paymentDate = clampDate(addDays(sr.paymentDate, -randomBetween(1, 5)), disbursedOn, CURRENT_DATE);
    } else {
      paymentDate = clampDate(paymentDate, disbursedOn, CURRENT_DATE);
    }

    const payment = await p.payment.create({
      data: {
        loanId: lr.id,
        paymentScheduleId: sr.id,
        amount: paymentAmount,
        paymentDate,
        paymentMethod: ['BANK_TRANSFER', 'CASH', 'CHECK'][Math.floor(Math.random() * 3)],
        paymentType: sr.status === 'PAID' ? 'ON_TIME' : 'LATE',
        reference: `PAY${lr.contract_number}${String(sr.paymentNumber).padStart(2, '0')}`,
        createdBy: lr.officer.id,
        notes: sr.status === 'PARTIAL' ? 'ชำระบางส่วน' : undefined,
      }
    });
    createdPayments.push(payment);

    // Update outstanding balance
    await p.$executeRaw`
      UPDATE "loans"
      SET "outstanding_balance" = GREATEST(0, "outstanding_balance" - ${paymentAmount})
      WHERE "id" = ${lr.id}
    `;

    await p.transaction.create({
      data: {
        userId: lr.officer.id,
        loanId: lr.id,
        type: 'LOAN_PAYMENT',
        amount: paymentAmount,
        status: 'COMPLETED',
        description: `ชำระงวดที่ ${sr.paymentNumber} — ${lr.contract_number}`,
        reference: payment.reference,
        processedAt: paymentDate,
        metadata: { paymentId: payment.id, scheduleId: sr.id, paymentNumber: sr.paymentNumber },
      }
    });
  }

  console.log(`  → Payment records: ${createdPayments.length}`);

  // ── STEP 11: Collection Actions ────────────────────────────────
  console.log('\n📞 Step 11: Creating collection actions...');
  const createdActions = [];
  const actionTypes = ['CALL', 'SMS', 'EMAIL', 'VISIT', 'LEGAL'];
  const overdueSchedules = createdSchedules.filter(s => (s.status === 'OVERDUE' || s.status === 'UNPAID') && s.daysOverdue > 0);

  for (const sr of overdueSchedules) {
    const lr = sr.loanRecord;
    const numActions = sr.daysOverdue >= 90 ? randomBetween(4, 6) : sr.daysOverdue >= 30 ? randomBetween(2, 4) : randomBetween(1, 2);

    for (let j = 0; j < numActions; j++) {
      const halfDays = Math.ceil(sr.daysOverdue / 2);
      const actionDate = addDays(sr.paymentDate, randomBetween(halfDays, sr.daysOverdue));
      if (actionDate > CURRENT_DATE) continue;

      const priority = sr.daysOverdue >= 90 ? 'HIGH' : sr.daysOverdue >= 30 ? 'MEDIUM' : 'LOW';
      const action = await p.collectionAction.create({
        data: {
          customerId: lr.customerId,
          loanId: lr.id,
          scheduleId: sr.id,
          actionType: actionTypes[j % actionTypes.length],
          agentId: lr.officer.id,
          status: 'COMPLETED',
          priority,
          notes: `ติดตาม ${actionTypes[j % actionTypes.length]} ครั้งที่ ${j + 1} (ค้าง ${sr.daysOverdue} วัน)`,
          result: sr.daysOverdue >= 90 ? 'NO_RESPONSE' : Math.random() < 0.3 ? 'PAYMENT_PROMISE' : 'NO_RESPONSE',
          followUpDate: addDays(actionDate, randomBetween(7, 30)),
          completedAt: actionDate,
        }
      });
      createdActions.push(action);
    }
  }

  console.log(`  → Collection actions: ${createdActions.length}`);

  // ── SUMMARY ────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Resume Seed Summary');
  console.log('═'.repeat(50));
  console.log(`  Payment schedules : ${createdSchedules.length}`);
  console.log(`  Payment records   : ${createdPayments.length}`);
  console.log(`  Collection actions: ${createdActions.length}`);
  console.log('\n✅ Done — ready for backfill');
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); }).finally(() => p.$disconnect());

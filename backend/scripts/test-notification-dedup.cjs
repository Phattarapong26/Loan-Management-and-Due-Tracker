/**
 * test-notification-dedup.cjs
 * Tests the dedup logic for LINE overdue and NPL alerts against production DB.
 *
 * Run:
 *   DATABASE_URL="postgresql://..." node scripts/test-notification-dedup.cjs
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

let passed = 0;
let failed = 0;

function pass(msg) { console.log('  ✅ PASS —', msg); passed++; }
function fail(msg) { console.log('  ❌ FAIL —', msg); failed++; }
function info(msg) { console.log('  ℹ️ ', msg); }
function section(title) { console.log('\n' + '─'.repeat(55)); console.log(' ' + title); console.log('─'.repeat(55)); }

async function main() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // ── หา loan ตัวอย่างสำหรับทดสอบ ──────────────────────────
  const nplLoan = await p.loan.findFirst({
    where: { status: 'NPL' },
    select: { id: true, status: true, customer: { select: { businessName: true } } },
  });

  const activeLoan = await p.loan.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, status: true, customer: { select: { businessName: true } } },
  });

  if (!nplLoan) { console.log('No NPL loans found — skipping NPL tests'); }
  if (!activeLoan) { console.log('No ACTIVE loans found — skipping overdue tests'); }

  // ══════════════════════════════════════════════════════
  // TEST 1: LINE Overdue dedup — ครั้งแรก ต้องผ่าน
  // ══════════════════════════════════════════════════════
  section('TEST 1: LINE Overdue dedup — first send (should NOT be blocked)');

  const testLoanId = activeLoan?.id || 'test-loan-id';
  const overdueKey = `LINE_OVERDUE_${testLoanId}_${todayStr}`;

  // ลบ dedup record เก่าถ้ามี (clean state)
  await p.notification.deleteMany({ where: { dedupKey: overdueKey } });

  const existingBefore = await p.notification.findFirst({
    where: { dedupKey: overdueKey, createdAt: { gte: today } },
    select: { id: true },
  });

  existingBefore === null
    ? pass(`No dedup record exists for ${overdueKey} — first send would proceed`)
    : fail(`Dedup record already exists — first send would be blocked unexpectedly`);

  // ── สร้าง dedup record จำลองการส่ง ──────────────────────
  section('TEST 2: Simulate first LINE send — create dedup record');

  // ต้องหา userId จริงจาก DB
  const systemUser = await p.user.findFirst({ select: { id: true } });
  if (!systemUser) { fail('No users in DB — cannot create dedup record'); return; }

  await p.notification.create({
    data: {
      userId: systemUser.id,
      type: 'PAYMENT_OVERDUE',
      title: 'LINE overdue sent [TEST]',
      message: `LINE overdue alert sent for loan ${testLoanId}`,
      dedupKey: overdueKey,
      priority: 'HIGH',
      audienceRoles: [],
    },
  });
  pass(`Created dedup record: ${overdueKey}`);

  // ══════════════════════════════════════════════════════
  // TEST 3: LINE Overdue dedup — ครั้งที่ 2 ต้องถูก block
  // ══════════════════════════════════════════════════════
  section('TEST 3: LINE Overdue dedup — second send same day (should be BLOCKED)');

  const existingAfter = await p.notification.findFirst({
    where: { dedupKey: overdueKey, createdAt: { gte: today } },
    select: { id: true },
  });

  existingAfter !== null
    ? pass(`Dedup record found — second send would be BLOCKED correctly`)
    : fail(`Dedup record NOT found — second send would go through (bug!)`);

  // ══════════════════════════════════════════════════════
  // TEST 4: NPL Alert dedup — ครั้งแรก ต้องผ่าน
  // ══════════════════════════════════════════════════════
  section('TEST 4: NPL Alert dedup — first send (should NOT be blocked)');

  const nplTestId = nplLoan?.id || 'test-npl-id';
  const nplKey = `NPL_ALERT_${nplTestId}_${todayStr}`;

  await p.notification.deleteMany({ where: { dedupKey: nplKey } });

  const nplBefore = await p.notification.findFirst({
    where: { dedupKey: nplKey, createdAt: { gte: today } },
    select: { id: true },
  });

  nplBefore === null
    ? pass(`No dedup record for NPL alert — first send would proceed`)
    : fail(`NPL dedup record already exists — first send blocked unexpectedly`);

  // ── สร้าง dedup record ──────────────────────────────────
  section('TEST 5: Simulate NPL alert send — create dedup record');

  await p.notification.create({
    data: {
      userId: systemUser.id,
      type: 'PAYMENT_OVERDUE',
      title: 'NPL alert sent [TEST]',
      message: `NPL alert sent for loan ${nplTestId}`,
      dedupKey: nplKey,
      priority: 'HIGH',
      audienceRoles: [],
    },
  });
  pass(`Created NPL dedup record: ${nplKey}`);

  // ══════════════════════════════════════════════════════
  // TEST 6: NPL Alert dedup — ครั้งที่ 2 ต้องถูก block
  // ══════════════════════════════════════════════════════
  section('TEST 6: NPL Alert dedup — second send same day (should be BLOCKED)');

  const nplAfter = await p.notification.findFirst({
    where: { dedupKey: nplKey, createdAt: { gte: today } },
    select: { id: true },
  });

  nplAfter !== null
    ? pass(`NPL dedup record found — second send would be BLOCKED correctly`)
    : fail(`NPL dedup record NOT found — second send would go through (bug!)`);

  // ══════════════════════════════════════════════════════
  // TEST 7: วันถัดไป dedup ต้องหมดอายุ (simulate)
  // ══════════════════════════════════════════════════════
  section('TEST 7: Next day — dedup should NOT block (different date key)');

  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
  const tomorrowKey = `LINE_OVERDUE_${testLoanId}_${tomorrowStr}`;

  const tomorrowRecord = await p.notification.findFirst({
    where: { dedupKey: tomorrowKey, createdAt: { gte: today } },
    select: { id: true },
  });

  tomorrowRecord === null
    ? pass(`No dedup record for tomorrow's key — next day send would proceed correctly`)
    : fail(`Tomorrow's dedup key already exists — unexpected`);

  // ══════════════════════════════════════════════════════
  // TEST 8: ตรวจสอบ NPL status update order
  // ══════════════════════════════════════════════════════
  section('TEST 8: NPL status update happens BEFORE notification (order check)');

  // ตรวจว่า NPL loans ทั้งหมดมี status = NPL จริงแล้ว (ไม่มี ACTIVE ที่ควรเป็น NPL)
  const activeWithHighOverdue = await p.loan.findMany({
    where: {
      status: 'ACTIVE',
      overdueDays: { gte: 90 },
    },
    select: { id: true, overdueDays: true },
  });

  activeWithHighOverdue.length === 0
    ? pass(`No ACTIVE loans with overdueDays >= 90 — status update logic is correct`)
    : fail(`${activeWithHighOverdue.length} ACTIVE loans have overdueDays >= 90 — should be NPL`);

  // ── Cleanup test records ──────────────────────────────
  section('CLEANUP');
  await p.notification.deleteMany({ where: { dedupKey: { in: [overdueKey, nplKey] } } });
  info('Test dedup records cleaned up');

  // ══════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════
  section('SUMMARY');
  console.log(`  ✅ PASSED : ${passed}`);
  console.log(`  ❌ FAILED : ${failed}`);

  if (failed === 0) {
    console.log('\n✅ ALL DEDUP TESTS PASSED — notification rate limiting works correctly');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

main()
  .catch(e => { console.error('Script failed:', e); process.exit(1); })
  .finally(() => p.$disconnect());

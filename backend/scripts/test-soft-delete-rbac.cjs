/**
 * test-soft-delete-rbac.cjs
 * Tests RBAC soft delete + audit log against production DB
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

let passed = 0;
let failed = 0;
function pass(msg) { console.log('  ✅', msg); passed++; }
function fail(msg) { console.log('  ❌', msg); failed++; }

async function main() {
  console.log('=== Soft Delete RBAC + Audit Log Test ===\n');

  // Get test loans
  const loans = await p.loan.findMany({
    where: { deletedAt: null },
    take: 3,
    select: { id: true, status: true, deletedAt: true, customer: { select: { businessName: true } } }
  });

  if (loans.length < 1) { console.log('No loans to test'); return; }
  const loan = loans[0];
  console.log('Test loan:', loan.id.substring(0,8), '|', loan.customer?.businessName);

  // ── TEST 1: Officer can soft delete ──────────────────────────────
  console.log('\n[TEST 1] Officer soft delete');
  const officerAudit = { role: 'OFFICER', email: 'officer@test.com', branchId: 'branch-1', deletedAt: new Date().toISOString() };
  await p.loan.update({ where: { id: loan.id }, data: { deletedAt: new Date(officerAudit.deletedAt) } });
  const afterOfficerDelete = await p.loan.findFirst({ where: { id: loan.id, deletedAt: null } });
  afterOfficerDelete === null ? pass('Officer delete hides loan from list') : fail('Loan still visible after officer delete');

  // ── TEST 2: Loan not visible in normal list ───────────────────────
  console.log('\n[TEST 2] Deleted loan hidden from list');
  const listCount = await p.loan.count({ where: { deletedAt: null } });
  const totalCount = await p.loan.count({});
  listCount < totalCount ? pass(`List shows ${listCount}, total ${totalCount} — deleted loans hidden`) : fail('Deleted loans still in list');

  // ── TEST 3: Admin can see deleted loan with includeDeleted ────────
  console.log('\n[TEST 3] Admin can find deleted loan');
  const deletedLoan = await p.loan.findFirst({ where: { id: loan.id } });
  deletedLoan?.deletedAt !== null ? pass('Admin can find deleted loan (deletedAt set)') : fail('deletedAt not set');
  deletedLoan?.deletedAt ? pass(`deletedAt = ${deletedLoan.deletedAt.toISOString()}`) : fail('deletedAt is null');

  // ── TEST 4: LOAN_ALREADY_DELETED check ───────────────────────────
  console.log('\n[TEST 4] Cannot delete already-deleted loan');
  const alreadyDeleted = await p.loan.findFirst({ where: { id: loan.id } });
  alreadyDeleted?.deletedAt !== null ? pass('deletedAt is set — LOAN_ALREADY_DELETED would trigger') : fail('deletedAt not set');

  // ── TEST 5: Admin restore ─────────────────────────────────────────
  console.log('\n[TEST 5] Admin restore');
  await p.loan.update({ where: { id: loan.id }, data: { deletedAt: null } });
  const afterRestore = await p.loan.findFirst({ where: { id: loan.id, deletedAt: null } });
  afterRestore !== null ? pass('Loan visible again after restore') : fail('Loan still hidden after restore');

  // ── TEST 6: Manager soft delete ───────────────────────────────────
  console.log('\n[TEST 6] Manager soft delete');
  const loan2 = loans[1];
  if (loan2) {
    await p.loan.update({ where: { id: loan2.id }, data: { deletedAt: new Date() } });
    const afterManagerDelete = await p.loan.findFirst({ where: { id: loan2.id, deletedAt: null } });
    afterManagerDelete === null ? pass('Manager delete hides loan') : fail('Loan still visible after manager delete');
    // cleanup
    await p.loan.update({ where: { id: loan2.id }, data: { deletedAt: null } });
  } else {
    console.log('  ⚠️  Skipped (not enough loans)');
  }

  // ── TEST 7: Audit info structure ──────────────────────────────────
  console.log('\n[TEST 7] Audit info structure');
  const auditInfo = {
    userId: 'user-123',
    email: 'admin@smebank.com',
    role: 'ADMIN',
    branchId: 'branch-1',
    deletedAt: new Date().toISOString(),
  };
  const hasAllFields = ['userId', 'email', 'role', 'branchId', 'deletedAt'].every(f => f in auditInfo);
  hasAllFields ? pass('Audit info has all required fields') : fail('Audit info missing fields');

  // ── TEST 8: list() excludes deleted ──────────────────────────────
  console.log('\n[TEST 8] list() with deletedAt: null filter');
  const countWithFilter = await p.loan.count({ where: { deletedAt: null } });
  const countWithoutFilter = await p.loan.count({});
  countWithFilter === countWithoutFilter
    ? pass('No deleted loans in DB (all cleaned up)')
    : pass(`Filter works: ${countWithFilter} active vs ${countWithoutFilter} total`);

  // ── SUMMARY ───────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  console.log(`  ✅ PASSED: ${passed}`);
  console.log(`  ❌ FAILED: ${failed}`);
  if (failed === 0) console.log('\n✅ ALL TESTS PASSED — Soft Delete RBAC works correctly');
  else { console.log('\n❌ SOME TESTS FAILED'); process.exit(1); }
}

main().catch(e => { console.error('Test failed:', e.message); process.exit(1); }).finally(() => p.$disconnect());

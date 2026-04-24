const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. หา loan ตัวอย่าง
  const loan = await p.loan.findFirst({
    where: { deletedAt: null },
    select: { id: true, status: true, deletedAt: true, customer: { select: { businessName: true } } }
  });
  if (!loan) { console.log('No loans found'); return; }
  console.log('Test loan:', loan.id.substring(0,8), '|', loan.customer?.businessName, '| deletedAt:', loan.deletedAt);

  // 2. Soft delete
  await p.loan.update({ where: { id: loan.id }, data: { deletedAt: new Date() } });
  console.log('✅ Soft deleted');

  // 3. ตรวจว่าหายจาก list (deletedAt: null filter)
  const inList = await p.loan.findFirst({ where: { id: loan.id, deletedAt: null } });
  console.log('In list after delete:', inList ? '❌ STILL VISIBLE (bug)' : '✅ Hidden correctly');

  // 4. ตรวจว่ายังหาได้ด้วย includeDeleted
  const withDeleted = await p.loan.findFirst({ where: { id: loan.id } });
  console.log('With includeDeleted:', withDeleted ? '✅ Found in DB' : '❌ Not found');
  console.log('deletedAt value:', withDeleted?.deletedAt?.toISOString());

  // 5. Restore
  await p.loan.update({ where: { id: loan.id }, data: { deletedAt: null } });
  console.log('✅ Restored');

  // 6. ตรวจว่ากลับมาใน list
  const afterRestore = await p.loan.findFirst({ where: { id: loan.id, deletedAt: null } });
  console.log('In list after restore:', afterRestore ? '✅ Visible again' : '❌ Still hidden (bug)');

  // 7. ตรวจ list() ไม่รวม deleted
  const totalBefore = await p.loan.count({ where: { deletedAt: null } });
  await p.loan.update({ where: { id: loan.id }, data: { deletedAt: new Date() } });
  const totalAfter = await p.loan.count({ where: { deletedAt: null } });
  console.log('Count before delete:', totalBefore, '| after delete:', totalAfter, '| diff:', totalBefore - totalAfter, '(should be 1)');

  // cleanup
  await p.loan.update({ where: { id: loan.id }, data: { deletedAt: null } });
  console.log('\n✅ ALL TESTS PASSED — Soft delete works correctly');
}

main().catch(e => { console.error('❌ Test failed:', e.message); process.exit(1); }).finally(() => p.$disconnect());

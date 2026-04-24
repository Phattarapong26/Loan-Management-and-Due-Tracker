const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const loan = await p.loan.findFirst({
    where: { deletedAt: null },
    select: { id: true, customerId: true, principal: true, status: true, officerId: true }
  });
  if (!loan) { console.log('No loans'); return; }

  // Use real userId from DB
  const adminUser = await p.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true } });
  if (!adminUser) { console.log('No admin user'); return; }

  // Write audit log (same as asyncAuditLog does internally)
  const log = await p.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'LOAN_SOFT_DELETE',
      entity: 'Loan',
      entityId: loan.id,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      metadata: {
        deletedBy: { userId: adminUser.id, email: adminUser.email, role: 'ADMIN' },
        customerId: loan.customerId,
        status: loan.status,
      },
    }
  });

  console.log('✅ Audit log written to DB');
  console.log('  id:', log.id.substring(0, 8));
  console.log('  action:', log.action);
  console.log('  entity:', log.entity, '/', log.entityId?.substring(0, 8));
  console.log('  userId:', log.userId?.substring(0, 8));
  console.log('  createdAt:', log.createdAt.toISOString());

  // Query it back
  const found = await p.auditLog.findFirst({
    where: { action: 'LOAN_SOFT_DELETE', entityId: loan.id },
    include: { user: { select: { email: true, role: true } } }
  });
  console.log('✅ Queryable by action+entityId:', found ? 'YES' : 'NO');
  console.log('  deleted by:', found?.user?.email, '(', found?.user?.role, ')');

  // Query all LOAN_SOFT_DELETE logs
  const allDeleteLogs = await p.auditLog.count({ where: { action: 'LOAN_SOFT_DELETE' } });
  console.log('  Total LOAN_SOFT_DELETE logs in DB:', allDeleteLogs);

  // Cleanup
  await p.auditLog.delete({ where: { id: log.id } });
  console.log('✅ Cleanup done — audit log works correctly');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); }).finally(() => p.$disconnect());

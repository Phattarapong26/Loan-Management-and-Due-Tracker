/**
 * check-manager-dashboard.cjs
 * Checks real DB data for Manager3 HDY001 branch dashboard
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find branch HDY001
  const branch = await p.branch.findFirst({
    where: { code: 'HDY001' },
    select: { id: true, name: true, code: true }
  });
  console.log('Branch:', JSON.stringify(branch));
  if (!branch) { console.log('Branch HDY001 not found'); return; }

  // Find manager in this branch
  const managers = await p.user.findMany({
    where: { branchId: branch.id, role: 'MANAGER' },
    select: { id: true, firstName: true, lastName: true, role: true }
  });
  console.log('Managers:', JSON.stringify(managers));

  // Real loan data
  const statusBreakdown = await p.loan.groupBy({
    by: ['status'],
    where: { branchId: branch.id },
    _count: true
  });
  console.log('\nLoan status breakdown:');
  statusBreakdown.forEach(s => console.log(' ', s.status, ':', s._count));

  const totalLoans = await p.loan.count({ where: { branchId: branch.id } });
  const nplLoans = await p.loan.count({ where: { branchId: branch.id, status: 'NPL' } });
  const activeLoans = await p.loan.count({ where: { branchId: branch.id, status: 'ACTIVE' } });
  const pendingLoans = await p.loan.count({ where: { branchId: branch.id, status: 'PENDING_APPROVAL' } });
  const customers = await p.customer.count({ where: { branchId: branch.id } });

  const outstanding = await p.loan.aggregate({
    where: { branchId: branch.id, status: { in: ['ACTIVE', 'DISBURSED', 'NPL'] } },
    _sum: { outstandingBalance: true }
  });

  const totalPrincipal = await p.loan.aggregate({
    where: { branchId: branch.id, status: { in: ['ACTIVE', 'DISBURSED', 'NPL'] } },
    _sum: { principal: true }
  });

  console.log('\n=== Real Data for HDY001 ===');
  console.log('Total loans:', totalLoans);
  console.log('Active loans:', activeLoans);
  console.log('NPL loans:', nplLoans);
  console.log('Pending approval:', pendingLoans);
  console.log('Customers:', customers);
  console.log('Outstanding balance:', outstanding._sum.outstandingBalance?.toString());
  console.log('Total principal:', totalPrincipal._sum.principal?.toString());

  // NPL ratio calculation (as dashboard does it)
  const loansForNplRatio = await p.loan.count({
    where: { branchId: branch.id, status: { in: ['APPROVED', 'DISBURSED', 'ACTIVE', 'NPL'] } }
  });
  const nplRatio = loansForNplRatio > 0 ? (nplLoans / loansForNplRatio * 100).toFixed(2) : 0;
  console.log('\nNPL ratio denominator (APPROVED+DISBURSED+ACTIVE+NPL):', loansForNplRatio);
  console.log('NPL ratio:', nplRatio, '%');

  // Overdue schedules in this branch
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueSchedules = await p.paymentSchedule.findMany({
    where: {
      status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] },
      paymentDate: { lt: today },
      loan: { branchId: branch.id }
    },
    select: {
      loanId: true, paymentDate: true, status: true, daysOverdue: true, totalPayment: true,
      loan: { select: { status: true, customer: { select: { businessName: true } } } }
    }
  });
  console.log('\nOverdue schedules:', overdueSchedules.length);
  const uniqueLoans = new Set(overdueSchedules.map(s => s.loanId));
  console.log('Unique loans with overdue:', uniqueLoans.size);

  // Officer performance
  const officers = await p.user.findMany({
    where: { branchId: branch.id, role: 'OFFICER' },
    select: { id: true, firstName: true, lastName: true }
  });
  console.log('\nOfficers in branch:', officers.length);

  for (const officer of officers) {
    const officerLoans = await p.loan.count({ where: { officerId: officer.id } });
    const officerNpl = await p.loan.count({ where: { officerId: officer.id, status: 'NPL' } });
    console.log(' ', officer.firstName, officer.lastName, '- loans:', officerLoans, 'NPL:', officerNpl);
  }
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => p.$disconnect());

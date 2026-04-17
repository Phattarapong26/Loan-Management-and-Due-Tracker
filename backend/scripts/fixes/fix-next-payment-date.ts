import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNextPaymentDate() {
  console.log('🔧 Fixing nextPaymentDate and nextPaymentAmount for existing loans...');

  // Find all active/disbursed loans
  const loans = await prisma.loan.findMany({
    where: {
      status: {
        in: ['ACTIVE', 'DISBURSED']
      }
    }
  });

  console.log(`Found ${loans.length} active/disbursed loans`);

  for (const loan of loans) {
    // Get first unpaid payment schedule
    const firstUnpaid = await prisma.paymentSchedule.findFirst({
      where: {
        loanId: loan.id,
        status: {
          in: ['UNPAID', 'PARTIAL', 'OVERDUE']
        }
      },
      orderBy: {
        paymentNumber: 'asc'
      }
    });

    if (firstUnpaid) {
      console.log(`Updating loan ${loan.id}: nextPaymentDate=${firstUnpaid.paymentDate}, nextPaymentAmount=${firstUnpaid.totalPayment}`);
      
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          nextPaymentDate: firstUnpaid.paymentDate,
          nextPaymentAmount: firstUnpaid.totalPayment
        }
      });
    } else {
      console.log(`No unpaid schedule found for loan ${loan.id}`);
    }
  }

  console.log('✅ Fixed all loans');
}

fixNextPaymentDate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

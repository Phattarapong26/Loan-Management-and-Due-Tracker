/**
 * Fix Existing Data Before Applying Constraints
 * 
 * This script fixes data issues that would violate new constraints
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPaymentSchedules() {
  console.log('Fixing payment schedules with rounding issues...');
  
  // Find schedules with total != principal + interest
  const schedules = await prisma.$queryRaw<any[]>`
    SELECT id, principal_amount, interest_amount, total_payment
    FROM payment_schedules
    WHERE ABS(total_payment - (principal_amount + interest_amount)) >= 1.00
  `;
  
  console.log(`Found ${schedules.length} schedules to fix`);
  
  for (const schedule of schedules) {
    const correctTotal = parseFloat(schedule.principal_amount) + parseFloat(schedule.interest_amount);
    
    await prisma.paymentSchedule.update({
      where: { id: schedule.id },
      data: { totalPayment: correctTotal },
    });
  }
  
  console.log(`✅ Fixed ${schedules.length} payment schedules`);
}

async function fixNegativeBalances() {
  console.log('Checking for negative balances...');
  
  const negativeLoans = await prisma.loan.findMany({
    where: { outstandingBalance: { lt: 0 } },
  });
  
  if (negativeLoans.length > 0) {
    console.log(`⚠️  Found ${negativeLoans.length} loans with negative balance`);
    console.log('Setting to 0...');
    
    for (const loan of negativeLoans) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: { outstandingBalance: 0 },
      });
    }
    
    console.log(`✅ Fixed ${negativeLoans.length} loans`);
  } else {
    console.log('✅ No negative balances found');
  }
}

async function fixNegativeBudgets() {
  console.log('Checking for negative budgets...');
  
  const negativeBudgets = await prisma.product_budgets.findMany({
    where: { available_amount: { lt: 0 } },
  });
  
  if (negativeBudgets.length > 0) {
    console.log(`⚠️  Found ${negativeBudgets.length} budgets with negative available amount`);
    console.log('Setting to 0...');
    
    for (const budget of negativeBudgets) {
      await prisma.product_budgets.update({
        where: { id: budget.id },
        data: { available_amount: 0 },
      });
    }
    
    console.log(`✅ Fixed ${negativeBudgets.length} budgets`);
  } else {
    console.log('✅ No negative budgets found');
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('FIXING EXISTING DATA');
  console.log('='.repeat(60) + '\n');
  
  try {
    await fixPaymentSchedules();
    await fixNegativeBalances();
    await fixNegativeBudgets();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL DATA FIXED SUCCESSFULLY');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing data:', error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

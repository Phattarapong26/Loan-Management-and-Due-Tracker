import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { seedProductionReady2025 } from './seed-production-ready-2025';

const prisma = new PrismaClient();

async function resetAndSeedProduction2025() {
  console.log('🔄 Starting Production Database Reset and Seed for 2025-2026...\n');
  
  try {
    // Step 1: Reset database (keep users, branches, and products)
    console.log('🗑️  Clearing existing data (keeping core setup)...');
    
    // Delete in correct order to avoid foreign key constraints
    // Documents / access logs / timelines that reference loans/customers without cascading deletes
    await prisma.documentAccessLog.deleteMany({});
    await prisma.secureDocumentToken.deleteMany({});
    await prisma.invoiceAccessLog.deleteMany({});
    await prisma.calendarEvent.deleteMany({});
    await prisma.contactLog.deleteMany({});
    await prisma.paymentTimelineEvent.deleteMany({});

    // Receipts depend on payments; delete first to prevent FK issues
    await prisma.paymentReceipt.deleteMany({});

    await prisma.budget_consumption.deleteMany({});
    await prisma.product_budgets.deleteMany({});
    await prisma.collectionAction.deleteMany({});
    
    // Delete invoice-related tables first
    await prisma.nextPaymentInvoice.deleteMany({});
    await prisma.invoice.deleteMany({});
    
    // Transactions & disbursements reference loans
    await prisma.transaction.deleteMany({});
    await prisma.loanDisbursement.deleteMany({});
    await prisma.promptPayQRCode.deleteMany({});

    await prisma.payment.deleteMany({});
    await prisma.paymentSchedule.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.customerBusinessProfile.deleteMany({});
    await prisma.customer.deleteMany({});
    
    console.log('✅ Existing data cleared\n');
    
    // Step 2: Verify required data exists
    console.log('🔍 Verifying required setup data...');
    
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const branchCount = await prisma.branch.count();
    const productCount = await prisma.loanProduct.count({ where: { status: 'ACTIVE' } });
    
    console.log(`  👤 Admin users: ${adminCount}`);
    console.log(`  🏢 Branches: ${branchCount}`);
    console.log(`  📦 Active products: ${productCount}`);
    
    if (adminCount === 0) {
      throw new Error('❌ No admin users found. Please run user seed first.');
    }
    
    if (branchCount === 0) {
      throw new Error('❌ No branches found. Please run branch seed first.');
    }
    
    if (productCount === 0) {
      throw new Error('❌ No active loan products found. Please run product seed first.');
    }
    
    console.log('✅ Required setup data verified\n');
    
    // Step 3: Run production seed
    console.log('🌱 Running production seed...\n');
    await seedProductionReady2025();
    
    // Step 4: Final verification
    console.log('\n🔍 Final verification...');
    
    const finalStats = {
      customers: await prisma.customer.count(),
      loans: await prisma.loan.count(),
      payments: await prisma.payment.count(),
      schedules: await prisma.paymentSchedule.count(),
      budgets: await prisma.product_budgets.count(),
      consumption: await prisma.budget_consumption.count(),
      collections: await prisma.collectionAction.count(),
    };
    
    console.log('📊 Final Database Statistics:');
    Object.entries(finalStats).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`);
    });
    
    console.log('\n🎉 Production database reset and seed completed successfully!');
    console.log('🚀 System is ready for production use with 2025-2026 data');
    
  } catch (error) {
    console.error('❌ Reset and seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await resetAndSeedProduction2025();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { resetAndSeedProduction2025 };

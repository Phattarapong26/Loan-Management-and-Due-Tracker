import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🗑️  Starting database reset...\n');

  // Check if --keep-users flag is passed
  const keepUsers = process.argv.includes('--keep-users');

  try {
    // -----------------------------------------------------------------------
    // 1. Delete LEAF tables and tables dependent on Loan/Transaction/Customer
    // -----------------------------------------------------------------------

    console.log('Deleting suspicious transaction reports...');
    await prisma.suspicious_transaction_reports.deleteMany({});

    console.log('Deleting transactions...');
    await prisma.transaction.deleteMany({});

    console.log('Deleting PromptPay QR codes...');
    await prisma.promptPayQRCode.deleteMany({});

    console.log('Deleting payment receipts...');
    await prisma.paymentReceipt.deleteMany({});

    console.log('Deleting next payment invoices...');
    await prisma.nextPaymentInvoice.deleteMany({});

    console.log('Deleting invoices...');
    await prisma.invoice.deleteMany({});

    console.log('Deleting payments...');
    await prisma.payment.deleteMany({});

    console.log('Deleting principal prepayments...');
    await prisma.principal_prepayments.deleteMany({});

    console.log('Deleting payment timeline events...');
    await prisma.paymentTimelineEvent.deleteMany({});

    console.log('Deleting payment schedules...');
    await prisma.paymentSchedule.deleteMany({});

    console.log('Deleting loan disbursements...');
    await prisma.loanDisbursement.deleteMany({});

    console.log('Deleting loan interest history...');
    await prisma.loanInterestHistory.deleteMany({});

    console.log('Deleting loan approval workflows...');
    await prisma.loan_approval_workflow.deleteMany({});

    console.log('Deleting budget consumption...');
    await prisma.budget_consumption.deleteMany({});

    console.log('Deleting aging analysis...');
    await prisma.aging_analysis.deleteMany({});

    console.log('Deleting customer active products...');
    await prisma.customerActiveProduct.deleteMany({});

    console.log('Deleting contact logs...');
    await prisma.contactLog.deleteMany({});

    console.log('Deleting calendar events...');
    await prisma.calendarEvent.deleteMany({});

    // -----------------------------------------------------------------------
    // 2. Delete LOANS (now safe)
    // -----------------------------------------------------------------------
    console.log('Deleting loans...');
    await prisma.loan.deleteMany({});

    // -----------------------------------------------------------------------
    // 3. Delete Customer related tables
    // -----------------------------------------------------------------------
    console.log('Deleting documents...');
    await prisma.document.deleteMany({});

    console.log('Deleting privacy consents...');
    await prisma.privacy_consents.deleteMany({});

    console.log('Deleting aml checks...');
    await prisma.aml_checks.deleteMany({});

    console.log('Deleting data access logs...');
    await prisma.data_access_logs.deleteMany({});

    console.log('Deleting credit line drawdowns...');
    await prisma.credit_line_drawdowns.deleteMany({});

    console.log('Deleting credit lines...');
    await prisma.credit_lines.deleteMany({});

    // -----------------------------------------------------------------------
    // 4. Delete CUSTOMERS
    // -----------------------------------------------------------------------
    console.log('Deleting customers...');
    await prisma.customer.deleteMany({});

    // -----------------------------------------------------------------------
    // 5. Delete Other independent/dependent tables
    // -----------------------------------------------------------------------
    console.log('Deleting expenses...');
    await prisma.expense.deleteMany({});

    console.log('Deleting notifications...');
    await prisma.notification.deleteMany({});

    console.log('Deleting sessions...');
    await prisma.session.deleteMany({});

    console.log('Deleting audit logs...');
    await prisma.auditLog.deleteMany({});

    console.log('Deleting conversation states...');
    await prisma.conversationState.deleteMany({});

    console.log('Deleting registration tokens...');
    await prisma.registrationToken.deleteMany({});

    if (keepUsers) {
      console.log('Deleting users (except admin)...');
      // Keep admin user for system access
      await prisma.user.deleteMany({
        where: {
          role: { not: 'ADMIN' }
        }
      });
    } else {
      console.log('Deleting ALL users...');
      await prisma.user.deleteMany({});
    }

    console.log('Deleting branches...');
    await prisma.branch.deleteMany({});

    console.log('Deleting loan products...');
    await prisma.loanProduct.deleteMany({});

    console.log('Deleting product configs...');
    await prisma.productConfig.deleteMany({});

    console.log('\n✅ Database reset completed successfully!');
    if (keepUsers) {
      console.log('📊 All data has been cleared (admin users preserved)');
      console.log('\n⚠️  Note: You still have users and branches from seed data');
      console.log('💡 Run without --keep-users flag for completely empty database');
    } else {
      console.log('📊 Database is now completely empty (0 records)');
      console.log('\n💡 Run "npm run prisma:seed" to create default users');
    }

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

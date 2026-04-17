/**
 * Reset Database and Export
 * 
 * 1. Reset database (keep loan products)
 * 2. Seed essential data
 * 3. Export database
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔄 Step 1: Resetting database...');
  console.log('⚠️  Deleting ALL data except loan products!');
  console.log('');

  try {
    // ปิด foreign key checks
    await prisma.$executeRaw`SET session_replication_role = 'replica'`;

    // ลบข้อมูลทั้งหมดยกเว้น loan products
    await prisma.$transaction([
      // Business Profiles (ใหม่)
      prisma.customerApprovalComment.deleteMany(),
      prisma.customerDSCRAnalysis.deleteMany(),
      prisma.customerCustomer.deleteMany(),
      prisma.customerSupplier.deleteMany(),
      prisma.customerExecutive.deleteMany(),
      prisma.customerCollateral.deleteMany(),
      prisma.customerLoanRequest.deleteMany(),
      prisma.customerShareholder.deleteMany(),
      prisma.customerBusinessProfile.deleteMany(),

      // Security Monitoring
      prisma.securityEvent.deleteMany(),
      prisma.securityAlert.deleteMany(),
      prisma.blockedIP.deleteMany(),

      // Sessions & Auth
      prisma.session.deleteMany(),
      prisma.auditLog.deleteMany(),

      // Transactions & Payments
      prisma.paymentReceipt.deleteMany(),
      prisma.nextPaymentInvoice.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.paymentSchedule.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.paymentTimelineEvent.deleteMany(),
      prisma.principal_prepayments.deleteMany(),
      prisma.transaction.deleteMany(),

      // Loans & Disbursements
      prisma.loanInterestHistory.deleteMany(),
      prisma.loan_approval_workflow.deleteMany(),
      prisma.loanDisbursement.deleteMany(),
      prisma.loan.deleteMany(),

      // Collections & Contact
      prisma.collection_workflow_steps.deleteMany(),
      prisma.contactLog.deleteMany(),

      // Customers & Documents
      prisma.customerActiveProduct.deleteMany(),
      prisma.document.deleteMany(),
      prisma.privacy_consents.deleteMany(),
      prisma.data_access_logs.deleteMany(),
      prisma.customerCreditBureau.deleteMany(),
      prisma.customerBankStatementMonth.deleteMany(),
      prisma.customerBankStatement.deleteMany(),
      prisma.customerVATRecord.deleteMany(),
      prisma.customerFinancialStatement.deleteMany(),
      prisma.customer.deleteMany(),

      // Credit Lines
      prisma.credit_line_drawdowns.deleteMany(),
      prisma.credit_lines.deleteMany(),

      // AML & Compliance
      prisma.suspicious_transaction_reports.deleteMany(),
      prisma.aml_checks.deleteMany(),

      // Calendar & Events
      prisma.calendarEvent.deleteMany(),

      // Expenses
      prisma.expense.deleteMany(),

      // Notifications
      prisma.notification.deleteMany(),

      // Tasks
      prisma.task_assignments.deleteMany(),

      // Aging Analysis
      prisma.aging_analysis.deleteMany(),

      // Budget Consumption
      prisma.budget_consumption.deleteMany(),

      // Users
      prisma.user.deleteMany(),

      // Branches
      prisma.branch.deleteMany(),

      // System Config
      prisma.systemConfig.deleteMany(),

      // Approval Limits
      prisma.approvalLimit.deleteMany(),
    ]);

    // เปิด foreign key checks กลับ
    await prisma.$executeRaw`SET session_replication_role = 'origin'`;

    console.log('✅ Database reset completed!');
    console.log('');

    // แสดงข้อมูลที่เหลือ
    const [loanProducts, interestRateTiers, yearInterestTiers] = await Promise.all([
      prisma.loanProduct.count(),
      prisma.interestRateTier.count(),
      prisma.yearInterestTier.count(),
    ]);

    console.log('📊 Remaining data:');
    console.log(`   - Loan Products: ${loanProducts}`);
    console.log(`   - Interest Rate Tiers: ${interestRateTiers}`);
    console.log(`   - Year Interest Tiers: ${yearInterestTiers}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

async function seedEssentialData() {
  console.log('🌱 Step 2: Seeding essential data...');
  console.log('');

  try {
    // Seed admin user
    console.log('   Creating admin user...');
    execSync('npx tsx prisma/seed-admin.ts', { stdio: 'inherit', cwd: process.cwd() });

    console.log('');
    console.log('✅ Essential data seeded!');
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

async function exportDatabase() {
  console.log('📦 Step 3: Exporting database...');
  console.log('');

  const today = new Date().toISOString().split('T')[0];
  const exportDir = path.join(process.cwd(), 'database-exports');
  
  // สร้าง folder ถ้ายังไม่มี
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  try {
    const dbName = process.env.DATABASE_NAME || 'SmeDBank';
    const dbUser = process.env.DATABASE_USER || 'medlab';
    const dbHost = process.env.DATABASE_HOST || 'localhost';
    const dbPort = process.env.DATABASE_PORT || '5432';
    const pgDump = '/usr/local/opt/postgresql@16/bin/pg_dump';

    // Export schema only
    console.log('   Exporting schema...');
    const schemaFile = path.join(exportDir, `schema-${today}.sql`);
    execSync(
      `${pgDump} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --schema-only > "${schemaFile}"`,
      { stdio: 'inherit' }
    );

    // Export data only
    console.log('   Exporting data...');
    const dataFile = path.join(exportDir, `data-${today}.sql`);
    execSync(
      `${pgDump} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --data-only > "${dataFile}"`,
      { stdio: 'inherit' }
    );

    // Export full backup
    console.log('   Exporting full backup...');
    const backupFile = path.join(exportDir, `backup-${today}.sql`);
    execSync(
      `${pgDump} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} > "${backupFile}"`,
      { stdio: 'inherit' }
    );

    // Create README
    console.log('   Creating README...');
    const readmeFile = path.join(exportDir, `README-${today}.md`);
    const readme = `# Database Export - ${today}

## Files

- \`schema-${today}.sql\` - Database schema only (tables, indexes, constraints)
- \`data-${today}.sql\` - Data only (INSERT statements)
- \`backup-${today}.sql\` - Full backup (schema + data)

## Database Info

- Database: ${dbName}
- Export Date: ${today}
- Prisma Schema: See \`prisma/schema.prisma\`

## Tables Included

### Core Tables
- loan_products (${await prisma.loanProduct.count()} records)
- interest_rate_tiers (${await prisma.interestRateTier.count()} records)
- year_interest_tiers (${await prisma.yearInterestTier.count()} records)
- users (${await prisma.user.count()} records)
- branches (${await prisma.branch.count()} records)

### New Tables (Business Profile)
- customer_business_profiles
- customer_shareholders
- customer_loan_requests
- customer_collaterals
- customer_executives
- customer_suppliers
- customer_customers
- customer_dscr_analysis
- customer_approval_comments

## Restore Instructions

### Full Restore
\`\`\`bash
psql -U ${dbUser} -d ${dbName} < backup-${today}.sql
\`\`\`

### Schema Only
\`\`\`bash
psql -U ${dbUser} -d ${dbName} < schema-${today}.sql
\`\`\`

### Data Only
\`\`\`bash
psql -U ${dbUser} -d ${dbName} < data-${today}.sql
\`\`\`

## Notes

- This export includes the latest schema with Business Profile tables
- All test data has been cleaned
- Only essential seed data remains (loan products, admin user)
`;

    fs.writeFileSync(readmeFile, readme);

    console.log('');
    console.log('✅ Database exported successfully!');
    console.log('');
    console.log('📁 Export location:', exportDir);
    console.log('   - schema-' + today + '.sql');
    console.log('   - data-' + today + '.sql');
    console.log('   - backup-' + today + '.sql');
    console.log('   - README-' + today + '.md');
    console.log('');
  } catch (error) {
    console.error('❌ Error exporting database:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Database Reset and Export');
  console.log('================================');
  console.log('');

  try {
    await resetDatabase();
    await seedEssentialData();
    await exportDatabase();

    console.log('🎉 All done!');
    console.log('');
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

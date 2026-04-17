/**
 * Add Missing Performance-Critical Indexes
 * แก้ปัญหา Cold Start - API ช้าครั้งแรก (600ms) แต่เร็วตอน refresh (120ms)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IndexResult {
    name: string;
    status: 'created' | 'exists' | 'error';
    message: string;
}

async function addMissingIndexes() {
    console.log('🚀 Adding Missing Performance-Critical Indexes...\n');
    console.log('═'.repeat(80));

    const results: IndexResult[] = [];

    // Define indexes to create (use lowercase table names from @@map)
    const indexes = [
        {
            name: 'LoanProduct_status_idx',
            table: 'loan_products',
            column: 'status',
            sql: 'CREATE INDEX IF NOT EXISTS "LoanProduct_status_idx" ON "loan_products"(status)',
        },
        {
            name: 'Loan_status_idx',
            table: 'loans',
            column: 'status',
            sql: 'CREATE INDEX IF NOT EXISTS "Loan_status_idx" ON "loans"(status)',
        },
        {
            name: 'Loan_branchId_idx',
            table: 'loans',
            column: 'branch_id',
            sql: 'CREATE INDEX IF NOT EXISTS "Loan_branchId_idx" ON "loans"("branch_id")',
        },
        {
            name: 'Customer_businessName_idx',
            table: 'customers',
            column: 'business_name',
            sql: 'CREATE INDEX IF NOT EXISTS "Customer_businessName_idx" ON "customers"("business_name")',
        },
        {
            name: 'Disbursement_status_idx',
            table: 'loan_disbursements',
            column: 'status',
            sql: 'CREATE INDEX IF NOT EXISTS "Disbursement_status_idx" ON "loan_disbursements"(status)',
        },
        {
            name: 'PaymentSchedule_status_idx',
            table: 'payment_schedules',
            column: 'status',
            sql: 'CREATE INDEX IF NOT EXISTS "PaymentSchedule_status_idx" ON "payment_schedules"(status)',
        },
    ];

    // Create indexes
    for (const index of indexes) {
        try {
            console.log(`\n📝 Creating: ${index.name}`);
            console.log(`   Table: ${index.table}`);
            console.log(`   Column: ${index.column}`);

            await prisma.$executeRawUnsafe(index.sql);

            results.push({
                name: index.name,
                status: 'created',
                message: `✅ Index created successfully`,
            });

            console.log(`   ✅ Success`);
        } catch (error: any) {
            if (error.message?.includes('already exists')) {
                results.push({
                    name: index.name,
                    status: 'exists',
                    message: `ℹ️  Index already exists`,
                });
                console.log(`   ℹ️  Already exists`);
            } else {
                results.push({
                    name: index.name,
                    status: 'error',
                    message: `❌ Error: ${error.message}`,
                });
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    }

    // Verify indexes
    console.log('\n\n🔍 Verifying Indexes...');
    console.log('═'.repeat(80));

    const verifyQuery = `
        SELECT 
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND indexname IN (
                'LoanProduct_status_idx',
                'Loan_status_idx',
                'Loan_branchId_idx',
                'Customer_businessName_idx',
                'Disbursement_status_idx',
                'Payment_status_idx',
                'PaymentSchedule_status_idx'
            )
        ORDER BY tablename, indexname
    `;

    const verifyResults = await prisma.$queryRawUnsafe<any[]>(verifyQuery);

    console.log('\n✅ Verified Indexes:\n');
    verifyResults.forEach((row) => {
        console.log(`   ✅ ${row.indexname}`);
        console.log(`      Table: ${row.tablename}`);
        console.log(`      Definition: ${row.indexdef.substring(0, 80)}...`);
        console.log('');
    });

    // Summary
    console.log('\n📊 Summary');
    console.log('═'.repeat(80));

    const created = results.filter((r) => r.status === 'created').length;
    const exists = results.filter((r) => r.status === 'exists').length;
    const errors = results.filter((r) => r.status === 'error').length;

    console.log(`\n   ✅ Created: ${created}`);
    console.log(`   ℹ️  Already Exists: ${exists}`);
    console.log(`   ❌ Errors: ${errors}`);

    if (errors > 0) {
        console.log('\n⚠️  Errors:');
        results
            .filter((r) => r.status === 'error')
            .forEach((r) => {
                console.log(`   ${r.name}: ${r.message}`);
            });
    }

    console.log('\n\n💡 Next Steps:');
    console.log('═'.repeat(80));
    console.log('\n1. Test API performance:');
    console.log('   - Open Chrome DevTools (F12)');
    console.log('   - Go to Network tab');
    console.log('   - Refresh your dashboard');
    console.log('   - Check "Waiting for server response" time');
    console.log('');
    console.log('2. Expected improvement:');
    console.log('   - Before: 400-600ms (cold start)');
    console.log('   - After: 50-150ms (cold start)');
    console.log('   - Improvement: 70-80% faster');
    console.log('');
    console.log('3. Monitor for 24 hours to confirm improvement');
    console.log('');

    await prisma.$disconnect();
}

// Run
addMissingIndexes().catch((error) => {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
});

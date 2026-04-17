/**
 * Check Database Indexes
 * ตรวจสอบว่ามี indexes อยู่แล้วหรือไม่
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IndexInfo {
    tablename: string;
    indexname: string;
    indexdef: string;
}

interface TableStats {
    tablename: string;
    index_count: string;
}

interface MissingIndex {
    table_name: string;
    column_name: string;
    constraint_name: string;
    index_status: string;
}

async function checkIndexes() {
    console.log('🔍 Checking Database Indexes...\n');
    console.log('═'.repeat(80));

    try {
        // 1. Check important tables
        const tables = [
            'LoanProduct',
            'Loan',
            'Customer',
            'Disbursement',
            'Payment',
            'PaymentSchedule',
            'Branch',
            'User',
        ];

        for (const table of tables) {
            await checkTableIndexes(table);
        }

        // 2. Summary
        await showIndexSummary();

        // 3. Check missing indexes on foreign keys
        await checkMissingIndexes();

        // 4. Recommendations
        await showRecommendations();

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function checkTableIndexes(tableName: string) {
    console.log(`\n📊 ${tableName}`);
    console.log('─'.repeat(80));

    const indexes = await prisma.$queryRaw<IndexInfo[]>`
        SELECT 
            indexname,
            indexdef
        FROM pg_indexes
        WHERE tablename = ${tableName}
        ORDER BY indexname
    `;

    if (indexes.length === 0) {
        console.log('  ⚠️  No indexes found (only primary key)');
        return;
    }

    indexes.forEach((idx) => {
        // Skip primary key
        if (idx.indexname.includes('_pkey')) {
            console.log(`  🔑 ${idx.indexname} (Primary Key)`);
        } else {
            console.log(`  ✅ ${idx.indexname}`);
            console.log(`     ${idx.indexdef.substring(0, 100)}...`);
        }
    });
}

async function showIndexSummary() {
    console.log('\n\n📈 Index Summary');
    console.log('═'.repeat(80));

    const summary = await prisma.$queryRaw<TableStats[]>`
        SELECT 
            tablename,
            COUNT(*)::text as index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY COUNT(*) DESC, tablename
    `;

    console.log('\n┌─────────────────────────────┬──────────────┐');
    console.log('│ Table                       │ Index Count  │');
    console.log('├─────────────────────────────┼──────────────┤');

    summary.forEach((row) => {
        const count = parseInt(row.index_count);
        const status = count > 1 ? '✅' : '⚠️ ';
        console.log(
            `│ ${status} ${row.tablename.padEnd(25)} │ ${row.index_count.padStart(12)} │`
        );
    });

    console.log('└─────────────────────────────┴──────────────┘');
}

async function checkMissingIndexes() {
    console.log('\n\n🔍 Checking Foreign Keys for Indexes');
    console.log('═'.repeat(80));

    const missingIndexes = await prisma.$queryRaw<MissingIndex[]>`
        SELECT
            tc.table_name,
            kcu.column_name,
            tc.constraint_name,
            CASE 
                WHEN i.indexname IS NULL THEN '❌ Missing Index'
                ELSE '✅ Has Index: ' || i.indexname
            END as index_status
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN pg_indexes i
            ON i.tablename = tc.table_name
            AND i.indexdef LIKE '%' || kcu.column_name || '%'
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
    `;

    const missing = missingIndexes.filter((idx) => idx.index_status.includes('Missing'));
    const hasIndex = missingIndexes.filter((idx) => idx.index_status.includes('Has Index'));

    console.log(`\n✅ Foreign keys with indexes: ${hasIndex.length}`);
    console.log(`❌ Foreign keys without indexes: ${missing.length}\n`);

    if (missing.length > 0) {
        console.log('⚠️  Missing Indexes on Foreign Keys:');
        console.log('─'.repeat(80));
        missing.forEach((idx) => {
            console.log(`  ❌ ${idx.table_name}.${idx.column_name}`);
        });
    }
}

async function showRecommendations() {
    console.log('\n\n💡 Recommendations');
    console.log('═'.repeat(80));

    // Check which indexes are missing
    const recommendations: string[] = [];

    // Check LoanProduct
    const loanProductIndexes = await prisma.$queryRaw<IndexInfo[]>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'LoanProduct'
    `;
    const hasStatusIndex = loanProductIndexes.some((idx) =>
        idx.indexname.includes('status')
    );
    if (!hasStatusIndex) {
        recommendations.push(
            'CREATE INDEX "LoanProduct_status_idx" ON "LoanProduct"(status);'
        );
    }

    // Check Loan
    const loanIndexes = await prisma.$queryRaw<IndexInfo[]>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Loan'
    `;
    const hasLoanStatusIndex = loanIndexes.some((idx) => idx.indexname.includes('status'));
    if (!hasLoanStatusIndex) {
        recommendations.push('CREATE INDEX "Loan_status_idx" ON "Loan"(status);');
    }

    const hasLoanBranchIndex = loanIndexes.some((idx) =>
        idx.indexname.includes('branchId')
    );
    if (!hasLoanBranchIndex) {
        recommendations.push('CREATE INDEX "Loan_branchId_idx" ON "Loan"("branchId");');
    }

    // Check Customer
    const customerIndexes = await prisma.$queryRaw<IndexInfo[]>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Customer'
    `;
    const hasBusinessNameIndex = customerIndexes.some((idx) =>
        idx.indexname.includes('businessName')
    );
    if (!hasBusinessNameIndex) {
        recommendations.push(
            'CREATE INDEX "Customer_businessName_idx" ON "Customer"("businessName");'
        );
    }

    // Check Disbursement
    const disbursementIndexes = await prisma.$queryRaw<IndexInfo[]>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Disbursement'
    `;
    const hasDisbursementStatusIndex = disbursementIndexes.some((idx) =>
        idx.indexname.includes('status')
    );
    if (!hasDisbursementStatusIndex) {
        recommendations.push(
            'CREATE INDEX "Disbursement_status_idx" ON "Disbursement"(status);'
        );
    }

    // Check Payment
    const paymentIndexes = await prisma.$queryRaw<IndexInfo[]>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Payment'
    `;
    const hasPaymentStatusIndex = paymentIndexes.some((idx) =>
        idx.indexname.includes('status')
    );
    if (!hasPaymentStatusIndex) {
        recommendations.push('CREATE INDEX "Payment_status_idx" ON "Payment"(status);');
    }

    // Check PaymentSchedule
    const scheduleIndexes = await prisma.$queryRaw<IndexInfo[]>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'PaymentSchedule'
    `;
    const hasScheduleStatusIndex = scheduleIndexes.some((idx) =>
        idx.indexname.includes('status')
    );
    if (!hasScheduleStatusIndex) {
        recommendations.push(
            'CREATE INDEX "PaymentSchedule_status_idx" ON "PaymentSchedule"(status);'
        );
    }

    if (recommendations.length === 0) {
        console.log('\n✅ All recommended indexes are already in place!');
        console.log('   Your database is well-optimized.');
    } else {
        console.log('\n⚠️  Missing Recommended Indexes:');
        console.log('─'.repeat(80));
        console.log('\nRun these SQL commands to add missing indexes:\n');
        recommendations.forEach((sql, index) => {
            console.log(`${index + 1}. ${sql}`);
        });

        console.log('\n💡 Or run this script to add all at once:');
        console.log('   npm run db:add-indexes');
    }

    console.log('\n');
}

// Run
checkIndexes();

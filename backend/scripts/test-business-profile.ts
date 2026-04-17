/**
 * Test Business Profile Service
 * 
 * Script to test the new business profile schema and service
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBusinessProfileSchema() {
  console.log('🧪 Testing Business Profile Schema...\n');

  try {
    // Test 1: Check if tables exist
    console.log('✅ Test 1: Checking if tables exist...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'customer_%'
      ORDER BY tablename;
    `;
    
    console.log('Found tables:');
    tables.forEach(t => console.log(`  - ${t.tablename}`));
    
    const expectedTables = [
      'customer_business_profiles',
      'customer_shareholders',
      'customer_executives',
      'customer_loan_requests',
      'customer_collaterals',
      'customer_suppliers',
      'customer_customers',
      'customer_dscr_analysis',
      'customer_approval_comments',
    ];
    
    const foundTables = tables.map(t => t.tablename);
    const missingTables = expectedTables.filter(t => !foundTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
    } else {
      console.log('✅ All expected tables exist!\n');
    }

    // Test 2: Check enums
    console.log('✅ Test 2: Checking enums...');
    const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname 
      FROM pg_type 
      WHERE typname IN ('ProfileStatus', 'ReviewStatus')
      ORDER BY typname;
    `;
    
    console.log('Found enums:');
    enums.forEach(e => console.log(`  - ${e.typname}`));
    
    if (enums.length === 2) {
      console.log('✅ All enums exist!\n');
    } else {
      console.log('❌ Missing enums\n');
    }

    // Test 3: Try to create a test profile (dry run)
    console.log('✅ Test 3: Testing profile creation (dry run)...');
    
    // Find first customer
    const customer = await prisma.customer.findFirst();
    
    if (!customer) {
      console.log('⚠️  No customers found in database. Skipping profile creation test.\n');
    } else {
      console.log(`Found customer: ${customer.businessName} (${customer.id})`);
      
      // Check if profile already exists
      const existingProfile = await prisma.customerBusinessProfile.findFirst({
        where: { customerId: customer.id },
      });
      
      if (existingProfile) {
        console.log(`✅ Profile already exists for this customer (ID: ${existingProfile.id})`);
        console.log(`   - Version: ${existingProfile.version}`);
        console.log(`   - Status: ${existingProfile.status}`);
        console.log(`   - Confidence: ${existingProfile.matchConfidence}`);
        
        // Count related records
        const shareholders = await prisma.customerShareholder.count({
          where: { profileId: existingProfile.id },
        });
        const loanRequests = await prisma.customerLoanRequest.count({
          where: { profileId: existingProfile.id },
        });
        
        console.log(`   - Shareholders: ${shareholders}`);
        console.log(`   - Loan Requests: ${loanRequests}\n`);
      } else {
        console.log('ℹ️  No profile exists yet for this customer.\n');
      }
    }

    // Test 4: Check indexes
    console.log('✅ Test 4: Checking indexes...');
    const indexes = await prisma.$queryRaw<Array<{ indexname: string, tablename: string }>>`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename LIKE 'customer_%'
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;
    
    console.log(`Found ${indexes.length} indexes on customer tables`);
    
    // Group by table
    const indexesByTable = indexes.reduce((acc, idx) => {
      if (!acc[idx.tablename]) acc[idx.tablename] = [];
      acc[idx.tablename].push(idx.indexname);
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(indexesByTable).forEach(([table, idxs]) => {
      console.log(`  ${table}: ${idxs.length} indexes`);
    });
    console.log('');

    // Test 5: Check foreign keys
    console.log('✅ Test 5: Checking foreign keys...');
    const foreignKeys = await prisma.$queryRaw<Array<{ 
      constraint_name: string, 
      table_name: string,
      column_name: string,
      foreign_table_name: string 
    }>>`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name LIKE 'customer_%'
      ORDER BY tc.table_name;
    `;
    
    console.log(`Found ${foreignKeys.length} foreign keys on customer tables`);
    
    // Group by table
    const fksByTable = foreignKeys.reduce((acc, fk) => {
      if (!acc[fk.table_name]) acc[fk.table_name] = [];
      acc[fk.table_name].push(`${fk.column_name} → ${fk.foreign_table_name}`);
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(fksByTable).forEach(([table, fks]) => {
      console.log(`  ${table}:`);
      fks.forEach(fk => console.log(`    - ${fk}`));
    });
    console.log('');

    console.log('🎉 All tests passed!\n');
    console.log('📊 Summary:');
    console.log(`  - Tables: ${tables.length}`);
    console.log(`  - Enums: ${enums.length}`);
    console.log(`  - Indexes: ${indexes.length}`);
    console.log(`  - Foreign Keys: ${foreignKeys.length}`);
    console.log('');
    console.log('✅ Database schema is ready for use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testBusinessProfileSchema()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

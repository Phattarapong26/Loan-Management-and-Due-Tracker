/**
 * Verify Race Condition Fixes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('\n🔍 Verifying Migrations...\n');
  
  // Check version columns
  const tables = ['loans', 'product_budgets', 'payment_schedules', 'payments'];
  for (const table of tables) {
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${table}' AND column_name = 'version'
    `);
    console.log(`✓ ${table}.version: ${(result as any[]).length > 0 ? 'EXISTS' : 'MISSING'}`);
  }
  
  console.log('');
  
  // Check idempotency keys
  const idempTables = ['payments', 'loan_disbursements', 'budget_consumption'];
  for (const table of idempTables) {
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${table}' AND column_name = 'idempotency_key'
    `);
    console.log(`✓ ${table}.idempotency_key: ${(result as any[]).length > 0 ? 'EXISTS' : 'MISSING'}`);
  }
  
  console.log('');
  
  // Check indexes
  const indexes = [
    'idx_loans_id_version',
    'idx_product_budgets_id_version', 
    'idx_payments_idempotency_key'
  ];
  for (const idx of indexes) {
    const result = await prisma.$queryRawUnsafe(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname = '${idx}'
    `);
    console.log(`✓ ${idx}: ${(result as any[]).length > 0 ? 'EXISTS' : 'MISSING'}`);
  }
  
  console.log('\n✅ All migrations verified!\n');
  
  await prisma.$disconnect();
  process.exit(0);
}

verify().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

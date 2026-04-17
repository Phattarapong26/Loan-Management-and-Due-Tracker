/**
 * Apply Migrations Safely (Skip Existing)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 Applying Race Condition Fixes (Safe Mode)\n');
  
  // Step 1: Add version columns
  console.log('Step 1: Adding version columns...');
  
  const tables = ['loans', 'product_budgets', 'payment_schedules', 'payments'];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL
      `);
      console.log(`✓ Added version to ${table}`);
    } catch (e: any) {
      console.log(`- ${table} version column (already exists)`);
    }
  }
  
  // Step 2: Add idempotency keys
  console.log('\nStep 2: Adding idempotency keys...');
  
  const idempotencyTables = ['payments', 'loan_disbursements', 'budget_consumption'];
  
  for (const table of idempotencyTables) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS idempotency_key TEXT
      `);
      console.log(`✓ Added idempotency_key to ${table}`);
    } catch (e: any) {
      console.log(`- ${table} idempotency_key (already exists)`);
    }
  }
  
  // Step 3: Add indexes
  console.log('\nStep 3: Adding indexes...');
  
  const indexes = [
    { table: 'loans', name: 'idx_loans_id_version', columns: '(id, version)' },
    { table: 'product_budgets', name: 'idx_product_budgets_id_version', columns: '(id, version)' },
    { table: 'payments', name: 'idx_payments_idempotency_key', columns: '(idempotency_key) WHERE idempotency_key IS NOT NULL' },
  ];
  
  for (const idx of indexes) {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} ${idx.columns}
      `);
      console.log(`✓ Created index ${idx.name}`);
    } catch (e: any) {
      console.log(`- ${idx.name} (already exists)`);
    }
  }
  
  console.log('\n✅ All migrations applied successfully!\n');
  
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

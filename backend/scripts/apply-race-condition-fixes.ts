/**
 * Apply Race Condition Fixes
 * 
 * This script applies all database migrations to fix race conditions:
 * 1. Add optimistic locking (version fields)
 * 2. Add database constraints
 * 3. Add idempotency keys
 * 
 * Usage:
 *   npm run db:fix-race-conditions
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

interface MigrationResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

async function runMigration(
  name: string,
  sqlFile: string
): Promise<MigrationResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running migration: ${name}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', sqlFile);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(statement);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Migration completed successfully in ${duration}ms\n`);

    return {
      name,
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Migration failed:`, error.message);

    return {
      name,
      success: false,
      duration,
      error: error.message,
    };
  }
}

async function verifyMigrations(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Verifying migrations...');
  console.log('='.repeat(60) + '\n');

  try {
    // Check if version column exists
    const versionCheck = await prisma.$queryRaw<any[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loans' 
      AND column_name = 'version'
    `;

    if (versionCheck.length === 0) {
      console.error('❌ Version column not found in loans table');
      return false;
    }

    console.log('✅ Version column exists');

    // Check if constraints exist
    const constraintCheck = await prisma.$queryRaw<any[]>`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'loans' 
      AND constraint_name = 'chk_loans_outstanding_balance_positive'
    `;

    if (constraintCheck.length === 0) {
      console.error('❌ Balance constraint not found');
      return false;
    }

    console.log('✅ Database constraints exist');

    // Check if idempotency_key column exists
    const idempotencyCheck = await prisma.$queryRaw<any[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name = 'idempotency_key'
    `;

    if (idempotencyCheck.length === 0) {
      console.error('❌ Idempotency key column not found');
      return false;
    }

    console.log('✅ Idempotency keys exist');

    return true;
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n' + '🔧'.repeat(30));
  console.log('APPLYING RACE CONDITION FIXES');
  console.log('🔧'.repeat(30) + '\n');

  const results: MigrationResult[] = [];

  // Run migrations in order
  const migrations = [
    { name: 'Optimistic Locking', file: 'add_optimistic_locking.sql' },
    { name: 'Database Constraints', file: 'add_database_constraints.sql' },
    { name: 'Idempotency Keys', file: 'add_idempotency_keys.sql' },
  ];

  for (const migration of migrations) {
    const result = await runMigration(migration.name, migration.file);
    results.push(result);

    if (!result.success) {
      console.error(`\n❌ Migration failed: ${migration.name}`);
      console.error(`Error: ${result.error}`);
      console.error('\nStopping migration process.\n');
      break;
    }
  }

  // Verify migrations
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION');
  console.log('='.repeat(60));

  const verified = await verifyMigrations();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const allSuccess = results.every(r => r.success) && verified;

  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
    console.log('\nYour database is now protected against race conditions!');
    console.log('\nNext steps:');
    console.log('1. Update your application code to use the new safe services');
    console.log('2. Run the verification tests: npm run test:destruction');
    console.log('3. Deploy to staging for testing');
  } else {
    console.log('❌ SOME MIGRATIONS FAILED');
    console.log('\nPlease review the errors above and fix them before proceeding.');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allSuccess ? 0 : 1);
}

main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

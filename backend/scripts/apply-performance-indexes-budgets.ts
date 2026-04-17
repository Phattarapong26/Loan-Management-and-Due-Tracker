#!/usr/bin/env ts-node

/**
 * Apply Performance Indexes for Budget Tables
 * 
 * This script adds database indexes to improve query performance
 * for budget-related operations.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function applyIndexes() {
  console.log('🚀 Starting performance index creation...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_performance_indexes_budgets.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolon and filter empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract index name for logging
      const indexMatch = statement.match(/idx_\w+/);
      const indexName = indexMatch ? indexMatch[0] : `statement ${i + 1}`;
      
      console.log(`⏳ Creating index: ${indexName}...`);
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Created: ${indexName}\n`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Already exists: ${indexName}\n`);
        } else {
          console.error(`❌ Failed: ${indexName}`);
          console.error(`   Error: ${error.message}\n`);
        }
      }
    }

    console.log('✨ Performance indexes applied successfully!\n');
    
    // Show index information
    console.log('📊 Checking created indexes...\n');
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('product_budgets', 'budget_consumption')
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;

    console.log('Indexes created:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.tablename}.${idx.indexname}`);
    });
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error applying indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
applyIndexes();


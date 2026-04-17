#!/usr/bin/env ts-node

/**
 * Test Performance Setup
 * 
 * Verifies that all performance optimizations are working correctly
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

async function testSetup() {
  console.log('🧪 Testing Performance Setup\n');
  
  let allPassed = true;

  // Test 1: Database Connection
  console.log('1️⃣ Testing database connection...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Database connected\n');
  } catch (error) {
    console.error('   ❌ Database connection failed:', error);
    allPassed = false;
  }

  // Test 2: Redis Connection
  console.log('2️⃣ Testing Redis connection...');
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    console.log('   ✅ Redis connected');
    await redis.quit();
    console.log('');
  } catch (error) {
    console.error('   ❌ Redis connection failed:', error);
    allPassed = false;
  }

  // Test 3: Budget Indexes
  console.log('3️⃣ Checking budget table indexes...');
  try {
    const budgetIndexes = await prisma.$queryRaw<any[]>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('product_budgets', 'budget_consumption')
      AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `;
    
    if (budgetIndexes.length > 0) {
      console.log(`   ✅ Found ${budgetIndexes.length} budget indexes:`);
      budgetIndexes.forEach(idx => console.log(`      - ${idx.indexname}`));
      console.log('');
    } else {
      console.log('   ⚠️  No budget indexes found (run apply-performance-indexes-budgets.ts)\n');
      allPassed = false;
    }
  } catch (error) {
    console.error('   ❌ Failed to check budget indexes:', error);
    allPassed = false;
  }

  // Test 4: Disbursement Indexes
  console.log('4️⃣ Checking disbursement table indexes...');
  try {
    const disbursementIndexes = await prisma.$queryRaw<any[]>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'loan_disbursements'
      AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `;
    
    if (disbursementIndexes.length > 0) {
      console.log(`   ✅ Found ${disbursementIndexes.length} disbursement indexes:`);
      disbursementIndexes.forEach(idx => console.log(`      - ${idx.indexname}`));
      console.log('');
    } else {
      console.log('   ⚠️  No disbursement indexes found (run apply-performance-indexes-disbursements.ts)\n');
      allPassed = false;
    }
  } catch (error) {
    console.error('   ❌ Failed to check disbursement indexes:', error);
    allPassed = false;
  }

  // Test 5: Cache Test
  console.log('5️⃣ Testing cache operations...');
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Set test value
    await redis.set('test:performance', 'working', 'EX', 10);
    
    // Get test value
    const value = await redis.get('test:performance');
    
    if (value === 'working') {
      console.log('   ✅ Cache read/write working');
    } else {
      console.log('   ❌ Cache read/write failed');
      allPassed = false;
    }
    
    // Clean up
    await redis.del('test:performance');
    await redis.quit();
    console.log('');
  } catch (error) {
    console.error('   ❌ Cache test failed:', error);
    allPassed = false;
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allPassed) {
    console.log('✅ All tests passed! Performance setup is complete.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

testSetup();

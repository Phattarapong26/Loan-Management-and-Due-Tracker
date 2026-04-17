#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { setupPrerequisites } from './prisma/setup-prerequisites';
import { resetAndSeedProduction2025 } from './prisma/reset-and-seed-production-2025';

const prisma = new PrismaClient();

async function runFullProductionSeed() {
  console.log('🚀 Starting Full Production Seed for 2025-2026 Data\n');
  console.log('=' .repeat(60));
  console.log('🎯 PRODUCTION-READY DATABASE SETUP');
  console.log('📅 Data Period: January 2025 - March 2026');
  console.log('💼 Features: NPL Tracking, Budget Management, Collection System');
  console.log('=' .repeat(60));
  console.log();
  
  const startTime = Date.now();
  
  try {
    // Step 1: Setup prerequisites
    console.log('📋 STEP 1: Setting up prerequisites...\n');
    await setupPrerequisites();
    
    console.log('\n' + '─'.repeat(60) + '\n');
    
    // Step 2: Reset and seed production data
    console.log('🌱 STEP 2: Resetting and seeding production data...\n');
    await resetAndSeedProduction2025();
    
    // Step 3: Final summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PRODUCTION SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Time: ${duration} seconds`);
    console.log('📊 Database is now ready with:');
    console.log('   • Realistic customer data with various payment behaviors');
    console.log('   • NPL cases for testing collection workflows');
    console.log('   • Product budgets for 2025-2026 with utilization tracking');
    console.log('   • Payment histories showing NPL progression over time');
    console.log('   • Collection actions and recovery scenarios');
    console.log();
    console.log('🎯 Ready for Production Use:');
    console.log('   • NPL analysis and reporting');
    console.log('   • Collection workflow testing');
    console.log('   • Budget utilization monitoring');
    console.log('   • Customer risk assessment');
    console.log('   • Payment behavior analysis');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Production seed failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check database connection');
    console.error('   2. Ensure Prisma schema is up to date');
    console.error('   3. Verify environment variables');
    console.error('   4. Check for any missing migrations');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Add command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 Production Seed Script for 2025-2026 Data

Usage:
  npm run seed:production        # Run full production seed
  tsx run-production-seed-2025.ts

Features:
  • Creates realistic customer data with NPL scenarios
  • Generates product budgets for 2025-2026
  • Includes payment histories and collection actions
  • Ready for production use with real-world scenarios

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be created (not implemented)
  --verbose      Show detailed logging (default)

Examples:
  # Run full production seed
  npm run seed:production
  
  # Run with tsx directly
  tsx run-production-seed-2025.ts
`);
    return;
  }
  
  if (args.includes('--dry-run')) {
    console.log('🔍 DRY RUN MODE - Showing what would be created:');
    console.log('   • 21 customers with various payment scenarios');
    console.log('   • 21 loans with realistic payment histories');
    console.log('   • Product budgets for 2025-2026 (40 records)');
    console.log('   • Payment records based on scenarios');
    console.log('   • Collection actions for NPL cases');
    console.log('   • Budget consumption tracking');
    console.log('\n💡 Remove --dry-run to execute actual seed');
    return;
  }
  
  await runFullProductionSeed();
}

// Run main function if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('run-production-seed-2025.ts')) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { runFullProductionSeed };
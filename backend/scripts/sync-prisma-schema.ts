/**
 * Sync Prisma Schema with Database
 * 
 * ดึง schema จาก database จริงมาสร้างเป็น Prisma schema ใหม่
 * แก้ปัญหา schema drift
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncPrismaSchema() {
    console.log('🔄 Syncing Prisma Schema with Database...\n');
    console.log('═'.repeat(80));

    try {
        const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
        const backupPath = path.join(__dirname, '../prisma/schema.prisma.backup');

        // 1. Backup current schema
        console.log('📝 Backing up current schema...');
        if (fs.existsSync(schemaPath)) {
            fs.copyFileSync(schemaPath, backupPath);
            console.log(`   ✅ Backup saved: ${backupPath}\n`);
        }

        // 2. Introspect database (pull schema from DB)
        console.log('🔍 Introspecting database...');
        console.log('   This will generate Prisma schema from current database structure\n');
        
        execSync('npx prisma db pull', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        console.log('\n   ✅ Schema introspected successfully\n');

        // 3. Format schema
        console.log('✨ Formatting schema...');
        execSync('npx prisma format', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        console.log('   ✅ Schema formatted\n');

        // 4. Generate Prisma Client
        console.log('🔨 Generating Prisma Client...');
        execSync('npx prisma generate', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        console.log('   ✅ Prisma Client generated\n');

        // 5. Summary
        console.log('\n📊 Summary');
        console.log('═'.repeat(80));
        console.log('\n✅ Prisma schema synced with database');
        console.log('✅ Old schema backed up');
        console.log('✅ Prisma Client regenerated');

        console.log('\n💡 Next Steps:');
        console.log('   1. Review the new schema.prisma file');
        console.log('   2. Compare with backup if needed');
        console.log('   3. Commit the updated schema to git');
        console.log('   4. Run: npm run db:export-schema (to create SQL files)');
        console.log('');

    } catch (error: any) {
        console.error('\n❌ Sync failed:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Check DATABASE_URL in .env');
        console.log('   2. Ensure database is running');
        console.log('   3. Check database connection');
        process.exit(1);
    }
}

// Run
syncPrismaSchema();

/**
 * Reset Migrations
 * 
 * สร้าง migration ใหม่จาก schema ปัจจุบัน
 * แก้ปัญหา migration history ที่ไม่ตรงกัน
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

async function resetMigrations() {
    console.log('⚠️  Reset Migrations\n');
    console.log('═'.repeat(80));
    console.log('\nThis will:');
    console.log('1. Backup current migrations');
    console.log('2. Delete all migrations');
    console.log('3. Create a single baseline migration from current schema');
    console.log('4. Mark it as applied in database');
    console.log('\n⚠️  WARNING: This is a destructive operation!');
    console.log('⚠️  Only do this if you understand the consequences.\n');

    const answer = await question('Do you want to continue? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Operation cancelled');
        rl.close();
        process.exit(0);
    }

    try {
        const migrationsDir = path.join(__dirname, '../prisma/migrations');
        const backupDir = path.join(__dirname, '../prisma/migrations-backup-' + Date.now());

        // 1. Backup migrations
        console.log('\n📝 Backing up migrations...');
        if (fs.existsSync(migrationsDir)) {
            fs.cpSync(migrationsDir, backupDir, { recursive: true });
            console.log(`   ✅ Backup saved: ${backupDir}\n`);
        }

        // 2. Delete migrations directory
        console.log('🗑️  Deleting old migrations...');
        if (fs.existsSync(migrationsDir)) {
            fs.rmSync(migrationsDir, { recursive: true, force: true });
            console.log('   ✅ Old migrations deleted\n');
        }

        // 3. Create baseline migration
        console.log('📝 Creating baseline migration...');
        console.log('   This will create a single migration from current schema\n');
        
        execSync('npx prisma migrate dev --name baseline --create-only', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        console.log('\n   ✅ Baseline migration created\n');

        // 4. Mark as applied
        console.log('✅ Marking migration as applied...');
        execSync('npx prisma migrate resolve --applied baseline', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        console.log('   ✅ Migration marked as applied\n');

        // 5. Summary
        console.log('\n📊 Summary');
        console.log('═'.repeat(80));
        console.log('\n✅ Migrations reset successfully');
        console.log('✅ Baseline migration created');
        console.log('✅ Migration history cleaned');

        console.log('\n💡 Next Steps:');
        console.log('   1. Test the application');
        console.log('   2. Commit the new migrations to git');
        console.log('   3. Run: npm run db:export-schema');
        console.log('   4. Share the SQL files with your team');
        console.log('');

    } catch (error: any) {
        console.error('\n❌ Reset failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run
resetMigrations();

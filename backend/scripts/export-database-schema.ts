/**
 * Export Database Schema
 * 
 * สร้างไฟล์ SQL schema ฉบับปัจจุบันจาก database จริง
 * เพื่อใช้ deploy บนเครื่องอื่นได้
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../database-exports');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

async function exportDatabaseSchema() {
    console.log('🔍 Exporting Database Schema...\n');
    console.log('═'.repeat(80));

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    try {
        // Get DATABASE_URL from .env
        const envPath = path.join(__dirname, '../.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const dbUrlMatch = envContent.match(/DATABASE_URL="(.+)"/);
        
        if (!dbUrlMatch) {
            throw new Error('DATABASE_URL not found in .env');
        }

        const databaseUrl = dbUrlMatch[1];
        
        // Parse connection string
        const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+)@([^:]+):(\d+)\/([^?]+)/);
        if (!urlMatch) {
            throw new Error('Invalid DATABASE_URL format');
        }

        const [, user, host, port, database] = urlMatch;

        console.log('📊 Database Info:');
        console.log(`   Host: ${host}`);
        console.log(`   Port: ${port}`);
        console.log(`   Database: ${database}`);
        console.log(`   User: ${user}\n`);

        // Use PostgreSQL 16 pg_dump
        const PG_DUMP = '/usr/local/opt/postgresql@16/bin/pg_dump';

        // 1. Export full schema (structure only)
        console.log('📝 Exporting schema structure...');
        const schemaFile = path.join(OUTPUT_DIR, `schema-${TIMESTAMP}.sql`);
        
        execSync(
            `${PG_DUMP} -h ${host} -p ${port} -U ${user} -d ${database} --schema-only --no-owner --no-acl -f "${schemaFile}"`,
            { stdio: 'inherit' }
        );
        
        console.log(`   ✅ Schema exported: ${schemaFile}\n`);

        // 2. Export schema + data (full backup)
        console.log('📝 Exporting full backup (schema + data)...');
        const backupFile = path.join(OUTPUT_DIR, `backup-${TIMESTAMP}.sql`);
        
        execSync(
            `${PG_DUMP} -h ${host} -p ${port} -U ${user} -d ${database} --no-owner --no-acl -f "${backupFile}"`,
            { stdio: 'inherit' }
        );
        
        console.log(`   ✅ Backup exported: ${backupFile}\n`);

        // 3. Export only essential data (for fresh install)
        console.log('📝 Exporting essential data...');
        const dataFile = path.join(OUTPUT_DIR, `data-${TIMESTAMP}.sql`);
        
        // Export only reference data (not user data)
        const tables = [
            'loan_products',
            'interest_rate_tiers',
            'year_interest_tiers',
            'penalty_rules',
            'system_configs',
            'approval_limits',
            'branches'
        ];
        
        execSync(
            `${PG_DUMP} -h ${host} -p ${port} -U ${user} -d ${database} --data-only --no-owner --no-acl ${tables.map(t => `-t ${t}`).join(' ')} -f "${dataFile}"`,
            { stdio: 'inherit' }
        );
        
        console.log(`   ✅ Data exported: ${dataFile}\n`);

        // 4. Create README
        const readmeContent = `# Database Export - ${TIMESTAMP}

## Files

1. **schema-${TIMESTAMP}.sql** - Database structure only (tables, indexes, constraints)
2. **backup-${TIMESTAMP}.sql** - Full backup (structure + all data)
3. **data-${TIMESTAMP}.sql** - Essential reference data only

## Usage

### Fresh Install (New Server)

\`\`\`bash
# 1. Create database
createdb SmeDBank

# 2. Import schema
psql -d SmeDBank -f schema-${TIMESTAMP}.sql

# 3. Import essential data
psql -d SmeDBank -f data-${TIMESTAMP}.sql

# 4. Run Prisma generate
cd backend
npx prisma generate
\`\`\`

### Restore Full Backup

\`\`\`bash
# 1. Drop and recreate database
dropdb SmeDBank
createdb SmeDBank

# 2. Restore backup
psql -d SmeDBank -f backup-${TIMESTAMP}.sql

# 3. Run Prisma generate
cd backend
npx prisma generate
\`\`\`

## Database Info

- **Export Date:** ${new Date().toISOString()}
- **Database:** ${database}
- **Host:** ${host}
- **Port:** ${port}

## Tables Exported

${tables.map(t => `- ${t}`).join('\n')}

## Notes

- Schema file does NOT include data
- Backup file includes ALL data (use for migration)
- Data file includes only reference data (use for fresh install)
`;

        fs.writeFileSync(
            path.join(OUTPUT_DIR, `README-${TIMESTAMP}.md`),
            readmeContent
        );

        // 5. Summary
        console.log('\n📊 Export Summary');
        console.log('═'.repeat(80));
        console.log(`\n✅ Schema file: ${schemaFile}`);
        console.log(`✅ Backup file: ${backupFile}`);
        console.log(`✅ Data file: ${dataFile}`);
        console.log(`✅ README: ${path.join(OUTPUT_DIR, `README-${TIMESTAMP}.md`)}`);

        // File sizes
        const schemaSize = (fs.statSync(schemaFile).size / 1024).toFixed(2);
        const backupSize = (fs.statSync(backupFile).size / 1024).toFixed(2);
        const dataSize = (fs.statSync(dataFile).size / 1024).toFixed(2);

        console.log(`\n📦 File Sizes:`);
        console.log(`   Schema: ${schemaSize} KB`);
        console.log(`   Backup: ${backupSize} KB`);
        console.log(`   Data: ${dataSize} KB`);

        console.log('\n✅ Export complete!\n');

    } catch (error: any) {
        console.error('\n❌ Export failed:', error.message);
        process.exit(1);
    }
}

// Run
exportDatabaseSchema();

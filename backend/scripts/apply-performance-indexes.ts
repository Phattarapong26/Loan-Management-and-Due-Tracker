import { prisma } from '../src/core/config/database.config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../src/core/utils/common/logger.util';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Apply Performance Indexes
 * 
 * This script applies all performance indexes to the database
 * to improve query performance and reduce N+1 query issues.
 */

async function applyPerformanceIndexes() {
    try {
        logger.info('🚀 Starting performance indexes migration...');

        // Read SQL file
        const sqlPath = join(__dirname, '../prisma/migrations/add_performance_indexes.sql');
        logger.info({ sqlPath }, 'Reading SQL file...');
        
        const sql = readFileSync(sqlPath, 'utf-8');

        // Split by semicolon and filter out comments and empty lines
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

        logger.info(`📝 Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            try {
                // Skip comments
                if (statement.startsWith('--') || statement.startsWith('/*')) {
                    continue;
                }

                // Extract index name for logging
                const indexMatch = statement.match(/idx_\w+/);
                const indexName = indexMatch ? indexMatch[0] : 'unknown';

                await prisma.$executeRawUnsafe(statement + ';');
                logger.info(`✅ Created index: ${indexName}`);
                successCount++;
            } catch (error: any) {
                // Check if index already exists
                if (error.message?.includes('already exists')) {
                    const indexMatch = statement.match(/idx_\w+/);
                    const indexName = indexMatch ? indexMatch[0] : 'unknown';
                    logger.info(`⏭️  Index already exists: ${indexName}`);
                    skipCount++;
                } else {
                    logger.error({ error: error.message, statement: statement.substring(0, 100) }, 'Failed to create index');
                    errorCount++;
                }
            }
        }

        logger.info('📊 Migration Summary:');
        logger.info(`   ✅ Created: ${successCount}`);
        logger.info(`   ⏭️  Skipped: ${skipCount}`);
        logger.info(`   ❌ Errors: ${errorCount}`);

        // Verify indexes
        logger.info('🔍 Verifying indexes...');
        const indexes = await prisma.$queryRaw<any[]>`
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname LIKE 'idx_%'
            ORDER BY tablename, indexname;
        `;

        logger.info(`📋 Total indexes found: ${indexes.length}`);

        // Group by table
        const indexesByTable = indexes.reduce((acc, idx) => {
            if (!acc[idx.tablename]) {
                acc[idx.tablename] = [];
            }
            acc[idx.tablename].push(idx.indexname);
            return acc;
        }, {} as Record<string, string[]>);

        logger.info('📊 Indexes by table:');
        for (const [table, idxList] of Object.entries(indexesByTable)) {
            logger.info(`   ${table}: ${idxList.length} indexes`);
        }

        logger.info('✅ Performance indexes migration completed successfully!');

    } catch (error: any) {
        logger.error({ error: error.message, stack: error.stack }, 'Failed to apply performance indexes');
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
applyPerformanceIndexes()
    .then(() => {
        logger.info('🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        logger.error({ error: error.message }, 'Migration failed');
        process.exit(1);
    });

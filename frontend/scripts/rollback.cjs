#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Rollback Script: Restore from backup
 * 
 * This script restores the src directory from the most recent backup.
 */

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Find most recent backup
function findLatestBackup() {
    const files = fs.readdirSync(PROJECT_ROOT);
    const backups = files
        .filter(f => f.startsWith('src-backup-'))
        .map(f => ({
            name: f,
            path: path.join(PROJECT_ROOT, f),
            timestamp: parseInt(f.replace('src-backup-', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

    return backups.length > 0 ? backups[0] : null;
}

function rollback() {
    console.log('🔄 Starting rollback...\n');

    const backup = findLatestBackup();

    if (!backup) {
        console.error('❌ No backup found!');
        process.exit(1);
    }

    console.log(`Found backup: ${backup.name}`);
    console.log(`Created: ${new Date(backup.timestamp).toLocaleString()}\n`);

    const srcDir = path.join(PROJECT_ROOT, 'src');
    const srcBackup = path.join(PROJECT_ROOT, `src-before-rollback-${Date.now()}`);

    // Backup current src before rollback
    console.log('Creating backup of current src...');
    if (fs.existsSync(srcDir)) {
        fs.renameSync(srcDir, srcBackup);
        console.log(`✓ Current src backed up to: ${path.basename(srcBackup)}\n`);
    }

    // Restore from backup
    console.log('Restoring from backup...');
    fs.renameSync(backup.path, srcDir);
    console.log('✓ Restored src directory\n');

    // Restore tsconfig.json if backup exists
    const tsconfigBackup = path.join(PROJECT_ROOT, 'tsconfig.json.backup');
    if (fs.existsSync(tsconfigBackup)) {
        const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
        fs.copyFileSync(tsconfigBackup, tsconfigPath);
        console.log('✓ Restored tsconfig.json\n');
    }

    console.log('✅ Rollback complete!\n');
    console.log('Your project has been restored to the pre-migration state.');
}

rollback();

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Verification Script: Check migration success
 * 
 * This script verifies that the migration completed successfully.
 */

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFeatureStructure() {
    log('\n📁 Checking Feature Structure...', 'cyan');

    const features = [
        'auth', 'customers', 'loans', 'payments', 'approvals',
        'collections', 'documents', 'branches', 'expenses',
        'reports', 'dashboard', 'notifications', 'calendar',
        'settings', 'users'
    ];

    let allExist = true;

    features.forEach(feature => {
        const featurePath = path.join(SRC_DIR, 'features', feature);

        if (fs.existsSync(featurePath)) {
            log(`  ✓ ${feature}`, 'green');
        } else {
            log(`  ✗ ${feature} - NOT FOUND`, 'red');
            allExist = false;
        }
    });

    return allExist;
}

function checkSharedStructure() {
    log('\n📦 Checking Shared Structure...', 'cyan');

    const sharedDirs = [
        'shared/components/ui',
        'shared/components/layout',
        'shared/hooks',
        'shared/lib',
        'shared/types'
    ];

    let allExist = true;

    sharedDirs.forEach(dir => {
        const dirPath = path.join(SRC_DIR, dir);

        if (fs.existsSync(dirPath)) {
            log(`  ✓ ${dir}`, 'green');
        } else {
            log(`  ✗ ${dir} - NOT FOUND`, 'red');
            allExist = false;
        }
    });

    return allExist;
}

function checkAppStructure() {
    log('\n🚀 Checking App Structure...', 'cyan');

    const appFiles = ['App.tsx', 'main.tsx'];
    let allExist = true;

    appFiles.forEach(file => {
        const filePath = path.join(SRC_DIR, 'app', file);

        if (fs.existsSync(filePath)) {
            log(`  ✓ app/${file}`, 'green');
        } else {
            log(`  ✗ app/${file} - NOT FOUND`, 'red');
            allExist = false;
        }
    });

    return allExist;
}

function checkOldStructure() {
    log('\n🗑️  Checking Old Structure Cleanup...', 'cyan');

    const oldDirs = ['pages', 'components'];
    let cleaned = true;

    oldDirs.forEach(dir => {
        const dirPath = path.join(SRC_DIR, dir);

        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            if (files.length > 0) {
                log(`  ⚠ ${dir}/ still contains files:`, 'yellow');
                files.forEach(f => log(`    - ${f}`, 'yellow'));
                cleaned = false;
            } else {
                log(`  ✓ ${dir}/ is empty`, 'green');
            }
        } else {
            log(`  ✓ ${dir}/ removed`, 'green');
        }
    });

    return cleaned;
}

function checkImportPaths() {
    log('\n🔗 Checking Import Paths...', 'cyan');

    let issuesFound = 0;

    function scanDirectory(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                    scanDirectory(filePath);
                }
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                const content = fs.readFileSync(filePath, 'utf8');

                // Check for old import patterns
                const oldPatterns = [
                    /from ['"]\.\.\/\.\.\/pages\//,
                    /from ['"]@\/pages\//,
                    /from ['"]@\/components\/ui\//,
                    /from ['"]@\/components\/layout\//,
                    /from ['"]@\/hooks\//,
                    /from ['"]@\/lib\//,
                ];

                oldPatterns.forEach(pattern => {
                    if (pattern.test(content)) {
                        if (issuesFound === 0) {
                            log('  Issues found:', 'yellow');
                        }
                        log(`  ⚠ Old import pattern in: ${path.relative(PROJECT_ROOT, filePath)}`, 'yellow');
                        issuesFound++;
                    }
                });
            }
        });
    }

    scanDirectory(SRC_DIR);

    if (issuesFound === 0) {
        log('  ✓ All imports updated', 'green');
        return true;
    } else {
        log(`\n  Found ${issuesFound} files with old import patterns`, 'yellow');
        return false;
    }
}

function checkTsConfig() {
    log('\n⚙️  Checking TypeScript Configuration...', 'cyan');

    const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    const requiredPaths = {
        '@/*': ['./src/*'],
        '@/features/*': ['./src/features/*'],
        '@/shared/*': ['./src/shared/*'],
        '@/app/*': ['./src/app/*']
    };

    let allCorrect = true;

    if (!tsconfig.compilerOptions || !tsconfig.compilerOptions.paths) {
        log('  ✗ No paths configuration found', 'red');
        return false;
    }

    Object.entries(requiredPaths).forEach(([key, value]) => {
        const configValue = tsconfig.compilerOptions.paths[key];

        if (JSON.stringify(configValue) === JSON.stringify(value)) {
            log(`  ✓ ${key}`, 'green');
        } else {
            log(`  ✗ ${key} - incorrect or missing`, 'red');
            allCorrect = false;
        }
    });

    return allCorrect;
}

function main() {
    log('='.repeat(60), 'cyan');
    log('  Migration Verification', 'cyan');
    log('='.repeat(60), 'cyan');

    const results = {
        features: checkFeatureStructure(),
        shared: checkSharedStructure(),
        app: checkAppStructure(),
        cleanup: checkOldStructure(),
        imports: checkImportPaths(),
        tsconfig: checkTsConfig(),
    };

    log('\n' + '='.repeat(60), 'cyan');
    log('  Summary', 'cyan');
    log('='.repeat(60), 'cyan');

    const allPassed = Object.values(results).every(r => r);

    if (allPassed) {
        log('\n✅ All checks passed! Migration successful.', 'green');
        log('\nNext steps:', 'cyan');
        log('  1. Run: npm run build', 'cyan');
        log('  2. Run: npm run dev', 'cyan');
        log('  3. Test critical user flows', 'cyan');
    } else {
        log('\n⚠️  Some checks failed. Please review the issues above.', 'yellow');
        log('\nYou may need to:', 'cyan');
        log('  1. Manually fix remaining import paths', 'cyan');
        log('  2. Move any missed files', 'cyan');
        log('  3. Run verification again', 'cyan');
    }

    log('');
}

main();

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Migration Script: Restructure to Feature-Based Architecture
 * 
 * This script migrates the codebase from flat folder structure to feature-based architecture.
 * It handles file moving, import path updates, and configuration changes.
 */

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const BACKUP_DIR = path.join(PROJECT_ROOT, `src-backup-${Date.now()}`);
const MAPPING_FILE = path.join(__dirname, 'feature-mapping.json');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

// Logging utilities
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'bright');
    console.log('='.repeat(60) + '\n');
}

function logStep(step, detail = '') {
    log(`✓ ${step}`, 'green');
    if (detail && VERBOSE) {
        log(`  ${detail}`, 'cyan');
    }
}

function logWarning(message) {
    log(`⚠ ${message}`, 'yellow');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

// File system utilities
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        if (!DRY_RUN) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        logStep(`Created directory: ${path.relative(PROJECT_ROOT, dirPath)}`);
    }
}

function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    if (!DRY_RUN) {
        fs.copyFileSync(src, dest);
    }
    logStep(`Copied: ${path.relative(PROJECT_ROOT, src)} → ${path.relative(PROJECT_ROOT, dest)}`);
}

function moveFile(src, dest) {
    ensureDir(path.dirname(dest));
    if (!DRY_RUN) {
        fs.renameSync(src, dest);
    }
    logStep(`Moved: ${path.relative(PROJECT_ROOT, src)} → ${path.relative(PROJECT_ROOT, dest)}`);
}

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
    if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

// Backup creation
function createBackup() {
    logSection('Creating Backup');

    if (DRY_RUN) {
        log('DRY RUN: Would create backup at: ' + BACKUP_DIR, 'yellow');
        return;
    }

    log('Creating backup of src directory...', 'blue');

    function copyRecursive(src, dest) {
        const stats = fs.statSync(src);

        if (stats.isDirectory()) {
            fs.mkdirSync(dest, { recursive: true });
            const files = fs.readdirSync(src);

            files.forEach(file => {
                copyRecursive(path.join(src, file), path.join(dest, file));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }

    copyRecursive(SRC_DIR, BACKUP_DIR);
    logStep(`Backup created at: ${BACKUP_DIR}`);
}

// Feature structure creation
function createFeatureStructure(mapping) {
    logSection('Creating Feature Structure');

    const features = Object.keys(mapping.features);

    features.forEach(feature => {
        const featureDir = path.join(SRC_DIR, 'features', feature);

        // Create standard feature folders
        ['components', 'hooks', 'pages', 'types', 'api'].forEach(folder => {
            ensureDir(path.join(featureDir, folder));
        });
    });

    // Create shared structure
    ensureDir(path.join(SRC_DIR, 'shared', 'components', 'ui'));
    ensureDir(path.join(SRC_DIR, 'shared', 'components', 'layout'));
    ensureDir(path.join(SRC_DIR, 'shared', 'hooks'));
    ensureDir(path.join(SRC_DIR, 'shared', 'lib'));
    ensureDir(path.join(SRC_DIR, 'shared', 'types'));
    ensureDir(path.join(SRC_DIR, 'shared', 'constants'));

    // Create app structure
    ensureDir(path.join(SRC_DIR, 'app'));
    ensureDir(path.join(SRC_DIR, 'app', 'providers'));
    ensureDir(path.join(SRC_DIR, 'app', 'pages'));

    logStep('Feature structure created');
}

// File moving
function moveFiles(mapping) {
    logSection('Moving Files');

    // Move feature pages
    Object.entries(mapping.features).forEach(([feature, config]) => {
        config.pages.forEach(page => {
            if (page.endsWith('.tsx')) {
                const src = path.join(SRC_DIR, 'pages', page);
                const dest = path.join(SRC_DIR, 'features', feature, 'pages', page);

                if (fs.existsSync(src)) {
                    moveFile(src, dest);
                } else {
                    logWarning(`File not found: ${page}`);
                }
            } else {
                // It's a directory (like dashboards)
                const src = path.join(SRC_DIR, 'pages', page);
                const dest = path.join(SRC_DIR, 'features', feature, 'pages', page);

                if (fs.existsSync(src)) {
                    if (!DRY_RUN) {
                        fs.renameSync(src, dest);
                    }
                    logStep(`Moved directory: ${page} → features/${feature}/pages/${page}`);
                }
            }
        });

        // Move feature components
        config.components.forEach(comp => {
            const src = path.join(SRC_DIR, 'components', comp);
            const dest = path.join(SRC_DIR, 'features', feature, 'components', comp);

            if (fs.existsSync(src)) {
                if (fs.statSync(src).isDirectory()) {
                    if (!DRY_RUN) {
                        fs.renameSync(src, dest);
                    }
                    logStep(`Moved component directory: ${comp} → features/${feature}/components/${comp}`);
                } else {
                    moveFile(src, dest);
                }
            }
        });
    });

    // Move shared components
    const uiDir = path.join(SRC_DIR, 'components', 'ui');
    if (fs.existsSync(uiDir)) {
        const dest = path.join(SRC_DIR, 'shared', 'components', 'ui');
        if (!DRY_RUN) {
            fs.renameSync(uiDir, dest);
        }
        logStep('Moved: components/ui → shared/components/ui');
    }

    const layoutDir = path.join(SRC_DIR, 'components', 'layout');
    if (fs.existsSync(layoutDir)) {
        const dest = path.join(SRC_DIR, 'shared', 'components', 'layout');
        if (!DRY_RUN) {
            fs.renameSync(layoutDir, dest);
        }
        logStep('Moved: components/layout → shared/components/layout');
    }

    // Move other shared components
    ['NavLink.tsx', 'ThreeBackground.tsx'].forEach(file => {
        const src = path.join(SRC_DIR, 'components', file);
        const dest = path.join(SRC_DIR, 'shared', 'components', file);

        if (fs.existsSync(src)) {
            moveFile(src, dest);
        }
    });

    // Move shared resources
    ['hooks', 'lib', 'types', 'integrations', 'config'].forEach(dir => {
        const src = path.join(SRC_DIR, dir);
        const dest = path.join(SRC_DIR, 'shared', dir);

        if (fs.existsSync(src)) {
            if (!DRY_RUN) {
                fs.renameSync(src, dest);
            }
            logStep(`Moved: ${dir} → shared/${dir}`);
        }
    });

    // Move app files
    ['App.tsx', 'main.tsx', 'App.css', 'index.css'].forEach(file => {
        const src = path.join(SRC_DIR, file);
        const dest = path.join(SRC_DIR, 'app', file);

        if (fs.existsSync(src)) {
            moveFile(src, dest);
        }
    });

    // Move NotFound to app/pages
    const notFoundSrc = path.join(SRC_DIR, 'pages', 'NotFound.tsx');
    const notFoundDest = path.join(SRC_DIR, 'app', 'pages', 'NotFound.tsx');
    if (fs.existsSync(notFoundSrc)) {
        moveFile(notFoundSrc, notFoundDest);
    }
}

// Import path mapping
const importMappings = [
    // Feature imports
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Loans|LoanDetail)['"]/, to: "from '@/features/loans/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Customers|CustomerDetail)['"]/, to: "from '@/features/customers/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Payments)['"]/, to: "from '@/features/payments/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Approvals)['"]/, to: "from '@/features/approvals/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(CollectionsReminders)['"]/, to: "from '@/features/collections/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Documents|DocumentUploadTest)['"]/, to: "from '@/features/documents/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Branches)['"]/, to: "from '@/features/branches/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Expenses)['"]/, to: "from '@/features/expenses/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Reports)['"]/, to: "from '@/features/reports/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Dashboard)['"]/, to: "from '@/features/dashboard/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Notifications)['"]/, to: "from '@/features/notifications/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(CalendarPage)['"]/, to: "from '@/features/calendar/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Settings)['"]/, to: "from '@/features/settings/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Users)['"]/, to: "from '@/features/users/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/(Login|LineRegistration)['"]/, to: "from '@/features/auth/pages/$1'" },
    { from: /from ['"]\.\.?\/\.\.?\/pages\/dashboards['"]/, to: "from '@/features/dashboard/pages/dashboards'" },

    // Shared component imports
    { from: /from ['"]@\/components\/ui\//, to: "from '@/shared/components/ui/" },
    { from: /from ['"]\.\.?\/\.\.?\/components\/ui\//, to: "from '@/shared/components/ui/" },
    { from: /from ['"]@\/components\/layout\//, to: "from '@/shared/components/layout/" },
    { from: /from ['"]\.\.?\/\.\.?\/components\/layout\//, to: "from '@/shared/components/layout/" },
    { from: /from ['"]@\/components\/(NavLink|ThreeBackground)['"]/, to: "from '@/shared/components/$1'" },

    // Feature component imports
    { from: /from ['"]@\/components\/dashboard\//, to: "from '@/features/dashboard/components/" },
    { from: /from ['"]@\/components\/documents\//, to: "from '@/features/documents/components/" },
    { from: /from ['"]@\/components\/auth\//, to: "from '@/features/auth/components/" },
    { from: /from ['"]@\/components\/settings\//, to: "from '@/features/settings/components/" },

    // Shared resources
    { from: /from ['"]@\/hooks\//, to: "from '@/shared/hooks/" },
    { from: /from ['"]@\/lib\//, to: "from '@/shared/lib/" },
    { from: /from ['"]@\/types\//, to: "from '@/shared/types/" },
    { from: /from ['"]@\/integrations\//, to: "from '@/shared/integrations/" },
    { from: /from ['"]@\/config\//, to: "from '@/shared/config/" },
    { from: /from ['"]@\/contexts\//, to: "from '@/shared/contexts/" },

    // App imports
    { from: /from ['"]\.\/pages\/(NotFound)['"]/, to: "from '@/app/pages/$1'" },
];

function updateImports(filePath, content) {
    let updatedContent = content;
    let changesMade = false;

    importMappings.forEach(({ from, to }) => {
        if (from.test(updatedContent)) {
            updatedContent = updatedContent.replace(from, to);
            changesMade = true;
        }
    });

    return { content: updatedContent, changed: changesMade };
}

function updateAllImports() {
    logSection('Updating Import Paths');

    let filesUpdated = 0;
    let totalChanges = 0;

    function processDirectory(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                    processDirectory(filePath);
                }
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                const content = readFile(filePath);
                const { content: updatedContent, changed } = updateImports(filePath, content);

                if (changed) {
                    writeFile(filePath, updatedContent);
                    filesUpdated++;
                    totalChanges++;

                    if (VERBOSE) {
                        logStep(`Updated imports in: ${path.relative(PROJECT_ROOT, filePath)}`);
                    }
                }
            }
        });
    }

    processDirectory(SRC_DIR);

    logStep(`Updated imports in ${filesUpdated} files`);
}

// Update tsconfig.json
function updateTsConfig() {
    logSection('Updating TypeScript Configuration');

    const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
    const tsconfig = JSON.parse(readFile(tsconfigPath));

    // Update paths
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.paths = {
        "@/*": ["./src/*"],
        "@/features/*": ["./src/features/*"],
        "@/shared/*": ["./src/shared/*"],
        "@/app/*": ["./src/app/*"]
    };

    if (!DRY_RUN) {
        writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }

    logStep('Updated tsconfig.json with new path aliases');
}

// Generate migration report
function generateReport(mapping) {
    logSection('Migration Report');

    const reportPath = path.join(PROJECT_ROOT, 'migration-report.txt');
    const timestamp = new Date().toISOString();

    let report = `Migration Report\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Mode: ${DRY_RUN ? 'DRY RUN' : 'ACTUAL'}\n`;
    report += `\n${'='.repeat(60)}\n\n`;

    report += `Features Created:\n`;
    Object.keys(mapping.features).forEach(feature => {
        report += `  - ${feature}\n`;
    });

    report += `\nBackup Location:\n`;
    report += `  ${BACKUP_DIR}\n`;

    report += `\nNew Structure:\n`;
    report += `  src/\n`;
    report += `  ├── app/           # Application core\n`;
    report += `  ├── features/      # Feature modules\n`;
    report += `  └── shared/        # Shared resources\n`;

    if (!DRY_RUN) {
        writeFile(reportPath, report);
        logStep(`Report saved to: migration-report.txt`);
    }

    console.log('\n' + report);
}

// Main execution
async function main() {
    try {
        logSection('Feature-Based Architecture Migration');

        if (DRY_RUN) {
            log('🔍 DRY RUN MODE - No files will be modified', 'yellow');
        }

        // Load mapping
        const mapping = JSON.parse(readFile(MAPPING_FILE));

        // Execute migration steps
        if (!DRY_RUN) {
            createBackup();
        }

        createFeatureStructure(mapping);
        moveFiles(mapping);
        updateAllImports();
        updateTsConfig();
        generateReport(mapping);

        logSection('Migration Complete! ✨');

        if (!DRY_RUN) {
            log('\nNext Steps:', 'bright');
            log('1. Review changes: git diff', 'cyan');
            log('2. Run build: npm run build', 'cyan');
            log('3. Test the application: npm run dev', 'cyan');
            log('4. If issues occur, run: node scripts/rollback.js', 'cyan');
        } else {
            log('\nTo execute migration, run:', 'bright');
            log('  node scripts/migrate-to-features.js', 'cyan');
        }

    } catch (error) {
        logError(`Migration failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run migration
main();

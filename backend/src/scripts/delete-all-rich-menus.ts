#!/usr/bin/env tsx

/**
 * Delete All Rich Menus Script
 * 
 * ⚠️ WARNING: This will delete ALL rich menus from LINE!
 * Use this only when you need to completely reset or clean up.
 * 
 * This script will:
 * 1. Delete all existing rich menus from LINE
 * 2. Clear rich menu IDs from SystemConfig
 */

import { RichMenuManager } from '../modules/line/services/rich-menu/line-rich-menu-manager.service';
import { prisma } from '../core/config/database.config';
import * as readline from 'readline';

async function askConfirmation(): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question('⚠️  Are you sure you want to DELETE ALL rich menus? (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes');
        });
    });
}

async function deleteAllRichMenus() {
    console.log('🗑️  Delete All Rich Menus Script\n');
    console.log('⚠️  WARNING: This will delete ALL rich menus from LINE!');
    console.log('This may cause rate limit issues if you have many menus.\n');

    const confirmed = await askConfirmation();

    if (!confirmed) {
        console.log('❌ Operation cancelled.');
        await prisma.$disconnect();
        process.exit(0);
    }

    try {
        const richMenuManager = new RichMenuManager();

        // Step 1: Delete all existing rich menus
        console.log('\nStep 1: Deleting all existing rich menus from LINE...');
        await richMenuManager.deleteAllRichMenus();
        console.log('✅ All rich menus deleted from LINE\n');

        // Step 2: Clear rich menu IDs from SystemConfig
        console.log('Step 2: Clearing rich menu IDs from database...');
        const result = await prisma.systemConfig.deleteMany({
            where: {
                key: {
                    startsWith: 'rich_menu_',
                },
            },
        });
        console.log(`✅ Deleted ${result.count} rich menu records from database\n`);

        console.log('🎉 All rich menus have been deleted!');
        console.log('\n💡 Next steps:');
        console.log('   Run: npm run rich-menu:reset');
        console.log('   This will create new rich menus with the updated layouts.');
        
        // Close database connection
        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error deleting rich menus:', error);
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Run the script
deleteAllRichMenus();

#!/usr/bin/env tsx

/**
 * Reset Rich Menus Script (Simple Version)
 * 
 * This script will:
 * 1. Check if rich menus already exist
 * 2. Only create new ones if they don't exist or are invalid
 * 3. Avoid hitting LINE API rate limits
 */

import { RichMenuManager } from '../modules/line/services/rich-menu/line-rich-menu-manager.service';
import { prisma } from '../core/config/database.config';

async function resetRichMenus() {
    console.log('🔄 Starting Rich Menu initialization...\n');

    try {
        const richMenuManager = new RichMenuManager();

        // Check existing rich menus first
        console.log('Step 1: Checking existing rich menus...');
        const roles = ['CUSTOMER', 'USER', 'OFFICER', 'MANAGER', 'ADMIN'];
        let existingCount = 0;
        let invalidCount = 0;

        for (const role of roles) {
            const key = `rich_menu_${role.toLowerCase()}`;
            const config = await prisma.systemConfig.findUnique({
                where: { key },
            });

            if (config?.value) {
                // Verify if the rich menu still exists on LINE
                try {
                    const response = await fetch(
                        `https://api.line.me/v2/bot/richmenu/${config.value}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                            },
                        }
                    );

                    if (response.ok) {
                        console.log(`✅ ${role}: Valid rich menu exists (${config.value})`);
                        existingCount++;
                    } else {
                        console.log(`⚠️  ${role}: Rich menu ID exists in DB but not on LINE`);
                        invalidCount++;
                    }
                } catch (error) {
                    console.log(`⚠️  ${role}: Could not verify rich menu`);
                    invalidCount++;
                }
            } else {
                console.log(`❌ ${role}: No rich menu found`);
            }
        }

        console.log(`\nSummary: ${existingCount} valid, ${invalidCount} invalid, ${roles.length - existingCount - invalidCount} missing\n`);

        // Only proceed if there are missing or invalid menus
        if (existingCount === roles.length) {
            console.log('✅ All rich menus are already set up and valid!');
            console.log('💡 If you want to recreate them, delete them first using deleteAllRichMenus()');
            await prisma.$disconnect();
            process.exit(0);
        }

        // Step 2: Initialize rich menus (will skip existing valid ones)
        console.log('Step 2: Creating/updating rich menus...');
        await richMenuManager.initializeRichMenus();
        console.log('✅ Rich menus initialized\n');

        console.log('🎉 Rich Menu setup completed successfully!');
        console.log('\nNew Menu Layouts (3x2 grid):');
        console.log('📱 CUSTOMER: ยอดคงเหลือ | กำหนดชำระ | ตารางชำระ');
        console.log('            ประวัติ | ใบแจ้งหนี้ | สัญญา');
        console.log('\n👨‍💼 OFFICER: งานวันนี้ | บันทึก | แดชบอร์ด');
        console.log('            ลูกค้า | สินเชื่อ | เมนู');
        console.log('\n👨‍💼 MANAGER: แดชบอร์ด | KPI | NPL');
        console.log('            อนุมัติ | ผลงานทีม | เมนู');
        console.log('\n👨‍💻 ADMIN: แดชบอร์ด | สถานะระบบ | ตั้งค่า');
        console.log('          จัดการผู้ใช้ | รายชื่อติดต่อ | เมนู');
        
        // Close database connection
        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up rich menus:', error);
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Run the script
resetRichMenus();

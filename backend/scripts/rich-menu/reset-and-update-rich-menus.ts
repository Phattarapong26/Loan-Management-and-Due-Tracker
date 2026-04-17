#!/usr/bin/env tsx

/**
 * RESET and Update All Rich Menus with Custom Images
 * ลบ Rich Menu เดิมทั้งหมด แล้วสร้างใหม่ตามที่ออกแบบ
 */

import axios from 'axios';
import { env } from './src/config/env';
import * as fs from 'fs';
import * as path from 'path';

interface RichMenuConfig {
    size: { width: number; height: number };
    selected: boolean;
    name: string;
    chatBarText: string;
    areas: Array<{
        bounds: { x: number; y: number; width: number; height: number };
        action: { type: string; text: string };
    }>;
}

// Function to delete all existing Rich Menus
async function cleanupAllRichMenus(accessToken: string) {
    console.log('🧹 Cleaning up all existing Rich Menus...');
    try {
        const listResponse = await axios.get('https://api.line.me/v2/bot/richmenu/list', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const richMenus = listResponse.data.richmenus;
        console.log(`Found ${richMenus.length} existing rich menus to delete.`);

        for (const menu of richMenus) {
            await axios.delete(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log(`   🗑️  Deleted: ${menu.name || 'Unnamed'} (${menu.richMenuId})`);
        }
        console.log('✅ Cleanup complete.\n');
    } catch (error: any) {
        console.error('❌ Error during cleanup:', error.response?.data || error.message);
        // Don't throw, try to proceed with creation
    }
}

async function updateAllRichMenus() {
    console.log('🎨 Resetting and Updating All Rich Menus with Custom Images\n');

    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!accessToken) {
        console.error('❌ LINE_CHANNEL_ACCESS_TOKEN is not defined');
        return;
    }

    // STEP 0: CLEANUP - This is what the user specifically asked for
    await cleanupAllRichMenus(accessToken);

    // Rich Menu configurations for each role
    const richMenuConfigs: Record<string, RichMenuConfig> = {
        USER: {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: 'Customer Menu - Custom Design',
            chatBarText: 'เมนูลูกค้า',
            areas: [
                // Row 1
                { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'ยอดคงเหลือ' } },
                { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: { type: 'message', text: 'กำหนดชำระ' } },
                { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'ตารางชำระ' } },
                // Row 2
                { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'ประวัติ' } },
                { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: 'message', text: 'ใบแจ้งหนี้' } },
                { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'เมนู' } }
            ]
        },
        OFFICER: {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: 'Officer Menu - Custom Design',
            chatBarText: 'เมนูเจ้าหน้าที่',
            areas: [
                // Row 1
                { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'งานวันนี้' } },
                { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: { type: 'message', text: 'บันทึกการติดต่อ' } },
                { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'dashboard' } },
                // Row 2
                { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'ลูกค้า' } },
                { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: 'message', text: 'สินเชื่อ' } },
                { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'เมนู' } }
            ]
        },
        MANAGER: {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: 'Manager Menu - Custom Design',
            chatBarText: 'เมนูผู้จัดการ',
            areas: [
                // Row 1
                { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'dashboard' } },
                { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: { type: 'message', text: 'kpi' } },
                { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'npl' } },
                // Row 2
                { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'อนุมัติ' } },
                { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: 'message', text: 'ผลงานทีม' } },
                { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'เมนู' } }
            ]
        },
        ADMIN: {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: 'Admin Menu - Custom Design',
            chatBarText: 'เมนูผู้ดูแลระบบ',
            areas: [
                // Row 1
                { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'dashboard' } },
                { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: { type: 'message', text: 'สถานะ' } },
                { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'ตั้งค่า' } },
                // Row 2
                { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'จัดการผู้ใช้' } },
                { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: 'message', text: 'ติดต่อ' } },
                { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'เมนู' } }
            ]
        }
    };

    // Image file mapping
    const imageFiles: Record<string, string> = {
        USER: 'customer.png',
        OFFICER: 'officer.png',
        MANAGER: 'manager.png',
        ADMIN: 'admin.png'
    };

    const createdMenus: Record<string, string> = {};

    try {
        // Step 1: Create Rich Menus for all roles
        for (const [role, config] of Object.entries(richMenuConfigs)) {
            console.log(`\n📱 Creating ${role} Rich Menu...`);

            // Check if image exists
            const imagePath = path.join('..', 'public', 'richmenu', imageFiles[role]);
            if (!fs.existsSync(imagePath)) {
                console.log(`❌ Image not found for ${role}: ${imagePath}`);
                continue;
            }

            // Create Rich Menu
            const createResponse = await axios.post(
                'https://api.line.me/v2/bot/richmenu',
                config,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const richMenuId = createResponse.data.richMenuId;
            console.log(`✅ ${role} Rich Menu created: ${richMenuId}`);

            // Upload image
            const imageBuffer = fs.readFileSync(imagePath);
            console.log(`📏 ${role} image size: ${imageBuffer.length} bytes`);

            const uploadResponse = await axios.post(
                `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
                imageBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'image/png'
                    }
                }
            );

            console.log(`✅ ${role} image uploaded successfully`);
            createdMenus[role] = richMenuId;
        }

        // Step 2: Update system config with new Rich Menu IDs
        console.log('\n💾 Updating system config...');

        const { prisma } = await import('./src/config/database');

        for (const [role, richMenuId] of Object.entries(createdMenus)) {
            const configKey = `rich_menu_${role.toLowerCase()}`;

            await prisma.systemConfig.upsert({
                where: { key: configKey },
                update: { value: richMenuId },
                create: {
                    key: configKey,
                    value: richMenuId,
                    description: `Rich Menu ID for ${role} role with custom design`,
                    category: 'LINE_INTEGRATION'
                }
            });

            console.log(`✅ Updated config for ${role}: ${configKey}`);
        }

        // Step 3: Update existing users with new Rich Menus
        console.log('\n🔄 Updating existing users with new Rich Menus...');

        // Get all users with LINE IDs
        const users = await prisma.user.findMany({
            where: {
                lineUserId: { not: null },
                lineActive: true,
            },
            select: {
                id: true,
                lineUserId: true,
                role: true,
                firstName: true,
                lastName: true,
            },
        });

        // Get customers with LINE IDs (they use USER role)
        const customers = await prisma.customer.findMany({
            where: {
                lineUserId: { not: null },
            },
            select: {
                id: true,
                lineUserId: true,
                businessName: true,
            },
        });

        // Combine users and customers
        const allLineUsers = [
            ...users.map(u => ({
                id: u.id,
                lineUserId: u.lineUserId,
                role: u.role,
                type: 'user' as const,
                name: `${u.firstName} ${u.lastName}`
            })),
            ...customers.map(c => ({
                id: c.id,
                lineUserId: c.lineUserId,
                role: 'USER' as const,
                type: 'customer' as const,
                name: c.businessName
            }))
        ];

        // Filter out mock/test LINE User IDs
        const realUsers = allLineUsers.filter(user => {
            if (!user.lineUserId) return false;

            const mockPatterns = ['Uofficer', 'Umanager', 'Uadmin', 'Ucustomer'];
            const isMockId = mockPatterns.some(pattern => user.lineUserId!.startsWith(pattern));

            if (isMockId) {
                console.log(`⚠️  Skipping mock LINE ID: ${user.lineUserId} (${user.role})`);
                return false;
            }

            return true;
        });

        console.log(`Found ${allLineUsers.length} users/customers with LINE IDs, ${realUsers.length} are real LINE users`);

        let updateCount = 0;
        for (const user of realUsers) {
            if (user.lineUserId && createdMenus[user.role]) {
                try {
                    await axios.post(
                        `https://api.line.me/v2/bot/user/${user.lineUserId}/richmenu/${createdMenus[user.role]}`,
                        {},
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            }
                        }
                    );

                    updateCount++;
                    console.log(`✅ Updated ${user.type} ${user.name} (${user.role}) - ${user.lineUserId}`);
                } catch (error: any) {
                    console.error(`❌ Failed to update ${user.type} ${user.name}:`, error.response?.data || error.message);
                }
            }
        }

        console.log(`\n🎉 Successfully updated Rich Menus for ${updateCount}/${realUsers.length} real users`);

        if (allLineUsers.length > realUsers.length) {
            console.log(`⚠️  Skipped ${allLineUsers.length - realUsers.length} mock/test LINE IDs`);
        }

        console.log('\n✨ ALL RICH MENUS UPDATED SUCCESSFULLY!');
        console.log('\n📱 Rich Menu Summary:');
        console.log('   👤 USER (ลูกค้า): Custom customer design');
        console.log('   👨💼 OFFICER (เจ้าหน้าที่): Custom officer design');
        console.log('   👨💼 MANAGER (ผู้จัดการ): Custom manager design');
        console.log('   👨💻 ADMIN (ผู้ดูแลระบบ): Custom admin design');
        console.log('\n🔧 All users will see their role-specific Rich Menu designs!');

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    updateAllRichMenus();
}

export { updateAllRichMenus };

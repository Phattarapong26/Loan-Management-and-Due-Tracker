#!/usr/bin/env tsx
/**
 * Update All Rich Menus with Custom Images
 * อัปเดต Rich Menu ทุก Role ให้ใช้รูปที่ออกแบบเอง
 */

import axios from 'axios';
import { env } from '../../src/core/config/env.config';
import { prisma } from '../../src/core/config/database.config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function updateAllRichMenus() {
    console.log('🎨 Updating All Rich Menus with Custom Images\n');
    
    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    
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
    
    // Image file mapping - using regular files (smaller size, under 1MB)
    const imageFiles: Record<string, string> = {
        USER: 'customer.png',
        OFFICER: 'officer.png',
        MANAGER: 'manager.png',
        ADMIN: 'admin.png'
    };
    
    const createdMenus: Record<string, string> = {};
    
    try {
        // Step 1: Delete old Rich Menus from LINE API and database
        console.log('\n🗑️  Deleting old Rich Menus...');
        
        // Get existing Rich Menu IDs from database
        const existingConfigs = await prisma.systemConfig.findMany({
            where: {
                key: {
                    in: ['rich_menu_user', 'rich_menu_officer', 'rich_menu_manager', 'rich_menu_admin']
                }
            }
        });
        
        for (const config of existingConfigs) {
            const oldRichMenuId = config.value;
            try {
                // Delete from LINE API
                await axios.delete(
                    `https://api.line.me/v2/bot/richmenu/${oldRichMenuId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );
                console.log(`✅ Deleted old Rich Menu: ${config.key} (${oldRichMenuId})`);
            } catch (error: any) {
                // Ignore 404 errors (menu already deleted)
                if (error.response?.status === 404) {
                    console.log(`⚠️  Rich Menu already deleted: ${config.key} (${oldRichMenuId})`);
                } else {
                    console.log(`⚠️  Failed to delete ${config.key}: ${error.response?.data?.message || error.message}`);
                }
            }
            
            // Delete from database
            await prisma.systemConfig.delete({
                where: { key: config.key }
            });
            console.log(`✅ Removed from database: ${config.key}`);
        }
        
        // Step 2: Create Rich Menus for all roles
        console.log('\n📱 Creating new Rich Menus...');
        for (const [role, config] of Object.entries(richMenuConfigs)) {
            console.log(`\n📱 Creating ${role} Rich Menu...`);
            
            // Check if image exists (use assets folder in backend)
            const imagePath = path.join(__dirname, '..', '..', 'assets', 'rich-menus', imageFiles[role]);
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
            
            // Upload image using api-data.line.me endpoint
            const imageBuffer = fs.readFileSync(imagePath);
            console.log(`📏 ${role} image size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);
            
            try {
                // Try the api-data endpoint first
                await axios.post(
                    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
                    imageBuffer,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'image/png'
                        }
                    }
                );
                console.log(`✅ ${role} image uploaded successfully via api-data.line.me`);
            } catch (apiDataError: any) {
                console.log(`⚠️  api-data.line.me failed (${apiDataError.response?.status}), trying api.line.me...`);
                
                // Fallback to regular api endpoint
                await axios.post(
                    `https://api.line.me/v2/bot/richmenu/${richMenuId}/content`,
                    imageBuffer,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'image/png'
                        }
                    }
                );
                console.log(`✅ ${role} image uploaded successfully via api.line.me`);
            }
            
            createdMenus[role] = richMenuId;
        }
        
        // Step 3: Update system config with new Rich Menu IDs
        console.log('\n💾 Saving new Rich Menu IDs to database...');
        
        for (const [role, richMenuId] of Object.entries(createdMenus)) {
            const configKey = `rich_menu_${role.toLowerCase()}`;
            
            await prisma.systemConfig.upsert({
                where: { key: configKey },
                update: { value: richMenuId },
                create: {
                    key: configKey,
                    value: richMenuId,
                    description: `Rich Menu ID for ${role} role with custom design`,
                    category: 'LINE_INTEGRATION',
                    dataType: 'STRING',
                    createdBy: 'SYSTEM'
                }
            });
            
            console.log(`✅ Updated config for ${role}: ${configKey}`);
        }
        
        // Step 4: Update existing users with new Rich Menus
        console.log('\n🔄 Assigning new Rich Menus to existing users...');
        
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
        console.log('   👨‍💼 OFFICER (เจ้าหน้าที่): Custom officer design');
        console.log('   👨‍💼 MANAGER (ผู้จัดการ): Custom manager design');
        console.log('   👨‍💻 ADMIN (ผู้ดูแลระบบ): Custom admin design');
        console.log('\n🔧 All users will see their role-specific Rich Menu designs!');
        
    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    updateAllRichMenus();
}

export { updateAllRichMenus };
#!/usr/bin/env tsx
/**
 * Fix Rich Menu for Block/Unblock Issue
 * แก้ปัญหา Rich Menu ไม่ขึ้นเมื่อ block แล้วปลด block
 * 
 * ปัญหา:
 * - เมื่อ user block แล้วปลด block (unfollow/follow) Rich Menu จะหายไป
 * - ต้อง re-assign Rich Menu ให้ user ทุกคนที่มี lineActive = true
 * 
 * วิธีแก้:
 * 1. ตรวจสอบ Rich Menu IDs ใน SystemConfig
 * 2. หา users/customers ที่มี LINE ID และ active
 * 3. Re-assign Rich Menu ตาม role
 */

import axios from 'axios';
import { env } from '../../src/core/config/env.config';
import { prisma } from '../../src/core/config/database.config';

const LINE_API = 'https://api.line.me/v2/bot';

interface UserWithLine {
    id: string;
    lineUserId: string;
    role: string;
    name: string;
    type: 'user' | 'customer';
}

async function fixRichMenuRefollow() {
    console.log('🔧 Fixing Rich Menu for Block/Unblock Issue\n');

    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!accessToken) {
        console.error('❌ LINE_CHANNEL_ACCESS_TOKEN is not defined');
        process.exit(1);
    }

    try {
        // Step 1: Get Rich Menu IDs from SystemConfig
        console.log('📋 Step 1: Getting Rich Menu IDs from SystemConfig...');
        
        const richMenuConfigs = await prisma.systemConfig.findMany({
            where: {
                key: {
                    in: [
                        'rich_menu_user',
                        'rich_menu_officer',
                        'rich_menu_manager',
                        'rich_menu_admin'
                    ]
                }
            }
        });

        const richMenuIds: Record<string, string> = {};
        for (const config of richMenuConfigs) {
            const role = config.key.replace('rich_menu_', '').toUpperCase();
            richMenuIds[role] = config.value;
            console.log(`   ✅ ${role}: ${config.value}`);
        }

        if (Object.keys(richMenuIds).length === 0) {
            console.error('❌ No Rich Menu IDs found in SystemConfig');
            console.log('💡 Please run update-all-rich-menus-custom.ts first to create Rich Menus');
            process.exit(1);
        }

        // Step 2: Verify Rich Menus exist
        console.log('\n🔍 Step 2: Verifying Rich Menus exist...');
        
        for (const [role, richMenuId] of Object.entries(richMenuIds)) {
            try {
                await axios.get(
                    `${LINE_API}/richmenu/${richMenuId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );
                console.log(`   ✅ ${role} Rich Menu exists: ${richMenuId}`);
            } catch (error: any) {
                console.error(`   ❌ ${role} Rich Menu NOT found: ${richMenuId}`);
                console.log('💡 Please run update-all-rich-menus-custom.ts to recreate Rich Menus');
                process.exit(1);
            }
        }

        // Step 3: Get all users with LINE IDs
        console.log('\n👥 Step 3: Getting users with LINE IDs...');
        
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

        const allLineUsers: UserWithLine[] = [
            ...users.map(u => ({
                id: u.id,
                lineUserId: u.lineUserId!,
                role: u.role,
                name: `${u.firstName} ${u.lastName}`,
                type: 'user' as const
            })),
            ...customers.map(c => ({
                id: c.id,
                lineUserId: c.lineUserId!,
                role: 'USER',
                name: c.businessName || 'Unknown',
                type: 'customer' as const
            }))
        ];

        // Filter out mock/test LINE User IDs
        const realUsers = allLineUsers.filter(user => {
            const mockPatterns = ['Uofficer', 'Umanager', 'Uadmin', 'Ucustomer'];
            const isMockId = mockPatterns.some(pattern => user.lineUserId.startsWith(pattern));
            
            if (isMockId) {
                console.log(`   ⚠️  Skipping mock LINE ID: ${user.lineUserId} (${user.role})`);
                return false;
            }
            
            return true;
        });

        console.log(`   Found ${allLineUsers.length} users/customers with LINE IDs`);
        console.log(`   ${realUsers.length} are real LINE users (excluding mock IDs)`);

        // Step 4: Re-assign Rich Menus to all users
        console.log('\n🔄 Step 4: Re-assigning Rich Menus...');
        
        let successCount = 0;
        let failCount = 0;
        const errors: Array<{ user: UserWithLine; error: string }> = [];

        for (const user of realUsers) {
            const richMenuId = richMenuIds[user.role];
            
            if (!richMenuId) {
                console.log(`   ⚠️  No Rich Menu for role ${user.role}: ${user.name}`);
                failCount++;
                continue;
            }

            try {
                // First, try to unlink existing Rich Menu (ignore errors)
                try {
                    await axios.delete(
                        `${LINE_API}/user/${user.lineUserId}/richmenu`,
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            }
                        }
                    );
                } catch (unlinkError) {
                    // Ignore 404 errors (no Rich Menu linked)
                }

                // Then, link new Rich Menu
                await axios.post(
                    `${LINE_API}/user/${user.lineUserId}/richmenu/${richMenuId}`,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );

                successCount++;
                console.log(`   ✅ ${user.type} ${user.name} (${user.role})`);
            } catch (error: any) {
                failCount++;
                const errorMsg = error.response?.data?.message || error.message;
                errors.push({ user, error: errorMsg });
                console.error(`   ❌ ${user.type} ${user.name}: ${errorMsg}`);
            }
        }

        // Summary
        console.log('\n📊 Summary:');
        console.log(`   ✅ Success: ${successCount}/${realUsers.length}`);
        console.log(`   ❌ Failed: ${failCount}/${realUsers.length}`);

        if (errors.length > 0) {
            console.log('\n⚠️  Errors:');
            errors.forEach(({ user, error }) => {
                console.log(`   - ${user.name} (${user.lineUserId}): ${error}`);
            });
        }

        console.log('\n✨ Rich Menu fix complete!');
        console.log('\n💡 Tips:');
        console.log('   - Users should now see Rich Menu after unblock');
        console.log('   - If Rich Menu still not showing, ask user to:');
        console.log('     1. Block and unblock the account again');
        console.log('     2. Clear LINE app cache');
        console.log('     3. Restart LINE app');

        await prisma.$disconnect();

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    fixRichMenuRefollow();
}

export { fixRichMenuRefollow };

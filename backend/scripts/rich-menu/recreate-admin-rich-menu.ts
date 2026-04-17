/**
 * Recreate Admin Rich Menu with Image
 * 
 * This script deletes and recreates the admin Rich Menu, then uploads the image
 */

import { RichMenuManager } from './src/services/line-rich-menu-manager.service.js';
import { prisma } from './src/config/database.js';
import axios from 'axios';
import { env } from './src/config/env.js';
import * as fs from 'fs';
import * as path from 'path';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';
const ACCESS_TOKEN = env.LINE_CHANNEL_ACCESS_TOKEN;

async function recreateAdminRichMenu() {
    console.log('🔄 Recreating Admin Rich Menu with Image...\n');
    
    const manager = new RichMenuManager();
    
    try {
        // Step 1: Get current admin Rich Menu ID
        console.log('📋 Step 1: Getting current admin Rich Menu ID...');
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'rich_menu_admin' },
        });
        
        if (config) {
            console.log(`🎯 Current admin Rich Menu ID: ${config.value}`);
            
            // Step 2: Delete current Rich Menu
            console.log('\n🗑️ Step 2: Deleting current Rich Menu...');
            try {
                await axios.delete(
                    `${LINE_MESSAGING_API}/richmenu/${config.value}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${ACCESS_TOKEN}`,
                        },
                    }
                );
                console.log('✅ Current Rich Menu deleted');
            } catch (error: any) {
                console.log('⚠️ Delete failed (might not exist):', error.response?.status);
            }
        }
        
        // Step 3: Create new Rich Menu
        console.log('\n🎨 Step 3: Creating new Admin Rich Menu...');
        
        const richMenuConfig = {
            size: {
                width: 2500,
                height: 1686,
            },
            selected: true,
            name: 'Admin Menu',
            chatBarText: 'เมนูแอดมิน',
            areas: [
                // Row 1: ระบบ
                {
                    bounds: { x: 0, y: 0, width: 1250, height: 562 },
                    action: {
                        type: 'message',
                        label: 'สถานะระบบ',
                        text: 'ระบบ',
                    },
                },
                // Row 1: ผู้ใช้
                {
                    bounds: { x: 1250, y: 0, width: 1250, height: 562 },
                    action: {
                        type: 'message',
                        label: 'จัดการผู้ใช้',
                        text: 'ผู้ใช้',
                    },
                },
                // Row 2: สาขา
                {
                    bounds: { x: 0, y: 562, width: 1250, height: 562 },
                    action: {
                        type: 'message',
                        label: 'จัดการสาขา',
                        text: 'สาขา',
                    },
                },
                // Row 2: รายงาน
                {
                    bounds: { x: 1250, y: 562, width: 1250, height: 562 },
                    action: {
                        type: 'postback',
                        label: 'รายงานภาพรวม',
                        data: 'action=dashboard',
                    },
                },
                // Row 3: ตั้งค่า
                {
                    bounds: { x: 0, y: 1124, width: 1250, height: 562 },
                    action: {
                        type: 'message',
                        label: 'ตั้งค่าระบบ',
                        text: 'ตั้งค่า',
                    },
                },
                // Row 3: เมนู
                {
                    bounds: { x: 1250, y: 1124, width: 1250, height: 562 },
                    action: {
                        type: 'message',
                        label: 'เมนูคำสั่ง',
                        text: 'เมนู',
                    },
                },
            ],
        };
        
        const response = await axios.post(
            `${LINE_MESSAGING_API}/richmenu`,
            richMenuConfig,
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        
        const newRichMenuId = response.data.richMenuId;
        console.log(`✅ New Rich Menu created: ${newRichMenuId}`);
        
        // Step 4: Update database
        console.log('\n💾 Step 4: Updating database...');
        await prisma.systemConfig.upsert({
            where: { key: 'rich_menu_admin' },
            update: {
                value: newRichMenuId,
                updatedAt: new Date(),
            },
            create: {
                key: 'rich_menu_admin',
                value: newRichMenuId,
                category: 'LINE',
                description: 'Rich Menu ID for ADMIN role',
            },
        });
        console.log('✅ Database updated');
        
        // Step 5: Wait a moment for LINE API to process
        console.log('\n⏳ Step 5: Waiting for LINE API to process...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 6: Upload image
        console.log('\n📤 Step 6: Uploading image...');
        const imagePath = path.join(process.cwd(), '../public/richmenu/admin.png');
        
        if (!fs.existsSync(imagePath)) {
            console.log('❌ Image file not found:', imagePath);
            return;
        }
        
        const imageBuffer = fs.readFileSync(imagePath);
        console.log(`📦 Image size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/richmenu/${newRichMenuId}/content`,
                imageBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`,
                        'Content-Type': 'image/png',
                    },
                }
            );
            
            console.log('✅ Image uploaded successfully!');
            
            // Step 7: Verify image upload
            console.log('\n🔍 Step 7: Verifying image upload...');
            const verifyResponse = await axios.get(
                `${LINE_MESSAGING_API}/richmenu/${newRichMenuId}/content`,
                {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    },
                    responseType: 'arraybuffer',
                }
            );
            
            console.log(`✅ Image verified! Size: ${verifyResponse.data.byteLength} bytes`);
            
        } catch (error: any) {
            console.log('❌ Image upload failed:', error.response?.status, error.response?.statusText);
            if (error.response?.data) {
                console.log('📄 Error details:', error.response.data);
            }
        }
        
        console.log('\n🎉 Admin Rich Menu recreation complete!');
        console.log(`📋 New Rich Menu ID: ${newRichMenuId}`);
        console.log('💡 You can now test the Rich Menu in LINE app');
        
    } catch (error: any) {
        console.error('❌ Error recreating Rich Menu:', error.response?.data || error.message);
    }
}

// Run the recreation
recreateAdminRichMenu()
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
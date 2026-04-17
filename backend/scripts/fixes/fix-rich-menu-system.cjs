#!/usr/bin/env node

/**
 * Fix Rich Menu System
 * 
 * This script will:
 * 1. Clean up all existing Rich Menus
 * 2. Create new Rich Menus for each role
 * 3. Upload images for each Rich Menu
 * 4. Store Rich Menu IDs in SystemConfig
 * 5. Assign Rich Menus to existing users based on their roles
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'tUW8OkX4MbZ2ObcNReV8U+Rls3umowBFcteq0qT4cc6HwuJ+pWBL6cqbbAl3vE1H09Hnv+rd14YjHZXyI2Xv5lHDgFZ37fh9LLxkyx4mhDp7UyV/XRvdSHUPCF0PRjvRhVw7pPa0pM8ZlIuS8zD1sQdB04t89/1O/w1cDnyilFU=';

// Rich Menu Configurations
const RICH_MENU_CONFIGS = {
    USER: {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Customer Menu',
        chatBarText: 'เมนู',
        areas: [
            // Row 1: ยอดคงเหลือ, กำหนดชำระ
            { bounds: { x: 0, y: 0, width: 1250, height: 562 }, action: { type: 'postback', label: 'ยอดคงเหลือ', data: 'action=balance' } },
            { bounds: { x: 1250, y: 0, width: 1250, height: 562 }, action: { type: 'postback', label: 'กำหนดชำระ', data: 'action=next_due' } },
            // Row 2: ประวัติ, ใบแจ้งหนี้
            { bounds: { x: 0, y: 562, width: 1250, height: 562 }, action: { type: 'postback', label: 'ประวัติการชำระ', data: 'action=history' } },
            { bounds: { x: 1250, y: 562, width: 1250, height: 562 }, action: { type: 'postback', label: 'ใบแจ้งหนี้', data: 'action=invoices' } },
            // Row 3: ติดต่อ, เมนู
            { bounds: { x: 0, y: 1124, width: 1250, height: 562 }, action: { type: 'postback', label: 'ติดต่อเจ้าหน้าที่', data: 'action=contact' } },
            { bounds: { x: 1250, y: 1124, width: 1250, height: 562 }, action: { type: 'message', label: 'เมนูคำสั่ง', text: 'เมนู' } },
        ],
    },
    OFFICER: {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Loan Officer Menu',
        chatBarText: 'เมนูเจ้าหน้าที่',
        areas: [
            // Row 1: งานวันนี้, ลูกค้า
            { bounds: { x: 0, y: 0, width: 1250, height: 562 }, action: { type: 'postback', label: 'งานวันนี้', data: 'action=tasks' } },
            { bounds: { x: 1250, y: 0, width: 1250, height: 562 }, action: { type: 'postback', label: 'รายชื่อลูกค้า', data: 'action=customers' } },
            // Row 2: บันทึก, สรุป
            { bounds: { x: 0, y: 562, width: 1250, height: 562 }, action: { type: 'postback', label: 'บันทึกการติดต่อ', data: 'action=start_contact_log' } },
            { bounds: { x: 1250, y: 562, width: 1250, height: 562 }, action: { type: 'postback', label: 'สรุปผลงาน', data: 'action=dashboard' } },
            // Row 3: สินเชื่อ, เมนู
            { bounds: { x: 0, y: 1124, width: 1250, height: 562 }, action: { type: 'postback', label: 'จัดการสินเชื่อ', data: 'action=loans' } },
            { bounds: { x: 1250, y: 1124, width: 1250, height: 562 }, action: { type: 'message', label: 'เมนูคำสั่ง', text: 'เมนู' } },
        ],
    },
    MANAGER: {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Branch Manager Menu',
        chatBarText: 'เมนูผู้จัดการ',
        areas: [
            // Row 1: อนุมัติ, KPI
            { bounds: { x: 0, y: 0, width: 1250, height: 562 }, action: { type: 'postback', label: 'รออนุมัติ', data: 'action=approvals' } },
            { bounds: { x: 1250, y: 0, width: 1250, height: 562 }, action: { type: 'postback', label: 'KPI Dashboard', data: 'action=dashboard' } },
            // Row 2: NPL, ทีม
            { bounds: { x: 0, y: 562, width: 1250, height: 562 }, action: { type: 'message', label: 'NPL Alert', text: 'NPL' } },
            { bounds: { x: 1250, y: 562, width: 1250, height: 562 }, action: { type: 'postback', label: 'ผลงานทีม', data: 'action=team_performance' } },
            // Row 3: รายงาน, เมนู
            { bounds: { x: 0, y: 1124, width: 1250, height: 562 }, action: { type: 'postback', label: 'รายงานสาขา', data: 'action=branch_reports' } },
            { bounds: { x: 1250, y: 1124, width: 1250, height: 562 }, action: { type: 'message', label: 'เมนูคำสั่ง', text: 'เมนู' } },
        ],
    },
    ADMIN: {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'Admin Menu',
        chatBarText: 'เมนูแอดมิน',
        areas: [
            // Row 1: ระบบ, ผู้ใช้
            { bounds: { x: 0, y: 0, width: 1250, height: 562 }, action: { type: 'message', label: 'สถานะระบบ', text: 'ระบบ' } },
            { bounds: { x: 1250, y: 0, width: 1250, height: 562 }, action: { type: 'postback', label: 'จัดการผู้ใช้', data: 'action=user_management' } },
            // Row 2: สาขา, รายงาน
            { bounds: { x: 0, y: 562, width: 1250, height: 562 }, action: { type: 'message', label: 'จัดการสาขา', text: 'สาขา' } },
            { bounds: { x: 1250, y: 562, width: 1250, height: 562 }, action: { type: 'postback', label: 'รายงานภาพรวม', data: 'action=dashboard' } },
            // Row 3: ตั้งค่า, เมนู
            { bounds: { x: 0, y: 1124, width: 1250, height: 562 }, action: { type: 'postback', label: 'ตั้งค่าระบบ', data: 'action=system_config' } },
            { bounds: { x: 1250, y: 1124, width: 1250, height: 562 }, action: { type: 'message', label: 'เมนูคำสั่ง', text: 'เมนู' } },
        ],
    },
};

async function deleteAllRichMenus() {
    console.log('🗑️  Deleting all existing Rich Menus...');
    
    try {
        const response = await axios.get(`${LINE_MESSAGING_API}/richmenu/list`, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
        });

        const richMenus = response.data.richmenus || [];
        console.log(`Found ${richMenus.length} Rich Menus to delete`);

        let deleted = 0;
        for (const menu of richMenus) {
            try {
                await axios.delete(`${LINE_MESSAGING_API}/richmenu/${menu.richMenuId}`, {
                    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
                });
                deleted++;
                if (deleted % 10 === 0) {
                    console.log(`✅ Deleted ${deleted}/${richMenus.length} Rich Menus...`);
                }
            } catch (error) {
                console.error(`❌ Failed to delete Rich Menu ${menu.richMenuId}:`, error.response?.data || error.message);
            }
        }
        console.log(`✅ Deleted ${deleted} Rich Menus total`);
    } catch (error) {
        console.error('Error fetching Rich Menu list:', error.response?.data || error.message);
    }
}

async function createRichMenu(role, config) {
    console.log(`🎨 Creating Rich Menu for ${role}...`);
    
    try {
        const response = await axios.post(`${LINE_MESSAGING_API}/richmenu`, config, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        const richMenuId = response.data.richMenuId;
        console.log(`✅ Created Rich Menu for ${role}: ${richMenuId}`);
        return richMenuId;
    } catch (error) {
        console.error(`❌ Failed to create Rich Menu for ${role}:`, error.response?.data || error.message);
        return null;
    }
}

async function uploadRichMenuImage(richMenuId, role) {
    console.log(`📷 Uploading image for ${role} Rich Menu...`);
    
    // Map roles to image files
    const imageFiles = {
        USER: 'customer.png',
        OFFICER: 'officer.png',
        MANAGER: 'manager.png',
        ADMIN: 'admin.png',
    };

    const imagePath = path.join(__dirname, 'public', 'richmenu', imageFiles[role]);
    
    if (!fs.existsSync(imagePath)) {
        console.log(`⚠️  Image file not found: ${imagePath} - skipping image upload`);
        return false;
    }

    try {
        const imageBuffer = fs.readFileSync(imagePath);
        
        await axios.post(`${LINE_MESSAGING_API}/richmenu/${richMenuId}/content`, imageBuffer, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'image/png',
            },
        });

        console.log(`✅ Uploaded image for ${role} Rich Menu`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to upload image for ${role}:`, error.response?.data || error.message);
        return false;
    }
}

async function storeRichMenuId(role, richMenuId) {
    const key = `rich_menu_${role.toLowerCase()}`;
    
    await prisma.systemConfig.upsert({
        where: { key },
        update: {
            value: richMenuId,
            updatedAt: new Date(),
        },
        create: {
            key,
            value: richMenuId,
            category: 'LINE',
            description: `Rich Menu ID for ${role} role`,
        },
    });

    console.log(`💾 Stored Rich Menu ID for ${role}: ${richMenuId}`);
}

async function assignRichMenuToUsers() {
    console.log('👥 Assigning Rich Menus to existing users...');
    
    const users = await prisma.user.findMany({
        where: {
            lineUserId: { not: null },
            lineActive: true,
        },
        select: {
            id: true,
            lineUserId: true,
            role: true,
        },
    });

    console.log(`Found ${users.length} users with LINE accounts`);

    for (const user of users) {
        if (!user.lineUserId) continue;

        try {
            // Get Rich Menu ID for user's role
            const key = `rich_menu_${user.role.toLowerCase()}`;
            const config = await prisma.systemConfig.findUnique({ where: { key } });
            
            if (!config) {
                console.error(`❌ No Rich Menu ID found for role: ${user.role}`);
                continue;
            }

            // Assign Rich Menu to user
            await axios.post(
                `${LINE_MESSAGING_API}/user/${user.lineUserId}/richmenu/${config.value}`,
                {},
                {
                    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
                }
            );

            console.log(`✅ Assigned ${user.role} Rich Menu to user ${user.id}`);
        } catch (error) {
            console.error(`❌ Failed to assign Rich Menu to user ${user.id}:`, error.response?.data || error.message);
        }
    }
}

async function main() {
    console.log('🚀 Starting Rich Menu System Fix...');
    console.log('=====================================');

    try {
        // Step 1: Delete all existing Rich Menus
        await deleteAllRichMenus();
        console.log('');

        // Step 2: Create new Rich Menus for each role
        const richMenuIds = {};
        
        for (const [role, config] of Object.entries(RICH_MENU_CONFIGS)) {
            const richMenuId = await createRichMenu(role, config);
            if (richMenuId) {
                richMenuIds[role] = richMenuId;
                
                // Step 3: Upload image for Rich Menu (optional)
                await uploadRichMenuImage(richMenuId, role);
                
                // Step 4: Store Rich Menu ID in SystemConfig
                await storeRichMenuId(role, richMenuId);
            }
            console.log('');
        }

        // Step 5: Assign Rich Menus to existing users
        await assignRichMenuToUsers();

        console.log('');
        console.log('✅ Rich Menu System Fix Complete!');
        console.log('=====================================');
        console.log('Rich Menu IDs:');
        for (const [role, id] of Object.entries(richMenuIds)) {
            console.log(`  ${role}: ${id}`);
        }

    } catch (error) {
        console.error('❌ Error during Rich Menu fix:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main().catch(console.error);
/**
 * Update Rich Menu Images Script
 * 
 * This script uploads Rich Menu images from public/richmenu/ to LINE API
 * Use this when you've updated the images with the same filename
 * 
 * Usage: 
 * 1. Update images in public/richmenu/ (admin.png, customer.png, manager.png, officer.png)
 * 2. Run: tsx update-rich-menu-images.ts
 */

import { RichMenuManager } from './src/services/line-rich-menu-manager.service.js';
import { prisma } from './src/config/database.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_RICHMENU_DIR = path.join(__dirname, '../public/richmenu');

interface MenuUpload {
    role: string;
    filename: string;
    name: string;
}

const MENUS: MenuUpload[] = [
    { role: 'USER', filename: 'customer.png', name: 'Customer Menu' },
    { role: 'OFFICER', filename: 'officer.png', name: 'Officer Menu' },
    { role: 'MANAGER', filename: 'manager.png', name: 'Manager Menu' },
    { role: 'ADMIN', filename: 'admin.png', name: 'Admin Menu' },
];

async function updateRichMenuImages() {
    console.log('🔄 Updating Rich Menu Images from public/richmenu/...\n');
    console.log('═'.repeat(80));

    const manager = new RichMenuManager();
    let successCount = 0;
    let failCount = 0;
    let notFoundCount = 0;

    for (const menu of MENUS) {
        console.log(`\n📸 Processing ${menu.name}...`);
        
        try {
            // Check if image file exists
            const imagePath = path.join(PUBLIC_RICHMENU_DIR, menu.filename);
            
            if (!fs.existsSync(imagePath)) {
                console.log(`   ⚠️  Image not found: ${menu.filename}`);
                console.log(`   💡 Please ensure the file exists in public/richmenu/`);
                notFoundCount++;
                continue;
            }

            // Check file size
            const stats = fs.statSync(imagePath);
            const fileSizeInMB = stats.size / (1024 * 1024);
            
            if (fileSizeInMB > 1) {
                console.log(`   ❌ Image too large: ${fileSizeInMB.toFixed(2)} MB (max 1 MB)`);
                console.log(`   💡 Please compress the image`);
                failCount++;
                continue;
            }

            console.log(`   ✅ Image found: ${fileSizeInMB.toFixed(2)} MB`);

            // Get Rich Menu ID from database
            const config = await prisma.systemConfig.findUnique({
                where: { key: `rich_menu_${menu.role.toLowerCase()}` },
            });

            if (!config) {
                console.log(`   ⚠️  Rich Menu not initialized for ${menu.role}`);
                console.log(`   💡 Run: npm run rich-menu:init first`);
                failCount++;
                continue;
            }

            console.log(`   📋 Rich Menu ID: ${config.value}`);

            // Upload image
            console.log(`   📤 Uploading to LINE API...`);
            const uploaded = await manager.uploadRichMenuImageFromFile(
                config.value,
                imagePath
            );

            if (uploaded) {
                console.log(`   ✅ Successfully uploaded ${menu.name}!`);
                successCount++;
            } else {
                console.log(`   ❌ Failed to upload ${menu.name}`);
                failCount++;
            }

        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
            failCount++;
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 Update Summary:');
    console.log(`   ✅ Updated: ${successCount}/4`);
    console.log(`   ❌ Failed: ${failCount}/4`);
    console.log(`   ⚠️  Not Found: ${notFoundCount}/4`);

    if (successCount === 4) {
        console.log('\n🎉 All Rich Menu images updated successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Open LINE app');
        console.log('   2. Close and reopen the chat with your bot');
        console.log('   3. Check your updated Rich Menu');
        console.log('   4. Test all buttons to ensure they work correctly\n');
    } else if (successCount > 0) {
        console.log('\n⚠️  Some menus updated, but some failed.');
        console.log('   Please check the errors above.\n');
    } else {
        console.log('\n❌ No menus were updated.');
        console.log('   Please check the image files and try again.\n');
        process.exit(1);
    }
}

// Run the update
updateRichMenuImages()
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
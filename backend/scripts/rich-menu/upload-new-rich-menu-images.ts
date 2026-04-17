/**
 * Upload New Rich Menu Images Script
 * 
 * This script uploads Rich Menu images using the latest Rich Menu IDs from database
 * 
 * Usage: tsx upload-new-rich-menu-images.ts
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
    { role: 'user', filename: 'customer.png', name: 'Customer Menu' },
    { role: 'officer', filename: 'officer.png', name: 'Officer Menu' },
    { role: 'manager', filename: 'manager.png', name: 'Manager Menu' },
    { role: 'admin', filename: 'admin.png', name: 'Admin Menu' },
];

async function uploadNewRichMenuImages() {
    console.log('🔄 Uploading Rich Menu Images with latest IDs...\n');
    console.log('═'.repeat(80));

    const manager = new RichMenuManager();
    let successCount = 0;
    let failCount = 0;

    for (const menu of MENUS) {
        console.log(`\n📸 Processing ${menu.name}...`);
        
        try {
            // Check if image file exists
            const imagePath = path.join(PUBLIC_RICHMENU_DIR, menu.filename);
            
            if (!fs.existsSync(imagePath)) {
                console.log(`   ⚠️  Image not found: ${menu.filename}`);
                failCount++;
                continue;
            }

            // Check file size
            const stats = fs.statSync(imagePath);
            const fileSizeInMB = stats.size / (1024 * 1024);
            console.log(`   ✅ Image found: ${fileSizeInMB.toFixed(2)} MB`);

            if (fileSizeInMB > 1) {
                console.log(`   ❌ Image too large: ${fileSizeInMB.toFixed(2)} MB (max 1 MB)`);
                failCount++;
                continue;
            }

            // Get Rich Menu ID from database
            const config = await prisma.systemConfig.findUnique({
                where: { key: `rich_menu_${menu.role}` },
            });

            if (!config) {
                console.log(`   ⚠️  Rich Menu not found for ${menu.role}`);
                failCount++;
                continue;
            }

            console.log(`   📋 Rich Menu ID: ${config.value}`);

            // Upload image using the manager's method
            console.log(`   📤 Uploading to LINE API...`);
            
            const imageBuffer = fs.readFileSync(imagePath);
            const uploaded = await manager.uploadRichMenuImage(
                config.value,
                imageBuffer,
                'image/png'
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
    console.log('\n📊 Upload Summary:');
    console.log(`   ✅ Uploaded: ${successCount}/4`);
    console.log(`   ❌ Failed: ${failCount}/4`);

    if (successCount === 4) {
        console.log('\n🎉 All Rich Menu images uploaded successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Open LINE app');
        console.log('   2. Close and reopen the chat with your bot');
        console.log('   3. Check your updated Rich Menu');
        console.log('   4. Test all buttons to ensure they work correctly\n');
    } else if (successCount > 0) {
        console.log('\n⚠️  Some menus uploaded, but some failed.');
        console.log('   Please check the errors above.\n');
    } else {
        console.log('\n❌ No menus were uploaded.');
        console.log('   Please check the Rich Menu IDs and try again.\n');
    }
}

// Run the upload
uploadNewRichMenuImages()
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
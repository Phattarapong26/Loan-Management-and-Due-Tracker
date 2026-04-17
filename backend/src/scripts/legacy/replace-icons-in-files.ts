/**
 * Script to replace all text icons with Lucide-inspired emojis in LINE message files
 * 
 * Run with: npx ts-node src/scripts/replace-icons-in-files.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Icon replacements mapping
const ICON_REPLACEMENTS: Record<string, string> = {
    // Currency & Financial
    '฿': '💰',
    
    // Time & Calendar  
    '◷': '🕐',
    
    // Documents & Records
    '⊞': '📋',
    '▣': '📊',
    
    // Communication & Actions
    '◉': '📞',
    
    // Status
    '✓': '✅',
    '✗': '❌',
    '⚠': '⚠️',
    
    // System
    '⚙': '⚙️',
};

// Files to process
const FILES_TO_PROCESS = [
    'src/services/line-messages/customer.messages.ts',
    'src/services/line-messages/officer.messages.ts',
    'src/services/line-messages/manager.messages.ts',
    'src/services/line-messages/admin.messages.ts',
    'src/services/line-messages/common.messages.ts',
    'src/services/line-contact-logging-flow.service.ts',
];

function replaceIconsInFile(filePath: string): void {
    try {
        // Read file
        const fullPath = path.join(process.cwd(), filePath);
        let content = fs.readFileSync(fullPath, 'utf-8');
        
        // Track replacements
        const replacements: Record<string, number> = {};
        
        // Replace each icon
        for (const [oldIcon, newIcon] of Object.entries(ICON_REPLACEMENTS)) {
            const regex = new RegExp(oldIcon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            if (matches) {
                replacements[oldIcon] = matches.length;
                content = content.replace(regex, newIcon);
            }
        }
        
        // Write back
        fs.writeFileSync(fullPath, content, 'utf-8');
        
        // Log results
        console.log(`\n✅ Processed: ${filePath}`);
        if (Object.keys(replacements).length > 0) {
            console.log('   Replacements:');
            for (const [icon, count] of Object.entries(replacements)) {
                console.log(`   ${icon} → ${ICON_REPLACEMENTS[icon]} (${count} times)`);
            }
        } else {
            console.log('   No icons to replace');
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
    }
}

// Main execution
console.log('🚀 Starting icon replacement...\n');
console.log('Icon Mapping:');
for (const [oldIcon, newIcon] of Object.entries(ICON_REPLACEMENTS)) {
    console.log(`  ${oldIcon} → ${newIcon}`);
}

FILES_TO_PROCESS.forEach(replaceIconsInFile);

console.log('\n✨ Icon replacement complete!');

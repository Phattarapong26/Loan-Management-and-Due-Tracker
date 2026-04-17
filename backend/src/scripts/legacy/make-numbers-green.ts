/**
 * Script to make all numbers in LINE messages green
 * 
 * This will change the color of text fields that display numbers to K-Bank Green
 * 
 * Run with: npx ts-node src/scripts/make-numbers-green.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const KBANK_GREEN = '#00AA5B';

// Files to process
const FILES_TO_PROCESS = [
    'src/services/line-messages/customer.messages.ts',
    'src/services/line-messages/officer.messages.ts',
    'src/services/line-messages/manager.messages.ts',
    'src/services/line-messages/admin.messages.ts',
    'src/services/line-messages/common.messages.ts',
];

/**
 * Process a single file
 */
function processFile(filePath: string): void {
    try {
        const fullPath = path.join(process.cwd(), filePath);
        let content = fs.readFileSync(fullPath, 'utf-8');
        let changeCount = 0;
        
        console.log(`\n📝 Processing: ${filePath}`);
        
        // Pattern 1: Change formatCurrency results to use green color
        // Find: { type: 'text', text: formatCurrency(...), ..., color: COLORS.TEXT_PRIMARY, ... }
        // Replace with: color: COLORS.PRIMARY (which is green)
        const pattern1 = /(\{\s*type:\s*'text',\s*text:\s*formatCurrency\([^)]+\)[^}]*),\s*color:\s*COLORS\.TEXT_PRIMARY/g;
        const matches1 = content.match(pattern1);
        if (matches1) {
            content = content.replace(pattern1, `$1, color: COLORS.PRIMARY`);
            changeCount += matches1.length;
            console.log(`   ✅ Changed ${matches1.length} formatCurrency colors to green`);
        }
        
        // Pattern 2: Change toLocaleString results to use green color
        // Find: { type: 'text', text: `...${number.toLocaleString()}...`, ..., color: COLORS.TEXT_PRIMARY, ... }
        const pattern2 = /(\{\s*type:\s*'text',\s*text:\s*`[^`]*toLocaleString[^`]*`[^}]*),\s*color:\s*COLORS\.TEXT_PRIMARY/g;
        const matches2 = content.match(pattern2);
        if (matches2) {
            content = content.replace(pattern2, `$1, color: COLORS.PRIMARY`);
            changeCount += matches2.length;
            console.log(`   ✅ Changed ${matches2.length} toLocaleString colors to green`);
        }
        
        // Pattern 3: Change number template strings to use green color
        // Find: { type: 'text', text: `💰${...}`, ..., color: COLORS.TEXT_PRIMARY, ... }
        const pattern3 = /(\{\s*type:\s*'text',\s*text:\s*`💰[^`]+`[^}]*),\s*color:\s*COLORS\.TEXT_PRIMARY/g;
        const matches3 = content.match(pattern3);
        if (matches3) {
            content = content.replace(pattern3, `$1, color: COLORS.PRIMARY`);
            changeCount += matches3.length;
            console.log(`   ✅ Changed ${matches3.length} currency template colors to green`);
        }
        
        // Pattern 4: Add green color to formatCurrency that doesn't have color
        const pattern4 = /(\{\s*type:\s*'text',\s*text:\s*formatCurrency\([^)]+\)[^}]*(?!color)[^}]*)(}\s*,)/g;
        const matches4 = content.match(pattern4);
        if (matches4) {
            content = content.replace(pattern4, `$1, color: COLORS.PRIMARY$2`);
            changeCount += matches4.length;
            console.log(`   ✅ Added green color to ${matches4.length} formatCurrency without color`);
        }
        
        // Pattern 5: Change COLORS.TEXT_SECONDARY to COLORS.PRIMARY for number fields
        // This is for labels, we want to keep them as TEXT_SECONDARY
        // So we only change if the text contains formatCurrency or toLocaleString
        const pattern5 = /(\{\s*type:\s*'text',\s*text:\s*(?:formatCurrency\([^)]+\)|`[^`]*toLocaleString[^`]*`)[^}]*),\s*color:\s*COLORS\.TEXT_SECONDARY/g;
        const matches5 = content.match(pattern5);
        if (matches5) {
            content = content.replace(pattern5, `$1, color: COLORS.PRIMARY`);
            changeCount += matches5.length;
            console.log(`   ✅ Changed ${matches5.length} TEXT_SECONDARY to green for numbers`);
        }
        
        if (changeCount > 0) {
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`   ✨ Total: ${changeCount} changes applied`);
        } else {
            console.log(`   ⏭️  No changes needed`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
    }
}

// Main execution
console.log('💚 Making all numbers green in LINE messages...\n');
console.log(`Target color: ${KBANK_GREEN} (K-Bank Green)`);

FILES_TO_PROCESS.forEach(processFile);

console.log('\n✨ Complete!');
console.log('\n💡 Next: Run "npm run build" to verify changes');

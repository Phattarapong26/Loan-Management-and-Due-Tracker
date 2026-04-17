/**
 * Script to add green color to numbers and bold to labels in LINE messages
 * 
 * This script will:
 * 1. Find all text fields that contain numbers
 * 2. Add green color (#00AA5B) to those fields
 * 3. Find all label fields (text ending with :)
 * 4. Add bold weight to those fields
 * 
 * Run with: npx ts-node src/scripts/add-number-color-and-bold.ts
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

interface Change {
    type: 'number-color' | 'label-bold' | 'header-bold';
    line: number;
    before: string;
    after: string;
}

/**
 * Add color to text fields containing numbers
 */
function addColorToNumbers(content: string): { content: string; changes: Change[] } {
    const lines = content.split('\n');
    const changes: Change[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!line) continue; // Skip undefined lines
        
        // Match: { type: 'text', text: 'something with 123,456 number', size: 'sm' }
        // But NOT if it already has color
        const textMatch = line.match(/(\s*\{\s*type:\s*'text',\s*text:\s*'[^']*\d[^']*'[^}]*)(})/);
        
        if (textMatch && !line.includes('color:')) {
            const hasNumber = /\d/.test(line);
            if (hasNumber) {
                // Add color before the closing }
                const newLine = line.replace(/}(\s*,?\s*)$/, `, color: '${KBANK_GREEN}' }$1`);
                changes.push({
                    type: 'number-color',
                    line: i + 1,
                    before: line.trim(),
                    after: newLine.trim()
                });
                lines[i] = newLine;
            }
        }
    }
    
    return { content: lines.join('\n'), changes };
}

/**
 * Add bold to label fields (ending with :)
 */
function addBoldToLabels(content: string): { content: string; changes: Change[] } {
    const lines = content.split('\n');
    const changes: Change[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!line) continue; // Skip undefined lines
        
        // Match: { type: 'text', text: 'Label:', ... }
        // But NOT if it already has weight
        const labelMatch = line.match(/type:\s*'text',\s*text:\s*'[^']+:'/);
        
        if (labelMatch && !line.includes('weight:')) {
            // Add weight: 'bold' after text
            const newLine = line.replace(
                /(text:\s*'[^']+:')/,
                "$1, weight: 'bold'"
            );
            changes.push({
                type: 'label-bold',
                line: i + 1,
                before: line.trim(),
                after: newLine.trim()
            });
            lines[i] = newLine;
        }
    }
    
    return { content: lines.join('\n'), changes };
}

/**
 * Add bold to headers (text starting with emoji)
 */
function addBoldToHeaders(content: string): { content: string; changes: Change[] } {
    const lines = content.split('\n');
    const changes: Change[] = [];
    
    const emojiPattern = /[💰🕐📋📊📞✅❌⚠️⚙️🏠👤👥🏢💼📈📉🔔📧💬📤]/u;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!line) continue; // Skip undefined lines
        
        // Match: { type: 'text', text: '💰 Header', ... }
        // But NOT if it already has weight or if it's a button
        const headerMatch = line.match(/type:\s*'text',\s*text:\s*'([^']+)'/);
        
        if (headerMatch && !line.includes('weight:') && !line.includes('action:')) {
            const textContent = headerMatch[1];
            if (textContent && emojiPattern.test(textContent)) {
                // Add weight: 'bold' after text
                const newLine = line.replace(
                    /(text:\s*'[^']+')/,
                    "$1, weight: 'bold'"
                );
                changes.push({
                    type: 'header-bold',
                    line: i + 1,
                    before: line.trim(),
                    after: newLine.trim()
                });
                lines[i] = newLine;
            }
        }
    }
    
    return { content: lines.join('\n'), changes };
}

/**
 * Process a single file
 */
function processFile(filePath: string): void {
    try {
        const fullPath = path.join(process.cwd(), filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        console.log(`\n📝 Processing: ${filePath}`);
        
        // Apply all transformations
        const { content: content1, changes: changes1 } = addColorToNumbers(content);
        const { content: content2, changes: changes2 } = addBoldToLabels(content1);
        const { content: content3, changes: changes3 } = addBoldToHeaders(content2);
        
        const allChanges = [...changes1, ...changes2, ...changes3];
        
        if (allChanges.length > 0) {
            fs.writeFileSync(fullPath, content3, 'utf-8');
            
            console.log(`✅ Applied ${allChanges.length} changes:`);
            console.log(`   - Numbers with green: ${changes1.length}`);
            console.log(`   - Labels bold: ${changes2.length}`);
            console.log(`   - Headers bold: ${changes3.length}`);
            
            // Show first few examples
            if (allChanges.length > 0 && allChanges.length <= 5) {
                console.log('\n   Examples:');
                allChanges.slice(0, 3).forEach(change => {
                    console.log(`   Line ${change.line} (${change.type}):`);
                    console.log(`     Before: ${change.before.substring(0, 80)}...`);
                    console.log(`     After:  ${change.after.substring(0, 80)}...`);
                });
            }
        } else {
            console.log('⏭️  No changes needed');
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
    }
}

// Main execution
console.log('🎨 Starting LINE message styling...\n');
console.log('Styling Rules:');
console.log(`  1. Numbers → Green color (${KBANK_GREEN})`);
console.log('  2. Labels (ending with :) → Bold');
console.log('  3. Headers (starting with emoji) → Bold');
console.log('');

FILES_TO_PROCESS.forEach(processFile);

console.log('\n✨ Styling complete!');
console.log('\n💡 Tip: Run "npm run build" to verify changes');

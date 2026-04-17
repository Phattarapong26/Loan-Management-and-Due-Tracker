/**
 * Script to format LINE messages with proper styling
 * 
 * 1. Make all numbers green (K-Bank Green #00AA5B)
 * 2. Make all labels/headers bold
 * 
 * Run with: npx ts-node src/scripts/format-line-messages-style.ts
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

interface Replacement {
    pattern: RegExp;
    replacement: string | ((match: string, ...args: any[]) => string);
    description: string;
}

/**
 * Patterns to format
 */
const FORMATTING_PATTERNS: Replacement[] = [
    // Format currency amounts (e.g., "฿1,234,567" or "1,234,567 บาท")
    {
        pattern: /text: '([^']*?)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(บาท|฿)?([^']*?)'/g,
        replacement: (match, before, number, currency, after) => {
            // If already has color, skip
            if (match.includes('color:')) return match;
            return `text: '${before}', size: 'sm', color: '${KBANK_GREEN}' },\n                            { type: 'text', text: '${number}${currency || ''}${after}'`;
        },
        description: 'Format currency amounts with green color'
    },
    
    // Format labels that end with colon (e.g., "ยอดคงเหลือ:", "กำหนดชำระ:")
    {
        pattern: /text: '([^']+:)'/g,
        replacement: (match, label) => {
            // If already has weight, skip
            if (match.includes('weight:')) return match;
            return `text: '${label}', weight: 'bold'`;
        },
        description: 'Make labels with colon bold'
    },
    
    // Format section headers (text that starts with emoji/icon)
    {
        pattern: /text: '([💰🕐📋📊📞✅❌⚠️⚙️][^']+)'/g,
        replacement: (match, text) => {
            // If already has weight, skip
            if (match.includes('weight:')) return match;
            // Don't format if it's a button label
            if (match.includes('action:')) return match;
            return `text: '${text}', weight: 'bold'`;
        },
        description: 'Make headers with icons bold'
    },
];

/**
 * Apply formatting to file content
 */
function applyFormatting(content: string): { content: string; changes: number } {
    let result = content;
    let totalChanges = 0;
    
    for (const pattern of FORMATTING_PATTERNS) {
        const matches = result.match(pattern.pattern);
        if (matches) {
            totalChanges += matches.length;
            result = result.replace(pattern.pattern, pattern.replacement as any);
        }
    }
    
    return { content: result, changes: totalChanges };
}

/**
 * Process a single file
 */
function processFile(filePath: string): void {
    try {
        const fullPath = path.join(process.cwd(), filePath);
        const originalContent = fs.readFileSync(fullPath, 'utf-8');
        
        const { content: newContent, changes } = applyFormatting(originalContent);
        
        if (changes > 0) {
            fs.writeFileSync(fullPath, newContent, 'utf-8');
            console.log(`\n✅ Processed: ${filePath}`);
            console.log(`   Applied ${changes} formatting changes`);
        } else {
            console.log(`\n⏭️  Skipped: ${filePath} (no changes needed)`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
    }
}

// Main execution
console.log('🎨 Starting LINE message formatting...\n');
console.log('Formatting Rules:');
console.log('  1. Numbers → Green color (#00AA5B)');
console.log('  2. Labels (ending with :) → Bold');
console.log('  3. Headers (with icons) → Bold');

FILES_TO_PROCESS.forEach(processFile);

console.log('\n✨ Formatting complete!');

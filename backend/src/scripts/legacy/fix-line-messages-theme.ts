/**
 * Fix LINE Messages Theme Script
 * 
 * This script replaces ALL colors and emojis in line-messages.service.ts
 * to use K-Bank green theme (#00AA5B) consistently.
 * 
 * Usage: npx tsx src/scripts/fix-line-messages-theme.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(__dirname, '../services/line-messages.service.ts');

// Color replacements - ALL to K-Bank Green
const COLOR_REPLACEMENTS: Record<string, string> = {
    '#06C755': '#00AA5B',  // LINE Green → K-Bank Green
    '#2196F3': '#00AA5B',  // Blue → K-Bank Green
    '#FF9800': '#00AA5B',  // Orange → K-Bank Green
    '#9C27B0': '#00AA5B',  // Purple → K-Bank Green
    '#1DB954': '#00AA5B',  // Spotify Green → K-Bank Green
    '#1E90FF': '#00AA5B',  // Dodger Blue → K-Bank Green
    '#4CAF50': '#00AA5B',  // Material Green → K-Bank Green
    '#F44336': '#FF6B6B',  // Keep red for errors (but softer)
    '#FFA500': '#FFA500',  // Keep orange for warnings
};

// Emoji replacements - Simple text icons
const EMOJI_REPLACEMENTS: Record<string, string> = {
    // Money & Finance
    '💰': '฿',
    '💳': '▣',
    '💵': '฿',
    '💴': '฿',
    
    // Calendar & Time
    '📅': '◷',
    '📆': '◷',
    '⏰': '◷',
    '🕐': '◷',
    
    // Documents & Lists
    '📝': '⊞',
    '📋': '⊞',
    '📄': '⊞',
    '📃': '⊞',
    '📑': '⊞',
    
    // Charts & Analytics
    '📊': '▣',
    '📈': '▤',
    '📉': '▤',
    '💹': '▤',
    
    // Communication
    '📞': '◉',
    '☎️': '◉',
    '📱': '◉',
    '💬': '◉',
    '📧': '◉',
    '✉️': '◉',
    
    // Status & Actions
    '✅': '✓',
    '✔️': '✓',
    '❌': '✗',
    '⚠️': '⚠',
    '🚨': '⚠',
    '⚡': '⚡',
    '🔔': '◉',
    
    // People & Users
    '👤': '◉',
    '👥': '◉',
    '👨': '◉',
    '👩': '◉',
    '🧑': '◉',
    
    // Buildings & Places
    '🏢': '▣',
    '🏠': '▣',
    '🏦': '▣',
    
    // Tech & System
    '🖥️': '⚙',
    '💻': '⚙',
    '⚙️': '⚙',
    '🔧': '⚙',
    
    // Misc
    '🎉': '✓',
    '🎊': '✓',
    '✨': '✓',
    '🌟': '✓',
    '⭐': '✓',
    '✍️': '✎',
    '✍': '✎',
    '🤝': '✓',
};

function fixLineMessagesTheme() {
    console.log('🎨 Fixing LINE Messages Theme...\n');
    console.log('═'.repeat(80));

    try {
        // Read file
        console.log('\n📖 Reading file...');
        let content = fs.readFileSync(FILE_PATH, 'utf-8');
        const originalContent = content;

        // Replace colors
        console.log('\n🎨 Replacing colors...');
        let colorCount = 0;
        for (const [oldColor, newColor] of Object.entries(COLOR_REPLACEMENTS)) {
            const regex = new RegExp(oldColor.replace('#', '\\#'), 'gi');
            const matches = content.match(regex);
            if (matches) {
                content = content.replace(regex, newColor);
                console.log(`   ${oldColor} → ${newColor} (${matches.length} occurrences)`);
                colorCount += matches.length;
            }
        }

        // Replace emojis
        console.log('\n😀 Replacing emojis...');
        let emojiCount = 0;
        for (const [emoji, replacement] of Object.entries(EMOJI_REPLACEMENTS)) {
            // Match emoji in strings (with quotes)
            const patterns = [
                new RegExp(`'${emoji}`, 'g'),
                new RegExp(`"${emoji}`, 'g'),
                new RegExp(`${emoji} `, 'g'),
            ];
            
            for (const pattern of patterns) {
                const matches = content.match(pattern);
                if (matches) {
                    content = content.replace(pattern, pattern.source.includes("'") ? `'${replacement}` : 
                                                       pattern.source.includes('"') ? `"${replacement}` : 
                                                       `${replacement} `);
                    emojiCount += matches.length;
                }
            }
        }

        // Add color constants if not exists
        if (!content.includes('private static readonly COLORS')) {
            console.log('\n➕ Adding color constants...');
            const colorConstants = `
    // K-Bank Theme Colors
    private static readonly COLORS = {
        PRIMARY: '#00AA5B',      // K-Bank Green
        SUCCESS: '#00AA5B',      // Same as primary
        WARNING: '#FFA500',      // Orange for warnings
        DANGER: '#FF6B6B',       // Red for errors/overdue
        INFO: '#0088CC',         // Blue for info (rarely used)
        BACKGROUND: '#FFFFFF',   // White
        LIGHT_BG: '#F8FDFB',     // Light green tint
        TEXT_PRIMARY: '#333333', // Dark gray
        TEXT_SECONDARY: '#666666', // Medium gray
        TEXT_LIGHT: '#999999',   // Light gray
    };
`;
            content = content.replace(
                'export class LineMessagesService {',
                `export class LineMessagesService {${colorConstants}`
            );
        }

        // Write file
        if (content !== originalContent) {
            console.log('\n💾 Writing changes...');
            fs.writeFileSync(FILE_PATH, content, 'utf-8');
            
            console.log('\n' + '═'.repeat(80));
            console.log('\n✅ Theme fixed successfully!');
            console.log(`\n📊 Summary:`);
            console.log(`   Colors replaced: ${colorCount}`);
            console.log(`   Emojis replaced: ${emojiCount}`);
            console.log(`   Total changes: ${colorCount + emojiCount}`);
            console.log('\n💡 Next steps:');
            console.log('   1. Review the changes in your editor');
            console.log('   2. Restart backend: npm run dev');
            console.log('   3. Test in LINE app');
            console.log('   4. Verify all messages use K-Bank green\n');
        } else {
            console.log('\n✓ No changes needed - file already uses K-Bank theme!\n');
        }

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixLineMessagesTheme();

// @ts-nocheck
/**
 * Script to update all LINE message icons to Lucide-inspired emojis
 * 
 * This script replaces all text icons (฿, ◷, ⊞, etc.) with Lucide-inspired emojis
 * to make the LINE messages more visually appealing and consistent
 */

import { ICONS } from '../services/line-messages/icons';

/**
 * Icon replacement mapping
 * Maps old text icons to new Lucide-inspired emojis
 */
export const ICON_REPLACEMENTS: Record<string, string> = {
    // Currency & Financial
    '฿': ICONS.CURRENCY,
    
    // Time & Calendar
    '◷': ICONS.CLOCK,
    
    // Documents & Records
    '⊞': ICONS.CLIPBOARD,
    '▣': ICONS.DASHBOARD,
    '📋': ICONS.TASK,
    '📝': ICONS.CONTACT_LOG,
    
    // Communication
    '◉': ICONS.CIRCLE,
    
    // Status
    '✓': ICONS.CHECK,
    '✗': ICONS.X,
    '⚠': ICONS.ALERT,
    
    // System
    '⚙': ICONS.SETTINGS,
};

/**
 * Semantic icon mapping for better context
 * Use these for specific contexts instead of generic icons
 */
export const SEMANTIC_ICONS = {
    // Financial
    balance: ICONS.WALLET,
    payment: ICONS.CREDIT_CARD,
    loan: ICONS.CURRENCY,
    receipt: ICONS.RECEIPT,
    
    // Time
    dueDate: ICONS.CALENDAR,
    schedule: ICONS.CALENDAR_CHECK,
    overdue: ICONS.CALENDAR_X,
    clock: ICONS.CLOCK,
    
    // Actions
    success: ICONS.CHECK_CIRCLE,
    error: ICONS.X_CIRCLE,
    warning: ICONS.ALERT_CIRCLE,
    info: ICONS.INFO,
    
    // Documents
    document: ICONS.FILE_TEXT,
    history: ICONS.ARCHIVE,
    task: ICONS.TASK,
    contactLog: ICONS.CONTACT_LOG,
    
    // Communication
    phone: ICONS.PHONE,
    email: ICONS.MAIL,
    message: ICONS.MESSAGE,
    visit: ICONS.VISIT,
    
    // Dashboard & Reports
    dashboard: ICONS.DASHBOARD,
    chart: ICONS.CHART,
    trendingUp: ICONS.TRENDING_UP,
    trendingDown: ICONS.TRENDING_DOWN,
    
    // User & Business
    user: ICONS.USER,
    users: ICONS.USERS,
    building: ICONS.BUILDING,
    briefcase: ICONS.BRIEFCASE,
    
    // Actions
    edit: ICONS.EDIT,
    delete: ICONS.TRASH,
    save: ICONS.SAVE,
    menu: ICONS.MENU,
    settings: ICONS.SETTINGS,
    
    // Status
    approved: ICONS.CHECK_CIRCLE,
    pending: ICONS.CLOCK,
    rejected: ICONS.X_CIRCLE,
    npl: ICONS.ALERT,
};

/**
 * Replace text icons in a string
 */
export function replaceIcons(text: string): string {
    let result = text;
    for (const [oldIcon, newIcon] of Object.entries(ICON_REPLACEMENTS)) {
        result = result.replace(new RegExp(oldIcon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newIcon);
    }
    return result;
}

/**
 * Get icon for specific context
 */
export function getContextIcon(context: keyof typeof SEMANTIC_ICONS): string {
    return SEMANTIC_ICONS[context];
}

/**
 * Format text with icon
 */
export function withIcon(icon: string, text: string, spacing: boolean = true): string {
    return spacing ? `${icon} ${text}` : `${icon}${text}`;
}

// Example usage:
console.log('Icon Replacement Examples:');
console.log('Old: ฿ ยอดคงเหลือ');
console.log('New:', replaceIcons('฿ ยอดคงเหลือ'));
console.log('');
console.log('Old: ◷ กำหนดชำระ');
console.log('New:', replaceIcons('◷ กำหนดชำระ'));
console.log('');
console.log('Old: ⊞ บันทึกการติดต่อ');
console.log('New:', replaceIcons('⊞ บันทึกการติดต่อ'));
console.log('');
console.log('Old: ▣ Dashboard');
console.log('New:', replaceIcons('▣ Dashboard'));
console.log('');
console.log('Old: ◉ ติดต่อลูกค้า');
console.log('New:', replaceIcons('◉ ติดต่อลูกค้า'));
console.log('');
console.log('Old: ✓ สำเร็จ');
console.log('New:', replaceIcons('✓ สำเร็จ'));
console.log('');
console.log('Old: ✗ ล้มเหลว');
console.log('New:', replaceIcons('✗ ล้มเหลว'));
console.log('');
console.log('Old: ⚠ แจ้งเตือน');
console.log('New:', replaceIcons('⚠ แจ้งเตือน'));

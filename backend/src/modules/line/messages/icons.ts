/**
 * Lucide Icons for LINE Messages
 * 
 * Using Lucide icon names as text since LINE doesn't support actual icon rendering
 * These will be displayed as emoji-like text in LINE chat
 * 
 * Reference: https://lucide.dev/icons/
 */

export const ICONS = {
    // Financial
    CURRENCY: '💰',           // DollarSign
    WALLET: '👛',             // Wallet
    CREDIT_CARD: '💳',        // CreditCard
    RECEIPT: '🧾',            // Receipt
    COINS: '🪙',              // Coins
    
    // Time & Calendar
    CALENDAR: '📅',           // Calendar
    CLOCK: '🕐',              // Clock
    CALENDAR_CHECK: '✅',     // CalendarCheck
    CALENDAR_X: '❌',         // CalendarX
    TIMER: '⏱️',              // Timer
    
    // Actions & Status
    CHECK: '✅',              // Check, CheckCircle
    CHECK_CIRCLE: '✅',       // CheckCircle2
    X: '❌',                  // X
    X_CIRCLE: '❌',           // XCircle
    ALERT: '⚠️',              // AlertTriangle
    INFO: 'ℹ️',               // Info
    ALERT_CIRCLE: '⚠️',       // AlertCircle
    
    // Documents & Files
    FILE: '📄',               // File
    FILE_TEXT: '📝',          // FileText
    CLIPBOARD: '📋',          // Clipboard
    FOLDER: '📁',             // Folder
    ARCHIVE: '🗄️',            // Archive
    
    // Communication
    PHONE: '📞',              // Phone
    MAIL: '📧',               // Mail
    MESSAGE: '💬',            // MessageCircle
    SEND: '📤',               // Send
    BELL: '🔔',               // Bell
    
    // Navigation & UI
    HOME: '🏠',               // Home
    MENU: '☰',                // Menu
    SETTINGS: '⚙️',           // Settings
    SEARCH: '🔍',             // Search
    FILTER: '🔽',             // Filter
    
    // Business & Office
    BRIEFCASE: '💼',          // Briefcase
    BUILDING: '🏢',           // Building, Building2
    USER: '👤',               // User
    USERS: '👥',              // Users
    CHART: '📊',              // BarChart, LineChart
    TRENDING_UP: '📈',        // TrendingUp
    TRENDING_DOWN: '📉',      // TrendingDown
    
    // Actions
    EDIT: '✏️',               // Edit, Pencil
    TRASH: '🗑️',              // Trash, Trash2
    PLUS: '➕',               // Plus
    MINUS: '➖',              // Minus
    SAVE: '💾',               // Save
    DOWNLOAD: '⬇️',           // Download
    UPLOAD: '⬆️',             // Upload
    
    // Status & Indicators
    CIRCLE: '⭕',             // Circle
    DOT: '•',                 // Dot (for lists)
    SQUARE: '▢',              // Square
    CHECK_SQUARE: '☑️',       // CheckSquare
    
    // Arrows & Direction
    ARROW_RIGHT: '→',         // ArrowRight
    ARROW_LEFT: '←',          // ArrowLeft
    ARROW_UP: '↑',            // ArrowUp
    ARROW_DOWN: '↓',          // ArrowDown
    CHEVRON_RIGHT: '›',       // ChevronRight
    CHEVRON_DOWN: '⌄',        // ChevronDown
    
    // Special
    STAR: '⭐',               // Star
    HEART: '❤️',              // Heart
    BOOKMARK: '🔖',           // Bookmark
    TAG: '🏷️',                // Tag
    LINK: '🔗',               // Link
    LOCK: '🔒',               // Lock
    UNLOCK: '🔓',             // Unlock
    EYE: '👁️',                // Eye
    EYE_OFF: '🙈',            // EyeOff
    
    // K-Bank Specific (using closest Lucide equivalents)
    LOAN: '💰',               // DollarSign (for loans)
    PAYMENT: '💳',            // CreditCard (for payments)
    TASK: '📋',               // ClipboardList (for tasks)
    CONTACT_LOG: '📝',        // FileText (for contact logging)
    DASHBOARD: '📊',          // LayoutDashboard (for dashboard)
    APPROVAL: '✅',           // CheckCircle (for approvals)
    NPL: '⚠️',                // AlertTriangle (for NPL alerts)
    VISIT: '🏠',              // Home (for home visits)
} as const;

/**
 * Icon helper functions
 */
export const getIcon = (name: keyof typeof ICONS): string => {
    return ICONS[name];
};

/**
 * Format text with icon
 */
export const withIcon = (icon: keyof typeof ICONS, text: string): string => {
    return `${ICONS[icon]} ${text}`;
};

/**
 * Legacy icon mapping (for backward compatibility)
 * Maps old text icons to new Lucide-based emojis
 */
export const LEGACY_ICON_MAP: Record<string, string> = {
    '฿': ICONS.CURRENCY,
    '◷': ICONS.CLOCK,
    '⊞': ICONS.CLIPBOARD,
    '▣': ICONS.SQUARE,
    '◉': ICONS.CIRCLE,
    '✓': ICONS.CHECK,
    '✗': ICONS.X,
    '⚠': ICONS.ALERT,
    '⚙': ICONS.SETTINGS,
};

/**
 * Replace legacy icons in text
 */
export const replaceLegacyIcons = (text: string): string => {
    let result = text;
    for (const [oldIcon, newIcon] of Object.entries(LEGACY_ICON_MAP)) {
        result = result.replace(new RegExp(oldIcon, 'g'), newIcon);
    }
    return result;
};

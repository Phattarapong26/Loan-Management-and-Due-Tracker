/**
 * K-Bank Theme Colors and Icons
 * Centralized color and icon management for LINE messages
 */

import { ICONS } from './icons';

export const COLORS = {
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
} as const;

// Re-export icons for convenience
export { ICONS };


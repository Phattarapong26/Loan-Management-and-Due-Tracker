/**
 * Rich Menu Sync Job
 * 
 * Purpose: Detect role changes and update Rich Menus accordingly
 * Schedule: Every 5 minutes
 * 
 * Requirements: Task 4.2.3 - Role change detection and menu update
 */

import { prisma } from '@config/database.config';
import { RichMenuManager } from '@line/services/rich-menu/line-rich-menu-manager.service';
import { logger } from '@utils/common/logger.util';

interface UserRoleCache {
    lineUserId: string;
    role: string;
    lastChecked: Date;
}

// In-memory cache of user roles (in production, use Redis)
const roleCache = new Map<string, UserRoleCache>();

/**
 * Check for role changes and update Rich Menus
 */
export async function syncRichMenus(): Promise<void> {
    try {
        logger.info('🔄 Starting Rich Menu sync job...');

        // Get all active LINE users
        const users = await prisma.user.findMany({
            where: {
                lineUserId: { not: null },
                lineActive: true,
            },
            select: {
                id: true,
                lineUserId: true,
                role: true,
            },
        });

        const richMenuManager = new RichMenuManager();
        let updatedCount = 0;
        let enforcedCount = 0;

        for (const user of users) {
            if (!user.lineUserId) continue;

            const cached = roleCache.get(user.lineUserId);

            // Check if role has changed
            if (cached && cached.role !== user.role) {
                logger.info({ lineUserId: user.lineUserId, oldRole: cached.role, newRole: user.role }, 'Role changed');

                // Update Rich Menu
                const success = await richMenuManager.updateUserRichMenu(user.lineUserId, user.role);

                if (success) {
                    updatedCount++;
                }
            }

            // Enforce rich menu even if role has not changed (fixes missing/unlinked rich menu)
            const enforced = await richMenuManager.ensureRichMenu(user.lineUserId, user.role);
            if (enforced) {
                enforcedCount++;
            }

            // Update cache
            roleCache.set(user.lineUserId, {
                lineUserId: user.lineUserId,
                role: user.role,
                lastChecked: new Date(),
            });
        }

        logger.info({ updatedCount, enforcedCount }, '✅ Rich Menu sync complete');
    } catch (error) {
        logger.error({ error }, '❌ Error in Rich Menu sync job');
    }
}

/**
 * Clear stale cache entries (older than 1 hour)
 */
export function clearStaleCache(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [lineUserId, cache] of roleCache.entries()) {
        if (cache.lastChecked < oneHourAgo) {
            roleCache.delete(lineUserId);
        }
    }
}

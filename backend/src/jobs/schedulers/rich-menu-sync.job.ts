/**
 * Rich Menu Sync Job
 * 
 * Purpose: Detect role changes and update Rich Menus accordingly
 * Schedule: Every 5 minutes
 * 
 * Requirements: Task 4.2.3 - Role change detection and menu update
 */

import { UserRepository } from '@users/repositories/user.repository';
import { RichMenuManager } from '@line/services/rich-menu/line-rich-menu-manager.service';
import { logger } from '@utils/common/logger.util';

interface UserRoleCache {
    lineUserId: string;
    role: string;
    lastChecked: Date;
}

const roleCache = new Map<string, UserRoleCache>();
const userRepository = new UserRepository();

export async function syncRichMenus(): Promise<void> {
    try {
        logger.info('🔄 Starting Rich Menu sync job...');

        const users = await userRepository.findAllActiveLineUsers();

        const richMenuManager = new RichMenuManager();
        let updatedCount = 0;
        let enforcedCount = 0;

        for (const user of users) {
            if (!user.lineUserId) continue;

            const cached = roleCache.get(user.lineUserId);

            if (cached && cached.role !== user.role) {
                logger.info({ lineUserId: user.lineUserId, oldRole: cached.role, newRole: user.role }, 'Role changed');
                const success = await richMenuManager.updateUserRichMenu(user.lineUserId, user.role);
                if (success) updatedCount++;
            }

            const enforced = await richMenuManager.ensureRichMenu(user.lineUserId, user.role);
            if (enforced) enforcedCount++;

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

export function clearStaleCache(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [lineUserId, cache] of roleCache.entries()) {
        if (cache.lastChecked < oneHourAgo) roleCache.delete(lineUserId);
    }
}

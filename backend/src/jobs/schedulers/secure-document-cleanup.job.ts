/**
 * Secure Document Token Cleanup Job
 * 
 * Runs daily to cleanup expired secure document tokens
 */

import cron from 'node-cron';
import { SecureDocumentService } from '@documents/services/secure-document.service';
import { logger } from '@utils/common/logger.util';

const secureDocumentService = new SecureDocumentService();

/**
 * Cleanup expired secure document tokens
 * Runs daily at 2:00 AM
 */
export const secureDocumentCleanupJob = cron.schedule(
    '0 2 * * *', // Every day at 2:00 AM
    async () => {
        try {
            logger.info('Starting secure document token cleanup job');
            
            const deletedCount = await secureDocumentService.cleanupExpiredTokens();
            
            logger.info(
                { deletedCount },
                'Secure document token cleanup job completed'
            );
        } catch (error) {
            logger.error(
                { error },
                'Error in secure document token cleanup job'
            );
        }
    },
    {
        timezone: 'Asia/Bangkok',
    }
);

logger.info('Secure document token cleanup job registered (runs daily at 2:00 AM)');

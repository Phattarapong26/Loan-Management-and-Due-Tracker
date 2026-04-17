import cron from 'node-cron';
import { SecurityMonitorService } from '../../modules/monitoring/services/security-monitor.service';
import { logger } from '@utils/common/logger.util';

const securityMonitor = new SecurityMonitorService();

/**
 * Cron job สำหรับทำความสะอาด security events เก่า
 * รันทุกวันเวลา 02:00 น.
 */
export function startSecurityCleanupJob() {
    // รันทุกวันเวลา 02:00 น.
    cron.schedule('0 2 * * *', async () => {
        try {
            logger.info('[Security Cleanup] Starting cleanup job...');
            
            const result = await securityMonitor.cleanupOldEvents();
            
            logger.info({ deleted: result.deleted }, '[Security Cleanup] Completed');
        } catch (error) {
            logger.error({ error }, '[Security Cleanup] Error');
        }
    });

    logger.info('[Security Cleanup] Job scheduled to run daily at 02:00');
}

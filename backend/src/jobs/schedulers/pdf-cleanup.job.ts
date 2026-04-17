/**
 * PDF Cleanup Job
 * 
 * Scheduled job to clean up old temporary and public PDF files
 * Runs every hour to remove files older than 24 hours
 */

import cron, { ScheduledTask } from 'node-cron';
import { PDFGenerationService } from '@documents/services/pdf-generation.service';
import { LineFileUploadService } from '@line/services/files/line-file-upload.service';
import { logger } from '@utils/common/logger.util';

export class PDFCleanupJob {
    private job: ScheduledTask | null = null;

    /**
     * Start the cleanup job
     * Runs every hour at minute 0
     */
    start(): void {
        if (this.job) {
            logger.warn('PDF cleanup job is already running');
            return;
        }

        // Run every hour at minute 0
        this.job = cron.schedule('0 * * * *', async () => {
            try {
                logger.info('Starting PDF cleanup job');

                // Cleanup temporary PDFs (older than 1 hour)
                await PDFGenerationService.cleanupOldFiles(1);

                // Cleanup public PDFs (older than 24 hours)
                await LineFileUploadService.cleanupPublicFiles(24);

                logger.info('PDF cleanup job completed successfully');
            } catch (error) {
                logger.error({ error }, 'Error in PDF cleanup job');
            }
        });

        logger.info('PDF cleanup job started (runs every hour)');
    }

    /**
     * Stop the cleanup job
     */
    stop(): void {
        if (this.job) {
            this.job.stop();
            this.job = null;
            logger.info('PDF cleanup job stopped');
        }
    }

    /**
     * Run cleanup immediately (for testing)
     */
    async runNow(): Promise<void> {
        try {
            logger.info('Running PDF cleanup job immediately');

            await PDFGenerationService.cleanupOldFiles(1);
            await LineFileUploadService.cleanupPublicFiles(24);

            logger.info('PDF cleanup job completed successfully');
        } catch (error) {
            logger.error({ error }, 'Error running PDF cleanup job');
            throw error;
        }
    }
}

// Export singleton instance
export const pdfCleanupJob = new PDFCleanupJob();

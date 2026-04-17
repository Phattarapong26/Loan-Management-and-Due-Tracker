import cron, { ScheduledTask } from 'node-cron';
import { LineSessionService } from '@line/services/core/line-session.service';
import { SessionRepository } from '@auth/repositories/session.repository';
import { logger } from '@utils/common/logger.util';

/**
 * Session Cleanup Job
 * 
 * Runs every 5 minutes to clean up expired sessions from the database.
 * This prevents the ConversationState and Session tables from growing indefinitely.
 * 
 * IMPROVEMENTS:
 * 1. Clean up expired auth sessions (JWT sessions)
 * 2. Clean up expired previous tokens (grace period cleanup)
 * 3. Clean up LINE conversation sessions
 * 
 * Requirements:
 * - Requirement 19: Automatically expire sessions after 15 minutes
 * - Requirement 2: Clear expired sessions automatically
 */
export class SessionCleanupJob {
    private static job: ScheduledTask | null = null;
    private static sessionRepository = new SessionRepository();

    /**
     * Start the session cleanup job
     * Runs every 5 minutes
     */
    static start(): void {
        if (this.job) {
            logger.warn('Session cleanup job is already running');
            return;
        }

        // Run every 5 minutes
        this.job = cron.schedule('*/5 * * * *', async () => {
            try {
                logger.info('Running session cleanup job');

                // 1. Clean up expired auth sessions
                const deletedAuthSessions = await this.sessionRepository.deleteExpired();

                // 2. Clean up expired previous tokens (grace period)
                const cleanedPreviousTokens = await this.sessionRepository.cleanupExpiredPreviousTokens();

                // 3. Clean up LINE conversation sessions
                const deletedLineSessions = await LineSessionService.cleanupExpiredSessions();

                if (deletedAuthSessions > 0 || cleanedPreviousTokens > 0 || deletedLineSessions > 0) {
                    logger.info(
                        {
                            deletedAuthSessions,
                            cleanedPreviousTokens,
                            deletedLineSessions,
                        },
                        'Session cleanup job completed successfully'
                    );
                }
            } catch (error) {
                logger.error(
                    { error },
                    'Session cleanup job failed'
                );
            }
        });

        logger.info('Session cleanup job started (runs every 5 minutes)');
    }

    /**
     * Stop the session cleanup job
     */
    static stop(): void {
        if (this.job) {
            this.job.stop();
            this.job = null;
            logger.info('Session cleanup job stopped');
        }
    }

    /**
     * Run cleanup immediately (for testing or manual trigger)
     */
    static async runNow(): Promise<{
        deletedAuthSessions: number;
        cleanedPreviousTokens: number;
        deletedLineSessions: number;
    }> {
        logger.info('Running session cleanup job manually');

        const deletedAuthSessions = await this.sessionRepository.deleteExpired();
        const cleanedPreviousTokens = await this.sessionRepository.cleanupExpiredPreviousTokens();
        const deletedLineSessions = await LineSessionService.cleanupExpiredSessions();

        logger.info(
            {
                deletedAuthSessions,
                cleanedPreviousTokens,
                deletedLineSessions,
            },
            'Manual session cleanup completed'
        );

        return {
            deletedAuthSessions,
            cleanedPreviousTokens,
            deletedLineSessions,
        };
    }
}

// Force IPv4 DNS before any imports — must be first line
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { buildApp } from './app';
import { env } from '@config/env.config';
import { logger } from '@utils/common/logger.util';
import { prisma } from '@config/database.config';
import { redis } from '@config/redis.config';
import { connectRedis } from '@core/cache/redis.config';
import { queryLogger } from '@core/monitoring/query-logger';
import { validateLineCredentials } from '@config/line-credentials.config';
import { SessionCleanupJob } from '@jobs/schedulers/session-cleanup.job';
import { startSecurityCleanupJob } from './jobs/schedulers/security-cleanup.job';
import { syncRichMenus, clearStaleCache } from '@jobs/schedulers/rich-menu-sync.job';
import { RichMenuManager } from '@line/services/rich-menu/line-rich-menu-manager.service';
import { NotificationSchedulerService } from '@notifications/services/notification-scheduler.service';
import { paymentReminderJob } from '@jobs/schedulers/payment-reminder.job';
import { startAllPaymentTimelineJobs } from '@jobs/schedulers/payment-timeline.job';
import { paymentSyncJob } from '@jobs/schedulers/payment-sync.job';
import { pdfCleanupJob } from '@jobs/schedulers/pdf-cleanup.job';
import { secureDocumentCleanupJob } from '@jobs/schedulers/secure-document-cleanup.job';
import { startLineDataBackfillJob } from '@jobs/schedulers/line-data-backfill.job';
import { startLineBackfillJob } from '@jobs/schedulers/line-backfill.job';
import '@loans/workers/loan.worker'; // Initialize loan worker
import '@payments/workers/payment.worker'; // Initialize payment worker
import '@notifications/channels/email/email.worker'; // Initialize email worker
import '@notifications/workers/notification.worker'; // Initialize notification worker

// Set timezone for the entire application
process.env.TZ = 'Asia/Bangkok';

// Store interval IDs and services for cleanup
let richMenuSyncInterval: NodeJS.Timeout | null = null;
let cacheClearInterval: NodeJS.Timeout | null = null;
let notificationScheduler: NotificationSchedulerService | null = null;

async function start() {
    try {
        // Connect to Redis for caching
        try {
            await connectRedis();
            logger.info(`✅ Redis connected for caching`);
        } catch (error) {
            logger.warn({ error }, '⚠️ Redis connection failed (non-fatal, caching disabled)');
        }

        // Setup Prisma query logging for performance monitoring
        prisma.$on('query' as never, (e: any) => {
            queryLogger.log(e.query, e.duration, e.params);
        });
        logger.info(`✅ Query logging enabled`);

        // Validate LINE credentials in the background - non-blocking so a
        // credential issue never prevents the server from starting.
        validateLineCredentials({
            testConnectivity: env.isProduction,
            failOnConnectivityError: false, // Never abort startup on connectivity failure
        }).catch((error) => {
            logger.warn({ error }, '⚠️ LINE credential validation failed (non-fatal) - server is running but LINE features may not work correctly');
        });

        // Build app
        const app = await buildApp();

        // Start server
        await app.listen({
            port: env.PORT,
            host: env.HOST,
        });

        logger.info(
            `🚀 Server running on http://${env.HOST}:${env.PORT}`
        );
        logger.info(`📝 Environment: ${env.NODE_ENV}`);
        logger.info(`✅ Database connected`);
        logger.info(`✅ Redis connected`);

        // Start session cleanup job
        SessionCleanupJob.start();
        logger.info(`✅ Session cleanup job started`);

        // Start security cleanup job
        startSecurityCleanupJob();
        logger.info(`✅ Security cleanup job started`);

        // Start PDF cleanup job
        pdfCleanupJob.start();
        logger.info(`✅ PDF cleanup job started`);
        
        // Start secure document token cleanup job
        secureDocumentCleanupJob.start();
        logger.info(`✅ Secure document token cleanup job started`);

        // Initialize Rich Menus on startup
        try {
            const richMenuManager = new RichMenuManager();
            await richMenuManager.initializeRichMenus();
            logger.info(`✅ Rich Menus initialized`);
        } catch (error) {
            logger.error({ error }, '⚠️ Failed to initialize Rich Menus (non-fatal)');
        }

        // Start Rich Menu sync job (every 5 minutes)
        richMenuSyncInterval = setInterval(async () => {
            await syncRichMenus();
        }, 5 * 60 * 1000); // 5 minutes
        logger.info(`✅ Rich Menu sync job started (5-min interval)`);

        // Start cache cleanup job (every hour)
        cacheClearInterval = setInterval(() => {
            clearStaleCache();
        }, 60 * 60 * 1000); // 1 hour
        logger.info(`✅ Cache cleanup job started (1-hour interval)`);

        // Task 8.1.14: Initialize notification scheduler
        try {
            notificationScheduler = new NotificationSchedulerService();
            notificationScheduler.initialize();
            logger.info(`✅ Notification scheduler initialized`);
        } catch (error) {
            logger.error({ error }, '⚠️ Failed to initialize notification scheduler (non-fatal)');
        }

        // Task 7.2.5: Initialize payment sync job (every 15 minutes)
        try {
            paymentSyncJob.initialize();
            logger.info(`✅ Payment sync job initialized (15-min interval)`);
        } catch (error) {
            logger.error({ error }, '⚠️ Failed to initialize payment sync job (non-fatal)');
        }

        // Payment reminder job (daily: upcoming 3d, overdue, NPL)
        try {
            const reminderCron = await import('node-cron');
            reminderCron.default.schedule('0 7 * * *', async () => {
                await paymentReminderJob.runAll();
            }, { timezone: 'Asia/Bangkok' });
            logger.info(`✅ Payment reminder job initialized (daily 07:00)`);
        } catch (error) {
            logger.error({ error }, '⚠️ Failed to initialize payment reminder job (non-fatal)');
        }

        // Payment timeline jobs (every 30 min + daily creation + weekly cleanup)
        try {
            startAllPaymentTimelineJobs();
            logger.info(`✅ Payment timeline jobs initialized`);
        } catch (error) {
            logger.error({ error }, '⚠️ Failed to initialize payment timeline jobs (non-fatal)');
        }

        // LINE data backfill job (daily at 03:00 AM - low traffic)
        try {
            startLineDataBackfillJob();
            logger.info(`✅ LINE data backfill job initialized (daily 03:00 AM)`);
        } catch (error) {
            logger.error({ error }, '⚠️ Failed to initialize LINE data backfill job (non-fatal)');
        }

        // LINE backfill job (daily 02:30 AM - timeline events, receipts, contract PDFs)
        try {
            startLineBackfillJob();
            logger.info('✅ LINE backfill job initialized (daily 02:30)');
        } catch (error) {
            logger.error({ error }, '⚠️ Failed to initialize LINE backfill job (non-fatal)');
        }

        // Graceful shutdown
        const signals = ['SIGINT', 'SIGTERM'];
        signals.forEach((signal) => {
            process.on(signal, async () => {
                logger.info(`${signal} received, shutting down gracefully...`);

                // Stop session cleanup job
                SessionCleanupJob.stop();

                // Stop PDF cleanup job
                pdfCleanupJob.stop();
                
                // Stop secure document token cleanup job
                secureDocumentCleanupJob.stop();

                // Stop Rich Menu sync job
                if (richMenuSyncInterval) {
                    clearInterval(richMenuSyncInterval);
                }
                if (cacheClearInterval) {
                    clearInterval(cacheClearInterval);
                }

                // Stop notification scheduler
                if (notificationScheduler) {
                    notificationScheduler.stop();
                }

                // Stop payment sync job
                paymentSyncJob.stop();

                await app.close();
                await prisma.$disconnect();
                await redis.quit();

                logger.info('✅ Shutdown complete');
                process.exit(0);
            });
        });
    } catch (error) {
        logger.error({ error }, '❌ Failed to start server');
        process.exit(1);
    }
}

start();

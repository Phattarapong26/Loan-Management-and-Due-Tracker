/**
 * Notification Scheduler Service
 * 
 * Purpose: Automated daily notifications with node-cron
 * Features:
 * - Scheduled notifications for all user roles
 * - Payment reminders
 * - Task notifications
 * - KPI updates
 * - Notification grouping
 * - Retry logic
 * 
 * Requirements: Requirement 15 - Daily Notification Scheduler
 */

import * as cron from 'node-cron';
import { prisma } from '@config/database.config';
import { DatabaseQueryService } from '@core-services/services/database-query.service';
import { LoanOfficerTaskService } from '@shared/services/loan-officer-task.service';
import { DashboardService } from '@reports/services/dashboard.service';
import { NPLAlertService } from '@collections/services/npl-alert.service';
import { NotificationRepository } from '../repositories/notification.repository';
import axios from 'axios';
import { env } from '@config/env.config';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

interface NotificationJob {
    name: string;
    schedule: string;
    task: cron.ScheduledTask | null;
}

export class NotificationSchedulerService {
    private accessToken: string;
    private dbQueryService: DatabaseQueryService;
    private taskService: LoanOfficerTaskService;
    private kpiService: DashboardService;
    private nplService: NPLAlertService;
    private notificationRepository: NotificationRepository;
    private jobs: Map<string, NotificationJob>;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY_MS = 2000;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
        this.dbQueryService = new DatabaseQueryService();
        this.taskService = new LoanOfficerTaskService();
        this.kpiService = new DashboardService();
        this.nplService = new NPLAlertService();
        this.notificationRepository = new NotificationRepository();
        this.jobs = new Map();
    }

    /**
     * Task 8.1.3: Initialize all cron jobs
     */
    initialize(): void {
        console.log('🕐 Initializing notification scheduler...');

        // Task 8.1.4: Payment schedule query at 6:00 AM Bangkok time
        this.scheduleJob(
            'payment-schedule-query',
            '0 6 * * *', // 6:00 AM daily
            async () => {
                console.log('Running payment schedule query...');
                await this.queryPaymentSchedules();
            }
        );

        // Task 8.1.5: Customer notifications at 7:00 AM Bangkok time
        this.scheduleJob(
            'customer-notifications',
            '0 7 * * *', // 7:00 AM daily
            async () => {
                console.log('Sending customer notifications...');
                await this.sendCustomerNotifications();
            }
        );

        // Task 8.1.6: Loan officer notifications at 8:00 AM Bangkok time
        this.scheduleJob(
            'officer-notifications',
            '0 8 * * *', // 8:00 AM daily
            async () => {
                console.log('Sending loan officer notifications...');
                await this.sendOfficerNotifications();
            }
        );

        // Task 8.1.7: Branch manager notifications at 9:00 AM Bangkok time
        this.scheduleJob(
            'manager-notifications',
            '0 9 * * *', // 9:00 AM daily
            async () => {
                console.log('Sending branch manager notifications...');
                await this.sendManagerNotifications();
            }
        );

        // Task 8.1.8: Admin notifications at 10:00 AM Bangkok time
        this.scheduleJob(
            'admin-notifications',
            '0 10 * * *', // 10:00 AM daily
            async () => {
                console.log('Sending admin notifications...');
                await this.sendAdminNotifications();
            }
        );

        // NPL check at 11:00 AM daily
        this.scheduleJob(
            'npl-check',
            '0 11 * * *', // 11:00 AM daily
            async () => {
                console.log('Checking for new NPLs...');
                await this.checkNPLs();
            }
        );

        // Calendar event reminders - every 30 minutes
        this.scheduleJob(
            'calendar-reminders',
            '*/30 * * * *',
            async () => {
                await this.sendCalendarReminders();
            }
        );

        console.log('✅ Notification scheduler initialized');
    }

    /**
     * Schedule a cron job
     */
    private scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
        const cronTask = cron.schedule(
            schedule,
            async () => {
                try {
                    await task();
                } catch (error) {
                    console.error(`Error in scheduled job ${name}:`, error);
                }
            },
            {
                timezone: 'Asia/Bangkok',
            }
        );

        this.jobs.set(name, {
            name,
            schedule,
            task: cronTask,
        });

        console.log(`📅 Scheduled job: ${name} (${schedule})`);
    }

    /**
     * Task 8.1.4: Query payment schedules
     */
    private async queryPaymentSchedules(): Promise<void> {
        try {
            const today = new Date();
            const sevenDaysLater = new Date();
            sevenDaysLater.setDate(today.getDate() + 7);

            // Get upcoming payments (7, 3, 1 day reminders)
            const upcomingPayments = await prisma.paymentSchedule.findMany({
                where: {
                    status: 'UNPAID',
                    paymentDate: {
                        gte: today,
                        lte: sevenDaysLater,
                    },
                },
                include: {
                    loan: {
                        include: {
                            customer: {
                                select: {
                                    id: true,
                                    businessName: true,
                                },
                            },
                        },
                    },
                },
            });

            console.log(`Found ${upcomingPayments.length} upcoming payments`);
        } catch (error) {
            console.error('Error querying payment schedules:', error);
        }
    }

    /**
     * Task 8.1.5: Send customer notifications
     */
    private async sendCustomerNotifications(): Promise<void> {
        try {
            // Get all customers with active LINE accounts
            const customers = await prisma.user.findMany({
                where: {
                    role: 'CUSTOMER',
                    lineUserId: { not: null },
                    lineActive: true,
                    lineNotificationsEnabled: true, // Task 8.1.11: Check opt-out
                },
                select: {
                    id: true,
                    lineUserId: true,
                },
            });

            let sentCount = 0;
            let blockedCount = 0;

            for (const customer of customers) {
                if (!customer.lineUserId) continue;

                // Task 8.1.10: Group notifications
                const notifications = await this.getCustomerNotifications(customer.id);

                if (notifications.length > 0) {
                    // Task 8.1.9: Send with retry
                    const sent = await this.sendNotificationWithRetry(
                        customer.lineUserId,
                        notifications
                    );

                    if (sent) {
                        sentCount++;
                        // Task 8.1.12: Log delivery status
                        await this.logNotificationDelivery(customer.id, 'CUSTOMER', 'SUCCESS');
                    } else {
                        // Task 8.1.13: Handle blocked users
                        await this.handleBlockedUser(customer.lineUserId);
                        blockedCount++;
                    }
                }
            }

            console.log(`Customer notifications: ${sentCount} sent, ${blockedCount} blocked`);
        } catch (error) {
            console.error('Error sending customer notifications:', error);
        }
    }

    /**
     * Task 8.1.6: Send loan officer notifications
     */
    private async sendOfficerNotifications(): Promise<void> {
        try {
            const officers = await prisma.user.findMany({
                where: {
                    role: 'OFFICER',
                    lineUserId: { not: null },
                    lineActive: true,
                    lineNotificationsEnabled: true,
                },
                select: {
                    id: true,
                    lineUserId: true,
                },
            });

            let sentCount = 0;

            for (const officer of officers) {
                if (!officer.lineUserId) continue;

                const notifications = await this.getOfficerNotifications(officer.id);

                if (notifications.length > 0) {
                    const sent = await this.sendNotificationWithRetry(
                        officer.lineUserId,
                        notifications
                    );

                    if (sent) {
                        sentCount++;
                        await this.logNotificationDelivery(officer.id, 'OFFICER', 'SUCCESS');
                    }
                }
            }

            console.log(`Officer notifications: ${sentCount} sent`);
        } catch (error) {
            console.error('Error sending officer notifications:', error);
        }
    }

    /**
     * Task 8.1.7: Send branch manager notifications
     */
    private async sendManagerNotifications(): Promise<void> {
        try {
            const managers = await prisma.user.findMany({
                where: {
                    role: 'MANAGER',
                    lineUserId: { not: null },
                    lineActive: true,
                    lineNotificationsEnabled: true,
                },
                select: {
                    id: true,
                    lineUserId: true,
                    branchId: true,
                },
            });

            let sentCount = 0;

            for (const manager of managers) {
                if (!manager.lineUserId || !manager.branchId) continue;

                const notifications = await this.getManagerNotifications(manager.id, manager.branchId);

                if (notifications.length > 0) {
                    const sent = await this.sendNotificationWithRetry(
                        manager.lineUserId,
                        notifications
                    );

                    if (sent) {
                        sentCount++;
                        await this.logNotificationDelivery(manager.id, 'MANAGER', 'SUCCESS');
                    }
                }
            }

            console.log(`Manager notifications: ${sentCount} sent`);
        } catch (error) {
            console.error('Error sending manager notifications:', error);
        }
    }

    /**
     * Task 8.1.8: Send admin notifications
     */
    private async sendAdminNotifications(): Promise<void> {
        try {
            // Get all admins (with or without LINE - for in-app notification)
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN', status: 'ACTIVE' },
                select: { id: true, lineUserId: true, lineActive: true, lineNotificationsEnabled: true },
            });

            if (admins.length === 0) return;

            // Fetch stats once for all admins
            const stats = await this.dbQueryService.getAdminStats();

            const isHealthy = stats.systemHealth === 'healthy';
            const title = isHealthy ? '📊 สรุประบบประจำวัน' : '⚠️ แจ้งเตือนระบบ';
            const message =
                `สถานะ: ${isHealthy ? '✅ ปกติ' : '⚠️ ผิดปกติ'} | ` +
                `ผู้ใช้งาน: ${stats.activeUsers} ราย | ` +
                `NPL: ${stats.nplRatio.toFixed(2)}% | ` +
                `Error Rate: ${stats.errorRate.toFixed(2)}%`;

            let sentCount = 0;

            for (const admin of admins) {
                // 1. Create in-app notification (always, regardless of LINE)
                await this.notificationRepository.createWithDedup({
                    userId: admin.id,
                    type: 'SYSTEM_ALERT' as any,
                    title,
                    message,
                    link: '/dashboard/admin',
                    priority: isHealthy ? 'LOW' : 'HIGH' as any,
                    dedupKey: `admin-daily-${admin.id}-${new Date().toISOString().slice(0, 10)}`,
                    dedupWindow: 20, // 20 hours - prevent duplicate same day
                    metadata: {
                        systemHealth: stats.systemHealth,
                        activeUsers: stats.activeUsers,
                        nplRatio: stats.nplRatio,
                        errorRate: stats.errorRate,
                    },
                });

                // 2. Send LINE notification if connected
                if (admin.lineUserId && admin.lineActive && admin.lineNotificationsEnabled) {
                    const lineMessages = await this.getAdminNotifications(admin.id);
                    if (lineMessages.length > 0) {
                        const sent = await this.sendNotificationWithRetry(admin.lineUserId, lineMessages);
                        if (sent) {
                            sentCount++;
                            await this.logNotificationDelivery(admin.id, 'ADMIN', 'SUCCESS');
                        }
                    }
                }
            }

            console.log(`Admin notifications: ${admins.length} in-app created, ${sentCount} LINE sent`);
        } catch (error) {
            console.error('Error sending admin notifications:', error);
        }
    }

    /**
     * Check for new NPLs
     */
    private async checkNPLs(): Promise<void> {
        try {
            const branches = await prisma.branch.findMany({
                select: { id: true },
            });

            let totalAlerts = 0;

            for (const branch of branches) {
                const alerts = await this.nplService.checkAndAlertNewNPLs(branch.id);
                totalAlerts += alerts;
            }

            console.log(`NPL check complete: ${totalAlerts} alerts sent`);
        } catch (error) {
            console.error('Error checking NPLs:', error);
        }
    }

    /**
     * Task 8.1.10: Get customer notifications (grouped)
     */
    private async getCustomerNotifications(customerId: string): Promise<any[]> {
        const notifications: any[] = [];

        try {
            // Get customer's loans
            const loans = await prisma.loan.findMany({
                where: {
                    customerId,
                    status: 'ACTIVE',
                },
                include: {
                    paymentSchedule: {
                        where: {
                            status: 'UNPAID',
                        },
                        orderBy: {
                            paymentDate: 'asc',
                        },
                        take: 5,
                    },
                },
            });

            const today = new Date();
            
            for (const loan of loans) {
                for (const payment of loan.paymentSchedule) {
                    const dueDate = new Date(payment.paymentDate);
                    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if ([7, 3, 1].includes(daysUntil)) {
                        notifications.push({
                            type: 'text',
                            text: `📅 แจ้งเตือนชำระเงิน\n\nครบกำหนดใน ${daysUntil} วัน\nยอดชำระ: ฿${payment.totalPayment.toLocaleString()}\nวันที่: ${dueDate.toLocaleDateString('th-TH')}`,
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error getting customer notifications:', error);
        }

        return notifications;
    }

    /**
     * Get officer notifications (grouped)
     */
    private async getOfficerNotifications(officerId: string): Promise<any[]> {
        const notifications: any[] = [];

        try {
            // Get today's tasks
            const tasks = await this.taskService.getTasksForOfficer(officerId);

            if (tasks.length > 0) {
                const highPriority = tasks.filter(t => t.priority === 'high').length;
                
                notifications.push({
                    type: 'text',
                    text: `📋 งานวันนี้\n\nทั้งหมด: ${tasks.length} รายการ\nด่วน: ${highPriority} รายการ\n\nพิมพ์ "งานวันนี้" เพื่อดูรายละเอียด`,
                });
            }
        } catch (error) {
            console.error('Error getting officer notifications:', error);
        }

        return notifications;
    }

    /**
     * Get manager notifications (grouped)
     */
    private async getManagerNotifications(_managerId: string, branchId: string): Promise<any[]> {
        const notifications: any[] = [];

        try {
            // Get KPIs
            const kpis = await this.kpiService.getBranchKPIs(branchId);

            // Send summary
            let summary = `📊 สรุป KPI วันนี้\n\n`;
            summary += `สินเชื่อทั้งหมด: ${kpis.totalLoans} รายการ\n`;
            summary += `Collection Rate: ${kpis.collectionRate.toFixed(2)}%\n`;
            summary += `NPL Ratio: ${kpis.nplRatio.toFixed(2)}%\n`;

            // Add alerts
            if (kpis.alerts.length > 0) {
                summary += `\n⚠️ แจ้งเตือน:\n`;
                kpis.alerts.forEach((alert: { message: string }) => {
                    summary += `- ${alert.message}\n`;
                });
            }

            notifications.push({
                type: 'text',
                text: summary,
            });
        } catch (error) {
            console.error('Error getting manager notifications:', error);
        }

        return notifications;
    }

    /**
     * Get admin notifications (grouped)
     */
    private async getAdminNotifications(_adminId: string): Promise<any[]> {
        const notifications: any[] = [];

        try {
            const stats = await this.dbQueryService.getAdminStats();

            let summary = `📊 สรุประบบวันนี้\n\n`;
            summary += `สถานะ: ${stats.systemHealth === 'healthy' ? '✅ ปกติ' : '⚠️ ผิดปกติ'}\n`;
            summary += `ผู้ใช้งาน: ${stats.activeUsers} ราย\n`;
            summary += `NPL Ratio: ${stats.nplRatio.toFixed(2)}%\n`;
            summary += `Error Rate: ${stats.errorRate.toFixed(2)}%\n`;

            notifications.push({
                type: 'text',
                text: summary,
            });
        } catch (error) {
            console.error('Error getting admin notifications:', error);
        }

        return notifications;
    }

    /**
     * Task 8.1.9: Send notification with retry (exponential backoff)
     */
    private async sendNotificationWithRetry(
        lineUserId: string,
        messages: any[]
    ): Promise<boolean> {
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                await axios.post(
                    `${LINE_MESSAGING_API}/message/push`,
                    {
                        to: lineUserId,
                        messages,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                return true;
            } catch (error: any) {
                console.error(`Attempt ${attempt}/${this.MAX_RETRIES} failed:`, error.response?.data || error.message);

                // Check if user blocked the bot
                if (error.response?.status === 403) {
                    return false;
                }

                if (attempt < this.MAX_RETRIES) {
                    const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                    await this.sleep(delay);
                }
            }
        }

        return false;
    }

    /**
     * Task 8.1.12: Log notification delivery status
     */
    private async logNotificationDelivery(
        userId: string,
        userType: string,
        status: 'SUCCESS' | 'FAILED'
    ): Promise<void> {
        try {
            // Could store in a NotificationLog table
            console.log(`Notification ${status}: ${userType} ${userId}`);
        } catch (error) {
            console.error('Error logging notification delivery:', error);
        }
    }

    /**
     * Task 8.1.13: Handle blocked users (mark as inactive)
     */
    private async handleBlockedUser(lineUserId: string): Promise<void> {
        try {
            await prisma.user.updateMany({
                where: { lineUserId },
                data: {
                    lineActive: false,
                },
            });

            console.log(`User marked as inactive (blocked): ${lineUserId}`);
        } catch (error) {
            console.error('Error handling blocked user:', error);
        }
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Send calendar event reminders (runs every 30 min)
     * - ทันทีที่สร้าง: ส่ง notification ให้ assignedTo (ทำใน calendar service แล้ว)
     * - ก่อนถึงกำหนด 1 ชั่วโมง: ส่ง reminder อีกครั้ง
     * - ตรงกำหนด: ส่ง reminder สุดท้าย
     */
    private async sendCalendarReminders(): Promise<void> {
        try {
            const now = new Date();
            const in60min = new Date(now.getTime() + 60 * 60 * 1000);
            const in35min = new Date(now.getTime() + 35 * 60 * 1000);

            // Find task assignments for calendar events due in ~1 hour
            const upcomingTasks = await prisma.task_assignments.findMany({
                where: {
                    task_type: 'OTHER',
                    status: 'PENDING',
                    due_date: { gte: in35min, lte: in60min },
                },
            });

            // Find task assignments due right now (within last 5 min)
            const dueTasks = await prisma.task_assignments.findMany({
                where: {
                    task_type: 'OTHER',
                    status: 'PENDING',
                    due_date: {
                        gte: new Date(now.getTime() - 5 * 60 * 1000),
                        lte: now,
                    },
                },
            });

            for (const task of upcomingTasks) {
                // Get event title from calendar_events
                const event = await prisma.calendarEvent.findUnique({
                    where: { id: task.task_id },
                    select: { title: true },
                });
                const title = event?.title ?? 'งานที่ได้รับมอบหมาย';

                await this.notificationRepository.createWithDedup({
                    userId: task.assigned_to,
                    type: 'REMINDER' as any,
                    title: `⏰ แจ้งเตือน: ${title}`,
                    message: `งานของคุณจะถึงกำหนดใน 1 ชั่วโมง`,
                    link: `/calendar`,
                    priority: 'HIGH' as any,
                    dedupKey: `calendar-1h-${task.task_id}`,
                    dedupWindow: 2,
                    metadata: { taskId: task.task_id },
                });
                console.log(`[Calendar Reminder] 1h reminder → user ${task.assigned_to}`);
            }

            for (const task of dueTasks) {
                const event = await prisma.calendarEvent.findUnique({
                    where: { id: task.task_id },
                    select: { title: true },
                });
                const title = event?.title ?? 'งานที่ได้รับมอบหมาย';

                await this.notificationRepository.createWithDedup({
                    userId: task.assigned_to,
                    type: 'REMINDER' as any,
                    title: `🔔 ถึงกำหนดแล้ว: ${title}`,
                    message: `งานที่ได้รับมอบหมายถึงกำหนดแล้ว`,
                    link: `/calendar`,
                    priority: 'URGENT' as any,
                    dedupKey: `calendar-due-${task.task_id}`,
                    dedupWindow: 2,
                    metadata: { taskId: task.task_id },
                });
                console.log(`[Calendar Reminder] Due now reminder → user ${task.assigned_to}`);
            }
        } catch (error) {
            console.error('[Calendar Reminder] Error:', error);
        }
    }

    /**
     * Stop all scheduled jobs
     */
    stop(): void {
        console.log('Stopping notification scheduler...');

        for (const [name, job] of this.jobs.entries()) {
            if (job.task) {
                job.task.stop();
                console.log(`Stopped job: ${name}`);
            }
        }

        this.jobs.clear();
        console.log('✅ Notification scheduler stopped');
    }

    /**
     * Get job status
     */
    getStatus(): Array<{ name: string; schedule: string; running: boolean }> {
        const status: Array<{ name: string; schedule: string; running: boolean }> = [];

        for (const [name, job] of this.jobs.entries()) {
            status.push({
                name,
                schedule: job.schedule,
                running: job.task !== null,
            });
        }

        return status;
    }
}

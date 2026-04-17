import axios from 'axios';
import { env } from '@config/env.config';
import { DatabaseQueryService } from '@core-services/services/database-query.service';
import { TimezoneUtil } from '@utils/formatting/timezone.util';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

interface LoanOfficerNotification {
    todayTasks: number;
    overdueLess3Days: number;
    overdueMore3Days: number;
    uncontactedCustomers: number;
    collections: { collected: number; target: number };
}

interface BranchManagerNotification {
    totalLoans: number;
    outstandingBalance: number;
    nplRatio: number;
    pendingApprovals: number;
    collectionRate: number;
    highRiskLoans: number;
}

interface AdminNotification {
    systemHealth: string;
    activeUsers: number;
    failedJobs: number;
    securityAlerts: number;
    dataVolume: { loans: number; payments: number };
}

export class LineDailyNotificationService {
    private accessToken: string;
    private dbQueryService: DatabaseQueryService;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
        this.dbQueryService = new DatabaseQueryService();
    }

    async sendNotification(role: string, lineUserId: string, userId: string, _testMode?: boolean) {
        // TODO: Implement test mode functionality
        let flexMessage: any;
        let data: any;

        switch (role) {
            case 'officer':
                data = await this.getLoanOfficerData(userId);
                flexMessage = this.createLoanOfficerFlexMessage(data);
                break;
            case 'manager':
                data = await this.getBranchManagerData(userId);
                flexMessage = this.createBranchManagerFlexMessage(data);
                break;
            case 'admin':
                data = await this.getAdminData();
                flexMessage = this.createAdminFlexMessage(data);
                break;
            default:
                throw new Error('Invalid role. Use: officer, manager, or admin');
        }

        const success = await this.pushMessage(lineUserId, flexMessage);

        return {
            success,
            role,
            message: success ? 'Notification sent successfully' : 'Failed to send notification',
            data,
        };
    }

    private async pushMessage(userId: string, flexMessage: any): Promise<boolean> {
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                {
                    to: userId,
                    messages: [{ type: 'flex', altText: 'สรุปงานประจำวัน', contents: flexMessage }],
                },
                { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
            );
            return true;
        } catch (error) {
            console.error('LINE Push Error:', error);
            return false;
        }
    }

    // Real data methods using DatabaseQueryService
    private async getLoanOfficerData(userId: string): Promise<LoanOfficerNotification> {
        try {
            const stats = await this.dbQueryService.getLoanOfficerStats(userId);
            return {
                todayTasks: stats.todayTasks,
                overdueLess3Days: stats.overdueLess3Days,
                overdueMore3Days: stats.overdueMore3Days,
                uncontactedCustomers: stats.uncontactedCustomers,
                collections: {
                    collected: stats.monthlyCollected,
                    target: stats.monthlyTarget,
                },
            };
        } catch (error) {
            console.error('Error getting loan officer data:', error);
            // Return default values on error
            return {
                todayTasks: 0,
                overdueLess3Days: 0,
                overdueMore3Days: 0,
                uncontactedCustomers: 0,
                collections: { collected: 0, target: 0 },
            };
        }
    }

    private async getBranchManagerData(userId: string): Promise<BranchManagerNotification> {
        try {
            // Get user's branch ID from database
            const { prisma } = await import('@config/database.config');
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { branchId: true },
            });

            if (!user || !user.branchId) {
                throw new Error('Branch ID not found for user');
            }

            const stats = await this.dbQueryService.getBranchManagerStats(user.branchId);
            
            // Get high-risk loans (60-89 days overdue)
            const allLoans = await prisma.loan.findMany({
                where: {
                    branchId: user.branchId,
                    status: 'ACTIVE',
                    overdueDays: {
                        gte: 60,
                        lt: 90,
                    },
                },
            });

            return {
                totalLoans: stats.totalLoans,
                outstandingBalance: stats.outstandingBalance,
                nplRatio: stats.nplRatio,
                pendingApprovals: stats.pendingApprovals,
                collectionRate: stats.collectionRate,
                highRiskLoans: allLoans.length,
            };
        } catch (error) {
            console.error('Error getting branch manager data:', error);
            // Return default values on error
            return {
                totalLoans: 0,
                outstandingBalance: 0,
                nplRatio: 0,
                pendingApprovals: 0,
                collectionRate: 0,
                highRiskLoans: 0,
            };
        }
    }

    private async getAdminData(): Promise<AdminNotification> {
        try {
            const stats = await this.dbQueryService.getAdminStats();
            
            // Get failed jobs count (placeholder - would need actual job tracking)
            const failedJobs = 0;
            
            // Get security alerts (placeholder - would need actual security log)
            const securityAlerts = 0;

            return {
                systemHealth: stats.systemHealth,
                activeUsers: stats.activeUsers,
                failedJobs,
                securityAlerts,
                dataVolume: {
                    loans: stats.totalLoans,
                    payments: 0, // Would need to query payment count
                },
            };
        } catch (error) {
            console.error('Error getting admin data:', error);
            // Return default values on error
            return {
                systemHealth: 'unknown',
                activeUsers: 0,
                failedJobs: 0,
                securityAlerts: 0,
                dataVolume: { loans: 0, payments: 0 },
            };
        }
    }

    // Flex message creators (abbreviated - full version in Supabase function)
    private createLoanOfficerFlexMessage(data: LoanOfficerNotification): any {
        return {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📋 สรุปงานวันนี้', weight: 'bold', size: 'xl', color: '#1DB954' },
                    { type: 'text', text: TimezoneUtil.format(new Date(), 'dd/MM/yyyy'), size: 'sm', color: '#666666' },
                ],
                backgroundColor: '#F5F5F5',
                paddingAll: '15px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: '📌 งานต้องทำวันนี้', size: 'sm', color: '#555555', flex: 3 },
                            { type: 'text', text: `${data.todayTasks} รายการ`, size: 'sm', color: '#111111', align: 'end', flex: 2 },
                        ],
                        margin: 'md',
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: '🔴 ค้างชำระเกิน 3 วัน', size: 'sm', color: '#555555', flex: 3 },
                            { type: 'text', text: `${data.overdueMore3Days} ราย`, size: 'sm', color: '#FF0000', weight: 'bold', align: 'end', flex: 2 },
                        ],
                        margin: 'md',
                    },
                ],
                paddingAll: '15px',
            },
        };
    }

    private createBranchManagerFlexMessage(data: BranchManagerNotification): any {
        const nplColor = data.nplRatio > 5 ? '#FF0000' : data.nplRatio > 3 ? '#FFA500' : '#1DB954';
        return {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📊 สรุปภาพรวมสาขา', weight: 'bold', size: 'xl', color: '#2196F3' },
                ],
                backgroundColor: '#E3F2FD',
                paddingAll: '15px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: '⚠️ NPL Ratio', size: 'sm', color: '#555555', flex: 3 },
                            { type: 'text', text: `${data.nplRatio.toFixed(2)}%`, size: 'md', color: nplColor, weight: 'bold', align: 'end', flex: 2 },
                        ],
                        margin: 'lg',
                    },
                ],
                paddingAll: '15px',
            },
        };
    }

    private createAdminFlexMessage(data: AdminNotification): any {
        const healthColor = data.systemHealth === 'healthy' ? '#1DB954' : '#FF0000';
        return {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '🖥️ สถานะระบบ HQ', weight: 'bold', size: 'xl', color: '#9C27B0' },
                ],
                backgroundColor: '#F3E5F5',
                paddingAll: '15px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: '🟢 สถานะระบบ', size: 'sm', color: '#555555', flex: 3 },
                            { type: 'text', text: data.systemHealth.toUpperCase(), size: 'sm', color: healthColor, weight: 'bold', align: 'end', flex: 2 },
                        ],
                        margin: 'md',
                    },
                ],
                paddingAll: '15px',
            },
        };
    }
}

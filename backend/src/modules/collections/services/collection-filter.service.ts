/**
 * Collection Filter Service
 * 
 * Purpose: Filter and manage customers by payment due status
 * - Filter customers near due date (3-7 days before)
 * - Filter customers near overdue (1-3 days after due)
 * - Dashboard for collection management
 * 
 * Requirements:
 * - ระบบ Filter และแจ้งเตือน แบ่งเป็น 2 กลุ่มหลัก
 * - กลุ่มใกล้ถึง Due Date
 * - กลุ่มใกล้ Overdue
 */

import { CollectionRepository } from '../repositories/collection.repository';
import { logger } from '@utils/common/logger.util';
import { EncryptionUtil } from '@core/utils/security/encryption.util';
import { AuthorizedUser, AuthorizationService } from '../../../shared/services/authorization.service';
import { computeCreditAssessment, type CreditGrade } from '../utils/credit-assessment.util';

export interface CustomerDueStatus {
    customerId: string;
    customerName: string;
    customerPhone: string;
    loanId: string;
    scheduleId: string;
    paymentNumber: number;
    dueDate: Date;
    daysUntilDue: number; // Negative if overdue
    amountDue: number;
    status: 'UPCOMING' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'CRITICAL_OVERDUE';
    lastContactDate?: Date;
    lastContactStatus?: string;
    // Risk-related fields
    dscr?: number;
    dscrStatus?: string;
    nplStatus?: boolean;
    creditUtilization?: number;
    industryCode?: string;
    businessAge?: number;
    // Credit assessment (computed)
    creditGrade?: CreditGrade;
    creditScore?: number; // 0-100 (higher = healthier / lower risk)
    creditReasons?: string[];
    creditNextActions?: string[];
}

export interface CollectionDashboard {
    summary: {
        totalUpcoming: number;
        totalDueSoon: number;
        totalDueToday: number;
        totalOverdue: number;
        totalCriticalOverdue: number;
        totalAmountDue: number;
        totalAmountOverdue: number;
    };
    upcomingPayments: CustomerDueStatus[]; // 7+ days
    dueSoon: CustomerDueStatus[]; // 1-7 days
    dueToday: CustomerDueStatus[]; // Today
    overdue: CustomerDueStatus[]; // 1-30 days overdue
    criticalOverdue: CustomerDueStatus[]; // 30+ days overdue
}

export class CollectionFilterService {
    private collectionRepository: CollectionRepository;

    constructor() {
        this.collectionRepository = new CollectionRepository();
    }

    /**
     * Get start of day for a date
     */
    private getStartOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    /**
     * Get end of day for a date
     */
    private getEndOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }

    /**
     * Add days to a date
     */
    private addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Subtract days from a date
     */
    private subDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() - days);
        return result;
    }

    /**
     * Safely decrypt phone number with error handling
     */
    private safeDecrypt(encryptedPhone: string): string {
        try {
            if (!encryptedPhone) return '';
            
            // Check if it's already a plain phone number (not encrypted)
            if (encryptedPhone.match(/^[0-9\-\+\(\)\s]+$/)) {
                return encryptedPhone; // Return as-is if it looks like a plain phone number
            }
            
            return EncryptionUtil.decrypt(encryptedPhone);
        } catch (error) {
            // Silently return the original value if decryption fails
            // Don't log warning to avoid spam in logs
            return encryptedPhone || '';
        }
    }

    /**
     * Get collection dashboard with all filters
     * Optimized query to avoid N+1 queries
     */
    async getCollectionDashboard(user: AuthorizedUser): Promise<CollectionDashboard> {
        try {
            const today = this.getStartOfDay(new Date());

            // Get authorization filter
            const authFilter = AuthorizationService.getUserFilter(user);
            
            // Debug: Log auth filter
            console.log('[Collection Dashboard] Auth Filter:', JSON.stringify(authFilter));
            
            // Build WHERE clause based on user permissions
            let whereConditions: string[] = ["ps.status IN ('UNPAID', 'OVERDUE', 'PARTIAL')"];
            let queryParams: any[] = [];
            
            if (authFilter.createdBy?.in) {
                // Officer level - only their own customers
                queryParams.push(authFilter.createdBy.in);
                whereConditions.push('l.officer_id = ANY($' + queryParams.length + ')');
                console.log('[Collection Dashboard] Officer filter - officer_ids:', authFilter.createdBy.in);
            } else if (authFilter.branchId?.in) {
                // Manager level - their branch only
                queryParams.push(authFilter.branchId.in);
                whereConditions.push('l.branch_id = ANY($' + queryParams.length + ')');
                console.log('[Collection Dashboard] Manager filter - branch_ids:', authFilter.branchId.in);
            } else {
                console.log('[Collection Dashboard] Admin filter - no restrictions');
            }
            // Admin level - no additional filter needed

            const whereClause = whereConditions.join(' AND ');

            // Optimized query using raw SQL to avoid N+1 queries
            // Include risk-related data: DSCR, NCB status, industry code
            // NOTE: Include ALL unpaid schedules regardless of date for proper categorization
            const query = `
	                SELECT 
	                    ps.id as schedule_id,
	                    ps.payment_date,
	                    ps.payment_number,
	                    ps.total_payment,
	                    ps.principal_amount,
	                    ps.interest_amount,
	                    ps.status,
	                    l.id as loan_id,
	                    l.status as loan_status,
	                    l.overdue_days,
	                    l.dscr,
	                    l.dscr_status,
	                    c.id as customer_id,
	                    c.business_name as customer_name,
                    c.phone as customer_phone,
                    c.industry_code,
                    c.business_age_years
                FROM payment_schedules ps
                JOIN loans l ON ps.loan_id = l.id
                JOIN customers c ON l.customer_id = c.id
                WHERE ${whereClause}
                ORDER BY ps.payment_date ASC
            `;

            console.log('[Collection Dashboard] Executing query:', query);
            console.log('[Collection Dashboard] Query params:', queryParams);

	            const schedules = await this.collectionRepository.findSchedulesRaw([query, ...queryParams]);

            console.log('[Collection Dashboard] Query returned schedules:', schedules.length);

            // Get last contact logs for customers
            const customerIds = [...new Set(schedules.map((s) => s.customer_id))];
            const lastContacts = await this.getLastContactDates(customerIds);
            
            // Get NCB data for risk scoring
            const ncbData = await this.getNCBData(customerIds);

            // Categorize schedules
            const upcomingPayments: CustomerDueStatus[] = [];
            const dueSoon: CustomerDueStatus[] = [];
            const dueToday: CustomerDueStatus[] = [];
            const overdue: CustomerDueStatus[] = [];
            const criticalOverdue: CustomerDueStatus[] = [];

            let totalAmountDue = 0;
            let totalAmountOverdue = 0;

            for (const schedule of schedules) {
                const dueDate = this.getStartOfDay(schedule.payment_date);
                const daysUntilDue = Math.floor(
                    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );

                const amountDue = Number(schedule.total_payment);
                const lastContact = lastContacts.get(schedule.customer_id);
                const ncb = ncbData.get(schedule.customer_id);

                const customerStatus: CustomerDueStatus = {
                    customerId: schedule.customer_id,
                    customerName: schedule.customer_name,
                    customerPhone: schedule.customer_phone ? this.safeDecrypt(schedule.customer_phone) : '',
                    loanId: schedule.loan_id,
                    scheduleId: schedule.schedule_id,
                    paymentNumber: schedule.payment_number,
                    dueDate: schedule.payment_date,
                    daysUntilDue,
                    amountDue,
                    status: this.getPaymentStatus(daysUntilDue),
                    lastContactDate: lastContact?.contactDate,
                    lastContactStatus: lastContact?.contactStatus,
                    // Risk-related fields
                    dscr: schedule.dscr ? Number(schedule.dscr) : undefined,
                    dscrStatus: schedule.dscr_status || undefined,
                    nplStatus: ncb?.nplStatus,
                    creditUtilization: ncb?.creditUtilization,
                    industryCode: schedule.industry_code || undefined,
                    businessAge: schedule.business_age_years || undefined,
                };

	                const credit = computeCreditAssessment({
	                    daysUntilDue,
	                    loanOverdueDays: schedule.overdue_days ?? undefined,
	                    scheduleStatus: schedule.status,
	                    loanStatus: schedule.loan_status,
	                    dscr: customerStatus.dscr,
	                    nplStatus: customerStatus.nplStatus,
	                    creditUtilization: customerStatus.creditUtilization,
	                    industryCode: customerStatus.industryCode,
	                    businessAge: customerStatus.businessAge,
                });
                customerStatus.creditGrade = credit.grade;
                customerStatus.creditScore = credit.score;
                customerStatus.creditReasons = credit.reasons;
                customerStatus.creditNextActions = credit.nextActions;

                // Categorize
                if (daysUntilDue >= 7) {
                    upcomingPayments.push(customerStatus);
                    totalAmountDue += amountDue;
                } else if (daysUntilDue >= 1 && daysUntilDue <= 6) {
                    dueSoon.push(customerStatus);
                    totalAmountDue += amountDue;
                } else if (daysUntilDue === 0) {
                    dueToday.push(customerStatus);
                    totalAmountDue += amountDue;
                } else if (daysUntilDue >= -30 && daysUntilDue < 0) {
                    overdue.push(customerStatus);
                    totalAmountOverdue += amountDue;
                } else if (daysUntilDue < -30) {
                    criticalOverdue.push(customerStatus);
                    totalAmountOverdue += amountDue;
                }
            }

            return {
                summary: {
                    totalUpcoming: upcomingPayments.length,
                    totalDueSoon: dueSoon.length,
                    totalDueToday: dueToday.length,
                    totalOverdue: overdue.length,
                    totalCriticalOverdue: criticalOverdue.length,
                    totalAmountDue,
                    totalAmountOverdue,
                },
                upcomingPayments,
                dueSoon,
                dueToday,
                overdue,
                criticalOverdue,
            };
        } catch (error) {
            const err = error as Error;
            logger.error({ 
                error: {
                    message: err?.message || 'Unknown error',
                    stack: err?.stack || 'No stack trace',
                    name: err?.name || 'Unknown error type',
                },
                user 
            }, 'Error getting collection dashboard');
            console.error('Collection Dashboard Error Details:', {
                errorMessage: err?.message,
                errorStack: err?.stack,
                errorName: err?.name,
                user: user?.userId
            });
            throw error;
        }
    }

    /**
     * Get customers near due date (3-7 days before)
     */
    async getCustomersNearDue(user: AuthorizedUser, daysAhead: number = 7): Promise<CustomerDueStatus[]> {
        const today = this.getStartOfDay(new Date());
        const futureDate = this.getEndOfDay(this.addDays(today, daysAhead));

        // Get authorization filter
        const authFilter = AuthorizationService.getBranchFilter(user);

        const schedules = await this.collectionRepository.findUnpaidSchedules({
            status: { in: ['UNPAID'] },
            paymentDate: { gte: today, lte: futureDate },
            loan: authFilter,
        });

        const customerIds = [...new Set(schedules.map((s) => s.loan.customerId))];
        const lastContacts = await this.getLastContactDates(customerIds);

        return schedules.map((schedule) => {
            const dueDate = this.getStartOfDay(schedule.paymentDate);
            const daysUntilDue = Math.floor(
                (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const lastContact = lastContacts.get(schedule.loan.customerId);

            const base: CustomerDueStatus = {
                customerId: schedule.loan.customerId,
                customerName: schedule.loan.customer.businessName,
                customerPhone: this.safeDecrypt(schedule.loan.customer.phone),
                loanId: schedule.loanId,
                scheduleId: schedule.id,
                paymentNumber: schedule.paymentNumber,
                dueDate: schedule.paymentDate,
                daysUntilDue,
                amountDue: Number(schedule.totalPayment),
                status: this.getPaymentStatus(daysUntilDue),
                lastContactDate: lastContact?.contactDate,
                lastContactStatus: lastContact?.contactStatus,
            };
            const credit = computeCreditAssessment({
                daysUntilDue,
            });
            base.creditGrade = credit.grade;
            base.creditScore = credit.score;
            base.creditReasons = credit.reasons;
            base.creditNextActions = credit.nextActions;
            return base;
        });
    }

    /**
     * Get customers near overdue (1-3 days after due)
     */
    async getCustomersNearOverdue(user: AuthorizedUser, daysBack: number = 3): Promise<CustomerDueStatus[]> {
        const today = this.getStartOfDay(new Date());
        const pastDate = this.getStartOfDay(this.subDays(today, daysBack));

        // Get authorization filter
        const authFilter = AuthorizationService.getBranchFilter(user);

        const schedules = await this.collectionRepository.findUnpaidSchedules({
            status: { in: ['UNPAID', 'OVERDUE'] },
            paymentDate: { gte: pastDate, lt: today },
            loan: authFilter,
        });

        const customerIds = [...new Set(schedules.map((s) => s.loan.customerId))];
        const lastContacts = await this.getLastContactDates(customerIds);

        return schedules.map((schedule) => {
            const dueDate = this.getStartOfDay(schedule.paymentDate);
            const daysUntilDue = Math.floor(
                (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const lastContact = lastContacts.get(schedule.loan.customerId);

            const base: CustomerDueStatus = {
                customerId: schedule.loan.customerId,
                customerName: schedule.loan.customer.businessName,
                customerPhone: this.safeDecrypt(schedule.loan.customer.phone),
                loanId: schedule.loanId,
                scheduleId: schedule.id,
                paymentNumber: schedule.paymentNumber,
                dueDate: schedule.paymentDate,
                daysUntilDue,
                amountDue: Number(schedule.totalPayment),
                status: this.getPaymentStatus(daysUntilDue),
                lastContactDate: lastContact?.contactDate,
                lastContactStatus: lastContact?.contactStatus,
            };
            const credit = computeCreditAssessment({
                daysUntilDue,
            });
            base.creditGrade = credit.grade;
            base.creditScore = credit.score;
            base.creditReasons = credit.reasons;
            base.creditNextActions = credit.nextActions;
            return base;
        });
    }

    /**
     * Get overdue customers
     */
    async getOverdueCustomers(user: AuthorizedUser): Promise<CustomerDueStatus[]> {
        const today = this.getStartOfDay(new Date());

        // Get authorization filter
        const authFilter = AuthorizationService.getBranchFilter(user);

        const schedules = await this.collectionRepository.findUnpaidSchedules({
            status: { in: ['OVERDUE', 'PARTIAL'] },
            paymentDate: { lt: today },
            loan: authFilter,
        });

        const customerIds = [...new Set(schedules.map((s) => s.loan.customerId))];
        const lastContacts = await this.getLastContactDates(customerIds);

        return schedules.map((schedule) => {
            const dueDate = this.getStartOfDay(schedule.paymentDate);
            const daysUntilDue = Math.floor(
                (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const lastContact = lastContacts.get(schedule.loan.customerId);

            return {
                customerId: schedule.loan.customerId,
                customerName: schedule.loan.customer.businessName,
                customerPhone: this.safeDecrypt(schedule.loan.customer.phone),
                loanId: schedule.loanId,
                scheduleId: schedule.id,
                paymentNumber: schedule.paymentNumber,
                dueDate: schedule.paymentDate,
                daysUntilDue,
                amountDue: Number(schedule.totalPayment),
                status: this.getPaymentStatus(daysUntilDue),
                lastContactDate: lastContact?.contactDate,
                lastContactStatus: lastContact?.contactStatus,
            };
        });
    }

    /**
     * Get payment status based on days until due
     */
    private getPaymentStatus(daysUntilDue: number): CustomerDueStatus['status'] {
        if (daysUntilDue >= 7) return 'UPCOMING';
        if (daysUntilDue >= 1) return 'DUE_SOON';
        if (daysUntilDue === 0) return 'DUE_TODAY';
        if (daysUntilDue >= -30) return 'OVERDUE';
        return 'CRITICAL_OVERDUE';
    }

    private async getLastContactDates(customerIds: string[]): Promise<Map<string, { contactDate: Date; contactStatus: string }>> {
        try {
            return this.collectionRepository.getLastContactsByCustomers(customerIds);
        } catch (error) {
            console.warn('Failed to get last contact dates:', error);
            return new Map();
        }
    }

    private async getNCBData(customerIds: string[]): Promise<Map<string, { nplStatus: boolean; creditUtilization?: number }>> {
        try {
            return this.collectionRepository.getNCBDataByCustomers(customerIds);
        } catch (error) {
            console.warn('Failed to get NCB data:', error);
            return new Map();
        }
    }

    /**
     * Get collection statistics
     */
    async getCollectionStats(user: AuthorizedUser): Promise<{
        totalCustomers: number;
        customersWithOverdue: number;
        overdueRate: number;
        totalOverdueAmount: number;
        averageOverdueDays: number;
    }> {
        // Get authorization filter
        const authFilter = AuthorizationService.getBranchFilter(user);

        const totalCustomers = await this.collectionRepository.countActiveLoans({
            status: { in: ['ACTIVE', 'DISBURSED'] },
            ...authFilter,
        });

        const overdueSchedules = await this.collectionRepository.findUnpaidSchedules({
            status: { in: ['OVERDUE', 'PARTIAL'] },
            loan: { status: { in: ['ACTIVE', 'DISBURSED'] }, ...authFilter },
        });

        const customersWithOverdue = new Set(overdueSchedules.map((s) => s.loanId)).size;
        const overdueRate = totalCustomers > 0 ? (customersWithOverdue / totalCustomers) * 100 : 0;
        const totalOverdueAmount = overdueSchedules.reduce(
            (sum, s) => sum + Number(s.totalPayment),
            0
        );
        const averageOverdueDays =
            overdueSchedules.length > 0
                ? overdueSchedules.reduce((sum, s) => sum + (s.daysOverdue || 0), 0) /
                  overdueSchedules.length
                : 0;

        return {
            totalCustomers,
            customersWithOverdue,
            overdueRate,
            totalOverdueAmount,
            averageOverdueDays,
        };
    }
}

export const collectionFilter = new CollectionFilterService();

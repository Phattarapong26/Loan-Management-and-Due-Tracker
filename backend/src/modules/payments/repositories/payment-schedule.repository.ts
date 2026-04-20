import { PrismaClient, PaymentSchedule } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Payment Schedule Repository - Database access ONLY
 */
export class PaymentScheduleRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Create payment schedules in bulk
     */
    async createMany(schedules: Array<{
        loanId: string;
        paymentNumber: number;
        paymentDate: Date;
        principalAmount: number;
        interestAmount: number;
        totalPayment: number;
        remainingBalance: number;
    }>): Promise<number> {
        const result = await this.db.paymentSchedule.createMany({
            data: schedules,
        });
        return result.count;
    }

    /**
     * Find payment schedule by ID
     */
    async findById(id: string): Promise<PaymentSchedule | null> {
        return this.db.paymentSchedule.findUnique({
            where: { id },
            include: {
                loan: {
                    select: {
                        id: true,
                        customerId: true,
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
    }

    /**
     * Get payment schedule for loan - RAW DATA ONLY
     * NO BUSINESS LOGIC - just return data from database with payments
     */
    async findByLoanId(loanId: string): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: { loanId },
            orderBy: { paymentNumber: 'asc' },
            include: {
                payments: {
                    orderBy: { paymentDate: 'asc' }
                }
            }
        });
    }

    /**
     * Get next payment
     */
    async getNextPayment(loanId: string): Promise<PaymentSchedule | null> {
        return this.db.paymentSchedule.findFirst({
            where: {
                loanId,
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }, // ✅ รวม OVERDUE และ PARTIAL ด้วย
            },
            orderBy: {
                paymentDate: 'asc',
            },
        });
    }

    /**
     * Get overdue schedules by customer
     * Only includes schedules from ACTIVE or DISBURSED loans
     */
    async getOverdueByCustomer(
        customerId: string,
        branchId: string
    ): Promise<PaymentSchedule[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                paymentDate: {
                    lt: new Date(),
                },
                loan: {
                    customerId,
                    branchId,
                    status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] }, // ✅ Include delinquent loans for tracking
                },
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        status: true,
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                paymentDate: 'asc',
            },
        });
    }

    /**
     * Get upcoming schedules by customer (next 30 days)
     * Only includes schedules from ACTIVE or DISBURSED loans
     */
    async getUpcomingByCustomer(
        customerId: string,
        branchId: string
    ): Promise<PaymentSchedule[]> {
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);

        return this.db.paymentSchedule.findMany({
            where: {
                status: { in: ['UNPAID', 'PARTIAL'] },
                paymentDate: {
                    gte: today,
                    lte: thirtyDaysLater,
                },
                loan: {
                    customerId,
                    branchId,
                    status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] }, // ✅ Include delinquent loans for tracking
                },
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        status: true,
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                paymentDate: 'asc',
            },
        });
    }

    /**
     * Get all unpaid schedules by customer
     */
    async getUnpaidByCustomer(
        customerId: string,
        branchId: string
    ): Promise<PaymentSchedule[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                loan: {
                    customerId,
                    branchId,
                    status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] },
                },
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        principal: true,
                        outstandingBalance: true,
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                            },
                        },
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        paymentDate: true,
                    },
                },
            },
            orderBy: [
                {
                    loan: {
                        id: 'asc',
                    },
                },
                {
                    paymentNumber: 'asc',
                },
            ],
        });
    }

    /**
     * Update payment schedule status
     */
    async updateStatus(
        id: string,
        status: 'UNPAID' | 'PAID' | 'PARTIAL' | 'OVERDUE',
        paidAt?: Date
    ): Promise<PaymentSchedule> {
        return this.db.paymentSchedule.update({
            where: { id },
            data: {
                status,
                ...(paidAt && { paidAt }),
            },
        });
    }

    /**
     * Get overdue payments
     */
    async getOverduePayments(beforeDate: Date): Promise<Array<PaymentSchedule & { loan: { id: string; branchId: string; customerId: string; status: string } }>> {
        return this.db.paymentSchedule.findMany({
            where: {
                status: { in: ['UNPAID', 'PARTIAL'] },
                paymentDate: {
                    lt: beforeDate,
                },
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        branchId: true,
                        customerId: true,
                        status: true,
                    },
                },
            },
        }) as any;
    }

    /**
     * List payment schedules with filters
     */
    async list(params: {
        status?: 'UNPAID' | 'PAID' | 'PARTIAL' | 'OVERDUE';
        page: number;
        limit: number;
    }): Promise<{ schedules: Array<PaymentSchedule & { payments?: Array<{ amount: number }> }>; total: number }> {
        const where: any = {};
        if (params.status) {
            where.status = params.status;
        }

        const [rawSchedules, total] = await Promise.all([
            this.db.paymentSchedule.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                include: {
                    payments: {
                        select: {
                            amount: true,
                        },
                    },
                },
                orderBy: { paymentDate: 'desc' },
            }),
            this.db.paymentSchedule.count({ where }),
        ]);

        // Convert Decimal to number for payments
        const schedules = rawSchedules.map(schedule => ({
            ...schedule,
            payments: schedule.payments?.map(payment => ({
                amount: Number(payment.amount)
            }))
        }));

        return { schedules, total };
    }

    /**
     * Get overdue schedules by branch
     * Only includes schedules from ACTIVE or DISBURSED loans
     */
    async getOverdueByBranch(branchId: string): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                paymentDate: {
                    lt: new Date(),
                },
                loan: {
                    status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] }, // ✅ Include delinquent loans for tracking
                    customer: {
                        branchId,
                    },
                },
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        customerId: true,
                        status: true,
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                                phone: true,
                            },
                        },
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        paymentDate: true,
                    },
                },
            },
            orderBy: {
                paymentDate: 'asc',
            },
        });
    }

    /**
     * Get upcoming schedules by branch
     * Only includes schedules from ACTIVE or DISBURSED loans
     */
    async getUpcomingByBranch(branchId: string, days: number = 30): Promise<any[]> {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        return this.db.paymentSchedule.findMany({
            where: {
                status: { in: ['UNPAID', 'PARTIAL'] },
                paymentDate: {
                    gte: today,
                    lte: futureDate,
                },
                loan: {
                    status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] }, // ✅ Include delinquent loans for tracking
                    customer: {
                        branchId,
                    },
                },
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        customerId: true,
                        status: true,
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                                phone: true,
                            },
                        },
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        paymentDate: true,
                    },
                },
            },
            orderBy: {
                paymentDate: 'asc',
            },
        });
    }

    /**
     * Find loan data needed for dynamic schedule calculation
     */
    async findLoanForSchedule(loanId: string): Promise<{
        principal: any;
        outstandingBalance: any;
        interestRate: any;
        termMonths: number;
        firstPaymentDate: Date | null;
        paymentDay: number | null;
        monthlyPayment: any;
    } | null> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            select: {
                principal: true,
                outstandingBalance: true,
                interestRate: true,
                termMonths: true,
                firstPaymentDate: true,
                paymentDay: true,
                monthlyPayment: true,
            },
        });
    }

    /**
     * Find all payments for a loan (for schedule calculation)
     */
    async findPaymentsByLoanId(loanId: string): Promise<Array<{
        id: string;
        amount: any;
        paymentDate: Date;
        paymentScheduleId: string | null;
    }>> {
        return this.db.payment.findMany({
            where: { loanId },
            orderBy: { paymentDate: 'asc' },
            select: {
                id: true,
                amount: true,
                paymentDate: true,
                paymentScheduleId: true,
            },
        });
    }

    /**
     * Get statistics
     */
    async getStats(params: {
        branchId?: string;
    }): Promise<{ totalPending: number; totalOverdue: number; overdueCount: number }> {
        const today = new Date();
        const branchFilter = params.branchId ? {
            loan: {
                customer: {
                    branchId: params.branchId,
                },
            },
        } : {};

        const [pendingAgg, overdueAgg, pastDueAgg] = await Promise.all([
            // Total Pending (Future/Today UNPAID/PARTIAL)
            this.db.paymentSchedule.aggregate({
                where: {
                    status: { in: ['UNPAID', 'PARTIAL'] },
                    paymentDate: { gte: today },
                    ...branchFilter,
                },
                _sum: {
                    totalPayment: true, // Use totalPayment for pending as per original logic
                },
            }),

            // Overdue schedules (Explicit OVERDUE status)
            this.db.paymentSchedule.aggregate({
                where: {
                    status: 'OVERDUE',
                    ...branchFilter,
                },
                _sum: {
                    remainingBalance: true,
                },
                _count: {
                    id: true,
                },
            }),

            // Past due UNPAID/PARTIAL (Implicitly overdue)
            this.db.paymentSchedule.aggregate({
                where: {
                    status: { in: ['UNPAID', 'PARTIAL'] },
                    paymentDate: { lt: today },
                    ...branchFilter,
                },
                _sum: {
                    remainingBalance: true,
                },
                _count: {
                    id: true,
                },
            }),
        ]);

        return {
            totalPending: Number(pendingAgg._sum.totalPayment || 0),
            totalOverdue: Number(overdueAgg._sum.remainingBalance || 0) + Number(pastDueAgg._sum.remainingBalance || 0),
            overdueCount: (overdueAgg._count.id || 0) + (pastDueAgg._count.id || 0),
        };
    }

    /**
     * Find unpaid schedules due within a specific date window (for payment reminders)
     */
    async findUpcomingInWindow(from: Date, to: Date): Promise<Array<any>> {
        return this.db.paymentSchedule.findMany({
            where: {
                status: 'UNPAID',
                paymentDate: { gte: from, lt: to },
                loan: { status: { in: ['ACTIVE', 'DISBURSED'] } },
            },
            include: {
                loan: {
                    include: {
                        customer: { select: { id: true, businessName: true } },
                    },
                },
            },
        });
    }

    /**
     * Find overdue unpaid schedules (for overdue alerts)
     */
    async findOverdueUnpaid(beforeDate: Date): Promise<Array<any>> {
        return this.db.paymentSchedule.findMany({
            where: {
                status: 'UNPAID',
                paymentDate: { lt: beforeDate },
                loan: { status: { in: ['ACTIVE', 'DISBURSED'] } },
            },
            include: {
                loan: {
                    include: {
                        customer: { select: { id: true, businessName: true } },
                    },
                },
            },
        });
    }

    /**
     * Find unpaid/partial/overdue schedules for given loan IDs (for bucket analysis)
     */
    async findUnpaidByLoanIds(loanIds: string[]): Promise<Array<{
        id: string;
        paymentDate: Date;
        totalPayment: any;
        loanId: string;
    }>> {
        return this.db.paymentSchedule.findMany({
            where: {
                loanId: { in: loanIds },
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
            },
            select: {
                id: true,
                paymentDate: true,
                totalPayment: true,
                loanId: true,
            },
        });
    }

    /**
     * Find upcoming unpaid schedules for LINE notification reminders
     * Filters by loan status and LINE notification settings
     */
    async findUpcomingForNotification(targetDateStart: Date, targetDateEnd: Date): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                paymentDate: {
                    gte: targetDateStart,
                    lte: targetDateEnd,
                },
                status: 'UNPAID',
                loan: {
                    status: { in: ['ACTIVE', 'NPL'] },
                    customer: {
                        lineUserId: { not: null },
                        user: {
                            lineActive: true,
                            lineNotificationsEnabled: true,
                        },
                    },
                },
            },
            include: {
                loan: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                                lineUserId: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Find overdue unpaid schedules for LINE notification reminders
     * Filters by loan status and LINE notification settings
     */
    async findOverdueForNotification(beforeDate: Date): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                paymentDate: { lt: beforeDate },
                status: { in: ['UNPAID', 'OVERDUE'] },
                loan: {
                    status: { in: ['ACTIVE', 'NPL'] },
                    customer: {
                        lineUserId: { not: null },
                        user: {
                            lineActive: true,
                            lineNotificationsEnabled: true,
                        },
                    },
                },
            },
            include: {
                loan: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                                lineUserId: true,
                            },
                        },
                    },
                },
            },
            orderBy: { paymentDate: 'asc' },
        });
    }

    /**
     * Find first unpaid schedule for a loan (for payment instructions)
     */
    async findFirstUnpaidByLoanId(loanId: string): Promise<any | null> {
        return this.db.paymentSchedule.findFirst({
            where: { loanId, status: 'UNPAID' },
            orderBy: { paymentDate: 'asc' },
        });
    }

    /**
     * Find schedule by ID with full loan/customer include
     */
    async findByIdWithLoanAndCustomer(id: string): Promise<any | null> {
        return this.db.paymentSchedule.findUnique({
            where: { id },
            include: {
                loan: {
                    include: {
                        customer: { select: { thaiId: true, id: true } },
                    },
                },
            },
        });
    }

    /**
     * Count paid schedules for a loan
     */
    async countPaidByLoanId(loanId: string): Promise<number> {
        return this.db.paymentSchedule.count({
            where: { loanId, status: 'PAID' },
        });
    }

    /**
     * Find overdue schedules for a loan
     */
    async findOverdueByLoanId(loanId: string): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: { loanId, status: 'OVERDUE' },
        });
    }

    /**
     * Find schedule by loan and payment number
     */
    async findByLoanAndPaymentNumber(loanId: string, paymentNumber: number): Promise<any | null> {
        return this.db.paymentSchedule.findFirst({
            where: { loanId, paymentNumber },
        });
    }

    /**
     * Find first pending (UNPAID or OVERDUE) schedule for a loan (for listLoans derived fields)
     */
    async findFirstPendingByLoanId(loanId: string): Promise<{
        paymentNumber: number;
        paymentDate: Date;
        status: string;
    } | null> {
        return this.db.paymentSchedule.findFirst({
            where: {
                loanId,
                status: { in: ['UNPAID', 'OVERDUE'] },
            },
            orderBy: { paymentNumber: 'asc' },
            select: {
                paymentNumber: true,
                paymentDate: true,
                status: true,
            },
        });
    }

    /**
     * Find schedule signals for multiple loans (for credit assessment in listLoans)
     */
    async findSignalsByLoanIds(loanIds: string[]): Promise<Array<{
        loanId: string;
        paymentDate: Date;
        status: string;
        paidAt: Date | null;
        daysOverdue: number | null;
    }>> {
        if (loanIds.length === 0) return [];
        return this.db.paymentSchedule.findMany({
            where: { loanId: { in: loanIds } },
            select: {
                loanId: true,
                paymentDate: true,
                status: true,
                paidAt: true,
                daysOverdue: true,
            },
        });
    }

    /**
     * Find payment schedule by ID with loan and loan product (for penalty calculation)
     */
    async findByIdWithLoanProduct(id: string): Promise<any | null> {
        return this.db.paymentSchedule.findUnique({
            where: { id },
            include: {
                loan: {
                    include: {
                        loanProduct: true,
                    },
                },
            },
        });
    }

    /**
     * Update penalty fields on a payment schedule
     */
    async updatePenalty(id: string, data: {
        daysOverdue: number;
        penaltyAmount: number;
        compoundInterestAmount: number;
        status: string;
    }): Promise<void> {
        await this.db.paymentSchedule.update({
            where: { id },
            data,
        });
    }

    /**
     * Find unpaid/overdue schedules for a loan that are past due (for penalty calculation)
     */
    async findOverdueUnpaidByLoanId(loanId: string): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                loanId,
                status: { in: ['UNPAID', 'OVERDUE'] },
                paymentDate: { lt: new Date() },
            },
            orderBy: { paymentNumber: 'asc' },
        });
    }

    /**
     * Find all unpaid/overdue schedules that are past due (for batch penalty update)
     */
    async findAllOverdueUnpaid(): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                status: { in: ['UNPAID', 'OVERDUE'] },
                paymentDate: { lt: new Date() },
            },
        });
    }

    /**
     * Find overdue/partial schedules for a loan (for penalty summary)
     */
    async findOverdueOrPartialByLoanId(loanId: string): Promise<any[]> {
        return this.db.paymentSchedule.findMany({
            where: {
                loanId,
                status: { in: ['OVERDUE', 'PARTIAL'] },
            },
        });
    }

}


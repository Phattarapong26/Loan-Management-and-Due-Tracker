import { PrismaClient, Loan, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Loan Repository - Database access ONLY
 * No business logic, just Prisma queries
 */
export class LoanRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find loan by ID
     */
    async findById(id: string, branchId?: string, tx?: Prisma.TransactionClient): Promise<Loan | null> {
        const db = tx || this.db;
        return db.loan.findFirst({
            where: {
                id,
                ...(branchId && { branchId }),
            },
            include: {
                customer: true,
                branch: true, // Add branch relation
                loanProduct: true, // Add loan product relation
                officer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Create loan
     */
    async create(data: {
            customerId: string;
            branchId: string;
            officerId: string;
            contractNumber?: string; // Add contract number
            principal: number;
            interestRate: number;
            termMonths: number;
            paymentDay: number;
            firstPaymentDate?: Date; // Add firstPaymentDate
            dscr?: number;
            dscrStatus?: string;
            monthlyPayment?: number;
            totalInterest?: number;
            productConfigId?: string;
            productConfig?: any;
            loanProductId?: string; // ✅ Add loanProductId
            approvalLevel: 'OFFICER' | 'MANAGER' | 'HQ'; // Required: OFFICER, MANAGER, or HQ
        }, tx?: Prisma.TransactionClient): Promise<Loan> {
            const db = tx || this.db;
            return db.loan.create({
                data: {
                    customerId: data.customerId,
                    branchId: data.branchId,
                    officerId: data.officerId,
                    contract_number: data.contractNumber, // Add contract number
                    principal: data.principal,
                    interestRate: data.interestRate,
                    termMonths: data.termMonths,
                    paymentDay: data.paymentDay,
                    firstPaymentDate: data.firstPaymentDate, // Add firstPaymentDate
                    dscr: data.dscr,
                    dscrStatus: data.dscrStatus,
                    monthlyPayment: data.monthlyPayment,
                    totalInterest: data.totalInterest,
                    productConfigId: data.productConfigId,
                    productConfig: data.productConfig,
                    loanProductId: data.loanProductId, // ✅ Add loanProductId
                    outstandingBalance: data.principal,
                    approvalLevel: data.approvalLevel,
                },
            });
        }

    /**
     * Update loan
     */
    async update(
        id: string,
        data: {
            status?: string;
            approvedBy?: string | null;
            approvedAt?: Date | null;
            rejectedBy?: string | null;
            rejectedAt?: Date | null;
            rejectedReason?: string | null;
            disbursementDate?: Date | null;
            maturityDate?: Date | null;
            firstPaymentDate?: Date | null; // Add firstPaymentDate
            paymentDay?: number; // Add paymentDay
            outstandingBalance?: number;
            nextPaymentDate?: Date | null;
            nextPaymentAmount?: number | null;
            lastPaymentDate?: Date | null;
            overdueDays?: number;
        },
        branchId?: string,
        tx?: Prisma.TransactionClient
    ): Promise<Loan> {
        const db = tx || this.db;
        const updateData: any = {};

        if (data.status !== undefined) updateData.status = data.status;
        if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;
        if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt;
        if (data.rejectedBy !== undefined) updateData.rejectedBy = data.rejectedBy;
        if (data.rejectedAt !== undefined) updateData.rejectedAt = data.rejectedAt;
        if (data.rejectedReason !== undefined) updateData.rejectedReason = data.rejectedReason;
        if (data.disbursementDate !== undefined) updateData.disbursementDate = data.disbursementDate;
        if (data.maturityDate !== undefined) updateData.maturityDate = data.maturityDate;
        if (data.firstPaymentDate !== undefined) updateData.firstPaymentDate = data.firstPaymentDate; // Add firstPaymentDate
        if (data.paymentDay !== undefined) updateData.paymentDay = data.paymentDay; // Add paymentDay
        if (data.outstandingBalance !== undefined) updateData.outstandingBalance = data.outstandingBalance;
        if (data.nextPaymentDate !== undefined) updateData.nextPaymentDate = data.nextPaymentDate;
        if (data.nextPaymentAmount !== undefined) updateData.nextPaymentAmount = data.nextPaymentAmount;
        if (data.lastPaymentDate !== undefined) updateData.lastPaymentDate = data.lastPaymentDate;
        if (data.overdueDays !== undefined) updateData.overdueDays = data.overdueDays;

        return db.loan.update({
            where: {
                id,
                ...(branchId && { branchId }),
            },
            data: updateData,
        });
    }

    /**
     * List loans with pagination and filters
     */
    async list(params: {
        branchId?: string;
        officerId?: string; // Add officerId parameter
        page: number;
        limit: number;
        status?: string;
        customerId?: string;
        search?: string;
    }): Promise<{ loans: Loan[]; total: number }> {
        const where: Prisma.LoanWhereInput = {};

        if (params.branchId) {
            where.branchId = params.branchId;
        }

        // Add officerId filter if provided
        // Portfolio ownership is tied to the staff who created the customer (customer.createdBy).
        // Keep backward compatibility for older records by also checking loan.officerId.
        if (params.officerId) {
            const existingAnd: Prisma.LoanWhereInput[] = [];
            if (where.AND) {
                existingAnd.push(...(Array.isArray(where.AND) ? where.AND : [where.AND]));
            }
            where.AND = [
                ...existingAnd,
                {
                    OR: [
                        { officerId: params.officerId },
                        { customer: { createdBy: params.officerId } },
                    ],
                },
            ];
        }

        if (params.status) {
            // Handle comma-separated status values
            const statuses = params.status.split(',').map(s => s.trim());
            if (statuses.length === 1) {
                where.status = statuses[0] as any;
            } else {
                where.status = { in: statuses as any[] };
            }
        }

        if (params.customerId) {
            where.customerId = params.customerId;
        }

        if (params.search) {
            where.OR = [
                { id: { contains: params.search, mode: 'insensitive' } },
                {
                    customer: {
                        businessName: { contains: params.search, mode: 'insensitive' },
                    },
                },
            ];
        }

        const [loans, total] = await Promise.all([
            this.db.loan.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: {
                        select: {
                            id: true,
                            customerCode: true,
                            businessName: true,
                            avatar: true,
                            industry_code: true,
                            business_age_years: true,
                        },
                    },
                    officer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    loanProduct: {
                        select: {
                            id: true,
                            productCode: true,
                            productName: true,
                        },
                    },
                    branch: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                },
            }),
            this.db.loan.count({ where }),
        ]);

        return { loans, total };
    }

    /**
     * Get loans by customer
     */
    async findByCustomer(customerId: string, branchId?: string): Promise<Loan[]> {
        return this.db.loan.findMany({
            where: {
                customerId,
                ...(branchId && { branchId }),
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        customerCode: true,
                        businessName: true,
                        avatar: true,
                    },
                },
                officer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                loanProduct: {
                    select: {
                        id: true,
                        productCode: true,
                        productName: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get pending approval loans for branch
     */
    async findPendingApprovals(branchId?: string): Promise<Loan[]> {
        const where: Prisma.LoanWhereInput = {
            status: 'PENDING_APPROVAL',
        };

        // Only filter by branchId if provided (Admin sees all)
        if (branchId) {
            where.branchId = branchId;
        }

        return this.db.loan.findMany({
            where,
            include: {
                customer: {
                    select: {
                        id: true,
                        customerCode: true,
                        businessName: true,
                        avatar: true,
                    },
                },
                officer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                loanProduct: {
                    select: {
                        id: true,
                        productCode: true,
                        productName: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Update disbursement tracking
     */
    async updateDisbursementTracking(
        id: string,
        data: {
            totalDisbursed: number;
            remainingAmount: number;
        }
    ): Promise<Loan> {
        return this.db.loan.update({
            where: { id },
            data: {
                totalDisbursed: data.totalDisbursed,
                remainingAmount: data.remainingAmount,
            },
        });
    }

    /**
     * Update loan status
     */
    async updateStatus(id: string, status: string): Promise<Loan> {
        return this.db.loan.update({
            where: { id },
            data: { status: status as any },
        });
    }

    /**
     * Find NPL loans for a branch (>90 days overdue)
     */
    async findNPLLoansByBranch(branchId: string, ninetyDaysAgo: Date): Promise<any[]> {
        return this.db.loan.findMany({
            where: {
                customer: { branchId },
                status: 'NPL',
                paymentSchedule: {
                    some: {
                        paymentDate: { lt: ninetyDaysAgo },
                        status: 'UNPAID',
                    },
                },
            },
            include: {
                customer: {
                    select: { id: true, businessName: true, phone: true },
                },
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 1,
                },
                contactLogs: {
                    orderBy: { contactDate: 'desc' },
                    take: 1,
                },
                paymentSchedule: {
                    where: { status: 'UNPAID' },
                    orderBy: { paymentDate: 'asc' },
                    take: 1,
                },
            },
        });
    }

    /**
     * Find high-risk loans for a branch (60-89 days overdue)
     */
    async findHighRiskLoansByBranch(branchId: string, ninetyDaysAgo: Date, sixtyDaysAgo: Date): Promise<any[]> {
        return this.db.loan.findMany({
            where: {
                customer: { branchId },
                status: 'NPL',
                paymentSchedule: {
                    some: {
                        paymentDate: { gte: ninetyDaysAgo, lt: sixtyDaysAgo },
                        status: 'UNPAID',
                    },
                },
            },
            include: {
                customer: {
                    select: { id: true, businessName: true, phone: true },
                },
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 1,
                },
                contactLogs: {
                    orderBy: { contactDate: 'desc' },
                    take: 1,
                },
                paymentSchedule: {
                    where: { status: 'UNPAID' },
                    orderBy: { paymentDate: 'asc' },
                    take: 1,
                },
            },
        });
    }

    /**
     * Find loan with customer and contact logs for NPL task assignment
     */
    async findLoanForNPLTask(loanId: string): Promise<{ id: string; customerId: string } | null> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            select: { customerId: true, id: true },
        });
    }

    /**
     * Find loan with customer for NPL status update
     */
    async findLoanWithCustomerForNPL(loanId: string): Promise<any> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            include: {
                customer: { select: { businessName: true } },
            },
        });
    }

    /**
     * Get loan statistics
     */
    async getStatistics(params: {
        branchId?: string;
        officerId?: string;
        status?: string;
    }) {
        const whereClause: any = {};

        if (params.branchId) {
            whereClause.branchId = params.branchId;
        }

        if (params.officerId) {
            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { officerId: params.officerId },
                        { customer: { createdBy: params.officerId } },
                    ],
                },
            ];
        }

        if (params.status) {
            const statuses = params.status.split(',').map(s => s.trim());
            whereClause.status = { in: statuses };
        }

        const [
            totalLoans,
            totalAmount,
            totalOutstanding,
            statusCounts,
            overdueLoans,
            nplLoans
        ] = await Promise.all([
            // Total count
            this.db.loan.count({ where: whereClause }),

            // Total loan amount
            this.db.loan.aggregate({
                where: whereClause,
                _sum: { principal: true }
            }),

            // Total outstanding balance
            this.db.loan.aggregate({
                where: whereClause,
                _sum: { outstandingBalance: true }
            }),

            // Count by status
            this.db.loan.groupBy({
                by: ['status'],
                where: whereClause,
                _count: { status: true }
            }),

            // Count overdue loans (loans with overdueDays > 0)
            this.db.loan.count({
                where: {
                    ...whereClause,
                    overdueDays: { gt: 0 }
                }
            }),

            // Count NPL loans: status=NPL OR overdueDays>=90 (matches frontend mapLoanStatus logic)
            this.db.loan.count({
                where: {
                    ...whereClause,
                    OR: [
                        { status: 'NPL' },
                        { overdueDays: { gte: 90 } },
                    ]
                }
            })
        ]);

        // Convert status counts to object
        const statusCountsObj = statusCounts.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalLoans,
            totalAmount: Number(totalAmount._sum.principal || 0),
            totalOutstanding: Number(totalOutstanding._sum.outstandingBalance || 0),
            statusCounts: statusCountsObj,
            pendingCount: statusCountsObj['PENDING_APPROVAL'] || 0,
            approvedCount: statusCountsObj['APPROVED'] || 0,
            activeCount: (statusCountsObj['ACTIVE'] || 0) + (statusCountsObj['DISBURSED'] || 0),
            nplCount: nplLoans,
            overdueCount: overdueLoans,
        };
    }

    /**
     * Find all NPL/overdue loans (no branch filter) for payment reminder job
     */
    async findNPLLoans(): Promise<Array<{ id: string; branchId: string; overdueDays: number | null; outstandingBalance: any; customer: { id: string; businessName: string } }>> {
        return this.db.loan.findMany({
            where: {
                status: { in: ['ACTIVE', 'DISBURSED', 'NPL'] },
                OR: [{ status: 'NPL' }, { overdueDays: { gte: 90 } }],
            },
            select: {
                id: true,
                branchId: true,
                overdueDays: true,
                outstandingBalance: true,
                customer: { select: { id: true, businessName: true } },
            },
        }) as any;
    }

    /**
     * Find active loan IDs (for payment sync job)
     */
    async findActiveIds(): Promise<string[]> {
        const loans = await this.db.loan.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true },
        });
        return loans.map(l => l.id);
    }

    /**
     * Find loan with customer and LINE info (for loan status notifications)
     */
    async findWithCustomerAndLine(loanId: string): Promise<any> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            include: {
                customer: {
                    include: { user: true },
                },
                loanProduct: true,
            },
        });
    }

    /**
     * Find payment with loan and customer LINE info
     */
    async findPaymentWithLoan(paymentId: string): Promise<any> {
        return this.db.payment.findUnique({
            where: { id: paymentId },
            include: {
                loan: {
                    include: {
                        customer: { include: { user: true } },
                    },
                },
            },
        });
    }
}

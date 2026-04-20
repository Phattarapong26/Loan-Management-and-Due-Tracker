import { PrismaClient, LoanDisbursement, DisbursementStatus, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Disbursement Repository - Database access ONLY
 */
export class DisbursementRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find disbursement by ID
     */
    async findById(id: string) {
        return this.db.loanDisbursement.findUnique({
            where: { id },
            include: {
                loan: {
                    select: {
                        id: true,
                        branchId: true,
                        officerId: true,
                        principal: true,
                        totalDisbursed: true,
                        remainingAmount: true,
                        contract_number: true,
                        approvedAt: true,
                        firstPaymentDate: true,
                        paymentDay: true,
                        productConfig: true, // เพิ่มเพื่อให้ได้ disbursementPdfStatus และ disbursementPdfUrl
                        customer: {
                            select: {
                                id: true,
                                businessName: true,
                                customerCode: true,
                                avatar: true,
                                address: true,
                                business_address: true,
                                phone: true,
                                business_phone: true,
                                email: true,
                                thaiId: true,
                                taxId: true,
                            },
                        },
                        branch: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                creator: {
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
                        email: true,
                    },
                },
                rejector: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                disburser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Create disbursement
     */
    async create(data: {
        loanId: string;
        disbursementNo: number;
        amount: number;
        purpose: string;
        requestedDate: Date;
        nextDisbursementDate?: Date;
        notes?: string;
        createdBy: string;
    }): Promise<LoanDisbursement> {
        return this.db.loanDisbursement.create({
            data: {
                loanId: data.loanId,
                disbursementNo: data.disbursementNo,
                amount: data.amount,
                purpose: data.purpose,
                requestedDate: data.requestedDate,
                nextDisbursementDate: data.nextDisbursementDate,
                notes: data.notes,
                createdBy: data.createdBy,
                status: DisbursementStatus.PENDING,
            },
            include: {
                loan: {
                    include: {
                        customer: true,
                    },
                },
            },
        });
    }

    /**
     * Update disbursement
     */
    async update(
        id: string,
        data: {
            amount?: number;
            purpose?: string;
            requestedDate?: Date;
            nextDisbursementDate?: Date;
            notes?: string;
        }
    ): Promise<LoanDisbursement> {
        return this.db.loanDisbursement.update({
            where: { id },
            data,
        });
    }

    /**
     * Update status
     */
    async updateStatus(id: string, status: DisbursementStatus): Promise<LoanDisbursement> {
        return this.db.loanDisbursement.update({
            where: { id },
            data: { status },
        });
    }

    /**
     * Approve disbursement
     */
    async approve(id: string, approverId: string, notes?: string): Promise<LoanDisbursement> {
        return this.db.loanDisbursement.update({
            where: { id },
            data: {
                status: DisbursementStatus.APPROVED,
                approvedBy: approverId,
                approvedAt: new Date(),
                notes: notes || undefined,
            },
        });
    }

    /**
     * Reject disbursement
     */
    async reject(id: string, rejectorId: string, reason: string): Promise<LoanDisbursement> {
        return this.db.loanDisbursement.update({
            where: { id },
            data: {
                status: DisbursementStatus.REJECTED,
                rejectedBy: rejectorId,
                rejectedAt: new Date(),
                rejectedReason: reason,
            },
        });
    }

    /**
     * Execute disbursement
     */
    async disburse(
        id: string,
        disburserId: string,
        method: string,
        referenceNo: string,
        notes?: string
    ): Promise<LoanDisbursement> {
        return this.db.loanDisbursement.update({
            where: { id },
            data: {
                status: DisbursementStatus.DISBURSED,
                disbursedBy: disburserId,
                disbursedAt: new Date(),
                disbursementMethod: method,
                referenceNo,
                notes: notes || undefined,
            },
        });
    }

    /**
     * List disbursements with pagination and filters
     */
    async list(params: {
        page: number;
        limit: number;
        loanId?: string;
        customerId?: string;
        branchId?: string;
        status?: DisbursementStatus;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<{ disbursements: LoanDisbursement[]; total: number }> {
        const where: Prisma.LoanDisbursementWhereInput = {};

        if (params.loanId) {
            where.loanId = params.loanId;
        }

        const loanWhere: Prisma.LoanWhereInput = {};
        if (params.customerId) {
            loanWhere.customerId = params.customerId;
        }
        if (params.branchId) {
            loanWhere.branchId = params.branchId;
        }

        // Only add loan filter if there are conditions
        if (Object.keys(loanWhere).length > 0) {
            where.loan = loanWhere;
        }

        if (params.status) {
            where.status = params.status;
        }

        if (params.dateFrom || params.dateTo) {
            where.requestedDate = {};
            if (params.dateFrom) {
                where.requestedDate.gte = params.dateFrom;
            }
            if (params.dateTo) {
                where.requestedDate.lte = params.dateTo;
            }
        }

        // PERFORMANCE: Use Promise.all for parallel queries
        const [disbursements, total] = await Promise.all([
            this.db.loanDisbursement.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { requestedDate: 'desc' },
                // PERFORMANCE: Optimized includes - select only required fields
                include: {
                    loan: {
                        select: {
                            id: true,
                            officerId: true,
                            principal: true,
                            totalDisbursed: true,
                            remainingAmount: true,
                            contract_number: true,
                            approvedAt: true,
                            firstPaymentDate: true,
                            paymentDay: true,
                            productConfig: true, // เพิ่มเพื่อให้ได้ disbursementPdfStatus และ disbursementPdfUrl
                            customer: {
                                select: {
                                    id: true,
                                    businessName: true,
                                    customerCode: true,
                                    avatar: true,
                                    address: true,
                                    business_address: true,
                                    phone: true,
                                    business_phone: true,
                                    email: true,
                                    thaiId: true,
                                    taxId: true,
                                },
                            },
                            branch: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                },
                            },
                        },
                    },
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
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
            }),
            this.db.loanDisbursement.count({ where }),
        ]);

        return { disbursements, total };
    }

    /**
     * Get disbursements by loan ID
     */
    async findByLoanId(loanId: string): Promise<LoanDisbursement[]> {
        return this.db.loanDisbursement.findMany({
            where: { loanId },
            orderBy: { disbursementNo: 'asc' },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                disburser: {
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
     * Get next disbursement number for a loan
     */
    async getNextDisbursementNo(loanId: string): Promise<number> {
        const lastDisbursement = await this.db.loanDisbursement.findFirst({
            where: { loanId },
            orderBy: { disbursementNo: 'desc' },
            select: { disbursementNo: true },
        });

        return lastDisbursement ? lastDisbursement.disbursementNo + 1 : 1;
    }

    /**
     * Get disbursement statistics
     */
    async getStats(params: {
        branchId?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<{
        pending: number;
        approved: number;
        disbursed: number;
        rejected: number;
        totalAmount: number;
        disbursedAmount: number;
        pendingAmount: number;
    }> {
        const where: Prisma.LoanDisbursementWhereInput = {};

        if (params.branchId) {
            where.loan = {
                branchId: params.branchId,
            };
        }

        if (params.dateFrom || params.dateTo) {
            where.requestedDate = {};
            if (params.dateFrom) {
                where.requestedDate.gte = params.dateFrom;
            }
            if (params.dateTo) {
                where.requestedDate.lte = params.dateTo;
            }
        }

        const [pending, approved, disbursed, rejected, amounts] = await Promise.all([
            this.db.loanDisbursement.count({
                where: { ...where, status: DisbursementStatus.PENDING },
            }),
            this.db.loanDisbursement.count({
                where: { ...where, status: DisbursementStatus.APPROVED },
            }),
            this.db.loanDisbursement.count({
                where: { ...where, status: DisbursementStatus.DISBURSED },
            }),
            this.db.loanDisbursement.count({
                where: { ...where, status: DisbursementStatus.REJECTED },
            }),
            this.db.loanDisbursement.aggregate({
                where,
                _sum: {
                    amount: true,
                },
            }),
        ]);

        const disbursedAmounts = await this.db.loanDisbursement.aggregate({
            where: { ...where, status: DisbursementStatus.DISBURSED },
            _sum: {
                amount: true,
            },
        });

        const pendingAmounts = await this.db.loanDisbursement.aggregate({
            where: {
                ...where,
                status: {
                    in: [DisbursementStatus.PENDING, DisbursementStatus.APPROVED],
                },
            },
            _sum: {
                amount: true,
            },
        });

        return {
            pending,
            approved,
            disbursed,
            rejected,
            totalAmount: Number(amounts._sum.amount || 0),
            disbursedAmount: Number(disbursedAmounts._sum.amount || 0),
            pendingAmount: Number(pendingAmounts._sum.amount || 0),
        };
    }

    /**
     * Delete disbursement
     */
    async delete(id: string): Promise<void> {
        await this.db.loanDisbursement.delete({
            where: { id },
        });
    }

    /**
     * Update loan productConfig (for PDF status tracking)
     */
    async updateLoanProductConfig(loanId: string, productConfig: any): Promise<void> {
        await this.db.loan.update({
            where: { id: loanId },
            data: { productConfig },
        });
    }

    /**
     * Find loan with customer and branch for PDF generation
     */
    async findLoanWithRelations(loanId: string): Promise<any> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            include: {
                customer: true,
                branch: true,
            },
        });
    }

    /**
     * Find latest disbursed disbursement for a loan
     */
    async findLatestDisbursedByLoanId(loanId: string): Promise<any> {
        return this.db.loanDisbursement.findFirst({
            where: {
                loanId,
                status: 'DISBURSED',
            },
            orderBy: { disbursedAt: 'desc' },
        });
    }

    /**
     * Find any disbursement for a loan (fallback when no DISBURSED record exists)
     */
    async findAnyDisbursementByLoanId(loanId: string): Promise<any> {
        return this.db.loanDisbursement.findFirst({
            where: { loanId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find loan with customer LINE info for notification
     */
    async findLoanWithCustomerLine(loanId: string): Promise<any> {
        return this.db.loan.findUnique({
            where: { id: loanId },
            include: {
                customer: {
                    include: {
                        user: true,
                    },
                },
            },
        });
    }
}

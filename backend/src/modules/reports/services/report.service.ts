import { prisma } from '@config/database.config';
import type { Prisma } from '@prisma/client';

type ReportFilters = {
    branchId?: string;
    officerId?: string;
    productId?: string;
    dateFrom?: Date;
    dateTo?: Date;
};

/**
 * Report Service - Business logic for generating reports
 * Aggregates and formats data for various report types
 */
export class ReportService {
    constructor() {
        // No repositories needed - using Prisma directly
    }

    private buildLoanWhere(params: Pick<ReportFilters, 'branchId' | 'officerId' | 'productId'>): Prisma.LoanWhereInput {
        const loanWhere: Prisma.LoanWhereInput = {};
        if (params.branchId) loanWhere.branchId = params.branchId;
        if (params.officerId) loanWhere.officerId = params.officerId;
        if (params.productId) loanWhere.loanProductId = params.productId;
        return loanWhere;
    }

    private buildDateRange(range?: { dateFrom?: Date; dateTo?: Date }) {
        if (!range?.dateFrom && !range?.dateTo) return undefined;
        return {
            ...(range.dateFrom ? { gte: range.dateFrom } : {}),
            ...(range.dateTo ? { lte: range.dateTo } : {}),
        };
    }

    /**
     * Generate Branch Summary Report
     *
     * Notes:
     * - Portfolio = DISBURSED/ACTIVE/NPL/DEFAULTED (still has exposure)
     * - NPL definition here aligns with Loan tracking: 30+ DPD (or status NPL/DEFAULTED)
     */
    async generateBranchSummaryReport(params: ReportFilters) {
        const loanWhere = this.buildLoanWhere(params);
        const portfolioStatuses = ['DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED'] as const;

        const portfolioWhere: Prisma.LoanWhereInput = {
            ...loanWhere,
            status: { in: [...portfolioStatuses] },
        };

        const portfolioLoans = await prisma.loan.count({ where: portfolioWhere });

        const [activeLoans, outstandingResult] = await Promise.all([
            prisma.loan.count({ where: { ...loanWhere, status: { in: ['DISBURSED', 'ACTIVE'] } } }),
            prisma.loan.aggregate({ where: portfolioWhere, _sum: { outstandingBalance: true } }),
        ]);
        const totalOutstanding = Number(outstandingResult._sum.outstandingBalance || 0);

        const disbursedAtRange = this.buildDateRange(params);
        const disbursedResult = await prisma.loanDisbursement.aggregate({
            where: {
                status: 'DISBURSED',
                ...(disbursedAtRange ? { disbursedAt: disbursedAtRange } : {}),
                loan: loanWhere,
            },
            _sum: { amount: true },
        });
        const totalDisbursed = Number(disbursedResult._sum.amount || 0);

        const paymentDateRange = this.buildDateRange(params);
        const collectedResult = await prisma.payment.aggregate({
            where: {
                ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
                loan: loanWhere,
            },
            _sum: { amount: true },
        });
        const totalCollected = Number(collectedResult._sum.amount || 0);

        const expectedResult = await prisma.paymentSchedule.aggregate({
            where: {
                loan: loanWhere,
                ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
            },
            _sum: { totalPayment: true },
        });
        const totalExpected = Number(expectedResult._sum.totalPayment || 0);
        const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

        const nplLoans = await prisma.loan.count({
            where: {
                ...portfolioWhere,
                OR: [{ status: 'NPL' }, { status: 'DEFAULTED' }, { overdueDays: { gte: 30 } }],
            },
        });
        const nplRatio = portfolioLoans > 0 ? (nplLoans / portfolioLoans) * 100 : 0;

        const [current, dpd1to7, dpd8to29, dpd30to89, dpd90plus] = await Promise.all([
            prisma.loan.count({ where: { ...portfolioWhere, overdueDays: 0 } }),
            prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 1, lte: 7 } } }),
            prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 8, lte: 29 } } }),
            prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 30, lte: 89 } } }),
            prisma.loan.count({ where: { ...portfolioWhere, overdueDays: { gte: 90 } } }),
        ]);

        return {
            summary: {
                portfolioLoans,
                activeLoans,
                nplLoans,
                totalDisbursed,
                totalCollected,
                totalExpected,
                collectionRate: Number(collectionRate.toFixed(2)),
                totalOutstanding,
                nplRatio: Number(nplRatio.toFixed(2)),
            },
            dpdBuckets: { current, dpd1to7, dpd8to29, dpd30to89, dpd90plus },
        };
    }

    /**
     * Generate NPL Report (30+ DPD)
     */
    async generateNPLReport(params: ReportFilters) {
        const loanWhere = this.buildLoanWhere(params);
        const updatedAtRange = this.buildDateRange(params);

        const nplLoans = await prisma.loan.findMany({
            where: {
                ...loanWhere,
                OR: [{ status: 'NPL' }, { status: 'DEFAULTED' }, { overdueDays: { gte: 30 } }],
                ...(updatedAtRange ? { updatedAt: updatedAtRange } : {}),
            },
            include: {
                customer: { select: { businessName: true, customerCode: true } },
                branch: { select: { name: true, code: true } },
                officer: { select: { firstName: true, lastName: true } },
                loanProduct: { select: { productName: true, productCode: true } },
            },
            orderBy: { overdueDays: 'desc' },
            take: 2000,
        });

        return nplLoans.map((loan) => ({
            loanId: loan.id,
            contractNumber: loan.contract_number,
            customerName: loan.customer.businessName,
            customerCode: loan.customer.customerCode,
            branchName: loan.branch?.name,
            officerName: loan.officer ? `${loan.officer.firstName} ${loan.officer.lastName}` : undefined,
            productName: loan.loanProduct?.productName,
            status: loan.status,
            outstandingAmount: Number(loan.outstandingBalance),
            overdueDays: loan.overdueDays || 0,
            lastPaymentDate: loan.lastPaymentDate ? loan.lastPaymentDate.toISOString() : undefined,
        }));
    }

    /**
     * Generate Officer Performance Report (portfolio + collection)
     */
    async generateOfficerPerformanceReport(params: ReportFilters) {
        const baseLoanWhere = this.buildLoanWhere({ branchId: params.branchId, productId: params.productId });
        const portfolioStatuses = ['DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED'] as const;

        const officers = await prisma.user.findMany({
            where: {
                role: 'OFFICER',
                ...(params.branchId ? { branchId: params.branchId } : {}),
                ...(params.officerId ? { id: params.officerId } : {}),
            },
            select: { id: true, firstName: true, lastName: true },
        });

        const paymentDateRange = this.buildDateRange(params);
        const disbursedAtRange = this.buildDateRange(params);

        const performanceData = await Promise.all(
            officers.map(async (officer) => {
                const officerLoanWhere: Prisma.LoanWhereInput = {
                    ...baseLoanWhere,
                    officerId: officer.id,
                };

                const [portfolioLoans, activeLoans, nplLoans] = await Promise.all([
                    prisma.loan.count({ where: { ...officerLoanWhere, status: { in: [...portfolioStatuses] } } }),
                    prisma.loan.count({ where: { ...officerLoanWhere, status: { in: ['DISBURSED', 'ACTIVE'] } } }),
                    prisma.loan.count({
                        where: {
                            ...officerLoanWhere,
                            OR: [{ status: 'NPL' }, { status: 'DEFAULTED' }, { overdueDays: { gte: 30 } }],
                        },
                    }),
                ]);

                const collectedResult = await prisma.payment.aggregate({
                    where: {
                        ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
                        loan: officerLoanWhere,
                    },
                    _sum: { amount: true },
                });
                const totalCollected = Number(collectedResult._sum.amount || 0);

                const expectedResult = await prisma.paymentSchedule.aggregate({
                    where: {
                        ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
                        loan: officerLoanWhere,
                    },
                    _sum: { totalPayment: true },
                });
                const totalExpected = Number(expectedResult._sum.totalPayment || 0);
                const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

                const disbursedResult = await prisma.loanDisbursement.aggregate({
                    where: {
                        status: 'DISBURSED',
                        ...(disbursedAtRange ? { disbursedAt: disbursedAtRange } : {}),
                        loan: officerLoanWhere,
                    },
                    _sum: { amount: true },
                });
                const disbursementAmount = Number(disbursedResult._sum.amount || 0);

                return {
                    officerId: officer.id,
                    officerName: `${officer.firstName} ${officer.lastName}`,
                    portfolioLoans,
                    activeLoans,
                    nplLoans,
                    disbursementAmount,
                    totalCollected,
                    totalExpected,
                    collectionRate: Number(collectionRate.toFixed(2)),
                };
            })
        );

        return performanceData;
    }

    /**
     * Generate Loan Register Report (tabular)
     */
    async generateLoanReport(params: ReportFilters) {
        const loanWhere = this.buildLoanWhere(params);
        const createdAtRange = this.buildDateRange(params);

        const loans = await prisma.loan.findMany({
            where: {
                ...loanWhere,
                ...(createdAtRange ? { createdAt: createdAtRange } : {}),
            },
            include: {
                customer: { select: { businessName: true, customerCode: true } },
                branch: { select: { name: true, code: true } },
                officer: { select: { firstName: true, lastName: true } },
                loanProduct: { select: { productName: true, productCode: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 2000,
        });

        return loans.map((loan) => ({
            loanId: loan.id,
            contractNumber: loan.contract_number,
            customerName: loan.customer.businessName,
            customerCode: loan.customer.customerCode,
            branchName: loan.branch?.name,
            officerName: loan.officer ? `${loan.officer.firstName} ${loan.officer.lastName}` : undefined,
            productName: loan.loanProduct?.productName,
            principal: Number(loan.principal),
            outstandingBalance: Number(loan.outstandingBalance),
            status: loan.status,
            disbursementDate: loan.disbursementDate ? loan.disbursementDate.toISOString() : undefined,
            overdueDays: loan.overdueDays || 0,
            createdAt: loan.createdAt.toISOString(),
        }));
    }

    /**
     * Generate Payment Register Report (tabular)
     */
    async generatePaymentReport(params: ReportFilters) {
        const loanWhere = this.buildLoanWhere(params);
        const paymentDateRange = this.buildDateRange(params);

        const payments = await prisma.payment.findMany({
            where: {
                ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
                loan: loanWhere,
            },
            include: {
                loan: {
                    select: {
                        id: true,
                        contract_number: true,
                        officer: { select: { firstName: true, lastName: true } },
                        branch: { select: { name: true, code: true } },
                        customer: { select: { businessName: true, customerCode: true } },
                        loanProduct: { select: { productName: true, productCode: true } },
                    },
                },
                paymentReceipts: { select: { receiptNumber: true } },
                creator: { select: { firstName: true, lastName: true } },
            },
            orderBy: { paymentDate: 'desc' },
            take: 5000,
        });

        const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        return {
            summary: {
                totalPayments: payments.length,
                totalCollected: Number(totalCollected.toFixed(2)),
            },
            payments: payments.map((p) => ({
                paymentId: p.id,
                paymentDate: p.paymentDate.toISOString(),
                amount: Number(p.amount),
                paymentMethod: p.paymentMethod,
                paymentType: p.paymentType,
                loanId: p.loanId,
                contractNumber: p.loan.contract_number,
                customerName: p.loan.customer.businessName,
                customerCode: p.loan.customer.customerCode,
                branchName: p.loan.branch?.name,
                officerName: p.loan.officer ? `${p.loan.officer.firstName} ${p.loan.officer.lastName}` : undefined,
                productName: p.loan.loanProduct?.productName,
                receiptNumber: p.paymentReceipts?.[0]?.receiptNumber,
                recordedBy: p.creator ? `${p.creator.firstName} ${p.creator.lastName}` : undefined,
            })),
        };
    }
}


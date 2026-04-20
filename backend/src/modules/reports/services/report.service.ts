import { ReportRepository } from '../repositories/report.repository';
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
    private reportRepository: ReportRepository;

    constructor() {
        this.reportRepository = new ReportRepository();
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
     */
    async generateBranchSummaryReport(params: ReportFilters) {
        const loanWhere = this.buildLoanWhere(params);
        const portfolioStatuses = ['DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED'] as const;

        const portfolioWhere: Prisma.LoanWhereInput = {
            ...loanWhere,
            status: { in: [...portfolioStatuses] },
        };

        const portfolioLoans = await this.reportRepository.countLoans(portfolioWhere);

        const [activeLoans, totalOutstanding] = await Promise.all([
            this.reportRepository.countLoans({ ...loanWhere, status: { in: ['DISBURSED', 'ACTIVE'] } }),
            this.reportRepository.aggregateLoanBalance(portfolioWhere),
        ]);

        const disbursedAtRange = this.buildDateRange(params);
        const totalDisbursed = await this.reportRepository.aggregateDisbursements({
            status: 'DISBURSED',
            ...(disbursedAtRange ? { disbursedAt: disbursedAtRange } : {}),
            loan: loanWhere,
        });

        const paymentDateRange = this.buildDateRange(params);
        const [totalCollected, totalExpected] = await Promise.all([
            this.reportRepository.aggregatePayments({
                ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
                loan: loanWhere,
            }),
            this.reportRepository.aggregatePaymentSchedules({
                loan: loanWhere,
                ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
            }),
        ]);

        const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

        const nplLoans = await this.reportRepository.countLoans({
            ...portfolioWhere,
            OR: [{ status: 'NPL' }, { status: 'DEFAULTED' }, { overdueDays: { gte: 30 } }],
        });
        const nplRatio = portfolioLoans > 0 ? (nplLoans / portfolioLoans) * 100 : 0;

        const [current, dpd1to7, dpd8to29, dpd30to89, dpd90plus] = await Promise.all([
            this.reportRepository.countLoans({ ...portfolioWhere, overdueDays: 0 }),
            this.reportRepository.countLoans({ ...portfolioWhere, overdueDays: { gte: 1, lte: 7 } }),
            this.reportRepository.countLoans({ ...portfolioWhere, overdueDays: { gte: 8, lte: 29 } }),
            this.reportRepository.countLoans({ ...portfolioWhere, overdueDays: { gte: 30, lte: 89 } }),
            this.reportRepository.countLoans({ ...portfolioWhere, overdueDays: { gte: 90 } }),
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

        const nplLoans = await this.reportRepository.findLoans({
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

        const officers = await this.reportRepository.findOfficers({
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
            officers.map(async (officer: any) => {
                const officerLoanWhere: Prisma.LoanWhereInput = {
                    ...baseLoanWhere,
                    officerId: officer.id,
                };

                const [portfolioLoans, activeLoans, nplLoans] = await Promise.all([
                    this.reportRepository.countLoans({ ...officerLoanWhere, status: { in: [...portfolioStatuses] } }),
                    this.reportRepository.countLoans({ ...officerLoanWhere, status: { in: ['DISBURSED', 'ACTIVE'] } }),
                    this.reportRepository.countLoans({
                        ...officerLoanWhere,
                        OR: [{ status: 'NPL' }, { status: 'DEFAULTED' }, { overdueDays: { gte: 30 } }],
                    }),
                ]);

                const [totalCollected, totalExpected, disbursementAmount] = await Promise.all([
                    this.reportRepository.aggregatePayments({
                        ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
                        loan: officerLoanWhere,
                    }),
                    this.reportRepository.aggregatePaymentSchedules({
                        ...(paymentDateRange ? { paymentDate: paymentDateRange } : {}),
                        loan: officerLoanWhere,
                    }),
                    this.reportRepository.aggregateDisbursements({
                        status: 'DISBURSED',
                        ...(disbursedAtRange ? { disbursedAt: disbursedAtRange } : {}),
                        loan: officerLoanWhere,
                    }),
                ]);

                const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

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

        const loans = await this.reportRepository.findLoans({
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

        return loans.map((loan: any) => ({
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

        const payments = await this.reportRepository.findPayments({
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

        const totalCollected = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        return {
            summary: {
                totalPayments: payments.length,
                totalCollected: Number(totalCollected.toFixed(2)),
            },
            payments: payments.map((p: any) => ({
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

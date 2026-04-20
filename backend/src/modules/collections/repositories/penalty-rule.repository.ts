import { prisma } from '@config/database.config';

/**
 * Penalty Rule Repository - Database access ONLY
 */
export class PenaltyRuleRepository {
    /**
     * Find applicable penalty rule for a loan product and overdue days
     */
    async findForLoanProduct(loanProductId: string, overdueDays: number): Promise<any | null> {
        return prisma.penaltyRule.findFirst({
            where: {
                loanProductId,
                status: 'ACTIVE',
                daysOverdueFrom: { lte: overdueDays },
                OR: [{ daysOverdueTo: null }, { daysOverdueTo: { gte: overdueDays } }],
            },
            orderBy: [{ daysOverdueFrom: 'desc' }, { createdAt: 'desc' }],
        });
    }

    /**
     * Find default penalty rule (no product association)
     */
    async findDefault(overdueDays: number): Promise<any | null> {
        return prisma.penaltyRule.findFirst({
            where: {
                loanProductId: null,
                isDefault: true,
                status: 'ACTIVE',
                daysOverdueFrom: { lte: overdueDays },
                OR: [{ daysOverdueTo: null }, { daysOverdueTo: { gte: overdueDays } }],
            },
            orderBy: [{ daysOverdueFrom: 'desc' }, { createdAt: 'desc' }],
        });
    }

    /**
     * Find loan with penalty rules for a given overdue days
     */
    async findLoanWithPenaltyRules(loanId: string, overdueDays: number): Promise<any | null> {
        return prisma.loan.findUnique({
            where: { id: loanId },
            include: {
                loanProduct: {
                    include: {
                        penaltyRules: {
                            where: {
                                status: 'ACTIVE',
                                daysOverdueFrom: { lte: overdueDays },
                                OR: [{ daysOverdueTo: null }, { daysOverdueTo: { gte: overdueDays } }],
                            },
                            orderBy: [{ daysOverdueFrom: 'desc' }, { createdAt: 'desc' }],
                        },
                    },
                },
            },
        });
    }

    /**
     * Create default penalty rules for a loan product
     */
    async createMany(rules: Array<{
        loanProductId: string;
        ruleName: string;
        daysOverdueFrom: number;
        daysOverdueTo: number | null;
        penaltyType: string;
        penaltyRate: number;
        compoundInterest: boolean;
        compoundRate?: number;
        createdBy: string;
    }>): Promise<void> {
        await prisma.penaltyRule.createMany({ data: rules });
    }

    /**
     * Find all active rules for a product
     */
    async findByProduct(loanProductId: string): Promise<any[]> {
        return prisma.penaltyRule.findMany({
            where: { loanProductId, status: 'ACTIVE' },
            orderBy: { daysOverdueFrom: 'asc' },
        });
    }
}

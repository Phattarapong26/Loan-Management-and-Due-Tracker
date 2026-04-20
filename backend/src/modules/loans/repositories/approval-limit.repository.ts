import { PrismaClient } from '@prisma/client';
import { prisma } from '@config/database.config';

export class ApprovalLimitRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find first matching approval limit for a role and amount
     */
    async findFirstForRoleAndAmount(role: string, loanAmount: number) {
        return this.db.approvalLimit.findFirst({
            where: {
                role: role as any,
                status: 'ACTIVE',
                minAmount: { lte: loanAmount },
                OR: [
                    { maxAmount: { gte: loanAmount } },
                    { maxAmount: null },
                ],
            },
            orderBy: { maxAmount: 'desc' },
        });
    }

    /**
     * Find all active approval limits ordered by maxAmount ascending
     */
    async findAllActive() {
        return this.db.approvalLimit.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { maxAmount: 'asc' },
        });
    }
}

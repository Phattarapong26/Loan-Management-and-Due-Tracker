import { prisma } from '@config/database.config';

/**
 * Aging Analysis Repository - Database access ONLY
 */
export class AgingAnalysisRepository {
    async findByBranchAndDate(branchId: string | undefined, date: Date): Promise<any[]> {
        const where: any = {
            analysis_date: {
                gte: new Date(date.getFullYear(), date.getMonth(), 1),
                lte: new Date(date.getFullYear(), date.getMonth() + 1, 0),
            },
        };
        if (branchId) where.branch_id = branchId;
        return prisma.aging_analysis.findMany({
            where,
            select: { aging_bucket: true, loan_count: true, total_outstanding: true, branch_id: true, analysis_date: true },
        });
    }
}

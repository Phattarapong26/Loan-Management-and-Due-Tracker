import { prisma } from '@config/database.config';

/**
 * Collection Repository - Database access for collection filter queries
 */
export class CollectionRepository {
    /**
     * Raw SQL query for collection dashboard (optimized join)
     */
    async findSchedulesRaw(queryParams: any[]): Promise<any[]> {
        return prisma.$queryRawUnsafe<any[]>(...queryParams as [string, ...any[]]);
    }

    async findUnpaidSchedules(where: any): Promise<any[]> {
        return prisma.paymentSchedule.findMany({
            where,
            include: {
                loan: {
                    include: {
                        customer: { select: { id: true, businessName: true, phone: true } },
                    },
                },
            },
            orderBy: { paymentDate: 'asc' },
        });
    }

    async getLastContactsByCustomers(customerIds: string[]): Promise<Map<string, { contactDate: Date; contactStatus: string }>> {
        const contacts = await prisma.contactLog.findMany({
            where: { customerId: { in: customerIds } },
            orderBy: { contactDate: 'desc' },
            select: { customerId: true, contactDate: true, contactStatus: true },
        });
        const map = new Map<string, { contactDate: Date; contactStatus: string }>();
        for (const c of contacts) {
            if (!map.has(c.customerId)) {
                map.set(c.customerId, { contactDate: c.contactDate, contactStatus: c.contactStatus });
            }
        }
        return map;
    }

    async getNCBDataByCustomers(customerIds: string[]): Promise<Map<string, { nplStatus: boolean; creditUtilization?: number }>> {
        const records = await prisma.customerCreditBureau.findMany({
            where: { customerId: { in: customerIds } },
            orderBy: { checkDate: 'desc' },
            select: { customerId: true, nplStatus: true, totalOutstanding: true, totalLimit: true },
        });
        const map = new Map<string, { nplStatus: boolean; creditUtilization?: number }>();
        for (const r of records) {
            if (!map.has(r.customerId)) {
                const creditUtilization =
                    r.totalLimit && Number(r.totalLimit) > 0
                        ? (Number(r.totalOutstanding) / Number(r.totalLimit)) * 100
                        : undefined;
                map.set(r.customerId, { nplStatus: r.nplStatus ?? false, creditUtilization });
            }
        }
        return map;
    }

    async countActiveLoans(where: any): Promise<number> {
        return prisma.loan.count({ where });
    }
}

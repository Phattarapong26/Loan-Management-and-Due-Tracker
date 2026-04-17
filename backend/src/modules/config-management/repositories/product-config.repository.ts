import { PrismaClient, ProductConfig } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Product Config Repository - Database access ONLY
 */
export class ProductConfigRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find active product config by ID
     */
    async findActiveById(id: string): Promise<ProductConfig | null> {
        const now = new Date();
        return this.db.productConfig.findFirst({
            where: {
                id,
                status: 'ACTIVE',
                activeFrom: { lte: now },
                OR: [
                    { activeUntil: null },
                    { activeUntil: { gte: now } },
                ],
            },
        });
    }

    /**
     * Find active product config by code
     */
    async findActiveByCode(code: string): Promise<ProductConfig | null> {
        const now = new Date();
        return this.db.productConfig.findFirst({
            where: {
                productCode: code,
                status: 'ACTIVE',
                activeFrom: { lte: now },
                OR: [
                    { activeUntil: null },
                    { activeUntil: { gte: now } },
                ],
            },
        });
    }

    /**
     * List all active product configs
     */
    async listActive(): Promise<ProductConfig[]> {
        const now = new Date();
        return this.db.productConfig.findMany({
            where: {
                status: 'ACTIVE',
                activeFrom: { lte: now },
                OR: [
                    { activeUntil: null },
                    { activeUntil: { gte: now } },
                ],
            },
            orderBy: {
                productName: 'asc',
            },
        });
    }
}

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

    async findById(id: string): Promise<ProductConfig | null> {
        return this.db.productConfig.findUnique({ where: { id } });
    }

    async findLatestByCode(productCode: string): Promise<ProductConfig | null> {
        return this.db.productConfig.findFirst({
            where: { productCode },
            orderBy: { version: 'desc' },
        });
    }

    async create(data: {
        productCode: string;
        productName: string;
        description?: string;
        config: any;
        activeFrom: Date;
        activeUntil?: Date | null;
        version: number;
        createdBy: string;
    }): Promise<ProductConfig> {
        return this.db.productConfig.create({
            data: {
                productCode: data.productCode,
                productName: data.productName,
                description: data.description,
                config: data.config,
                status: 'ACTIVE',
                activeFrom: data.activeFrom,
                activeUntil: data.activeUntil ?? null,
                version: data.version,
                createdBy: data.createdBy,
            },
        });
    }

    async update(id: string, data: Partial<{
        productName: string;
        description: string;
        config: any;
        activeFrom: Date;
        activeUntil: Date | null;
    }>): Promise<ProductConfig> {
        return this.db.productConfig.update({ where: { id }, data });
    }

    async list(params: {
        page: number;
        limit: number;
        status?: string;
        search?: string;
    }): Promise<{ configs: ProductConfig[]; total: number }> {
        const where: any = {};
        if (params.status) where.status = params.status;
        if (params.search) {
            where.OR = [
                { productCode: { contains: params.search, mode: 'insensitive' } },
                { productName: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
            ];
        }
        const [configs, total] = await Promise.all([
            this.db.productConfig.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.db.productConfig.count({ where }),
        ]);
        return { configs, total };
    }
}
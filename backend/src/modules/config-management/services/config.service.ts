import { FastifyRequest } from 'fastify';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import { ProductConfigRepository } from '../repositories/product-config.repository';
import { prisma } from '@config/database.config';
import {
    CreateSystemConfigInput,
    UpdateSystemConfigInput,
    CreateProductConfigInput,
    UpdateProductConfigInput,
} from '../models/config.model';

/**
 * Config Service - Business logic for configuration management
 */
export class ConfigService {
    private systemConfigRepository: SystemConfigRepository;
    private productConfigRepository: ProductConfigRepository;

    constructor() {
        this.systemConfigRepository = new SystemConfigRepository();
        this.productConfigRepository = new ProductConfigRepository();
    }

    // ========== System Config Methods ==========

    /**
     * Create system config
     */
    async createSystemConfig(
        _request: FastifyRequest,
        input: CreateSystemConfigInput,
        userId: string
    ) {
        // Check if key already exists
        const existing = await this.systemConfigRepository.getByKey(input.key);
        if (existing) {
            throw new Error(`Config key '${input.key}' already exists`);
        }

        return this.systemConfigRepository.setValue(
            input.key,
            input.value,
            input.category,
            input.description,
            userId
        );
    }

    /**
     * Update system config
     */
    async updateSystemConfig(
        _request: FastifyRequest,
        key: string,
        input: UpdateSystemConfigInput,
        userId: string
    ) {
        const existing = await this.systemConfigRepository.getByKey(key);
        if (!existing) {
            throw new Error(`Config key '${key}' not found`);
        }

        return this.systemConfigRepository.setValue(
            key,
            input.value || existing.value,
            input.category || existing.category,
            input.description ?? existing.description ?? undefined,
            userId
        );
    }

    /**
     * Get system config by key
     */
    async getSystemConfig(key: string) {
        const config = await this.systemConfigRepository.getByKey(key);
        if (!config) {
            throw new Error(`Config key '${key}' not found`);
        }

        return config;
    }

    /**
     * List system configs
     */
    async listSystemConfigs(params: {
        page: number;
        limit: number;
        category?: string;
        search?: string;
    }) {
        let configs;
        let total;

        if (params.category) {
            configs = await this.systemConfigRepository.getByCategory(params.category);
            total = configs.length;
        } else {
            // For search, we need to query all and filter
            const allConfigs = await prisma.systemConfig.findMany({
                where: params.search
                    ? {
                          OR: [
                              { key: { contains: params.search, mode: 'insensitive' } },
                              { value: { contains: params.search, mode: 'insensitive' } },
                              { description: { contains: params.search, mode: 'insensitive' } },
                          ],
                      }
                    : {},
                orderBy: { key: 'asc' },
            });

            total = allConfigs.length;
            const start = (params.page - 1) * params.limit;
            const end = start + params.limit;
            configs = allConfigs.slice(start, end);
        }

        return {
            configs,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
        };
    }

    /**
     * Delete system config
     */
    async deleteSystemConfig(key: string) {
        const config = await this.systemConfigRepository.getByKey(key);
        if (!config) {
            throw new Error(`Config key '${key}' not found`);
        }

        await prisma.systemConfig.delete({
            where: { key },
        });

        return { message: 'Config deleted successfully' };
    }

    // ========== Product Config Methods ==========

    /**
     * Create product config
     */
    async createProductConfig(
        _request: FastifyRequest,
        input: CreateProductConfigInput,
        userId: string
    ) {
        // Check if product code already exists
        const existing = await this.productConfigRepository.findActiveByCode(input.productCode);
        if (existing) {
            throw new Error(`Product code '${input.productCode}' already exists`);
        }

        // Validate config structure
        this.validateProductConfig(input.config);

        // Get latest version for this product code
        const latest = await prisma.productConfig.findFirst({
            where: { productCode: input.productCode },
            orderBy: { version: 'desc' },
        });

        const version = latest ? latest.version + 1 : 1;

        return prisma.productConfig.create({
            data: {
                productCode: input.productCode,
                productName: input.productName,
                description: input.description,
                config: input.config as any,
                status: 'ACTIVE',
                activeFrom: new Date(input.activeFrom),
                activeUntil: input.activeUntil ? new Date(input.activeUntil) : null,
                version,
                createdBy: userId,
            },
        });
    }

    /**
     * Update product config
     */
    async updateProductConfig(
        _request: FastifyRequest,
        id: string,
        input: UpdateProductConfigInput
    ) {
        const existing = await prisma.productConfig.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error('Product config not found');
        }

        // If config is being updated, validate it
        if (input.config) {
            this.validateProductConfig(input.config);
        }

        const updateData: any = {};
        if (input.productName !== undefined) updateData.productName = input.productName;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.config !== undefined) updateData.config = input.config as any;
        if (input.activeFrom !== undefined) updateData.activeFrom = new Date(input.activeFrom);
        if (input.activeUntil !== undefined) updateData.activeUntil = input.activeUntil ? new Date(input.activeUntil) : null;

        return prisma.productConfig.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Get product config by ID
     */
    async getProductConfig(id: string) {
        const config = await prisma.productConfig.findUnique({
            where: { id },
        });

        if (!config) {
            throw new Error('Product config not found');
        }

        return config;
    }

    /**
     * List product configs
     */
    async listProductConfigs(params: {
        page: number;
        limit: number;
        status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
        search?: string;
    }) {
        const where: any = {};

        if (params.status) {
            where.status = params.status;
        }

        if (params.search) {
            where.OR = [
                { productCode: { contains: params.search, mode: 'insensitive' } },
                { productName: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [configs, total] = await Promise.all([
            prisma.productConfig.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.productConfig.count({ where }),
        ]);

        return {
            configs,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
        };
    }

    /**
     * Get active product configs (for loan creation dropdown)
     */
    async getActiveProductConfigs() {
        return this.productConfigRepository.listActive();
    }

    /**
     * Validate product config structure
     */
    private validateProductConfig(config: any): void {
        if (!config || typeof config !== 'object') {
            throw new Error('Product config must be a valid JSON object');
        }

        // Validate required fields
        if (!config.interest_config) {
            throw new Error('Product config must have interest_config');
        }

        if (!config.eligibility) {
            throw new Error('Product config must have eligibility');
        }

        // Validate interest_config structure
        const interestConfig = config.interest_config;
        if (!interestConfig.base_rate_type || !['MRR', 'MLR'].includes(interestConfig.base_rate_type)) {
            throw new Error('interest_config.base_rate_type must be MRR or MLR');
        }

        if (typeof interestConfig.margin !== 'number') {
            throw new Error('interest_config.margin must be a number');
        }

        // Validate eligibility structure
        const eligibility = config.eligibility;
        if (typeof eligibility.min_annual_revenue !== 'number' || eligibility.min_annual_revenue < 0) {
            throw new Error('eligibility.min_annual_revenue must be a positive number');
        }

        if (typeof eligibility.max_loan_amount !== 'number' || eligibility.max_loan_amount <= 0) {
            throw new Error('eligibility.max_loan_amount must be a positive number');
        }
    }
}

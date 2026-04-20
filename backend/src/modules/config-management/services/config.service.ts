import { FastifyRequest } from 'fastify';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import { ProductConfigRepository } from '../repositories/product-config.repository';
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

    async listSystemConfigs(params: { page: number; limit: number; category?: string; search?: string }) {
        if (params.category) {
            const configs = await this.systemConfigRepository.getByCategory(params.category);
            return { configs, total: configs.length, page: params.page, limit: params.limit, totalPages: Math.ceil(configs.length / params.limit) };
        }
        const { configs, total } = await this.systemConfigRepository.list({ page: params.page, limit: params.limit, search: params.search });
        return { configs, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
    }

    async deleteSystemConfig(key: string) {
        const config = await this.systemConfigRepository.getByKey(key);
        if (!config) throw new Error(`Config key '${key}' not found`);
        await this.systemConfigRepository.delete(key);
        return { message: 'Config deleted successfully' };
    }

    // ========== Product Config Methods ==========

    async createProductConfig(_request: FastifyRequest, input: CreateProductConfigInput, userId: string) {
        const existing = await this.productConfigRepository.findActiveByCode(input.productCode);
        if (existing) throw new Error(`Product code '${input.productCode}' already exists`);
        this.validateProductConfig(input.config);
        const latest = await this.productConfigRepository.findLatestByCode(input.productCode);
        const version = latest ? latest.version + 1 : 1;
        return this.productConfigRepository.create({
            productCode: input.productCode,
            productName: input.productName,
            description: input.description,
            config: input.config,
            activeFrom: new Date(input.activeFrom),
            activeUntil: input.activeUntil ? new Date(input.activeUntil) : null,
            version,
            createdBy: userId,
        });
    }

    async updateProductConfig(_request: FastifyRequest, id: string, input: UpdateProductConfigInput) {
        const existing = await this.productConfigRepository.findById(id);
        if (!existing) throw new Error('Product config not found');
        if (input.config) this.validateProductConfig(input.config);
        const updateData: any = {};
        if (input.productName !== undefined) updateData.productName = input.productName;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.config !== undefined) updateData.config = input.config;
        if (input.activeFrom !== undefined) updateData.activeFrom = new Date(input.activeFrom);
        if (input.activeUntil !== undefined) updateData.activeUntil = input.activeUntil ? new Date(input.activeUntil) : null;
        return this.productConfigRepository.update(id, updateData);
    }

    async getProductConfig(id: string) {
        const config = await this.productConfigRepository.findById(id);
        if (!config) throw new Error('Product config not found');
        return config;
    }

    async listProductConfigs(params: { page: number; limit: number; status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; search?: string }) {
        const { configs, total } = await this.productConfigRepository.list(params);
        return { configs, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
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

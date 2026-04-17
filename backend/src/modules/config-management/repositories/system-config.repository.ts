import { PrismaClient, SystemConfig } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * System Config Repository - Database access ONLY
 * For dynamic configuration values (no hardcoding)
 */
export class SystemConfigRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Get config value by key
     */
    async getByKey(key: string): Promise<SystemConfig | null> {
        return this.db.systemConfig.findUnique({
            where: { key },
        });
    }

    /**
     * Get config value (with default fallback)
     */
    async getValue(key: string, defaultValue: string): Promise<string> {
        const config = await this.getByKey(key);
        return config?.value || defaultValue;
    }

    /**
     * Get configs by category
     */
    async getByCategory(category: string): Promise<SystemConfig[]> {
        return this.db.systemConfig.findMany({
            where: { category },
        });
    }

    /**
     * Set config value
     */
    async setValue(
        key: string,
        value: string,
        category: string,
        description?: string,
        updatedBy?: string
    ): Promise<SystemConfig> {
        return this.db.systemConfig.upsert({
            where: { key },
            update: {
                value,
                description,
                updatedBy,
            },
            create: {
                key,
                value,
                category,
                description,
                updatedBy,
                dataType: 'STRING',
                createdBy: updatedBy || 'system',
            },
        });
    }
}

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

    async list(params: { page: number; limit: number; search?: string }): Promise<{ configs: SystemConfig[]; total: number }> {
        const where: any = params.search
            ? {
                  OR: [
                      { key: { contains: params.search, mode: 'insensitive' } },
                      { value: { contains: params.search, mode: 'insensitive' } },
                      { description: { contains: params.search, mode: 'insensitive' } },
                  ],
              }
            : {};
        const all = await this.db.systemConfig.findMany({ where, orderBy: { key: 'asc' } });
        const start = (params.page - 1) * params.limit;
        return { configs: all.slice(start, start + params.limit), total: all.length };
    }

    async delete(key: string): Promise<void> {
        await this.db.systemConfig.delete({ where: { key } });
    }

    /**
     * Get next sequence number atomically (thread-safe via transaction)
     */
    async getNextSequence(sequenceKey: string): Promise<number> {
        const configKey = `SEQ:${sequenceKey}`;

        return this.db.$transaction(async (tx) => {
            const config = await tx.systemConfig.findUnique({ where: { key: configKey } });

            let current = 0;
            if (config) {
                current = parseInt(config.value, 10);
                if (isNaN(current)) current = 0;
            }

            const next = current + 1;

            await tx.systemConfig.upsert({
                where: { key: configKey },
                create: {
                    key: configKey,
                    value: next.toString(),
                    category: 'SEQUENCE',
                    description: `Auto-generated sequence number for ${sequenceKey}`,
                    dataType: 'INTEGER',
                    createdBy: 'SYSTEM',
                },
                update: { value: next.toString() },
            });

            return next;
        });
    }
}
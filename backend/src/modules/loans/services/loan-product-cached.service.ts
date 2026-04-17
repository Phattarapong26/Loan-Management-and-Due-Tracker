/**
 * Cached Loan Product Service
 * 
 * Wrapper around LoanProductService with smart caching
 * - Cache read operations (GET)
 * - Invalidate cache on write operations (CREATE, UPDATE, DELETE)
 * - Maintain real-time accuracy
 */

import { LoanProduct, Prisma } from '@prisma/client';
import { LoanProductService } from './loan-product.service';
import { cacheService } from '@core/services/cache.service';
import { CACHE_STRATEGIES, CACHE_KEYS } from '@core/config/cache-strategy.config';
import { logger } from '@utils/common/logger.util';

export class CachedLoanProductService extends LoanProductService {
    /**
     * Get all products with caching
     * Cache key includes filters to avoid stale data
     */
    async getAllProducts(filters?: {
        status?: string;
        isPopular?: boolean;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: LoanProduct[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        // Generate cache key based on filters
        const cacheKey = this.generateListCacheKey(filters);

        // Try cache first
        return await cacheService.wrap(
            cacheKey,
            () => super.getAllProducts(filters),
            CACHE_STRATEGIES.LOAN_PRODUCTS
        );
    }

    /**
     * Get product by ID with caching
     */
    async getProductById(id: string): Promise<LoanProduct> {
        const cacheKey = CACHE_KEYS.loanProductDetail(id);

        return await cacheService.wrap(
            cacheKey,
            () => super.getProductById(id),
            CACHE_STRATEGIES.LOAN_PRODUCTS
        );
    }

    /**
     * Get product by code with caching
     */
    async getProductByCode(productCode: string): Promise<LoanProduct | null> {
        const cacheKey = `loan-product:code:${productCode}`;

        return await cacheService.wrap(
            cacheKey,
            () => super.getProductByCode(productCode),
            CACHE_STRATEGIES.LOAN_PRODUCTS
        );
    }

    /**
     * Get product stats with caching
     */
    async getProductStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
        popular: number;
    }> {
        const cacheKey = 'loan-products:stats';

        return await cacheService.wrap(
            cacheKey,
            () => super.getProductStats(),
            CACHE_STRATEGIES.LOAN_PRODUCTS
        );
    }

    /**
     * Create product and invalidate cache
     */
    async createProduct(
        data: Omit<Prisma.LoanProductCreateInput, 'createdBy'> & {
            createdBy: string;
            yearInterestTiers?: Array<{
                tierType: string;
                startYear: number;
                endYear: string;
                rate?: number;
                formula?: string;
                minRate?: number;
                maxRate?: number;
            }>;
        }
    ): Promise<LoanProduct> {
        // Create product
        const product = await super.createProduct(data);

        // Invalidate all loan product caches
        await this.invalidateCache();

        logger.info({ productId: product.id }, '✅ Loan product created - cache invalidated');

        return product;
    }

    /**
     * Update product and invalidate cache
     */
    async updateProduct(
        id: string,
        data: Prisma.LoanProductUpdateInput & {
            yearInterestTiers?: Array<{
                id?: string;
                tierType: string;
                startYear: number;
                endYear: string;
                rate?: number;
                formula?: string;
                minRate?: number;
                maxRate?: number;
            }>;
        }
    ): Promise<LoanProduct> {
        // Update product
        const product = await super.updateProduct(id, data);

        // Invalidate all loan product caches
        await this.invalidateCache();

        logger.info({ productId: id }, '✅ Loan product updated - cache invalidated');

        return product;
    }

    /**
     * Delete product and invalidate cache
     */
    async deleteProduct(id: string): Promise<void> {
        // Delete product
        await super.deleteProduct(id);

        // Invalidate all loan product caches
        await this.invalidateCache();

        logger.info({ productId: id }, '✅ Loan product deleted - cache invalidated');
    }

    /**
     * Invalidate all loan product caches
     */
    private async invalidateCache(): Promise<void> {
        await cacheService.deleteByTag('loan-products');
    }

    /**
     * Generate cache key for list queries
     */
    private generateListCacheKey(filters?: {
        status?: string;
        isPopular?: boolean;
        search?: string;
        page?: number;
        limit?: number;
    }): string {
        const parts = ['loan-products'];

        if (filters?.status) parts.push(`status:${filters.status}`);
        if (filters?.isPopular !== undefined) parts.push(`popular:${filters.isPopular}`);
        if (filters?.search) parts.push(`search:${filters.search}`);
        if (filters?.page) parts.push(`page:${filters.page}`);
        if (filters?.limit) parts.push(`limit:${filters.limit}`);

        return parts.join(':');
    }
}

// Export singleton instance
export const cachedLoanProductService = new CachedLoanProductService();

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Product Budget Repository - Database access ONLY
 * No business logic, just Prisma queries
 */
export class ProductBudgetRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find budget by product, fiscal year, and optional quarter
     */
    async findByProduct(
        productId: string,
        fiscalYear: number,
        quarter?: number,
        tx?: Prisma.TransactionClient
    ): Promise<any | null> {
        const db = tx || this.db;
        const where: any = { product_id: productId, fiscal_year: fiscalYear };
        if (quarter) where.quarter = quarter;

        return db.product_budgets.findFirst({
            where,
            include: {
                loan_products: true,
                users_product_budgets_budget_ownerTousers: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });
    }

    /**
     * Find budgets for multiple products (batch)
     */
    async findManyByProducts(
        productIds: string[],
        fiscalYear: number,
        quarter?: number
    ): Promise<any[]> {
        const where: any = { product_id: { in: productIds }, fiscal_year: fiscalYear };
        if (quarter) where.quarter = quarter;

        return this.db.product_budgets.findMany({
            where,
            select: {
                id: true,
                product_id: true,
                product_code: true,
                product_name: true,
                fiscal_year: true,
                quarter: true,
                total_budget_amount: true,
                available_amount: true,
                committed_amount: true,
                disbursed_amount: true,
                pending_amount: true,
                utilization_rate: true,
                warning_threshold: true,
                critical_threshold: true,
                budget_status: true,
                created_at: true,
                updated_at: true,
            },
        });
    }

    /**
     * Find all budgets for a product
     */
    async findAllByProduct(productId: string): Promise<any[]> {
        return this.db.product_budgets.findMany({
            where: { product_id: productId },
            include: {
                loan_products: true,
                users_product_budgets_budget_ownerTousers: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
            orderBy: [{ fiscal_year: 'desc' }, { quarter: 'asc' }],
        });
    }

    /**
     * Find budget by ID
     */
    async findById(id: string, tx?: Prisma.TransactionClient): Promise<any | null> {
        const db = tx || this.db;
        return db.product_budgets.findUnique({ where: { id } });
    }

    /**
     * Check if budget exists for a period
     */
    async findExisting(productId: string, fiscalYear: number, quarter?: number | null): Promise<any | null> {
        return this.db.product_budgets.findFirst({
            where: { product_id: productId, fiscal_year: fiscalYear, quarter: quarter || null },
        });
    }

    /**
     * Create a new budget
     */
    async create(data: {
        product_id: string;
        product_code: string;
        product_name: string;
        fiscal_year: number;
        quarter?: number;
        total_budget_amount: number;
        available_amount: number;
        committed_amount: number;
        disbursed_amount: number;
        pending_amount: number;
        utilization_rate: number;
        warning_threshold: number;
        critical_threshold: number;
        budget_status: string;
        budget_owner?: string;
        notes?: string;
        created_by: string;
    }): Promise<any> {
        return this.db.product_budgets.create({
            data,
            include: { loan_products: true },
        });
    }

    /**
     * Update budget amounts
     */
    async update(id: string, data: Partial<{
        total_budget_amount: number;
        available_amount: number;
        committed_amount: number;
        disbursed_amount: number;
        utilization_rate: number;
        updated_at: Date;
    }>, tx?: Prisma.TransactionClient): Promise<any> {
        const db = tx || this.db;
        return db.product_budgets.update({ where: { id }, data });
    }

    /**
     * Find all budgets (optionally filtered by product)
     */
    async findAll(productId?: string): Promise<any[]> {
        const where: any = {};
        if (productId) where.product_id = productId;
        return this.db.product_budgets.findMany({
            where,
            include: { loan_products: true },
        });
    }

    /**
     * Find budget consumption history for a budget
     */
    async findConsumptionHistory(budgetId: string): Promise<any[]> {
        return this.db.budget_consumption.findMany({
            where: { product_budget_id: budgetId },
            include: {
                loans: {
                    include: {
                        customer: { select: { customerCode: true, businessName: true } },
                    },
                },
                branches: { select: { code: true, name: true } },
            },
            orderBy: { consumption_date: 'desc' },
        });
    }

    /**
     * Update budget consumption record to DISBURSED
     */
    async updateConsumptionToDisbursed(
        budgetId: string,
        loanId: string,
        disbursedAmount: number
    ): Promise<void> {
        await this.db.budget_consumption.updateMany({
            where: { product_budget_id: budgetId, loan_id: loanId, consumption_type: 'COMMITMENT', status: 'COMMITTED' },
            data: {
                consumption_type: 'DISBURSEMENT',
                status: 'DISBURSED',
                updated_at: new Date(),
                disbursed_amount: disbursedAmount,
            },
        });
    }

    /**
     * Update budget consumption record to RELEASED
     */
    async updateConsumptionToReleased(
        budgetId: string,
        loanId: string,
        releasedAmount: number
    ): Promise<void> {
        await this.db.budget_consumption.updateMany({
            where: { product_budget_id: budgetId, loan_id: loanId, status: 'COMMITTED' },
            data: {
                status: 'RELEASED',
                released_at: new Date(),
                updated_at: new Date(),
                released_amount: releasedAmount,
            },
        });
    }
}

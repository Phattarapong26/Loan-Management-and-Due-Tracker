import { PrismaClient, Customer, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';
import { EncryptionUtil } from '@utils/security/encryption.util';

/**
 * Customer Repository - Database access ONLY
 * No business logic, just Prisma queries
 */
export class CustomerRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Find customer by ID
     */
    async findById(id: string, branchId?: string): Promise<Customer | null> {
        return this.db.customer.findFirst({
            where: {
                id,
                ...(branchId && { branchId }),
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Find customer by Tax ID (encrypted)
     */
    async findByTaxId(taxId: string): Promise<Customer | null> {
        // Tax ID is encrypted, so we need to search by comparing encrypted values
        // This is not efficient for large datasets, but necessary for security
        const customers = await this.db.customer.findMany({
            where: {
                status: 'ACTIVE',
            },
        });

        for (const customer of customers) {
            try {
                const decrypted = EncryptionUtil.decrypt(customer.taxId);
                if (decrypted === taxId) {
                    return customer;
                }
            } catch {
                // Skip if decryption fails
                continue;
            }
        }

        return null;
    }

    /**
     * Check if Tax ID exists (for duplicate detection)
     */
    async taxIdExists(taxId: string, excludeCustomerId?: string): Promise<boolean> {
        const customer = await this.findByTaxId(taxId);
        if (!customer) return false;
        
        // If excludeCustomerId is provided, check if it's the same customer
        if (excludeCustomerId && customer.id === excludeCustomerId) {
            return false; // Not a duplicate, it's the same customer
        }
        
        return true;
    }

    /**
     * Create customer
     */
    async create(data: {
        branchId: string;
        customerCode: string;
        businessName: string;
        businessType?: string;
        phone: string;
        email?: string;
        address?: string;
        thaiId?: string;
        taxId: string;
        annualRevenue?: number;
        createdBy: string;
    }): Promise<Customer> {
        // Encrypt sensitive data
        const encryptedTaxId = EncryptionUtil.encrypt(data.taxId);
        const encryptedThaiId = data.thaiId ? EncryptionUtil.encrypt(data.thaiId) : null;

        // Generate a simple UUID-like string
        return this.db.customer.create({
            data: {
                branchId: data.branchId,
                customerCode: data.customerCode,
                businessName: data.businessName,
                businessType: data.businessType,
                phone: data.phone,
                email: data.email,
                address: data.address,
                thaiId: encryptedThaiId,
                taxId: encryptedTaxId,
                annualRevenue: data.annualRevenue,
                createdBy: data.createdBy,
            },
        });
    }

    /**
     * Update customer
     */
    async update(
        id: string,
        data: {
            businessName?: string;
            businessType?: string;
            phone?: string;
            email?: string;
            address?: string;
            thaiId?: string;
            taxId?: string;
            annualRevenue?: number;
            status?: 'ACTIVE' | 'INACTIVE';
            documentComplete?: boolean;
            lineUserId?: string | null;
            lineLinkedAt?: Date | null;
            // Company info fields
            registeredCapital?: number;
            registrationDate?: string;
            registrationNumber?: string;
            numberOfEmployees?: number;
            businessAgeYears?: number;
        },
        branchId?: string
    ): Promise<Customer> {
        const updateData: Prisma.CustomerUpdateInput = {};

        if (data.businessName !== undefined) updateData.businessName = data.businessName;
        if (data.businessType !== undefined) updateData.businessType = data.businessType;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.annualRevenue !== undefined) updateData.annualRevenue = data.annualRevenue;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.documentComplete !== undefined) updateData.documentComplete = data.documentComplete;
        if (data.lineUserId !== undefined) updateData.lineUserId = data.lineUserId;
        if (data.lineLinkedAt !== undefined) updateData.lineLinkedAt = data.lineLinkedAt;
        // Company info fields
        if (data.registeredCapital !== undefined) updateData.registered_capital = data.registeredCapital;
        if (data.registrationDate !== undefined) updateData.business_registration_date = data.registrationDate ? new Date(data.registrationDate) : null;
        if (data.registrationNumber !== undefined) updateData.business_registration_type = data.registrationNumber;
        if (data.numberOfEmployees !== undefined) updateData.number_of_employees = data.numberOfEmployees;
        if (data.businessAgeYears !== undefined) updateData.business_age_years = data.businessAgeYears;

        // Encrypt Thai ID if provided
        if (data.thaiId !== undefined) {
            updateData.thaiId = data.thaiId ? EncryptionUtil.encrypt(data.thaiId) : null;
        }

        // Encrypt Tax ID if provided
        if (data.taxId !== undefined) {
            updateData.taxId = EncryptionUtil.encrypt(data.taxId);
        }

        return this.db.customer.update({
            where: {
                id,
                ...(branchId && { branchId }),
            },
            data: updateData,
        });
    }

    /**
     * Update customer with AI-extracted data
     */
    async updateWithAIData(
        id: string,
        data: {
            aiExtractedData: any;
            aiConfidenceScore: number;
            aiProcessedAt: Date;
            aiWarnings: string[];
            annualRevenue?: number;
            netProfit?: number;
            totalAssets?: number;
            totalLiabilities?: number;
            debtToEquityRatio?: number;
        },
        branchId?: string
    ): Promise<Customer> {
        return this.db.customer.update({
            where: {
                id,
                ...(branchId && { branchId }),
            },
            data: {
                aiExtractedData: data.aiExtractedData,
                aiConfidenceScore: data.aiConfidenceScore,
                aiProcessedAt: data.aiProcessedAt,
                aiWarnings: data.aiWarnings,
                annualRevenue: data.annualRevenue,
                netProfit: data.netProfit,
                totalAssets: data.totalAssets,
                totalLiabilities: data.totalLiabilities,
                debtToEquityRatio: data.debtToEquityRatio,
            },
        });
    }

    /**
     * List customers with pagination and filters
     */
    async list(params: {
        branchId?: string;
        officerId?: string; // Add officerId filter
        page: number;
        limit: number;
        status?: 'ACTIVE' | 'INACTIVE';
        search?: string;
    }): Promise<{ customers: any[]; total: number }> {
        const where: Prisma.CustomerWhereInput = {};

        if (params.branchId) {
            where.branchId = params.branchId;
        }

        // Add officerId filter if provided
        if (params.officerId) {
            where.createdBy = params.officerId;
        }

        if (params.status) {
            where.status = params.status;
        }

        if (params.search) {
            where.OR = [
                { businessName: { contains: params.search, mode: 'insensitive' } },
                { customerCode: { contains: params.search, mode: 'insensitive' } },
                { phone: { contains: params.search } },
            ];
        }

        const [customers, total] = await Promise.all([
            this.db.customer.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
                // ✅ Select only needed fields for list view
                select: {
                    id: true,
                    customerCode: true,
                    businessName: true,
                    businessType: true,
                    phone: true,
                    email: true,
                    address: true,
                    taxId: true,
                    thaiId: true,
                    status: true,
                    annualRevenue: true,
                    createdAt: true,
                    updatedAt: true,
                    branchId: true,
                    createdBy: true,
                    documentComplete: true,
                    _count: {
                        select: {
                            loans: true,
                        },
                    },
                    loans: {
                        select: {
                            id: true,
                            principal: true,
                            status: true,
                        },
                        take: 5, // ✅ จำกัดแค่ 5 loans ล่าสุด
                        orderBy: { createdAt: 'desc' },
                        where: { 
                            status: { 
                                in: ['ACTIVE', 'PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'NPL', 'DEFAULTED'] 
                            } 
                        },
                    },
                },
            }),
            this.db.customer.count({ where }),
        ]);

        return { customers, total };
    }

    /**
     * Delete customer by ID
     */
    async delete(id: string): Promise<void> {
        await this.db.customer.delete({
            where: { id },
        });
    }

    /**
     * Generate unique customer code
     */
    async generateCustomerCode(branchCode: string): Promise<string> {
        const prefix = `CUST${branchCode}`;
        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // Find last customer code for today
        const lastCustomer = await this.db.customer.findFirst({
            where: {
                customerCode: {
                    startsWith: `${prefix}${dateStr}`,
                },
            },
            orderBy: {
                customerCode: 'desc',
            },
        });

        let sequence = 1;
        if (lastCustomer) {
            const lastSeq = parseInt(lastCustomer.customerCode.slice(-4), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(4, '0')}`;
    }

    /**
     * Save detailed parsed Excel data to multiple related tables
     * Handles all 9 categories: VAT, Financials, Investments, etc.
     */
    async saveParsedExcelData(customerId: string, data: any): Promise<void> {
        // Use a transaction to ensure all data is consistent
        await this.db.$transaction(async (tx) => {
            // 1. Update Core Customer Data (Financials & AI Metadata)
            const extractedData = data.extractedData || data; // Handle both wrapped and direct structure

            // Extract latest years for core fields
            const latestFinancial = extractedData.financialStatement?.years?.slice(-1)?.[0];
            const latestBalance = extractedData.balanceSheet?.years?.slice(-1)?.[0];
            const investment = extractedData.investmentStructure;

            const updatePayload: any = {
                aiExtractedData: extractedData,
                aiConfidenceScore: data.confidenceScore || 0,
                aiProcessedAt: new Date(),
                aiWarnings: data.warnings || [],
            };

            if (latestFinancial?.revenue) updatePayload.annualRevenue = latestFinancial.revenue;
            if (latestFinancial?.netProfit) updatePayload.netProfit = latestFinancial.netProfit;
            if (latestBalance?.totalAssets) updatePayload.totalAssets = latestBalance.totalAssets;
            if (latestBalance?.totalLiabilities) updatePayload.totalLiabilities = latestBalance.totalLiabilities;
            if (investment?.debtToEquityRatio) updatePayload.debtToEquityRatio = investment.debtToEquityRatio;

            // Shareholders
            if (extractedData.shareholders) updatePayload.shareholders = extractedData.shareholders;

            await tx.customer.update({
                where: { id: customerId },
                data: updatePayload
            });

            // 2. Clear old data to prevent stale records (optional strategy, or upsert)
            // For simplicity and correctness with full document refresh, we delete old detailed records
            await tx.customerVATRecord.deleteMany({ where: { customerId } });
            await tx.customerFinancialStatement.deleteMany({ where: { customerId } });
            await tx.customerInvestment.deleteMany({ where: { customerId } });
            await tx.customerWorkingCapital.deleteMany({ where: { customerId } });
            await tx.customerProjection.deleteMany({ where: { customerId } });
            await tx.customerCreditBureau.deleteMany({ where: { customerId } });
            await tx.customerBankStatement.deleteMany({ where: { customerId } });
            await tx.customerComment.deleteMany({ where: { customerId } });
            await tx.customerBusinessHistory.deleteMany({ where: { customerId } });

            // 3. Insert New Data

            // 3.1 VAT Records
            if (extractedData.vatReport?.records?.length > 0) {
                await tx.customerVATRecord.createMany({
                    data: extractedData.vatReport.records.map((r: any) => ({
                        customerId,
                        month: r.month,
                        year: new Date().getFullYear(), // Default current year if not extracted? Or extract from month if possible
                        salesAmount: r.salesAmount,
                        salesTax: r.salesTax,
                        purchaseAmount: r.purchaseAmount,
                        purchaseTax: r.purchaseTax,
                        taxPayable: r.taxPayable,
                        details: r
                    }))
                });
            }

            // 3.2 Financial Statements (Combine P&L and Balance Sheet by Year)
            const yearsMap = new Map<string, any>();

            // Process P&L
            extractedData.financialStatement?.years?.forEach((y: any) => {
                const existing = yearsMap.get(y.year) || { year: y.year };
                existing.revenue = y.revenue;
                existing.grossProfit = y.grossProfit;
                existing.netProfit = y.netProfit;
                yearsMap.set(y.year, existing);
            });

            // Process Balance Sheet
            extractedData.balanceSheet?.years?.forEach((y: any) => {
                const existing = yearsMap.get(y.year) || { year: y.year };
                existing.totalAssets = y.totalAssets;
                existing.totalLiabilities = y.totalLiabilities;
                existing.totalEquity = y.totalEquity;
                existing.currentAssets = y.currentAssets;
                existing.nonCurrentAssets = y.nonCurrentAssets;
                existing.currentLiabilities = y.currentLiabilities;
                existing.nonCurrentLiabilities = y.nonCurrentLiabilities;
                yearsMap.set(y.year, existing);
            });

            if (yearsMap.size > 0) {
                await tx.customerFinancialStatement.createMany({
                    data: Array.from(yearsMap.values()).map(y => ({
                        customerId,
                        ...y
                    }))
                });
            }

            // 3.3 Investment Structure
            if (investment?.items?.length > 0) {
                await tx.customerInvestment.createMany({
                    data: investment.items.map((i: any) => ({
                        customerId,
                        description: i.name,
                        totalAmount: i.total,
                        ownShare: i.ownCapital,
                        loanShare: (i.total || 0) - (i.ownCapital || 0)
                    }))
                });
            }

            // 3.4 Working Capital
            if (extractedData.workingCapitalAnalysis) {
                const wc = extractedData.workingCapitalAnalysis;
                await tx.customerWorkingCapital.create({
                    data: {
                        customerId,
                        totalLimit: wc.totalNeeded || 0,
                        usedLimit: wc.additionalNeeded || 0,
                        stockAmount: wc.stock,
                        receivableDays: wc.receivables?.days, // Assuming structure
                        payableDays: wc.payables?.days,
                        details: wc
                    }
                });
            }

            // 3.5 Projections
            if (extractedData.projections) {
                const p = extractedData.projections;
                const projYears = p.headers || [];
                // Transform parallel arrays to objects
                const projectionsData = projYears.map((year: string, idx: number) => ({
                    customerId,
                    year: year,
                    revenue: p.revenue?.[idx],
                    costOfSales: p.costOfSales?.[idx],
                    grossProfit: p.grossProfit?.[idx],
                    expenses: (p.adminExpenses?.[idx] || 0) + (p.sellingExpenses?.[idx] || 0),
                    netProfit: p.netProfit?.[idx],
                    dscr: p.dscr?.[idx]
                })).filter((d: any) => d.revenue || d.netProfit); // Filter empty columns

                if (projectionsData.length > 0) {
                    await tx.customerProjection.createMany({ data: projectionsData });
                }
            }

            // 3.6 Credit Bureau
            const cb = extractedData.creditBureau;
            if (cb) {
                // Borrower
                if (cb.borrower) {
                    await tx.customerCreditBureau.create({
                        data: {
                            customerId,
                            type: 'BORROWER',
                            name: cb.borrower.name,
                            checkDate: cb.borrower.checkDate ? new Date() : undefined, // Parse date string if needed
                            totalLimit: cb.borrower.totalLimit,
                            totalOutstanding: cb.borrower.totalOutstanding,
                            numberOfAccounts: cb.borrower.accounts?.length,
                            accounts: cb.borrower.accounts
                        }
                    });
                }
                // Guarantors
                if (cb.guarantors?.length > 0) {
                    await tx.customerCreditBureau.createMany({
                        data: cb.guarantors.map((g: any) => ({
                            customerId,
                            type: 'GUARANTOR',
                            name: g.name,
                            totalLimit: g.totalLimit,
                            totalOutstanding: g.totalOutstanding,
                            numberOfAccounts: g.accounts?.length,
                            accounts: g.accounts
                        }))
                    });
                }
            }

            // 3.7 Bank Statements
            const bankAccounts = extractedData.bankStatementAccounts;
            if (bankAccounts?.length > 0) {
                for (const acc of bankAccounts) {
                    await tx.customerBankStatement.create({
                        data: {
                            customerId,
                            bankName: acc.bankName,
                            accountNumber: acc.accountNumber,
                            months: {
                                create: acc.months?.map((m: any) => ({
                                    month: m.month,
                                    withdrawCount: m.withdrawCount,
                                    withdrawAmount: m.withdrawAmount,
                                    depositCount: m.depositCount,
                                    depositAmount: m.depositAmount,
                                    balance: m.balance
                                }))
                            }
                        }
                    });
                }
            }

            // 3.8 Comments
            if (extractedData.comments?.length > 0) {
                await tx.customerComment.createMany({
                    data: extractedData.comments.map((c: string) => ({
                        customerId,
                        content: c,
                        topic: 'Approval Comment'
                    }))
                });
            }

            // 3.9 Business History
            if (extractedData.businessHistory) {
                const bh = extractedData.businessHistory;
                if (bh.executives?.length > 0) {
                    await tx.customerBusinessHistory.create({
                        data: {
                            customerId,
                            type: 'EXECUTIVES',
                            details: bh.executives
                        }
                    });
                }
                if (bh.shareholding?.length > 0) {
                    await tx.customerBusinessHistory.create({
                        data: {
                            customerId,
                            type: 'SHAREHOLDERS',
                            details: bh.shareholding
                        }
                    });
                }
            }
        });
    }

    /**
     * Find customers with active loans for a given officer (for contact logging)
     */
    async findWithActiveLoansByOfficer(officerId: string, take: number = 10): Promise<Array<{
        id: string;
        businessName: string;
        loans: Array<{ id: string; overdueDays: number }>;
    }>> {
        return this.db.customer.findMany({
            where: {
                loans: {
                    some: {
                        officerId,
                        status: { in: ['ACTIVE', 'DISBURSED'] },
                    },
                },
            },
            select: {
                id: true,
                businessName: true,
                loans: {
                    where: {
                        officerId,
                        status: { in: ['ACTIVE', 'DISBURSED'] },
                    },
                    select: { id: true, overdueDays: true },
                },
            },
            take,
        }) as any;
    }

    /**
     * Find latest credit bureau record for a customer (for getLoan credit assessment)
     */
    async findLatestCreditBureau(customerId: string): Promise<{
        nplStatus: boolean | null;
        totalLimit: any;
        totalOutstanding: any;
    } | null> {
        return this.db.customerCreditBureau.findFirst({
            where: { customerId },
            orderBy: [{ createdAt: 'desc' }],
            select: { nplStatus: true, totalLimit: true, totalOutstanding: true },
        });
    }

    /**
     * Find latest credit bureau records for multiple customers (for listLoans credit assessment)
     */
    async findCreditBureauByCustomerIds(customerIds: string[]): Promise<Array<{
        customerId: string;
        nplStatus: boolean | null;
        totalLimit: any;
        totalOutstanding: any;
    }>> {
        if (customerIds.length === 0) return [];
        return this.db.customerCreditBureau.findMany({
            where: { customerId: { in: customerIds } },
            orderBy: [{ createdAt: 'desc' }],
            select: { customerId: true, nplStatus: true, totalLimit: true, totalOutstanding: true },
        });
    }

    // ── CustomerActiveProduct methods ──────────────────────────────────────

    async findActiveProduct(customerId: string): Promise<any | null> {
        return this.db.customerActiveProduct.findFirst({
            where: { customerId, status: 'ACTIVE' },
            include: { loanProduct: true, loan: true },
        });
    }

    async findActiveProductByLoanId(loanId: string): Promise<any | null> {
        return this.db.customerActiveProduct.findFirst({
            where: { loanId, status: 'ACTIVE' },
        });
    }

    async findActiveProductExists(customerId: string): Promise<boolean> {
        const record = await this.db.customerActiveProduct.findFirst({
            where: { customerId, status: 'ACTIVE' },
            select: { id: true },
        });
        return !!record;
    }

    async createActiveProduct(data: {
        customerId: string;
        loanProductId: string;
        loanId: string;
        status: string;
    }): Promise<void> {
        await this.db.customerActiveProduct.create({ data });
    }

    async updateActiveProductStatus(id: string, status: string): Promise<void> {
        await this.db.customerActiveProduct.update({
            where: { id },
            data: { status, deactivatedAt: new Date() },
        });
    }

    async findAllActiveProducts(customerId: string): Promise<any[]> {
        return this.db.customerActiveProduct.findMany({
            where: { customerId },
            include: { loanProduct: true, loan: true },
            orderBy: { activatedAt: 'desc' },
        });
    }
}


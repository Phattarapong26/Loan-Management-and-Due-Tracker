import { FastifyRequest } from 'fastify';
import { CustomerRepository } from '../repositories/customer.repository';
import { BranchRepository } from '@branches/repositories/branch.repository';
import { CreateCustomerInput, UpdateCustomerInput } from '../models/customer.model';
import { EncryptionUtil } from '@utils/security/encryption.util';
import { prisma } from '@config/database.config';
import { Customer } from '@prisma/client';
import { CacheUtil } from '@utils/cache/cache.util';

interface BusinessProfile {
    companyInfo?: {
        companyName?: string;
        registrationNumber?: string;
        phoneNumber?: string;
        email?: string;
        address?: string;
    };
    [key: string]: unknown;
}

interface AIData {
    vatReport?: {
        annualSales?: number;
    };
    financialStatement?: {
        years?: Array<{
            revenue?: number;
            netProfit?: number;
            totalAssets?: number;
            totalLiabilities?: number;
        }>;
    };
    investmentStructure?: {
        debtToEquityRatio?: number;
    };
    [key: string]: unknown;
}

/**
 * Customer Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class CustomerService {
    private customerRepository: CustomerRepository;
    private branchRepository: BranchRepository;

    constructor() {
        this.customerRepository = new CustomerRepository();
        this.branchRepository = new BranchRepository();
    }

    /**
     * Create customer with validation and duplicate checking
     */
    async createCustomer(
        _request: FastifyRequest,
        input: CreateCustomerInput,
        branchId: string,
        userId: string
    ) {
        // Check if branch exists
        const branch = await this.branchRepository.findById(branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        // Check for duplicate Tax ID
        const taxIdExists = await this.customerRepository.taxIdExists(input.taxId);
        if (taxIdExists) {
            throw new Error('Tax ID already exists');
        }

        // Generate customer code
        const customerCode = await this.customerRepository.generateCustomerCode(branch.code);

        // Create customer
        const customer = await this.customerRepository.create({
            branchId,
            customerCode,
            businessName: input.businessName,
            businessType: input.businessType,
            phone: input.phone,
            email: input.email || undefined,
            address: input.address,
            thaiId: input.thaiId,
            taxId: input.taxId,
            annualRevenue: input.annualRevenue,
            createdBy: userId,
        });

        // Return customer with decrypted data (for response only)
        return this.decryptCustomerData(customer);
    }

    /**
     * Update customer
     */
    async updateCustomer(
        _request: FastifyRequest,
        customerId: string,
        input: UpdateCustomerInput,
        branchId: string
    ) {
        // Check if customer exists and belongs to branch
        const existingCustomer = await this.customerRepository.findById(customerId, branchId);
        if (!existingCustomer) {
            throw new Error('Customer not found');
        }

        // If Tax ID is being updated, check for duplicates (excluding current customer)
        if (input.taxId && input.taxId !== this.decryptTaxId(existingCustomer.taxId)) {
            const taxIdExists = await this.customerRepository.taxIdExists(input.taxId, customerId);
            if (taxIdExists) {
                throw new Error('Tax ID already exists');
            }
        }

        // Update customer
        const customer = await this.customerRepository.update(customerId, input, branchId);

        return this.decryptCustomerData(customer);
    }

    /**
     * Get customer by ID
     */
    async getCustomer(customerId: string, branchId?: string) {
        const customer = await this.customerRepository.findById(customerId, branchId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        return this.decryptCustomerData(customer);
    }

    /**
     * List customers with pagination
     */
    async listCustomers(params: {
        branchId?: string;
        officerId?: string; // Add officerId filter
        page: number;
        limit: number;
        status?: 'ACTIVE' | 'INACTIVE';
        search?: string;
    }) {
        // ✅ Try to get from cache first (with error handling)
        try {
            const cacheKey = CacheUtil.customerListKey(params);
            const cached = await CacheUtil.get(cacheKey);
            
            if (cached) {
                return cached;
            }
        } catch (error) {
            // Cache error - continue without cache
            console.warn('[Cache] Failed to get customer list from cache:', error);
        }
        
        const result = await this.customerRepository.list(params);

        const safeDecryptMaybe = (value?: string | null) => {
            if (!value) return value;
            try {
                return EncryptionUtil.decrypt(value);
            } catch {
                // Some legacy rows may already store plain text
                return value;
            }
        };

        // ✅ Decrypt all sensitive data for display (with legacy fallback)
        const customers = result.customers.map((customer) => {
            return {
                ...customer,
                phone: safeDecryptMaybe(customer.phone) || '',
                address: safeDecryptMaybe(customer.address) || null,
                taxId: safeDecryptMaybe(customer.taxId) || '',
                thaiId: safeDecryptMaybe(customer.thaiId) || null,
            };
        });

        // Attach creator (officer) info for UI display
        const creatorIds = Array.from(
            new Set(customers.map((c: any) => c.createdBy).filter(Boolean))
        ) as string[];

        const creators = creatorIds.length
            ? await prisma.user.findMany({
                  where: { id: { in: creatorIds } },
                  select: { id: true, firstName: true, lastName: true },
              })
            : [];

        const creatorMap = new Map(
            creators.map((u) => [u.id, { id: u.id, firstName: u.firstName, lastName: u.lastName }])
        );

        const customersWithCreator = customers.map((c: any) => {
            const creator = c.createdBy ? creatorMap.get(c.createdBy) : undefined;
            const createdByName = creator ? `${creator.firstName} ${creator.lastName}`.trim() : undefined;
            return {
                ...c,
                createdByUser: creator || null,
                createdByName,
            };
        });

        const response = {
            customers: customersWithCreator,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
        
        // ✅ Cache for 60 seconds (with error handling)
        try {
            const cacheKey = CacheUtil.customerListKey(params);
            await CacheUtil.set(cacheKey, response, 60);
        } catch (error) {
            // Cache error - continue without caching
            console.warn('[Cache] Failed to set customer list cache:', error);
        }
        
        return response;
    }

    /**
     * Update customer with AI-extracted data
     */
    async updateWithAIData(
        customerId: string,
        aiData: AIData,
        confidenceScore: number,
        warnings: string[],
        branchId: string
    ) {
        // Check if customer exists and belongs to branch
        const existingCustomer = await this.customerRepository.findById(customerId, branchId);
        if (!existingCustomer) {
            throw new Error('Customer not found');
        }

        // Extract financial summary from AI data
        const financialSummary: Record<string, number | undefined> = {};

        // Extract annual revenue from VAT report
        if (aiData.vatReport?.annualSales) {
            financialSummary.annualRevenue = aiData.vatReport.annualSales;
        }

        // Extract from financial statement (latest year)
        if (aiData.financialStatement?.years && aiData.financialStatement.years.length > 0) {
            const latestYear = aiData.financialStatement.years[aiData.financialStatement.years.length - 1];
            
            if (latestYear) {
                if (latestYear.revenue && !financialSummary.annualRevenue) {
                    financialSummary.annualRevenue = latestYear.revenue;
                }
                if (latestYear.netProfit) {
                    financialSummary.netProfit = latestYear.netProfit;
                }
                if (latestYear.totalAssets) {
                    financialSummary.totalAssets = latestYear.totalAssets;
                }
                if (latestYear.totalLiabilities) {
                    financialSummary.totalLiabilities = latestYear.totalLiabilities;
                }
            }
        }

        // Extract D/E ratio
        if (aiData.investmentStructure?.debtToEquityRatio) {
            financialSummary.debtToEquityRatio = aiData.investmentStructure.debtToEquityRatio;
        }

        // Update customer with AI data
        const customer = await this.customerRepository.updateWithAIData(
            customerId,
            {
                aiExtractedData: aiData,
                aiConfidenceScore: confidenceScore,
                aiProcessedAt: new Date(),
                aiWarnings: warnings,
                ...financialSummary,
            },
            branchId
        );

        return this.decryptCustomerData(customer);
    }

    /**
     * Decrypt customer sensitive data for response
     */
    private decryptCustomerData(customer: Customer) {
        const safeDecryptMaybe = (value?: string | null) => {
            if (!value) return value;
            try {
                return EncryptionUtil.decrypt(value);
            } catch {
                return value;
            }
        };

        return {
            ...customer,
            phone: safeDecryptMaybe(customer.phone) || '',
            address: safeDecryptMaybe(customer.address) || null,
            thaiId: safeDecryptMaybe(customer.thaiId) || null,
            taxId: safeDecryptMaybe(customer.taxId) || '',
        };
    }

    /**
     * Decrypt Tax ID for comparison
     */
    private decryptTaxId(encryptedTaxId: string): string {
        try {
            return EncryptionUtil.decrypt(encryptedTaxId);
        } catch {
            return '';
        }
    }

    /**
     * Delete customer
     */
    async deleteCustomer(customerId: string, branchId?: string) {
        console.log(`[Customer Service] Deleting customer: ${customerId}`);

        // Check if customer exists and user has access
        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Check branch access if branchId is provided
        if (branchId && customer.branchId !== branchId) {
            throw new Error('Access denied: Customer belongs to different branch');
        }

        // Check if customer has active loans
        const activeLoans = await prisma.loan.count({
            where: {
                customerId: customerId,
                status: {
                    in: ['ACTIVE', 'PENDING_APPROVAL', 'APPROVED', 'DISBURSED']
                }
            }
        });

        if (activeLoans > 0) {
            throw new Error('Cannot delete customer with active loans');
        }

        // Delete customer (this will cascade delete related records)
        await this.customerRepository.delete(customerId);

        console.log(`[Customer Service] Customer deleted successfully: ${customerId}`);
        return { message: 'Customer deleted successfully' };
    }

    /**
     * Create customer from document (parsed business profile)
     */
    async createFromDocument(
        documentId: string,
        businessProfile: BusinessProfile,
        createdBy: string,
        branchId: string
    ) {
        console.log(`[Customer Service] Creating customer from document: ${documentId}`);

        const branch = await this.branchRepository.findById(branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        // Generate customer code
        const customerCode = await this.customerRepository.generateCustomerCode(branch.code);

        // Extract company info from business profile
        const companyInfo = businessProfile.companyInfo || {};

        // Create customer data
        const customerData = {
            branchId,
            customerCode,
            businessName: companyInfo.companyName || 'Unknown Company',
            taxId: companyInfo.registrationNumber || companyInfo.taxId || '0000000000000', // Fallback to placeholder tax ID
            phone: companyInfo.phoneNumber || companyInfo.phone || '-',
            email: companyInfo.email || undefined,
            address: companyInfo.address || undefined,
            createdBy,
        };

        // Create customer
        const customer = await this.customerRepository.create(customerData);

        // Link document to customer and save extracted data
        await prisma.document.update({
            where: { id: documentId },
            data: { 
                customerId: customer.id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                extractedData: businessProfile as any,
                aiStatus: 'completed',
                aiProcessed: true
            },
        });

        console.log(`[Customer Service] Customer created and document data saved: ${customer.id}`);
        return this.decryptCustomerData(customer);
    }
}

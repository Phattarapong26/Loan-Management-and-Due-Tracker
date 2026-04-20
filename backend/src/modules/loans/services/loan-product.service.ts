import { LoanProduct, Prisma } from '@prisma/client';
import { LoanProductRepository } from '../repositories/loan-product.repository';

export class LoanProductService {
  private repository: LoanProductRepository;

  constructor() {
    this.repository = new LoanProductRepository();
  }

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
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const result = await this.repository.findAll(filters);
    const total = await this.repository.count(filters);

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string): Promise<LoanProduct> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new Error('Loan product not found');
    }
    return product;
  }

  // VALIDATION LOGIC
  private validateProductData(data: any): void {
    // 1. Min/Max Validation
    if (data.minLoanAmount && data.maxLoanAmount && data.minLoanAmount > data.maxLoanAmount) {
      throw new Error('วงเงินกู้ขั้นต่ำต้องไม่มากกว่าวงเงินกู้สูงสุด (Min Amount > Max Amount)');
    }
    if (data.minRevenue && data.maxRevenue && data.minRevenue > data.maxRevenue) {
      throw new Error('รายได้ขั้นต่ำต้องไม่มากกว่ารายได้สูงสุด (Min Revenue > Max Revenue)');
    }

    // 2. Date Validation
    if (data.projectStartDate && data.projectEndDate) {
      const start = new Date(data.projectStartDate);
      const end = new Date(data.projectEndDate);
      if (end < start) {
        throw new Error('วันสิ้นสุดโครงการต้องอยู่หลังวันเริ่มโครงการ (End Date < Start Date)');
      }
    }

    // 3. Tiers Validation
    if (data.interestRateType === 'TIERED' && data.yearInterestTiers) {
      const tiers = data.yearInterestTiers;
      if (tiers.length === 0) throw new Error('ต้องระบุ Tier อย่างน้อย 1 รายการ');

      // Sort by start year
      const sortedTiers = [...tiers].sort((a: any, b: any) => a.startYear - b.startYear);

      if (sortedTiers[0].startYear !== 1) {
        throw new Error('Tier แรกต้องเริ่มที่ปีที่ 1');
      }

      for (let i = 0; i < sortedTiers.length - 1; i++) {
        const current = sortedTiers[i];
        const next = sortedTiers[i + 1];

        // Check for 'END' in middle
        if (current.endYear === 'END') {
          throw new Error(`Tier ที่ ${i + 1} เป็นแบบตลอดสัญญา ไม่ควรมี Tier ต่อท้าย`);
        }

        const currentEnd = parseInt(current.endYear as string);

        // Gap Check
        if (next.startYear > currentEnd + 1) {
          throw new Error(`มีช่องว่างระหว่างปีที่ ${current.endYear} และ ${next.startYear}`);
        }

        // Overlap Check
        if (next.startYear <= currentEnd) {
          throw new Error(`ช่วงเวลาซ้อนทับกันระหว่าง Tier ${i + 1} และ ${i + 2}`);
        }
      }
    }
  }

  async getProductByCode(productCode: string): Promise<LoanProduct | null> {
    return this.repository.findByCode(productCode);
  }

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
    // Check if product code already exists
    const existing = await this.repository.findByCode(data.productCode);
    if (existing) {
      throw new Error('Product code already exists');
    }

    // Validate Business Rules
    this.validateProductData(data);

    // Extract year tiers if present
    const { yearInterestTiers, ...rest } = data;
    const { interestTiers, ...productData } = rest as any;

    // Create product with tiers
    const createData: any = {
      ...productData,
    };

    // Add year-based tiers if interestRateType is TIERED
    if (data.interestRateType === 'TIERED' && yearInterestTiers && yearInterestTiers.length > 0) {
      createData.yearInterestTiers = {
        create: yearInterestTiers.map((tier: any) => ({
          tierType: tier.tierType,
          startYear: tier.startYear,
          endYear: tier.endYear,
          rate: tier.rate,
          formula: tier.formula,
          minRate: tier.minRate,
          maxRate: tier.maxRate,
        })),
      };
    }

    return this.repository.createWithTiers(createData);
  }

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
    // Check if product exists
    await this.getProductById(id);

    // If updating product code, check if it's unique
    if (data.productCode && typeof data.productCode === 'string') {
      const existing = await this.repository.findByCode(data.productCode);
      if (existing && existing.id !== id) {
        throw new Error('Product code already exists');
      }
    }

    // Validate Business Rules
    this.validateProductData(data);

    // Extract year tiers if present
    const { yearInterestTiers, ...rest } = data;
    const { interestTiers, ...productData } = rest as any;

    const updateData: any = {
      ...productData,
    };

    // Handle year-based tiers update
    if (data.interestRateType === 'TIERED' && yearInterestTiers) {
      // Delete existing tiers and create new ones
      updateData.yearInterestTiers = {
        deleteMany: {},
        create: yearInterestTiers.map((tier: any) => ({
          tierType: tier.tierType,
          startYear: tier.startYear,
          endYear: tier.endYear,
          rate: tier.rate,
          formula: tier.formula,
          minRate: tier.minRate,
          maxRate: tier.maxRate,
        })),
      };
    }

    return this.repository.updateWithTiers(id, updateData);
  }

  async deleteProduct(id: string): Promise<void> {
    // Check if product exists
    await this.getProductById(id);

    await this.repository.delete(id);
  }

  async getProductStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    popular: number;
  }> {
    const [total, active, inactive, popular] = await Promise.all([
      this.repository.count(),
      this.repository.count({ status: 'ACTIVE' }),
      this.repository.count({ status: 'INACTIVE' }),
      this.repository.count({ isPopular: true }),
    ]);

    return { total, active, inactive, popular };
  }
}

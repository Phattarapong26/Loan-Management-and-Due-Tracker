import { PrismaClient, LoanProduct, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';

export class LoanProductRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findAll(filters?: {
    status?: string;
    isPopular?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<LoanProduct[]> {
    const where: Prisma.LoanProductWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.isPopular !== undefined) {
      where.isPopular = filters.isPopular;
    }

    if (filters?.search) {
      where.OR = [
        { productName: { contains: filters.search, mode: 'insensitive' } },
        { productCode: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    return this.prisma.loanProduct.findMany({
      where,
      include: {
        yearInterestTiers: {
          orderBy: { startYear: 'asc' },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });
  }

  async findById(id: string): Promise<LoanProduct | null> {
    return this.prisma.loanProduct.findUnique({
      where: { id },
      include: {
        yearInterestTiers: {
          orderBy: { startYear: 'asc' },
        },
      },
    });
  }

  async findByCode(productCode: string): Promise<LoanProduct | null> {
    return this.prisma.loanProduct.findUnique({
      where: { productCode },
    });
  }

  async create(data: Prisma.LoanProductCreateInput): Promise<LoanProduct> {
    return this.prisma.loanProduct.create({
      data,
    });
  }

  async update(id: string, data: Prisma.LoanProductUpdateInput): Promise<LoanProduct> {
    return this.prisma.loanProduct.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<LoanProduct> {
    return this.prisma.loanProduct.delete({
      where: { id },
    });
  }

  async count(filters?: {
    status?: string;
    isPopular?: boolean;
    search?: string;
  }): Promise<number> {
    const where: Prisma.LoanProductWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.isPopular !== undefined) {
      where.isPopular = filters.isPopular;
    }

    if (filters?.search) {
      where.OR = [
        { productName: { contains: filters.search, mode: 'insensitive' } },
        { productCode: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.loanProduct.count({ where });
  }

  async createWithTiers(createData: any): Promise<LoanProduct> {
    return this.prisma.loanProduct.create({
      data: createData,
      include: { yearInterestTiers: true },
    });
  }

  async updateWithTiers(id: string, updateData: any): Promise<LoanProduct> {
    return this.prisma.loanProduct.update({
      where: { id },
      data: updateData,
      include: { yearInterestTiers: true },
    });
  }

  /**
   * Find loan product with all interest rate tiers (for rate calculation)
   */
  async findByIdWithAllTiers(id: string): Promise<LoanProduct | null> {
    return this.prisma.loanProduct.findUnique({
      where: { id },
      include: {
        yearInterestTiers: {
          orderBy: { startYear: 'asc' },
        },
        interestRateTiers: {
          where: { status: 'ACTIVE' },
          orderBy: { minAmount: 'asc' },
        },
      },
    }) as any;
  }
}

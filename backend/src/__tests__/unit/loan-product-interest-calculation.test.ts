import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies
const mockPrisma = {
  loanProduct: {
    findUnique: jest.fn(),
  },
};

const mockInterestRateService = {
  calculateRateFromFormula: jest.fn(),
};

// Mock modules
jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../services/interest-rate.service', () => ({
  InterestRateService: jest.fn().mockImplementation(() => mockInterestRateService),
}));

// Import after mocks
import { LoanService } from '../../services/loan.service';

describe('LoanService - Interest Rate Calculation from Product', () => {
  let loanService: LoanService;

  beforeEach(() => {
    jest.clearAllMocks();
    loanService = new LoanService();
  });

  describe('FIXED Interest Rate Type', () => {
    it('should use interestRateYear1_3 for loans with duration <= 3 years', async () => {
      const mockProduct = {
        id: 'product-1',
        interestRateType: 'FIXED',
        interestRateYear1_3: 5.5,
        interestRateYear4Plus: 7.0,
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      // Access private method via any cast for testing
      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-1',
        24, // 2 years
        500000
      );

      expect(rate).toBe(5.5);
      expect(mockPrisma.loanProduct.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        include: {
          yearInterestTiers: { orderBy: { startYear: 'asc' } },
          interestRateTiers: { where: { status: 'ACTIVE' }, orderBy: { minAmount: 'asc' } },
        },
      });
    });

    it('should use interestRateYear4Plus for loans with duration > 3 years', async () => {
      const mockProduct = {
        id: 'product-1',
        interestRateType: 'FIXED',
        interestRateYear1_3: 5.5,
        interestRateYear4Plus: 7.0,
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-1',
        48, // 4 years
        500000
      );

      expect(rate).toBe(7.0);
    });

    it('should fallback to interestRateYear1_3 if year4Plus is not set', async () => {
      const mockProduct = {
        id: 'product-1',
        interestRateType: 'FIXED',
        interestRateYear1_3: 5.5,
        interestRateYear4Plus: null,
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-1',
        60, // 5 years
        500000
      );

      expect(rate).toBe(5.5);
    });

    it('should throw error if no fixed rate is configured', async () => {
      const mockProduct = {
        id: 'product-1',
        interestRateType: 'FIXED',
        interestRateYear1_3: null,
        interestRateYear4Plus: null,
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      await expect(
        (loanService as any).calculateInterestRateFromProduct('product-1', 24, 500000)
      ).rejects.toThrow('No fixed interest rate configured for this product');
    });
  });

  describe('VARIABLE Interest Rate Type', () => {
    it('should calculate rate from MLR formula', async () => {
      const mockProduct = {
        id: 'product-2',
        interestRateType: 'VARIABLE',
        interestRateFormula: 'MLR + 1.5%',
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);
      mockInterestRateService.calculateRateFromFormula.mockResolvedValue(8.375); // 6.875 + 1.5

      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-2',
        36,
        1000000
      );

      expect(rate).toBe(8.375);
      expect(mockInterestRateService.calculateRateFromFormula).toHaveBeenCalledWith('MLR + 1.5%');
    });

    it('should calculate rate from MRR formula', async () => {
      const mockProduct = {
        id: 'product-2',
        interestRateType: 'VARIABLE',
        interestRateFormula: 'MRR + 2.0%',
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);
      mockInterestRateService.calculateRateFromFormula.mockResolvedValue(9.125); // 7.125 + 2.0

      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-2',
        36,
        1000000
      );

      expect(rate).toBe(9.125);
      expect(mockInterestRateService.calculateRateFromFormula).toHaveBeenCalledWith('MRR + 2.0%');
    });

    it('should throw error if formula is not configured', async () => {
      const mockProduct = {
        id: 'product-2',
        interestRateType: 'VARIABLE',
        interestRateFormula: null,
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      await expect(
        (loanService as any).calculateInterestRateFromProduct('product-2', 36, 1000000)
      ).rejects.toThrow('No interest rate formula configured for variable rate product');
    });
  });

  describe('TIERED Interest Rate Type', () => {
    it('should use first year tier with FIXED rate', async () => {
      const mockProduct = {
        id: 'product-3',
        interestRateType: 'TIERED',
        yearInterestTiers: [
          {
            id: 'tier-1',
            startYear: 1,
            endYear: '3',
            tierType: 'FIXED',
            rate: 3.99,
            formula: null,
          },
          {
            id: 'tier-2',
            startYear: 4,
            endYear: 'END',
            tierType: 'FIXED',
            rate: 5.99,
            formula: null,
          },
        ],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-3',
        36,
        2000000
      );

      expect(rate).toBe(3.99);
    });

    it('should use first year tier with VARIABLE rate', async () => {
      const mockProduct = {
        id: 'product-3',
        interestRateType: 'TIERED',
        yearInterestTiers: [
          {
            id: 'tier-1',
            startYear: 1,
            endYear: '3',
            tierType: 'VARIABLE',
            rate: null,
            formula: 'MLR + 0.5%',
          },
          {
            id: 'tier-2',
            startYear: 4,
            endYear: 'END',
            tierType: 'VARIABLE',
            rate: null,
            formula: 'MLR + 1.0%',
          },
        ],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);
      mockInterestRateService.calculateRateFromFormula.mockResolvedValue(7.375); // 6.875 + 0.5

      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-3',
        36,
        2000000
      );

      expect(rate).toBe(7.375);
      expect(mockInterestRateService.calculateRateFromFormula).toHaveBeenCalledWith('MLR + 0.5%');
    });

    it('should fallback to amount-based tiers if no year tiers', async () => {
      const mockProduct = {
        id: 'product-3',
        interestRateType: 'TIERED',
        yearInterestTiers: [],
        interestRateTiers: [
          {
            id: 'tier-1',
            minAmount: 0,
            maxAmount: 1000000,
            interestRate: 8.5,
            status: 'ACTIVE',
          },
          {
            id: 'tier-2',
            minAmount: 1000001,
            maxAmount: 5000000,
            interestRate: 7.5,
            status: 'ACTIVE',
          },
          {
            id: 'tier-3',
            minAmount: 5000001,
            maxAmount: null,
            interestRate: 6.5,
            status: 'ACTIVE',
          },
        ],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      // Test loan amount in second tier
      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-3',
        36,
        2000000
      );

      expect(rate).toBe(7.5);
    });

    it('should use highest tier if loan amount exceeds all tiers', async () => {
      const mockProduct = {
        id: 'product-3',
        interestRateType: 'TIERED',
        yearInterestTiers: [],
        interestRateTiers: [
          {
            id: 'tier-1',
            minAmount: 0,
            maxAmount: 1000000,
            interestRate: 8.5,
            status: 'ACTIVE',
          },
          {
            id: 'tier-2',
            minAmount: 1000001,
            maxAmount: 5000000,
            interestRate: 7.5,
            status: 'ACTIVE',
          },
        ],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      // Test loan amount exceeding all tiers
      const rate = await (loanService as any).calculateInterestRateFromProduct(
        'product-3',
        36,
        10000000
      );

      expect(rate).toBe(7.5); // Should use highest tier
    });

    it('should throw error if no applicable tier found', async () => {
      const mockProduct = {
        id: 'product-3',
        interestRateType: 'TIERED',
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      await expect(
        (loanService as any).calculateInterestRateFromProduct('product-3', 36, 2000000)
      ).rejects.toThrow('No applicable interest rate tier found');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if loan product not found', async () => {
      mockPrisma.loanProduct.findUnique.mockResolvedValue(null);

      await expect(
        (loanService as any).calculateInterestRateFromProduct('invalid-id', 36, 1000000)
      ).rejects.toThrow('Loan product not found');
    });

    it('should throw error for unsupported interest rate type', async () => {
      const mockProduct = {
        id: 'product-4',
        interestRateType: 'UNKNOWN_TYPE',
        yearInterestTiers: [],
        interestRateTiers: [],
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(mockProduct);

      await expect(
        (loanService as any).calculateInterestRateFromProduct('product-4', 36, 1000000)
      ).rejects.toThrow('Unsupported interest rate type: UNKNOWN_TYPE');
    });
  });
});

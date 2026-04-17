import { TieredInterestCalculatorService } from '@loans/calculators/tiered-interest-calculator.service';

// Mock dependencies
jest.mock('../../../config/database', () => ({
    prisma: {
        loan: {
            findUnique: jest.fn(),
        },
    },
}));

describe('TieredInterestCalculatorService', () => {
    let service: TieredInterestCalculatorService;
    
    const mockDb = {
        loan: {
            findUnique: jest.fn(),
        },
        loanInterestHistory: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
    };

    beforeEach(() => {
        service = new TieredInterestCalculatorService();
        // Mock the db constant
        (service as any).db = mockDb;
        jest.clearAllMocks();
    });

    describe('calculateTieredInterest', () => {
        const mockLoan = {
            id: 'loan-1',
            principal: 100000,
            interestRate: 12,
            disbursementDate: new Date('2024-01-01'),
            loanProduct: {
                interestRateTiers: [
                    {
                        id: 'tier-1',
                        tierName: 'Tier 1',
                        minAmount: 0,
                        maxAmount: 50000,
                        interestRate: 10,
                        gracePeriodDays: 30,
                        status: 'ACTIVE',
                    },
                    {
                        id: 'tier-2',
                        tierName: 'Tier 2',
                        minAmount: 50001,
                        maxAmount: 100000,
                        interestRate: 8,
                        gracePeriodDays: 15,
                        status: 'ACTIVE',
                    },
                    {
                        id: 'tier-3',
                        tierName: 'Tier 3',
                        minAmount: 100001,
                        maxAmount: null,
                        interestRate: 6,
                        gracePeriodDays: 0,
                        status: 'ACTIVE',
                    },
                ],
            },
        };

        beforeEach(() => {
            mockDb.loan.findUnique.mockResolvedValue(mockLoan);
            mockDb.loanInterestHistory.findMany.mockResolvedValue([]);
            mockDb.loanInterestHistory.create.mockResolvedValue({});
        });

        it('should calculate tiered interest for amount in tier 1', async () => {
            const result = await service.calculateTieredInterest('loan-1', 30000, 1);

            expect(result.appliedTier.tierName).toBe('Tier 1');
            expect(result.appliedTier.interestRate).toBe(10);
            expect(result.appliedTier.minAmount).toBe(0);
            expect(result.appliedTier.maxAmount).toBe(50000);
            expect(result.gracePeriodActive).toBe(true);
            expect(result.interestAmount).toBe(0); // Grace period active
        });

        it('should calculate tiered interest for amount in tier 2', async () => {
            const result = await service.calculateTieredInterest('loan-1', 75000, 1);

            expect(result.appliedTier.tierName).toBe('Tier 2');
            expect(result.appliedTier.interestRate).toBe(8);
            expect(result.appliedTier.minAmount).toBe(50001);
            expect(result.appliedTier.maxAmount).toBe(100000);
            expect(result.gracePeriodActive).toBe(true);
            expect(result.interestAmount).toBe(0); // Grace period active
        });

        it('should calculate tiered interest for amount in tier 3', async () => {
            const result = await service.calculateTieredInterest('loan-1', 150000, 1);

            expect(result.appliedTier.tierName).toBe('Tier 3');
            expect(result.appliedTier.interestRate).toBe(6);
            expect(result.appliedTier.minAmount).toBe(100001);
            expect(result.appliedTier.maxAmount).toBeNull();
            expect(result.gracePeriodActive).toBe(false); // No grace period for tier 3
            
            // Calculate expected interest: 150000 * (6/100) / 12 = 750
            expect(result.interestAmount).toBe(750);
        });

        it('should handle grace period expiration', async () => {
            // Mock loan with disbursement date 45 days ago (beyond grace period)
            const oldDisbursementDate = new Date();
            oldDisbursementDate.setDate(oldDisbursementDate.getDate() - 45);
            
            mockDb.loan.findUnique.mockResolvedValue({
                ...mockLoan,
                disbursementDate: oldDisbursementDate,
            });

            const result = await service.calculateTieredInterest('loan-1', 30000, 1);

            expect(result.gracePeriodActive).toBe(false);
            // Calculate expected interest: 30000 * (10/100) / 12 = 250
            expect(result.interestAmount).toBe(250);
        });

        it('should use basic interest rate when no tiers available', async () => {
            mockDb.loan.findUnique.mockResolvedValue({
                ...mockLoan,
                loanProduct: null,
            });

            const result = await service.calculateTieredInterest('loan-1', 50000, 1);

            expect(result.appliedTier.tierName).toBe('Basic Rate');
            expect(result.appliedTier.interestRate).toBe(12);
            expect(result.gracePeriodActive).toBe(false);
            // Calculate expected interest: 50000 * (12/100) / 12 = 500
            expect(result.interestAmount).toBe(500);
        });

        it('should handle loan not found', async () => {
            mockDb.loan.findUnique.mockResolvedValue(null);

            await expect(service.calculateTieredInterest('non-existent', 50000, 1))
                .rejects.toThrow('Loan not found');
        });
    });

    describe('findApplicableTier', () => {
        const mockTiers = [
            {
                tierName: 'Tier 1',
                minAmount: 0,
                maxAmount: 50000,
                interestRate: 10,
                gracePeriodDays: 30,
            },
            {
                tierName: 'Tier 2',
                minAmount: 50001,
                maxAmount: 100000,
                interestRate: 8,
                gracePeriodDays: 15,
            },
            {
                tierName: 'Tier 3',
                minAmount: 100001,
                maxAmount: null,
                interestRate: 6,
                gracePeriodDays: 0,
            },
        ];

        it('should find correct tier for amount in range', () => {
            const tier1 = service.findApplicableTier(mockTiers as any, 25000);
            expect(tier1?.tierName).toBe('Tier 1');

            const tier2 = service.findApplicableTier(mockTiers as any, 75000);
            expect(tier2?.tierName).toBe('Tier 2');

            const tier3 = service.findApplicableTier(mockTiers as any, 150000);
            expect(tier3?.tierName).toBe('Tier 3');
        });

        it('should handle edge cases', () => {
            const tierAtBoundary1 = service.findApplicableTier(mockTiers as any, 50000);
            expect(tierAtBoundary1?.tierName).toBe('Tier 1');

            const tierAtBoundary2 = service.findApplicableTier(mockTiers as any, 50001);
            expect(tierAtBoundary2?.tierName).toBe('Tier 2');

            const tierAtBoundary3 = service.findApplicableTier(mockTiers as any, 100001);
            expect(tierAtBoundary3?.tierName).toBe('Tier 3');
        });

        it('should return null for empty tiers', () => {
            const result = service.findApplicableTier([], 50000);
            expect(result).toBeNull();
        });
    });

    describe('findNextTierThreshold', () => {
        const mockTiers = [
            {
                tierName: 'Tier 1',
                minAmount: 0,
                maxAmount: 50000,
                interestRate: 10,
            },
            {
                tierName: 'Tier 2',
                minAmount: 50001,
                maxAmount: 100000,
                interestRate: 8,
            },
            {
                tierName: 'Tier 3',
                minAmount: 100001,
                maxAmount: null,
                interestRate: 6,
            },
        ];

        it('should find next tier threshold', () => {
            const nextTier1 = service.findNextTierThreshold(mockTiers as any, 25000);
            expect(nextTier1).toEqual({
                nextTierName: 'Tier 2',
                thresholdAmount: 50001,
                amountToReach: 25001,
                potentialSavings: 2, // 10% - 8% = 2%
            });

            const nextTier2 = service.findNextTierThreshold(mockTiers as any, 75000);
            expect(nextTier2).toEqual({
                nextTierName: 'Tier 3',
                thresholdAmount: 100001,
                amountToReach: 25001,
                potentialSavings: 2, // 8% - 6% = 2%
            });
        });

        it('should return null when already at highest tier', () => {
            const result = service.findNextTierThreshold(mockTiers as any, 150000);
            expect(result).toBeNull();
        });

        it('should handle empty tiers', () => {
            const result = service.findNextTierThreshold([], 50000);
            expect(result).toBeNull();
        });
    });

    describe('getOptimizationRecommendations', () => {
        const mockLoan = {
            id: 'loan-1',
            loanProduct: {
                interestRateTiers: [
                    {
                        tierName: 'Tier 1',
                        minAmount: 0,
                        maxAmount: 50000,
                        interestRate: 10,
                    },
                    {
                        tierName: 'Tier 2',
                        minAmount: 50001,
                        maxAmount: 100000,
                        interestRate: 8,
                    },
                ],
            },
        };

        beforeEach(() => {
            mockDb.loan.findUnique.mockResolvedValue(mockLoan);
        });

        it('should provide optimization recommendations', async () => {
            const result = await service.getOptimizationRecommendations('loan-1', 75000);

            expect(result).toEqual({
                loanId: 'loan-1',
                currentBalance: 75000,
                currentTier: {
                    tierName: 'Tier 2',
                    interestRate: 8,
                },
                recommendations: [],
                potentialSavings: {
                    monthlyInterestSavings: 0,
                    annualInterestSavings: 0,
                },
                generatedAt: expect.any(Date),
            });
        });

        it('should handle loan not found', async () => {
            mockDb.loan.findUnique.mockResolvedValue(null);

            await expect(service.getOptimizationRecommendations('non-existent', 50000))
                .rejects.toThrow('Loan not found');
        });
    });
});
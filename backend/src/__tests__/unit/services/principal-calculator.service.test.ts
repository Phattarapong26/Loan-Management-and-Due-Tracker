import { PrincipalCalculatorService } from '@loans/calculators/principal-calculator.service';
import { prisma } from '@config/database.config';

// Mock Prisma
jest.mock('../../../config/database', () => ({
    prisma: {
        loan: {
            findUnique: jest.fn(),
        },
        paymentSchedule: {
            findMany: jest.fn(),
        },
        payment: {
            findMany: jest.fn(),
        },
    },
}));

describe('PrincipalCalculatorService', () => {
    let service: PrincipalCalculatorService;
    const mockPrisma = prisma as jest.Mocked<typeof prisma>;

    beforeEach(() => {
        service = new PrincipalCalculatorService();
        jest.clearAllMocks();
    });

    describe('calculateCurrentPrincipal', () => {
        const mockLoan = {
            id: 'loan-1',
            principal: 100000,
            interestRate: 12,
            termMonths: 12,
            disbursementDate: new Date('2024-01-01'),
            status: 'ACTIVE',
        };

        const mockPaymentSchedule = [
            {
                id: 'schedule-1',
                paymentNumber: 1,
                paymentDate: new Date('2024-02-01'),
                principalAmount: 8000,
                interestAmount: 1000,
                totalPayment: 9000,
                remainingBalance: 92000,
                status: 'PAID',
            },
            {
                id: 'schedule-2',
                paymentNumber: 2,
                paymentDate: new Date('2024-03-01'),
                principalAmount: 8100,
                interestAmount: 900,
                totalPayment: 9000,
                remainingBalance: 83900,
                status: 'UNPAID',
            },
        ];

        const mockPayments = [
            {
                id: 'payment-1',
                amount: 9000,
                paymentDate: new Date('2024-02-01'),
                paymentScheduleId: 'schedule-1',
            },
        ];

        beforeEach(() => {
            mockPrisma.loan.findUnique.mockResolvedValue(mockLoan as any);
            mockPrisma.paymentSchedule.findMany.mockResolvedValue(mockPaymentSchedule as any);
            mockPrisma.payment.findMany.mockResolvedValue(mockPayments as any);
        });

        it('should calculate current principal correctly', async () => {
            const result = await service.calculateCurrentPrincipal('loan-1');

            expect(result).toEqual({
                loanId: 'loan-1',
                originalPrincipal: 100000,
                currentOutstandingBalance: 83900,
                remainingPrincipal: 83900,
                totalAmountPaid: 9000,
                totalPrincipalPaid: 8000,
                totalInterestPaid: 1000,
                paymentProgress: {
                    completedPayments: 1,
                    totalPayments: 12,
                    progressPercentage: 8.33,
                },
                nextPaymentSchedule: mockPaymentSchedule[1],
                lastPaymentDate: new Date('2024-02-01'),
                calculatedAt: expect.any(Date),
            });
        });

        it('should handle loan not found', async () => {
            mockPrisma.loan.findUnique.mockResolvedValue(null);

            await expect(service.calculateCurrentPrincipal('non-existent'))
                .rejects.toThrow('Loan not found');
        });

        it('should handle no payment schedule', async () => {
            mockPrisma.paymentSchedule.findMany.mockResolvedValue([]);

            const result = await service.calculateCurrentPrincipal('loan-1');

            expect(result.currentOutstandingBalance).toBe(100000);
            expect(result.nextPaymentSchedule).toBeNull();
        });
    });

    describe('simulatePayment', () => {
        const mockLoan = {
            id: 'loan-1',
            principal: 100000,
            interestRate: 12,
            termMonths: 12,
        };

        const mockCurrentPrincipal = {
            loanId: 'loan-1',
            originalPrincipal: 100000,
            currentOutstandingBalance: 83900,
            remainingPrincipal: 83900,
            totalAmountPaid: 9000,
            totalPrincipalPaid: 8000,
            totalInterestPaid: 1000,
            paymentProgress: {
                completedPayments: 1,
                totalPayments: 12,
                progressPercentage: 8.33,
            },
            nextPaymentSchedule: {
                id: 'schedule-2',
                paymentNumber: 2,
                principalAmount: 8100,
                interestAmount: 900,
                totalPayment: 9000,
                remainingBalance: 75800,
            },
            lastPaymentDate: new Date('2024-02-01'),
            calculatedAt: new Date(),
        };

        beforeEach(() => {
            mockPrisma.loan.findUnique.mockResolvedValue(mockLoan as any);
            // Mock the calculateCurrentPrincipal method
            jest.spyOn(service, 'calculateCurrentPrincipal').mockResolvedValue(mockCurrentPrincipal as any);
        });

        it('should simulate payment correctly', async () => {
            const result = await service.simulatePayment('loan-1', 9000);

            expect(result).toEqual({
                loanId: 'loan-1',
                paymentAmount: 9000,
                beforePayment: {
                    outstandingBalance: 83900,
                    remainingPayments: 11,
                },
                afterPayment: {
                    outstandingBalance: 75800,
                    remainingPayments: 10,
                },
                impact: {
                    principalReduction: 8100,
                    interestPaid: 900,
                    progressIncrease: 8.33,
                },
                simulatedAt: expect.any(Date),
            });
        });

        it('should handle invalid payment amount', async () => {
            await expect(service.simulatePayment('loan-1', 0))
                .rejects.toThrow('Payment amount must be greater than 0');

            await expect(service.simulatePayment('loan-1', -1000))
                .rejects.toThrow('Payment amount must be greater than 0');
        });
    });

    describe('calculateMultipleLoans', () => {
        const mockLoans = [
            { id: 'loan-1', principal: 100000 },
            { id: 'loan-2', principal: 200000 },
        ];

        beforeEach(() => {
            jest.spyOn(service, 'calculateCurrentPrincipal')
                .mockImplementation((loanId) => {
                    const loan = mockLoans.find(l => l.id === loanId);
                    return Promise.resolve({
                        loanId,
                        originalPrincipal: loan?.principal || 0,
                        currentOutstandingBalance: (loan?.principal || 0) * 0.8,
                        remainingPrincipal: (loan?.principal || 0) * 0.8,
                        totalAmountPaid: (loan?.principal || 0) * 0.2,
                        totalPrincipalPaid: (loan?.principal || 0) * 0.15,
                        totalInterestPaid: (loan?.principal || 0) * 0.05,
                        paymentProgress: {
                            completedPayments: 2,
                            totalPayments: 12,
                            progressPercentage: 16.67,
                        },
                        nextPaymentSchedule: null,
                        lastPaymentDate: new Date(),
                        calculatedAt: new Date(),
                    } as any);
                });
        });

        it('should calculate multiple loans correctly', async () => {
            const result = await service.calculateMultipleLoans(['loan-1', 'loan-2']);

            expect(result).toHaveLength(2);
            expect(result[0].loanId).toBe('loan-1');
            expect(result[1].loanId).toBe('loan-2');
            expect(result[0].originalPrincipal).toBe(100000);
            expect(result[1].originalPrincipal).toBe(200000);
        });

        it('should handle empty loan array', async () => {
            const result = await service.calculateMultipleLoans([]);
            expect(result).toEqual([]);
        });

        it('should handle maximum loan limit', async () => {
            const manyLoanIds = Array.from({ length: 51 }, (_, i) => `loan-${i}`);
            
            await expect(service.calculateMultipleLoans(manyLoanIds))
                .rejects.toThrow('Maximum 50 loans can be calculated at once');
        });
    });

    describe('getPrincipalSummary', () => {
        beforeEach(() => {
            jest.spyOn(service, 'calculateCurrentPrincipal').mockResolvedValue({
                loanId: 'loan-1',
                originalPrincipal: 100000,
                currentOutstandingBalance: 80000,
                remainingPrincipal: 80000,
                totalAmountPaid: 20000,
                totalPrincipalPaid: 15000,
                totalInterestPaid: 5000,
                paymentProgress: {
                    completedPayments: 2,
                    totalPayments: 12,
                    progressPercentage: 16.67,
                },
                nextPaymentSchedule: {
                    paymentDate: new Date('2024-03-01'),
                    totalPayment: 9000,
                },
                lastPaymentDate: new Date('2024-02-01'),
                calculatedAt: new Date(),
            } as any);
        });

        it('should get principal summary correctly', async () => {
            const result = await service.getPrincipalSummary('loan-1');

            expect(result).toEqual({
                loanId: 'loan-1',
                summary: {
                    originalAmount: 100000,
                    currentBalance: 80000,
                    totalPaid: 20000,
                    paymentProgress: 16.67,
                },
                nextPayment: {
                    dueDate: new Date('2024-03-01'),
                    amount: 9000,
                },
                lastPayment: {
                    date: new Date('2024-02-01'),
                },
                generatedAt: expect.any(Date),
            });
        });
    });
});
import { NextPaymentInvoiceService } from '@invoices/services/next-payment-invoice.service';
import { PrincipalCalculatorService } from '@loans/calculators/principal-calculator.service';
import { ReferenceNumberService } from '@invoices/services/reference-number.service';

// Mock dependencies
jest.mock('../../../config/database', () => ({
    prisma: {
        loan: {
            findUnique: jest.fn(),
        },
        payment: {
            findMany: jest.fn(),
        },
    },
}));

jest.mock('../../../services/principal-calculator.service');
jest.mock('../../../services/reference-number.service');

describe('NextPaymentInvoiceService', () => {
    let service: NextPaymentInvoiceService;
    let mockPrincipalCalculator: jest.Mocked<PrincipalCalculatorService>;
    let mockReferenceService: jest.Mocked<ReferenceNumberService>;

    const mockDb = {
        nextPaymentInvoice: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    };

    beforeEach(() => {
        service = new NextPaymentInvoiceService();
        mockPrincipalCalculator = new PrincipalCalculatorService() as jest.Mocked<PrincipalCalculatorService>;
        mockReferenceService = new ReferenceNumberService() as jest.Mocked<ReferenceNumberService>;
        
        // Mock the private properties
        (service as any).principalCalculator = mockPrincipalCalculator;
        (service as any).referenceService = mockReferenceService;
        
        // Mock the db constant
        (service as any).db = mockDb;
        
        jest.clearAllMocks();
    });

    describe('generateNextPaymentInvoice', () => {
        const mockLoan = {
            id: 'loan-1',
            customerId: 'customer-1',
            customer: {
                businessName: 'Test Business',
                address: '123 Test St',
                phone: '0123456789',
                email: 'test@example.com',
                branch: {
                    code: 'BKK1',
                },
            },
        };

        const mockPrincipalCalc = {
            currentOutstandingBalance: 80000,
            remainingPrincipal: 80000,
            totalAmountPaid: 20000,
            paymentProgress: {
                progressPercentage: 20,
            },
            nextPaymentSchedule: {
                id: 'schedule-1',
                paymentNumber: 3,
                paymentDate: new Date('2024-03-01'),
                principalAmount: 8000,
                interestAmount: 1000,
                totalPayment: 9000,
                status: 'UNPAID',
            },
        };

        beforeEach(() => {
            const { prisma } = require('../../../config/database');
            prisma.loan.findUnique.mockResolvedValue(mockLoan);
            
            mockPrincipalCalculator.calculateCurrentPrincipal.mockResolvedValue(mockPrincipalCalc as any);
            mockReferenceService.generateInvoiceNumber.mockResolvedValue('INV-BKK1-6703-00001');
            
            mockDb.nextPaymentInvoice.findFirst.mockResolvedValue(null);
            mockDb.nextPaymentInvoice.create.mockResolvedValue({
                id: 'invoice-1',
                invoiceNumber: 'INV-BKK1-6703-00001',
            });
        });

        it('should generate next payment invoice successfully', async () => {
            const result = await service.generateNextPaymentInvoice('loan-1', 'user-1');

            expect(result).toEqual({
                invoiceId: 'invoice-1',
                invoiceNumber: 'INV-BKK1-6703-00001',
                loanId: 'loan-1',
                customerId: 'customer-1',
                paymentScheduleId: 'schedule-1',
                customer: {
                    businessName: 'Test Business',
                    address: '123 Test St',
                    phone: '0123456789',
                    email: 'test@example.com',
                },
                nextPayment: {
                    installmentNo: 3,
                    totalInstallments: undefined, // termMonths not in mock
                    dueDate: new Date('2024-03-01'),
                    principalAmount: 8000,
                    interestAmount: 1000,
                    totalAmount: 9000,
                    status: 'UNPAID',
                },
                loanSummary: {
                    originalPrincipal: undefined, // principal not in mock
                    currentOutstandingBalance: 80000,
                    remainingPrincipal: 80000,
                    totalPaid: 20000,
                    paymentProgress: 20,
                    interestRate: undefined, // interestRate not in mock
                },
                paymentInfo: undefined,
                metadata: {
                    generatedAt: expect.any(Date),
                    validUntil: expect.any(Date),
                    qrCodeData: undefined,
                    bankingInfo: undefined,
                },
            });

            expect(mockPrincipalCalculator.calculateCurrentPrincipal).toHaveBeenCalledWith('loan-1');
            expect(mockReferenceService.generateInvoiceNumber).toHaveBeenCalledWith('BKK1');
            expect(mockDb.nextPaymentInvoice.create).toHaveBeenCalled();
        });

        it('should handle loan not found', async () => {
            const { prisma } = require('../../../config/database');
            prisma.loan.findUnique.mockResolvedValue(null);

            await expect(service.generateNextPaymentInvoice('non-existent', 'user-1'))
                .rejects.toThrow('Loan not found');
        });

        it('should handle no pending payment schedule', async () => {
            mockPrincipalCalculator.calculateCurrentPrincipal.mockResolvedValue({
                ...mockPrincipalCalc,
                nextPaymentSchedule: null,
            } as any);

            await expect(service.generateNextPaymentInvoice('loan-1', 'user-1'))
                .rejects.toThrow('No pending payment schedule found');
        });

        it('should use existing invoice if valid', async () => {
            const existingInvoice = {
                id: 'existing-invoice',
                invoiceNumber: 'INV-BKK1-6703-00001',
                createdAt: new Date(),
                status: 'PENDING',
                invoiceData: {
                    invoiceId: 'existing-invoice',
                    invoiceNumber: 'INV-BKK1-6703-00001',
                    loanId: 'loan-1',
                    customerId: 'customer-1',
                    paymentScheduleId: 'schedule-1',
                    customer: mockLoan.customer,
                    nextPayment: {
                        installmentNo: 3,
                        dueDate: new Date('2024-03-01'),
                        principalAmount: 8000,
                        interestAmount: 1000,
                        totalAmount: 9000,
                        status: 'UNPAID',
                    },
                    loanSummary: {
                        currentOutstandingBalance: 80000,
                        remainingPrincipal: 80000,
                        totalPaid: 20000,
                        paymentProgress: 20,
                    },
                    metadata: {
                        generatedAt: new Date(),
                        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                },
            };

            mockDb.nextPaymentInvoice.findFirst.mockResolvedValue(existingInvoice);

            const result = await service.generateNextPaymentInvoice('loan-1', 'user-1');

            expect(result.invoiceId).toBe('existing-invoice');
            expect(mockDb.nextPaymentInvoice.create).not.toHaveBeenCalled();
        });
    });

    describe('updateInvoiceAfterPayment', () => {
        const mockInvoice = {
            id: 'invoice-1',
            paymentScheduleId: 'schedule-1',
        };

        beforeEach(() => {
            mockDb.nextPaymentInvoice.findFirst.mockResolvedValue(mockInvoice);
            mockDb.nextPaymentInvoice.update.mockResolvedValue(mockInvoice);
        });

        it('should update invoice after payment', async () => {
            const paymentData = {
                amount: 9000,
                paymentDate: new Date('2024-03-01'),
                paymentMethod: 'BANK_TRANSFER',
                receiptNumber: 'RCP-001',
            };

            await service.updateInvoiceAfterPayment('schedule-1', paymentData);

            expect(mockDb.nextPaymentInvoice.update).toHaveBeenCalledWith({
                where: { id: 'invoice-1' },
                data: {
                    status: 'PAID',
                    paidAt: paymentData.paymentDate,
                    paidAmount: paymentData.amount,
                    paymentMethod: paymentData.paymentMethod,
                    receiptNumber: paymentData.receiptNumber,
                },
            });
        });

        it('should handle no invoice found gracefully', async () => {
            mockDb.nextPaymentInvoice.findFirst.mockResolvedValue(null);

            const paymentData = {
                amount: 9000,
                paymentDate: new Date('2024-03-01'),
                paymentMethod: 'BANK_TRANSFER',
                receiptNumber: 'RCP-001',
            };

            // Should not throw error
            await expect(service.updateInvoiceAfterPayment('schedule-1', paymentData))
                .resolves.toBeUndefined();

            expect(mockDb.nextPaymentInvoice.update).not.toHaveBeenCalled();
        });
    });

    describe('sendInvoiceToCustomer', () => {
        const mockInvoice = {
            id: 'invoice-1',
            customerId: 'customer-1',
            loan: {
                customer: {
                    businessName: 'Test Business',
                },
            },
        };

        beforeEach(() => {
            mockDb.nextPaymentInvoice.findUnique.mockResolvedValue(mockInvoice);
            mockDb.nextPaymentInvoice.update.mockResolvedValue(mockInvoice);
        });

        it('should send invoice via LINE successfully', async () => {
            const result = await service.sendInvoiceToCustomer('invoice-1', 'LINE', 'user-1');

            expect(result).toEqual({
                success: true,
                message: 'Invoice sent via LINE successfully',
            });

            expect(mockDb.nextPaymentInvoice.update).toHaveBeenCalledWith({
                where: { id: 'invoice-1' },
                data: {
                    status: 'SENT',
                    sentAt: expect.any(Date),
                    sentVia: 'LINE',
                    sentBy: 'user-1',
                },
            });
        });

        it('should handle invoice not found', async () => {
            mockDb.nextPaymentInvoice.findUnique.mockResolvedValue(null);

            const result = await service.sendInvoiceToCustomer('non-existent', 'LINE', 'user-1');

            expect(result).toEqual({
                success: false,
                message: 'Invoice not found',
            });
        });
    });

    describe('getInvoiceHistory', () => {
        const mockInvoices = [
            {
                id: 'invoice-1',
                invoiceNumber: 'INV-001',
                createdAt: new Date('2024-03-01'),
                invoiceData: {
                    invoiceId: 'invoice-1',
                    loanId: 'loan-1',
                    metadata: { generatedAt: new Date('2024-03-01') },
                },
            },
            {
                id: 'invoice-2',
                invoiceNumber: 'INV-002',
                createdAt: new Date('2024-02-01'),
                invoiceData: {
                    invoiceId: 'invoice-2',
                    loanId: 'loan-1',
                    metadata: { generatedAt: new Date('2024-02-01') },
                },
            },
        ];

        beforeEach(() => {
            mockDb.nextPaymentInvoice.findMany.mockResolvedValue(mockInvoices);
            mockPrincipalCalculator.calculateCurrentPrincipal.mockResolvedValue({
                currentOutstandingBalance: 80000,
                remainingPrincipal: 80000,
                totalAmountPaid: 20000,
                paymentProgress: { progressPercentage: 20 },
            } as any);
        });

        it('should get invoice history successfully', async () => {
            const result = await service.getInvoiceHistory('loan-1');

            expect(result).toHaveLength(2);
            expect(result[0].invoiceId).toBe('invoice-1');
            expect(result[1].invoiceId).toBe('invoice-2');
            expect(mockDb.nextPaymentInvoice.findMany).toHaveBeenCalledWith({
                where: { loanId: 'loan-1' },
                orderBy: { createdAt: 'desc' },
            });
        });
    });
});
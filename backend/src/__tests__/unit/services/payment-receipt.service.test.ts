import { PaymentReceiptService } from '@invoices/services/payment-receipt.service';
import { ReferenceNumberService } from '@invoices/services/reference-number.service';

// Mock dependencies
jest.mock('../../../config/database', () => ({
    prisma: {
        payment: {
            findUnique: jest.fn(),
        },
        loan: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('../../../services/reference-number.service');

describe('PaymentReceiptService', () => {
    let service: PaymentReceiptService;
    let mockReferenceService: jest.Mocked<ReferenceNumberService>;

    const mockDb = {
        paymentReceipt: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
    };

    beforeEach(() => {
        service = new PaymentReceiptService();
        mockReferenceService = new ReferenceNumberService() as jest.Mocked<ReferenceNumberService>;
        
        // Mock the private properties
        (service as any).referenceService = mockReferenceService;
        (service as any).db = mockDb;
        
        jest.clearAllMocks();
    });

    describe('generatePaymentReceipt', () => {
        const mockPayment = {
            id: 'payment-1',
            loanId: 'loan-1',
            amount: 9000,
            paymentDate: new Date('2024-03-01'),
            paymentMethod: 'BANK_TRANSFER',
            loan: {
                customerId: 'customer-1',
                customer: {
                    businessName: 'Test Business',
                    address: '123 Test St',
                    phone: '0123456789',
                    email: 'test@example.com',
                    branch: {
                        code: 'BKK1',
                        name: 'Bangkok Branch',
                    },
                },
                principal: 100000,
                interestRate: 12,
                termMonths: 12,
            },
        };

        beforeEach(() => {
            const { prisma } = require('../../../config/database');
            prisma.payment.findUnique.mockResolvedValue(mockPayment);
            
            mockReferenceService.generateReceiptNumber.mockResolvedValue('RCP-BKK1-6703-00001');
            
            mockDb.paymentReceipt.create.mockResolvedValue({
                id: 'receipt-1',
                receiptNumber: 'RCP-BKK1-6703-00001',
            });
        });

        it('should generate payment receipt successfully', async () => {
            const result = await service.generatePaymentReceipt('payment-1', 'user-1');

            expect(result).toEqual({
                receiptId: 'receipt-1',
                receiptNumber: 'RCP-BKK1-6703-00001',
                paymentId: 'payment-1',
                loanId: 'loan-1',
                customerId: 'customer-1',
                amount: 9000,
                paymentDate: new Date('2024-03-01'),
                paymentMethod: 'BANK_TRANSFER',
                customer: {
                    businessName: 'Test Business',
                    address: '123 Test St',
                    phone: '0123456789',
                    email: 'test@example.com',
                },
                paymentBreakdown: {
                    totalAmount: 9000,
                    principalAmount: expect.any(Number),
                    interestAmount: expect.any(Number),
                    penaltyAmount: 0,
                    fees: [],
                },
                loanSummary: {
                    originalPrincipal: 100000,
                    interestRate: 12,
                    termMonths: 12,
                    outstandingBalance: expect.any(Number),
                },
                branch: {
                    code: 'BKK1',
                    name: 'Bangkok Branch',
                },
                metadata: {
                    issuedAt: expect.any(Date),
                    issuedBy: 'user-1',
                    validationCode: expect.any(String),
                    qrCodeData: expect.stringContaining('RCP-BKK1-6703-00001'),
                },
            });

            expect(mockReferenceService.generateReceiptNumber).toHaveBeenCalledWith('BKK1');
            expect(mockDb.paymentReceipt.create).toHaveBeenCalled();
        });

        it('should handle payment not found', async () => {
            const { prisma } = require('../../../config/database');
            prisma.payment.findUnique.mockResolvedValue(null);

            await expect(service.generatePaymentReceipt('non-existent', 'user-1'))
                .rejects.toThrow('Payment not found');
        });

        it('should include penalty amount when present', async () => {
            const paymentWithPenalty = {
                ...mockPayment,
                penaltyAmount: 500,
            };

            const { prisma } = require('../../../config/database');
            prisma.payment.findUnique.mockResolvedValue(paymentWithPenalty);

            const result = await service.generatePaymentReceipt('payment-1', 'user-1');

            expect(result.paymentBreakdown.penaltyAmount).toBe(500);
        });
    });

    describe('validateReceipt', () => {
        const mockReceipt = {
            id: 'receipt-1',
            receiptNumber: 'RCP-BKK1-6703-00001',
            amount: 9000,
            paymentDate: new Date('2024-03-01'),
            status: 'ISSUED',
            receiptData: {
                metadata: {
                    validationCode: 'ABC123',
                },
            },
        };

        beforeEach(() => {
            mockDb.paymentReceipt.findUnique.mockResolvedValue(mockReceipt);
        });

        it('should validate receipt successfully', async () => {
            const result = await service.validateReceipt('RCP-BKK1-6703-00001', 'ABC123');

            expect(result).toEqual({
                isValid: true,
                receiptNumber: 'RCP-BKK1-6703-00001',
                amount: 9000,
                paymentDate: new Date('2024-03-01'),
                status: 'ISSUED',
                validatedAt: expect.any(Date),
            });
        });

        it('should handle invalid receipt number', async () => {
            mockDb.paymentReceipt.findUnique.mockResolvedValue(null);

            const result = await service.validateReceipt('INVALID', 'ABC123');

            expect(result).toEqual({
                isValid: false,
                error: 'Receipt not found',
                validatedAt: expect.any(Date),
            });
        });

        it('should handle invalid validation code', async () => {
            const result = await service.validateReceipt('RCP-BKK1-6703-00001', 'WRONG');

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid validation code',
                validatedAt: expect.any(Date),
            });
        });

        it('should handle cancelled receipt', async () => {
            mockDb.paymentReceipt.findUnique.mockResolvedValue({
                ...mockReceipt,
                status: 'CANCELLED',
            });

            const result = await service.validateReceipt('RCP-BKK1-6703-00001', 'ABC123');

            expect(result).toEqual({
                isValid: false,
                error: 'Receipt has been cancelled',
                validatedAt: expect.any(Date),
            });
        });
    });

    describe('sendReceiptToCustomer', () => {
        const mockReceipt = {
            id: 'receipt-1',
            receiptNumber: 'RCP-BKK1-6703-00001',
            customerId: 'customer-1',
            payment: {
                loan: {
                    customer: {
                        businessName: 'Test Business',
                        lineUserId: 'line-user-1',
                        email: 'test@example.com',
                        phone: '0123456789',
                    },
                },
            },
        };

        beforeEach(() => {
            mockDb.paymentReceipt.findUnique.mockResolvedValue(mockReceipt);
            mockDb.paymentReceipt.update.mockResolvedValue(mockReceipt);
        });

        it('should send receipt via LINE successfully', async () => {
            const result = await service.sendReceiptToCustomer('receipt-1', 'LINE', 'user-1');

            expect(result).toEqual({
                success: true,
                message: 'Receipt sent via LINE successfully',
                sentAt: expect.any(Date),
            });

            expect(mockDb.paymentReceipt.update).toHaveBeenCalledWith({
                where: { id: 'receipt-1' },
                data: {
                    status: 'SENT',
                    sentAt: expect.any(Date),
                    sentVia: 'LINE',
                },
            });
        });

        it('should send receipt via EMAIL successfully', async () => {
            const result = await service.sendReceiptToCustomer('receipt-1', 'EMAIL', 'user-1');

            expect(result).toEqual({
                success: true,
                message: 'Receipt sent via EMAIL successfully',
                sentAt: expect.any(Date),
            });
        });

        it('should handle receipt not found', async () => {
            mockDb.paymentReceipt.findUnique.mockResolvedValue(null);

            const result = await service.sendReceiptToCustomer('non-existent', 'LINE', 'user-1');

            expect(result).toEqual({
                success: false,
                message: 'Receipt not found',
            });
        });

        it('should handle missing contact information', async () => {
            mockDb.paymentReceipt.findUnique.mockResolvedValue({
                ...mockReceipt,
                payment: {
                    loan: {
                        customer: {
                            businessName: 'Test Business',
                            // Missing lineUserId, email, phone
                        },
                    },
                },
            });

            const result = await service.sendReceiptToCustomer('receipt-1', 'LINE', 'user-1');

            expect(result).toEqual({
                success: false,
                message: 'Customer LINE ID not found',
            });
        });
    });

    describe('getReceiptHistory', () => {
        const mockReceipts = [
            {
                id: 'receipt-1',
                receiptNumber: 'RCP-001',
                amount: 9000,
                paymentDate: new Date('2024-03-01'),
                status: 'SENT',
                receiptData: {
                    customer: { businessName: 'Test Business 1' },
                    metadata: { issuedAt: new Date('2024-03-01') },
                },
            },
            {
                id: 'receipt-2',
                receiptNumber: 'RCP-002',
                amount: 8500,
                paymentDate: new Date('2024-02-01'),
                status: 'ISSUED',
                receiptData: {
                    customer: { businessName: 'Test Business 2' },
                    metadata: { issuedAt: new Date('2024-02-01') },
                },
            },
        ];

        beforeEach(() => {
            mockDb.paymentReceipt.findMany.mockResolvedValue(mockReceipts);
        });

        it('should get receipt history for loan', async () => {
            const result = await service.getReceiptHistory('loan-1');

            expect(result).toHaveLength(2);
            expect(result[0].receiptId).toBe('receipt-1');
            expect(result[1].receiptId).toBe('receipt-2');
            expect(mockDb.paymentReceipt.findMany).toHaveBeenCalledWith({
                where: { loanId: 'loan-1' },
                orderBy: { issuedAt: 'desc' },
            });
        });

        it('should get receipt history for customer', async () => {
            const result = await service.getReceiptHistory(undefined, 'customer-1');

            expect(result).toHaveLength(2);
            expect(mockDb.paymentReceipt.findMany).toHaveBeenCalledWith({
                where: { customerId: 'customer-1' },
                orderBy: { issuedAt: 'desc' },
            });
        });

        it('should handle no receipts found', async () => {
            mockDb.paymentReceipt.findMany.mockResolvedValue([]);

            const result = await service.getReceiptHistory('loan-1');

            expect(result).toEqual([]);
        });
    });
});
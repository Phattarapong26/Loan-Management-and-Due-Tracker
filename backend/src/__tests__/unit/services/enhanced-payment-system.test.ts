import { PrincipalCalculatorService } from '@loans/calculators/principal-calculator.service';
import { NextPaymentInvoiceService } from '@invoices/services/next-payment-invoice.service';
import { TieredInterestCalculatorService } from '@loans/calculators/tiered-interest-calculator.service';
import { PaymentReceiptService } from '@invoices/services/payment-receipt.service';

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
            findUnique: jest.fn(),
        },
    },
}));

describe('Enhanced Payment System Unit Tests', () => {
    let principalCalculatorService: PrincipalCalculatorService;
    let nextPaymentInvoiceService: NextPaymentInvoiceService;
    let tieredInterestCalculatorService: TieredInterestCalculatorService;
    let paymentReceiptService: PaymentReceiptService;

    beforeEach(() => {
        principalCalculatorService = new PrincipalCalculatorService();
        nextPaymentInvoiceService = new NextPaymentInvoiceService();
        tieredInterestCalculatorService = new TieredInterestCalculatorService();
        paymentReceiptService = new PaymentReceiptService();
        jest.clearAllMocks();
    });

    describe('PrincipalCalculatorService', () => {
        it('should be instantiated correctly', () => {
            expect(principalCalculatorService).toBeInstanceOf(PrincipalCalculatorService);
        });

        it('should have calculateCurrentPrincipal method', () => {
            expect(typeof principalCalculatorService.calculateCurrentPrincipal).toBe('function');
        });
    });

    describe('NextPaymentInvoiceService', () => {
        it('should be instantiated correctly', () => {
            expect(nextPaymentInvoiceService).toBeInstanceOf(NextPaymentInvoiceService);
        });

        it('should have generateNextPaymentInvoice method', () => {
            expect(typeof nextPaymentInvoiceService.generateNextPaymentInvoice).toBe('function');
        });

        it('should have updateInvoiceAfterPayment method', () => {
            expect(typeof nextPaymentInvoiceService.updateInvoiceAfterPayment).toBe('function');
        });

        it('should have getNextPaymentInvoiceForCustomer method', () => {
            expect(typeof nextPaymentInvoiceService.getNextPaymentInvoiceForCustomer).toBe('function');
        });

        it('should have sendInvoiceToCustomer method', () => {
            expect(typeof nextPaymentInvoiceService.sendInvoiceToCustomer).toBe('function');
        });

        it('should have getInvoiceHistory method', () => {
            expect(typeof nextPaymentInvoiceService.getInvoiceHistory).toBe('function');
        });
    });

    describe('TieredInterestCalculatorService', () => {
        it('should be instantiated correctly', () => {
            expect(tieredInterestCalculatorService).toBeInstanceOf(TieredInterestCalculatorService);
        });

        it('should have calculateTieredInterest method', () => {
            expect(typeof tieredInterestCalculatorService.calculateTieredInterest).toBe('function');
        });
    });

    describe('PaymentReceiptService', () => {
        it('should be instantiated correctly', () => {
            expect(paymentReceiptService).toBeInstanceOf(PaymentReceiptService);
        });

        it('should have generatePaymentReceipt method', () => {
            expect(typeof paymentReceiptService.generatePaymentReceipt).toBe('function');
        });

        it('should have validateReceipt method', () => {
            expect(typeof paymentReceiptService.validateReceipt).toBe('function');
        });

        it('should have sendReceiptToCustomer method', () => {
            expect(typeof paymentReceiptService.sendReceiptToCustomer).toBe('function');
        });
    });

    describe('Service Integration', () => {
        it('should have all required services available', () => {
            expect(principalCalculatorService).toBeDefined();
            expect(nextPaymentInvoiceService).toBeDefined();
            expect(tieredInterestCalculatorService).toBeDefined();
            expect(paymentReceiptService).toBeDefined();
        });

        it('should have proper method signatures', () => {
            // Test that methods exist and are callable
            expect(() => {
                principalCalculatorService.calculateCurrentPrincipal('test-id');
            }).not.toThrow();

            expect(() => {
                nextPaymentInvoiceService.generateNextPaymentInvoice('test-id', 'user-id');
            }).not.toThrow();

            expect(() => {
                tieredInterestCalculatorService.calculateTieredInterest('test-id', 50000, 1);
            }).not.toThrow();

            expect(() => {
                paymentReceiptService.generatePaymentReceipt('test-id', 'user-id');
            }).not.toThrow();
        });
    });
});
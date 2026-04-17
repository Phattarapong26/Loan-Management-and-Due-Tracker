import { prisma } from '../../config/database';
import { PrincipalCalculatorService } from '../../services/principal-calculator.service';
import { NextPaymentInvoiceService } from '../../services/next-payment-invoice.service';
import { PaymentReceiptService } from '../../services/payment-receipt.service';
import { TieredInterestCalculatorService } from '../../services/tiered-interest-calculator.service';
import { ReferenceNumberService } from '../../services/reference-number.service';

describe('Enhanced Payment System Integration Tests', () => {
    let principalCalculatorService: PrincipalCalculatorService;
    let nextPaymentInvoiceService: NextPaymentInvoiceService;
    let paymentReceiptService: PaymentReceiptService;
    let tieredInterestCalculatorService: TieredInterestCalculatorService;
    let referenceNumberService: ReferenceNumberService;

    // Test data
    let testBranch: any;
    let testUser: any;
    let testCustomer: any;
    let testLoanProduct: any;
    let testLoan: any;
    let testPaymentSchedules: any[];

    beforeAll(async () => {
        // Initialize services
        principalCalculatorService = new PrincipalCalculatorService();
        nextPaymentInvoiceService = new NextPaymentInvoiceService();
        paymentReceiptService = new PaymentReceiptService();
        tieredInterestCalculatorService = new TieredInterestCalculatorService();
        referenceNumberService = new ReferenceNumberService();

        // Create test data
        await setupTestData();
    });

    afterAll(async () => {
        // Clean up test data
        await cleanupTestData();
        await prisma.$disconnect();
    });

    describe('Complete Payment Flow Integration', () => {
        it('should complete the full payment flow: Invoice → Payment → Receipt', async () => {
            // Step 1: Calculate current principal
            const principalCalc = await principalCalculatorService.calculateCurrentPrincipal(testLoan.id);
            
            expect(principalCalc).toMatchObject({
                loanId: testLoan.id,
                originalPrincipal: 100000,
                currentOutstandingBalance: expect.any(Number),
                nextPaymentSchedule: expect.objectContaining({
                    status: 'UNPAID',
                }),
            });

            // Step 2: Generate next payment invoice
            const invoice = await nextPaymentInvoiceService.generateNextPaymentInvoice(
                testLoan.id,
                testUser.id
            );

            expect(invoice).toMatchObject({
                invoiceId: expect.any(String),
                invoiceNumber: expect.stringMatching(/^INV-/),
                loanId: testLoan.id,
                customerId: testCustomer.id,
                customer: {
                    businessName: testCustomer.businessName,
                },
                nextPayment: {
                    installmentNo: expect.any(Number),
                    totalAmount: expect.any(Number),
                    status: 'UNPAID',
                },
            });

            // Step 3: Verify invoice generation
            expect(invoice).toMatchObject({
                loanId: testLoan.id,
                customerId: testLoan.customerId,
                nextPayment: {
                    installmentNo: expect.any(Number),
                    totalAmount: expect.any(Number),
                    status: 'UNPAID',
                },
            });

            // Step 4: Create actual payment record
            const paymentAmount = invoice.nextPayment.totalAmount;
            const payment = await prisma.payment.create({
                data: {
                    loanId: testLoan.id,
                    paymentScheduleId: invoice.paymentScheduleId,
                    amount: paymentAmount,
                    paymentDate: new Date(),
                    paymentMethod: 'BANK_TRANSFER',
                    paymentType: 'ON_TIME',
                    createdBy: testUser.id,
                    reference: `PAY-${Date.now()}`,
                },
            });

            // Step 5: Update invoice after payment
            await nextPaymentInvoiceService.updateInvoiceAfterPayment(
                invoice.paymentScheduleId,
                {
                    amount: paymentAmount,
                    paymentDate: new Date(),
                    paymentMethod: 'BANK_TRANSFER',
                    receiptNumber: `RCP-${Date.now()}`,
                }
            );

            // Step 6: Generate payment receipt
            const receipt = await paymentReceiptService.generatePaymentReceipt(
                payment.id,
                testUser.id
            );

            expect(receipt).toMatchObject({
                receiptId: expect.any(String),
                receiptNumber: expect.stringMatching(/^RCP-/),
                paymentId: payment.id,
                loanId: testLoan.id,
                customerId: testCustomer.id,
                amount: paymentAmount,
                paymentBreakdown: {
                    totalAmount: paymentAmount,
                    principalAmount: expect.any(Number),
                    interestAmount: expect.any(Number),
                },
            });

            // Step 7: Verify principal calculation after payment
            const updatedPrincipalCalc = await principalCalculatorService.calculateCurrentPrincipal(testLoan.id);
            
            expect(updatedPrincipalCalc.currentOutstandingBalance)
                .toBeLessThan(principalCalc.currentOutstandingBalance);
            expect(updatedPrincipalCalc.totalAmountPaid)
                .toBeGreaterThan(principalCalc.totalAmountPaid);
        });

        it('should handle tiered interest calculation correctly', async () => {
            // Test different outstanding balance amounts
            const testAmounts = [25000, 75000, 150000];
            
            for (const amount of testAmounts) {
                const tieredInterest = await tieredInterestCalculatorService.calculateTieredInterest(
                    testLoan.id,
                    amount,
                    1
                );

                expect(tieredInterest).toMatchObject({
                    loanId: testLoan.id,
                    outstandingBalance: amount,
                    paymentNumber: 1,
                    applicableTier: {
                        tierName: expect.any(String),
                        interestRate: expect.any(Number),
                        minAmount: expect.any(Number),
                    },
                    interestAmount: expect.any(Number),
                    effectiveRate: expect.any(Number),
                    calculationDate: expect.any(Date),
                });

                // Verify tier logic
                if (amount <= 50000) {
                    expect(tieredInterest.appliedTier.tierName).toBe('Small Business');
                } else if (amount <= 100000) {
                    expect(tieredInterest.appliedTier.tierName).toBe('Medium Business');
                } else {
                    expect(tieredInterest.appliedTier.tierName).toBe('Large Business');
                }
            }
        });

    });

    describe('Reference Number System Integration', () => {
        it('should generate unique reference numbers', async () => {
            const contractNumber = await referenceNumberService.generateContractNumber('BKK1');
            const invoiceNumber = await referenceNumberService.generateInvoiceNumber('BKK1');
            const receiptNumber = await referenceNumberService.generateReceiptNumber('BKK1');
            const statementNumber = await referenceNumberService.generateStatementNumber('BKK1', 1);

            expect(contractNumber).toMatch(/^BKK1-\d{4}-SME-\d{6}$/);
            expect(invoiceNumber).toMatch(/^INV-BKK1-\d{4}-\d{5}$/);
            expect(receiptNumber).toMatch(/^RCP-BKK1-\d{4}-\d{5}$/);
            expect(statementNumber).toMatch(/^STM-BKK1-\d{4}-SME-\d{6}-\d{3}$/);

            // Verify uniqueness
            const contractNumber2 = await referenceNumberService.generateContractNumber('BKK1');
            const invoiceNumber2 = await referenceNumberService.generateInvoiceNumber('BKK1');
            const receiptNumber2 = await referenceNumberService.generateReceiptNumber('BKK1');

            expect(contractNumber2).not.toBe(contractNumber);
            expect(invoiceNumber2).not.toBe(invoiceNumber);
            expect(receiptNumber2).not.toBe(receiptNumber);
        });

        it('should validate and parse reference numbers', async () => {
            const contractNumber = 'BKK1-2567-SME-000123';
            const invoiceNumber = 'INV-BKK1-6703-00123';
            const receiptNumber = 'RCP-BKK1-6703-00123';

            const contractValidation = await referenceNumberService.validateReferenceNumber(contractNumber);
            const invoiceValidation = await referenceNumberService.validateReferenceNumber(invoiceNumber);
            const receiptValidation = await referenceNumberService.validateReferenceNumber(receiptNumber);

            expect(contractValidation).toMatchObject({
                isValid: true,
                type: 'CONTRACT',
                branchCode: 'BKK1',
                year: 2567,
                sequenceNumber: 123,
            });

            expect(invoiceValidation).toMatchObject({
                isValid: true,
                type: 'INVOICE',
                branchCode: 'BKK1',
                month: 3,
                year: 2567,
                sequenceNumber: 123,
            });

            expect(receiptValidation).toMatchObject({
                isValid: true,
                type: 'RECEIPT',
                branchCode: 'BKK1',
                month: 3,
                year: 2567,
                sequenceNumber: 123,
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle non-existent loan gracefully', async () => {
            await expect(principalCalculatorService.calculateCurrentPrincipal('non-existent'))
                .rejects.toThrow('Loan not found');

            await expect(nextPaymentInvoiceService.generateNextPaymentInvoice('non-existent', testUser.id))
                .rejects.toThrow('Loan not found');

            await expect(tieredInterestCalculatorService.calculateTieredInterest('non-existent', 50000, 1))
                .rejects.toThrow('Loan not found');
        });

        it('should handle invalid loan IDs', async () => {
            await expect(principalCalculatorService.calculateCurrentPrincipal('invalid-id'))
                .rejects.toThrow('Loan not found');

            await expect(nextPaymentInvoiceService.generateNextPaymentInvoice(testLoan.id, 'user-id'))
                .rejects.toThrow();
        });
    });

    // Helper functions
    async function setupTestData() {
        // Create test branch
        testBranch = await prisma.branch.create({
            data: {
                code: 'TEST1',
                name: 'Test Branch',
                status: 'ACTIVE',
            },
        });

        // Create test user
        testUser = await prisma.user.create({
            data: {
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                firstName: 'Test',
                lastName: 'User',
                role: 'OFFICER',
                status: 'ACTIVE',
                branchId: testBranch.id,
            },
        });

        // Create test customer
        testCustomer = await prisma.customer.create({
            data: {
                customerCode: 'CUST001',
                businessName: 'Test Business Ltd.',
                phone: '0123456789',
                email: 'customer@example.com',
                taxId: '1234567890123',
                branchId: testBranch.id,
                createdBy: testUser.id,
            },
        });

        // Create test loan product with interest rate tiers
        testLoanProduct = await prisma.loanProduct.create({
            data: {
                productCode: 'SME001',
                productName: 'SME Loan Product',
                maxLoanAmount: 1000000,
                interestRateType: 'FIXED',
                loanType: 'SHORT_TERM',
                maxTermMonths: 12,
                status: 'ACTIVE',
                createdBy: testUser.id,
                interestRateTiers: {
                    create: [
                        {
                            tierName: 'Small Business',
                            minAmount: 0,
                            maxAmount: 50000,
                            interestRate: 10,
                            gracePeriodDays: 30,
                            effectiveFrom: new Date('2024-01-01'),
                            status: 'ACTIVE',
                        },
                        {
                            tierName: 'Medium Business',
                            minAmount: 50001,
                            maxAmount: 100000,
                            interestRate: 8,
                            gracePeriodDays: 15,
                            effectiveFrom: new Date('2024-01-01'),
                            status: 'ACTIVE',
                        },
                        {
                            tierName: 'Large Business',
                            minAmount: 100001,
                            maxAmount: null,
                            interestRate: 6,
                            gracePeriodDays: 0,
                            effectiveFrom: new Date('2024-01-01'),
                            status: 'ACTIVE',
                        },
                    ],
                },
            },
        });

        // Create test loan
        testLoan = await prisma.loan.create({
            data: {
                customerId: testCustomer.id,
                branchId: testBranch.id,
                officerId: testUser.id,
                principal: 100000,
                interestRate: 12,
                termMonths: 12,
                status: 'ACTIVE',
                approvalLevel: 'OFFICER',
                disbursementDate: new Date('2024-01-01'),
                loanProductId: testLoanProduct.id,
            },
        });

        // Create test payment schedules
        testPaymentSchedules = [];
        for (let i = 1; i <= 12; i++) {
            const paymentDate = new Date('2024-01-01');
            paymentDate.setMonth(paymentDate.getMonth() + i);

            const principalAmount = 8000 + (i * 100); // Increasing principal
            const interestAmount = 1000 - (i * 50); // Decreasing interest
            const totalPayment = principalAmount + interestAmount;
            const remainingBalance = 100000 - (principalAmount * i);

            const schedule = await prisma.paymentSchedule.create({
                data: {
                    loanId: testLoan.id,
                    paymentNumber: i,
                    paymentDate,
                    principalAmount,
                    interestAmount,
                    totalPayment,
                    remainingBalance: Math.max(0, remainingBalance),
                    status: i <= 2 ? 'PAID' : 'UNPAID', // First 2 payments are paid
                },
            });

            testPaymentSchedules.push(schedule);
        }

        // Create payments for the first 2 schedules
        for (let i = 0; i < 2; i++) {
            await prisma.payment.create({
                data: {
                    loanId: testLoan.id,
                    paymentScheduleId: testPaymentSchedules[i].id,
                    amount: testPaymentSchedules[i].totalPayment,
                    paymentDate: testPaymentSchedules[i].paymentDate,
                    paymentMethod: 'BANK_TRANSFER',
                    paymentType: 'ON_TIME',
                    createdBy: testUser.id,
                    reference: `PAY-TEST-${i + 1}`,
                },
            });
        }
    }

    async function cleanupTestData() {
        // Delete in reverse order of creation to handle foreign key constraints
        await prisma.payment.deleteMany({ where: { loanId: testLoan?.id } });
        await prisma.paymentSchedule.deleteMany({ where: { loanId: testLoan?.id } });
        await prisma.loan.deleteMany({ where: { id: testLoan?.id } });
        await prisma.interestRateTier.deleteMany({ where: { loanProductId: testLoanProduct?.id } });
        await prisma.loanProduct.deleteMany({ where: { id: testLoanProduct?.id } });
        await prisma.customer.deleteMany({ where: { id: testCustomer?.id } });
        await prisma.user.deleteMany({ where: { id: testUser?.id } });
        await prisma.branch.deleteMany({ where: { id: testBranch?.id } });
    }
});
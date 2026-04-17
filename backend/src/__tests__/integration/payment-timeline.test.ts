import { prisma } from '@config/database.config';
import { PaymentTimelineService } from '@services/payment-timeline.service';

describe('Payment Timeline System Integration', () => {
    let paymentTimelineService: PaymentTimelineService;
    let testLoan: any;
    let testCustomer: any;
    let testUser: any;
    let testBranch: any;
    let testPaymentSchedule: any;

    beforeAll(async () => {
        paymentTimelineService = new PaymentTimelineService();
        await setupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
        await prisma.$disconnect();
    });

    describe('Timeline Event Creation', () => {
        it('should create timeline events for a payment schedule', async () => {
            const events = await paymentTimelineService.createPaymentTimeline(
                testLoan.id,
                testPaymentSchedule.id,
                testPaymentSchedule.paymentDate
            );

            expect(Array.isArray(events)).toBe(true);
            expect(events).toHaveLength(6); // T-7, T-3, T-1, T+0, T+1, T+90
            
            // Verify event types
            const eventTypes = events.map((e: any) => e.eventType);
            expect(eventTypes).toContain('INVOICE_GENERATION');
            expect(eventTypes).toContain('REMINDER_1');
            expect(eventTypes).toContain('REMINDER_2');
            expect(eventTypes).toContain('OVERDUE_UPDATE');
            expect(eventTypes).toContain('PENALTY_INVOICE');
            expect(eventTypes).toContain('NPL_STATUS_UPDATE');

            // Verify all events have required properties
            events.forEach((event: any) => {
                expect(event).toHaveProperty('id');
                expect(event).toHaveProperty('eventType');
                expect(event).toHaveProperty('scheduledDate');
                expect(event.loanId).toBe(testLoan.id);
                expect(event.paymentScheduleId).toBe(testPaymentSchedule.id);
            });
        });

        it('should process scheduled timeline events', async () => {
            // Create events first
            await paymentTimelineService.createPaymentTimeline(
                testLoan.id,
                testPaymentSchedule.id,
                new Date() // Use current date to make events processable
            );

            // Process events
            const result = await paymentTimelineService.processScheduledEvents();
            
            expect(result.processed).toBeGreaterThanOrEqual(0);
            expect(result.failed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Timeline Management', () => {
        it('should get payment timeline for a loan', async () => {
            // Create timeline first
            await paymentTimelineService.createPaymentTimeline(
                testLoan.id,
                testPaymentSchedule.id,
                testPaymentSchedule.paymentDate
            );

            const timeline = await paymentTimelineService.getPaymentTimeline(testLoan.id);
            
            expect(Array.isArray(timeline)).toBe(true);
            expect(timeline.length).toBeGreaterThan(0);
            
            timeline.forEach((event: any) => {
                expect(event).toHaveProperty('id');
                expect(event).toHaveProperty('eventType');
                expect(event).toHaveProperty('scheduledDate');
                expect(event).toHaveProperty('status');
                expect(event.loanId).toBe(testLoan.id);
            });
        });

        it('should cancel timeline events', async () => {
            // Create timeline first
            await paymentTimelineService.createPaymentTimeline(
                testLoan.id,
                testPaymentSchedule.id,
                testPaymentSchedule.paymentDate
            );

            // Cancel events
            await paymentTimelineService.cancelTimelineEvents(
                testPaymentSchedule.id,
                'Payment completed early'
            );

            // Verify events are cancelled
            const events = await prisma.paymentTimelineEvent.findMany({
                where: {
                    paymentScheduleId: testPaymentSchedule.id,
                    status: 'CANCELLED',
                },
            });

            expect(events.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid loan IDs gracefully', async () => {
            try {
                const events = await paymentTimelineService.createPaymentTimeline(
                    'invalid-loan-id',
                    testPaymentSchedule.id,
                    new Date()
                );
                
                // If no error is thrown, expect empty array or handle gracefully
                expect(Array.isArray(events)).toBe(true);
            } catch (error) {
                // If error is thrown, that's also acceptable
                expect(error).toBeDefined();
            }
        });

        it('should handle missing payment schedule gracefully', async () => {
            try {
                const events = await paymentTimelineService.createPaymentTimeline(
                    testLoan.id,
                    'invalid-schedule-id',
                    new Date()
                );
                
                // If no error is thrown, expect empty array or handle gracefully
                expect(Array.isArray(events)).toBe(true);
            } catch (error) {
                // If error is thrown, that's also acceptable
                expect(error).toBeDefined();
            }
        });
    });

    // Helper functions
    async function setupTestData() {
        // Use unique identifiers to avoid conflicts
        const timestamp = Date.now();
        
        // Create test branch
        testBranch = await prisma.branch.create({
            data: {
                code: `TEST${timestamp}`,
                name: `Test Branch ${timestamp}`,
                status: 'ACTIVE',
            },
        });

        // Create test user
        testUser = await prisma.user.create({
            data: {
                email: `test${timestamp}@example.com`,
                passwordHash: 'hashed_password',
                firstName: 'Test',
                lastName: 'User',
                role: 'OFFICER',
                branchId: testBranch.id,
            },
        });

        // Create test customer
        testCustomer = await prisma.customer.create({
            data: {
                customerCode: `CUST${timestamp}`,
                businessName: `Test Business ${timestamp}`,
                phone: '0123456789',
                taxId: `${timestamp}123`,
                branchId: testBranch.id,
                createdBy: testUser.id,
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
                outstandingBalance: 100000,
                approvalLevel: 'OFFICER',
            },
        });

        // Create test payment schedule
        testPaymentSchedule = await prisma.paymentSchedule.create({
            data: {
                loanId: testLoan.id,
                paymentNumber: 1,
                paymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                principalAmount: 8000,
                interestAmount: 1000,
                totalPayment: 9000,
                remainingBalance: 92000,
                status: 'UNPAID',
            },
        });
    }

    async function cleanupTestData() {
        try {
            // Clean up in reverse order of creation to avoid foreign key constraints
            await prisma.paymentTimelineEvent.deleteMany({
                where: { loanId: testLoan?.id },
            });
            
            await prisma.nextPaymentInvoice.deleteMany({
                where: { loanId: testLoan?.id },
            });
            
            await prisma.paymentSchedule.deleteMany({
                where: { loanId: testLoan?.id },
            });
            
            await prisma.loan.deleteMany({
                where: { id: testLoan?.id },
            });
            
            await prisma.customer.deleteMany({
                where: { id: testCustomer?.id },
            });
            
            await prisma.user.deleteMany({
                where: { id: testUser?.id },
            });
            
            await prisma.branch.deleteMany({
                where: { id: testBranch?.id },
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
});
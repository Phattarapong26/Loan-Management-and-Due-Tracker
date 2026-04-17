import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../config/database';
import { JWTUtil } from '../../utils/jwt.util';

describe('Payment Validation Integration Tests', () => {
    let app: FastifyInstance;
    let authToken: string;
    let testLoanId: string;
    let testUserId: string;
    let testBranchId: string;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();

        // Create test branch
        const branch = await prisma.branch.create({
            data: {
                code: 'TEST001',
                name: 'Test Branch',
                address: 'Test Address',
                phone: '0123456789',
                status: 'ACTIVE'
            }
        });
        testBranchId = branch.id;

        // Create test user
        const user = await prisma.user.create({
            data: {
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'ADMIN',
                branchId: testBranchId,
                status: 'ACTIVE',
                passwordHash: 'dummy-hash'
            }
        });
        testUserId = user.id;

        // Create test customer
        const customer = await prisma.customer.create({
            data: {
                businessName: 'Test Business',
                email: 'customer@test.com',
                phone: '0987654321',
                address: 'Test Address',
                branchId: testBranchId,
                status: 'ACTIVE'
            }
        });

        // Create test loan with specific outstanding balance
        const loan = await prisma.loan.create({
            data: {
                customerId: customer.id,
                principal: 100000,
                outstandingBalance: 50000, // ยอดคงเหลือ 50,000 บาท
                interestRate: 12,
                termMonths: 12,
                status: 'ACTIVE',
                branchId: testBranchId,
                createdBy: testUserId,
                nextPaymentAmount: 5000,
                nextPaymentDate: new Date()
            }
        });
        testLoanId = loan.id;

        // Generate auth token
        authToken = await JWTUtil.generateAccessToken(app as any, {
            userId: testUserId,
            email: user.email,
            role: user.role,
            branchId: testBranchId
        });
    });

    afterAll(async () => {
        // Cleanup
        await prisma.payment.deleteMany({});
        await prisma.loan.deleteMany({});
        await prisma.customer.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.branch.deleteMany({});
        await app.close();
    });

    describe('Payment Amount Validation', () => {
        it('should reject negative payment amount', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/payments',
                headers: {
                    authorization: `Bearer ${authToken}`
                },
                payload: {
                    loanId: testLoanId,
                    amount: -1000,
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'CASH'
                }
            });

            expect(response.statusCode).toBe(422);
            expect(response.json().message).toContain('จำนวนเงินต้องมากกว่า 0');
        });

        it('should reject zero payment amount', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/payments',
                headers: {
                    authorization: `Bearer ${authToken}`
                },
                payload: {
                    loanId: testLoanId,
                    amount: 0,
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'CASH'
                }
            });

            expect(response.statusCode).toBe(422);
            expect(response.json().message).toContain('จำนวนเงินต้องมากกว่า 0');
        });

        it('should reject payment amount exceeding outstanding balance', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/payments',
                headers: {
                    authorization: `Bearer ${authToken}`
                },
                payload: {
                    loanId: testLoanId,
                    amount: 100000, // เกินยอดคงเหลือ 50,000
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'CASH'
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().message).toContain('ไม่สามารถชำระเกินยอดคงเหลือได้');
            expect(response.json().message).toContain('50,000');
        });

        it('should reject extremely high payment amount', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/payments',
                headers: {
                    authorization: `Bearer ${authToken}`
                },
                payload: {
                    loanId: testLoanId,
                    amount: 100000000, // 100 ล้าน
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'CASH'
                }
            });

            expect(response.statusCode).toBe(422);
            expect(response.json().message).toContain('จำนวนเงินสูงเกินไป');
        });

        it('should accept valid payment amount within outstanding balance', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/payments',
                headers: {
                    authorization: `Bearer ${authToken}`
                },
                payload: {
                    loanId: testLoanId,
                    amount: 25000, // ครึ่งหนึ่งของยอดคงเหลือ
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'CASH'
                }
            });

            expect(response.statusCode).toBe(201);
            expect(response.json().success).toBe(true);
        });

        it('should accept payment amount equal to outstanding balance', async () => {
            // สร้าง loan ใหม่สำหรับการทดสอบนี้
            const customer = await prisma.customer.create({
                data: {
                    businessName: 'Test Business 2',
                    email: 'customer2@test.com',
                    phone: '0987654322',
                    address: 'Test Address 2',
                    branchId: testBranchId,
                    status: 'ACTIVE'
                }
            });

            const loan = await prisma.loan.create({
                data: {
                    customerId: customer.id,
                    principal: 100000,
                    outstandingBalance: 30000,
                    interestRate: 12,
                    termMonths: 12,
                    status: 'ACTIVE',
                    branchId: testBranchId,
                    createdBy: testUserId,
                    nextPaymentAmount: 5000,
                    nextPaymentDate: new Date()
                }
            });

            const response = await app.inject({
                method: 'POST',
                url: '/api/payments',
                headers: {
                    authorization: `Bearer ${authToken}`
                },
                payload: {
                    loanId: loan.id,
                    amount: 30000, // เท่ากับยอดคงเหลือ
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'CASH'
                }
            });

            expect(response.statusCode).toBe(201);
            expect(response.json().success).toBe(true);

            // Cleanup
            await prisma.payment.deleteMany({ where: { loanId: loan.id } });
            await prisma.loan.delete({ where: { id: loan.id } });
            await prisma.customer.delete({ where: { id: customer.id } });
        });

        it('should reject payment for non-existent loan', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/payments',
                headers: {
                    authorization: `Bearer ${authToken}`
                },
                payload: {
                    loanId: '00000000-0000-0000-0000-000000000000',
                    amount: 5000,
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'CASH'
                }
            });

            expect(response.statusCode).toBe(404);
            expect(response.json().message).toContain('ไม่พบข้อมูลสัญญา');
        });
    });
});
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../config/database';
import { JWTUtil } from '../../utils/jwt.util';

describe('SQL Injection Security Tests', () => {
    let app: FastifyInstance;
    let authToken: string;
    let testUserId: string;
    let testCustomerId: string;
    let testLoanId: string;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        // Create test user for authentication
        const testUser = await prisma.user.create({
            data: {
                email: 'sqltest@example.com',
                firstName: 'SQL',
                lastName: 'Test',
                role: 'ADMIN',
                branchId: 'test-branch',
                status: 'ACTIVE',
            },
        });
        testUserId = testUser.id;

        // Generate auth token
        authToken = await JWTUtil.generateAccessToken(app, {
            userId: testUser.id,
            email: testUser.email,
            role: testUser.role,
            branchId: testUser.branchId,
        });

        // Create test session
        await prisma.session.create({
            data: {
                token: authToken,
                userId: testUser.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                isValid: true,
            },
        });

        // Create test customer
        const testCustomer = await prisma.customer.create({
            data: {
                firstName: 'Test',
                lastName: 'Customer',
                email: 'testcustomer@example.com',
                phone: '0123456789',
                taxId: 'encrypted_tax_id',
                branchId: 'test-branch',
                status: 'ACTIVE',
            },
        });
        testCustomerId = testCustomer.id;

        // Create test loan
        const testLoan = await prisma.loan.create({
            data: {
                customerId: testCustomer.id,
                branchId: 'test-branch',
                amount: 100000,
                interestRate: 15,
                termMonths: 12,
                status: 'ACTIVE',
                officerId: testUser.id,
            },
        });
        testLoanId = testLoan.id;
    });

    afterAll(async () => {
        // Cleanup test data
        await prisma.loan.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.customer.deleteMany({ where: { email: 'testcustomer@example.com' } });
        await prisma.session.deleteMany({ where: { userId: testUserId } });
        await prisma.user.deleteMany({ where: { email: 'sqltest@example.com' } });
        await app.close();
    });

    describe('1. Classic SQL Injection Payloads', () => {
        const classicPayloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "' OR 1=1#",
            "' OR 1=1/*",
            "'; DROP TABLE users;--",
            "' UNION SELECT * FROM users--",
            "' AND (SELECT COUNT(*) FROM users) > 0--",
            "admin'--",
            "admin'/*",
            "' OR 'x'='x",
            "') OR ('1'='1",
            "' OR 1=1 LIMIT 1--",
        ];

        test.each(classicPayloads)('Should reject classic SQL injection: %s', async (payload) => {
            // Test in URL parameters
            const response1 = await app.inject({
                method: 'GET',
                url: `/api/customers/${payload}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            expect([400, 404, 422]).toContain(response1.statusCode);

            // Test in query parameters
            const response2 = await app.inject({
                method: 'GET',
                url: `/api/customers?search=${encodeURIComponent(payload)}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            expect([200, 400, 422]).toContain(response2.statusCode);
            if (response2.statusCode === 200) {
                const data = JSON.parse(response2.body);
                expect(data.data).toBeDefined();
                expect(Array.isArray(data.data)).toBe(true);
            }
        });

        test.each(classicPayloads)('Should reject SQL injection in POST body: %s', async (payload) => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/customers',
                headers: {
                    authorization: `Bearer ${authToken}`,
                    'content-type': 'application/json',
                },
                payload: {
                    firstName: payload,
                    lastName: 'Test',
                    email: 'test@example.com',
                    phone: '0123456789',
                    taxId: '1234567890123',
                },
            });

            expect([400, 422]).toContain(response.statusCode);
        });
    });

    describe('2. Union-Based SQL Injection', () => {
        const unionPayloads = [
            "' UNION SELECT 1,2,3,4,5--",
            "' UNION SELECT NULL,NULL,NULL,NULL,NULL--",
            "' UNION SELECT username,password FROM users--",
            "' UNION SELECT table_name FROM information_schema.tables--",
            "' UNION SELECT column_name FROM information_schema.columns--",
            "' UNION ALL SELECT 1,2,3,4,5--",
            "1' UNION SELECT * FROM users WHERE '1'='1",
        ];

        test.each(unionPayloads)('Should prevent UNION injection: %s', async (payload) => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/loans/${payload}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            expect([400, 404, 422]).toContain(response.statusCode);
        });
    });

    describe('3. Boolean-Based Blind SQL Injection', () => {
        const blindPayloads = [
            "' AND (SELECT COUNT(*) FROM users) > 0--",
            "' AND (SELECT LENGTH(password) FROM users LIMIT 1) > 5--",
            "' AND SUBSTRING((SELECT password FROM users LIMIT 1),1,1)='a'--",
            "' AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>64--",
            "' AND (SELECT COUNT(*) FROM information_schema.tables) > 0--",
            "' AND EXISTS(SELECT * FROM users WHERE id=1)--",
        ];

        test.each(blindPayloads)('Should prevent blind SQL injection: %s', async (payload) => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/payments?loanId=${encodeURIComponent(payload)}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            expect([200, 400, 422]).toContain(response.statusCode);
            if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                expect(data.data).toBeDefined();
            }
        });
    });

    describe('4. Time-Based Blind SQL Injection', () => {
        const timeBasedPayloads = [
            "'; WAITFOR DELAY '00:00:05'--",
            "'; SELECT SLEEP(5)--",
            "' AND (SELECT SLEEP(5))--",
            "'; pg_sleep(5)--",
            "' OR (SELECT * FROM (SELECT(SLEEP(5)))a)--",
            "' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
        ];

        test.each(timeBasedPayloads)('Should prevent time-based injection: %s', async (payload) => {
            const startTime = Date.now();
            
            const response = await app.inject({
                method: 'GET',
                url: `/api/customers/${encodeURIComponent(payload)}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should not cause significant delay (more than 2 seconds)
            expect(duration).toBeLessThan(2000);
            expect([400, 404, 422]).toContain(response.statusCode);
        });
    });

    describe('5. Error-Based SQL Injection', () => {
        const errorBasedPayloads = [
            "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
            "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version()),0x7e))--",
            "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT((SELECT version()),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
            "' AND UPDATEXML(1,CONCAT(0x7e,(SELECT version()),0x7e),1)--",
            "' AND (SELECT COUNT(*) FROM (SELECT 1 UNION SELECT null UNION SELECT !1)x GROUP BY CONCAT((SELECT version()),FLOOR(RAND(0)*2)))--",
        ];

        test.each(errorBasedPayloads)('Should handle error-based injection gracefully: %s', async (payload) => {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/customers/${testCustomerId}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                    'content-type': 'application/json',
                },
                payload: {
                    firstName: payload,
                    lastName: 'Test',
                },
            });

            expect([400, 422, 500]).toContain(response.statusCode);
            
            // Should not expose database errors
            const body = JSON.parse(response.body);
            expect(body.message).not.toMatch(/mysql|postgresql|sqlite|database|sql/i);
        });
    });

    describe('6. Second-Order SQL Injection', () => {
        test('Should prevent second-order injection through stored data', async () => {
            const maliciousPayload = "'; DROP TABLE customers;--";
            
            // First, try to store malicious data
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/customers',
                headers: {
                    authorization: `Bearer ${authToken}`,
                    'content-type': 'application/json',
                },
                payload: {
                    firstName: maliciousPayload,
                    lastName: 'Test',
                    email: 'secondorder@example.com',
                    phone: '0123456789',
                    taxId: '9876543210123',
                },
            });

            if (createResponse.statusCode === 201) {
                const createdCustomer = JSON.parse(createResponse.body);
                const customerId = createdCustomer.data.id;

                // Then try to retrieve and use that data in another query
                const retrieveResponse = await app.inject({
                    method: 'GET',
                    url: `/api/customers/${customerId}`,
                    headers: {
                        authorization: `Bearer ${authToken}`,
                    },
                });

                expect(retrieveResponse.statusCode).toBe(200);
                
                // Verify the customers table still exists
                const listResponse = await app.inject({
                    method: 'GET',
                    url: '/api/customers',
                    headers: {
                        authorization: `Bearer ${authToken}`,
                    },
                });

                expect(listResponse.statusCode).toBe(200);

                // Cleanup
                await app.inject({
                    method: 'DELETE',
                    url: `/api/customers/${customerId}`,
                    headers: {
                        authorization: `Bearer ${authToken}`,
                    },
                });
            }
        });
    });

    describe('7. NoSQL Injection (if applicable)', () => {
        const noSqlPayloads = [
            '{"$ne": null}',
            '{"$gt": ""}',
            '{"$where": "this.password.length > 0"}',
            '{"$regex": ".*"}',
            '{"$or": [{"password": {"$exists": true}}]}',
        ];

        test.each(noSqlPayloads)('Should handle NoSQL injection attempts: %s', async (payload) => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/customers?filter=${encodeURIComponent(payload)}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            expect([200, 400, 422]).toContain(response.statusCode);
        });
    });

    describe('8. Specific Vulnerability Tests for Raw SQL Usage', () => {
        test('Should secure LINE user ID lookup', async () => {
            const maliciousLineUserId = "test' OR '1'='1";
            
            const response = await app.inject({
                method: 'POST',
                url: '/api/line/webhook',
                headers: {
                    'content-type': 'application/json',
                    'x-line-signature': 'test-signature',
                },
                payload: {
                    events: [{
                        type: 'message',
                        source: { userId: maliciousLineUserId },
                        message: { type: 'text', text: 'test' }
                    }]
                },
            });

            // Should handle gracefully without exposing data
            expect([200, 400, 401]).toContain(response.statusCode);
        });

        test('Should secure user LINE linking endpoint', async () => {
            const maliciousUserId = "test' OR '1'='1";
            
            const response = await app.inject({
                method: 'POST',
                url: '/api/line/link-account',
                headers: {
                    authorization: `Bearer ${authToken}`,
                    'content-type': 'application/json',
                },
                payload: {
                    userId: maliciousUserId,
                    lineUserId: 'test-line-user',
                },
            });

            expect([400, 404, 422]).toContain(response.statusCode);
        });

        test('Should secure user LINE unlinking endpoint', async () => {
            const maliciousUserId = "test' OR '1'='1";
            
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/line/unlink-account/${encodeURIComponent(maliciousUserId)}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            expect([400, 404, 422]).toContain(response.statusCode);
        });
    });

    describe('9. Input Validation and Sanitization Tests', () => {
        test('Should sanitize XSS attempts that could lead to SQL injection', async () => {
            const xssPayload = "<script>alert('xss')</script>' OR '1'='1";
            
            const response = await app.inject({
                method: 'POST',
                url: '/api/customers',
                headers: {
                    authorization: `Bearer ${authToken}`,
                    'content-type': 'application/json',
                },
                payload: {
                    firstName: xssPayload,
                    lastName: 'Test',
                    email: 'xsstest@example.com',
                    phone: '0123456789',
                    taxId: '1111111111111',
                },
            });

            expect([400, 422]).toContain(response.statusCode);
        });

        test('Should handle encoded SQL injection attempts', async () => {
            const encodedPayload = encodeURIComponent("' OR '1'='1--");
            
            const response = await app.inject({
                method: 'GET',
                url: `/api/customers/${encodedPayload}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            expect([400, 404, 422]).toContain(response.statusCode);
        });
    });

    describe('10. Database Schema Protection', () => {
        test('Should not expose database schema information', async () => {
            const schemaPayloads = [
                "' UNION SELECT table_name FROM information_schema.tables--",
                "' UNION SELECT column_name FROM information_schema.columns--",
                "'; SELECT name FROM sqlite_master WHERE type='table'--",
                "' AND (SELECT COUNT(*) FROM information_schema.schemata) > 0--",
            ];

            for (const payload of schemaPayloads) {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/loans?search=${encodeURIComponent(payload)}`,
                    headers: {
                        authorization: `Bearer ${authToken}`,
                    },
                });

                expect([200, 400, 422]).toContain(response.statusCode);
                
                if (response.statusCode === 200) {
                    const body = JSON.parse(response.body);
                    // Should not contain schema information
                    const bodyStr = JSON.stringify(body).toLowerCase();
                    expect(bodyStr).not.toMatch(/information_schema|sqlite_master|pg_catalog/);
                }
            }
        });
    });
});
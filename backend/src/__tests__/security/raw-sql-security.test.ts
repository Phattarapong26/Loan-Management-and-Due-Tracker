import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../config/database';
import { JWTUtil } from '../../utils/jwt.util';

describe('Raw SQL Security Tests - Critical Vulnerabilities', () => {
    let app: FastifyInstance;
    let authToken: string;
    let testUserId: string;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        // Create test user
        const testUser = await prisma.user.create({
            data: {
                email: 'rawsqltest@example.com',
                firstName: 'RawSQL',
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
    });

    afterAll(async () => {
        // Cleanup
        await prisma.session.deleteMany({ where: { userId: testUserId } });
        await prisma.user.deleteMany({ where: { email: 'rawsqltest@example.com' } });
        await app.close();
    });

    describe('Critical Raw SQL Vulnerabilities', () => {
        
        describe('LINE Check Endpoint - routes/index.ts:871-876', () => {
            const sqlPayloads = [
                "' OR '1'='1",
                "'; DROP TABLE users;--",
                "' UNION SELECT password FROM users--",
                "' AND (SELECT COUNT(*) FROM users) > 0--",
                "test' OR id IN (SELECT id FROM users WHERE role='ADMIN')--",
            ];

            test.each(sqlPayloads)('Should secure LINE check with payload: %s', async (payload) => {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/line/check/${encodeURIComponent(payload)}`,
                    headers: {
                        authorization: `Bearer ${authToken}`,
                    },
                });

                // Should reject malicious input or handle safely
                expect([400, 404, 422]).toContain(response.statusCode);
                
                if (response.statusCode === 200) {
                    const body = JSON.parse(response.body);
                    // Should not expose sensitive data
                    expect(body.data).toBeDefined();
                    expect(typeof body.data.lineUserId).toBe('string');
                }
            });
        });

        describe('LINE Link Account - routes/index.ts:954-962', () => {
            test('Should prevent SQL injection in link account endpoint', async () => {
                const maliciousPayloads = [
                    {
                        userId: "' OR '1'='1--",
                        lineUserId: 'test-line-user'
                    },
                    {
                        userId: testUserId,
                        lineUserId: "'; UPDATE users SET role='ADMIN' WHERE id='1'--"
                    },
                    {
                        userId: "'; DROP TABLE sessions;--",
                        lineUserId: 'test-line-user'
                    }
                ];

                for (const payload of maliciousPayloads) {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/line/link-account',
                        headers: {
                            authorization: `Bearer ${authToken}`,
                            'content-type': 'application/json',
                        },
                        payload,
                    });

                    expect([400, 404, 422]).toContain(response.statusCode);
                }
            });
        });

        describe('LINE Unlink Account - routes/index.ts:1019-1025', () => {
            test('Should prevent SQL injection in unlink account endpoint', async () => {
                const maliciousUserIds = [
                    "' OR '1'='1--",
                    "'; DELETE FROM users;--",
                    "' UNION SELECT id FROM users WHERE role='ADMIN'--",
                    "test'; UPDATE users SET line_user_id='hacked' WHERE '1'='1'--",
                ];

                for (const userId of maliciousUserIds) {
                    const response = await app.inject({
                        method: 'DELETE',
                        url: `/api/line/unlink-account/${encodeURIComponent(userId)}`,
                        headers: {
                            authorization: `Bearer ${authToken}`,
                        },
                    });

                    expect([400, 404, 422]).toContain(response.statusCode);
                }
            });
        });

        describe('LINE Webhook Service - line-webhook.service.ts', () => {
            test('Should secure LINE webhook user lookup', async () => {
                const maliciousLineUserIds = [
                    "test' OR '1'='1",
                    "'; SELECT * FROM users;--",
                    "test' UNION SELECT id,email,role,'hacked','hacked' FROM users--",
                    "'; UPDATE users SET role='ADMIN' WHERE line_user_id IS NOT NULL;--",
                ];

                for (const lineUserId of maliciousLineUserIds) {
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
                                source: { userId: lineUserId },
                                message: { type: 'text', text: 'test message' }
                            }]
                        },
                    });

                    // Should handle gracefully
                    expect([200, 400, 401, 403]).toContain(response.statusCode);
                }
            });

            test('Should secure LINE postback data handling', async () => {
                const maliciousPostbackData = [
                    "action=test&userId=' OR '1'='1--",
                    "action='; DROP TABLE users;--&userId=test",
                    "action=test&userId=test' UNION SELECT * FROM users--",
                ];

                for (const data of maliciousPostbackData) {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/line/webhook',
                        headers: {
                            'content-type': 'application/json',
                            'x-line-signature': 'test-signature',
                        },
                        payload: {
                            events: [{
                                type: 'postback',
                                source: { userId: 'test-user' },
                                postback: { data }
                            }]
                        },
                    });

                    expect([200, 400, 401, 403]).toContain(response.statusCode);
                }
            });
        });
    });

    describe('Prisma Template Literal Security', () => {
        test('Should verify Prisma template literals are parameterized', async () => {
            // Test that Prisma's $queryRaw with template literals is safe
            // This is more of a verification test than a vulnerability test
            
            const testQuery = async (userId: string) => {
                try {
                    const result = await prisma.$queryRaw<Array<{ id: string }>>`
                        SELECT id FROM users WHERE id = ${userId}
                    `;
                    return result;
                } catch (error) {
                    return null;
                }
            };

            // Test with normal ID
            const normalResult = await testQuery(testUserId);
            expect(normalResult).toBeDefined();
            expect(Array.isArray(normalResult)).toBe(true);

            // Test with SQL injection payload
            const maliciousResult = await testQuery("' OR '1'='1--");
            // Should return empty array or null, not all users
            expect(maliciousResult).toEqual([]);
        });

        test('Should verify $executeRaw parameterization', async () => {
            const testUpdate = async (userId: string, lineUserId: string) => {
                try {
                    await prisma.$executeRaw`
                        UPDATE users 
                        SET line_user_id = ${lineUserId}
                        WHERE id = ${userId}
                    `;
                    return true;
                } catch (error) {
                    return false;
                }
            };

            // Should not affect other users with malicious input
            const maliciousUserId = "' OR '1'='1--";
            const result = await testUpdate(maliciousUserId, 'hacked');
            
            // Verify no users were actually updated
            const hackedUsers = await prisma.user.findMany({
                where: { lineUserId: 'hacked' }
            });
            expect(hackedUsers).toHaveLength(0);
        });
    });

    describe('Input Sanitization Effectiveness', () => {
        test('Should test LINE user ID sanitization', async () => {
            // Import the sanitization function if available
            const { sanitizeLineUserId } = require('../../utils/line-sanitization.util');
            
            const maliciousInputs = [
                "test' OR '1'='1",
                "'; DROP TABLE users;--",
                "<script>alert('xss')</script>",
                "test\x00null",
                "test\r\ninjection",
            ];

            for (const input of maliciousInputs) {
                const sanitized = sanitizeLineUserId(input);
                
                // Should remove or escape dangerous characters
                expect(sanitized).not.toContain("'");
                expect(sanitized).not.toContain(';');
                expect(sanitized).not.toContain('--');
                expect(sanitized).not.toContain('<script>');
                expect(sanitized).not.toContain('\x00');
            }
        });

        test('Should test postback data sanitization', async () => {
            const { sanitizeLinePostbackData } = require('../../utils/line-sanitization.util');
            
            const maliciousData = "action=test&userId=' OR '1'='1--";
            const sanitized = sanitizeLinePostbackData(maliciousData);
            
            expect(sanitized).toBeDefined();
            expect(typeof sanitized).toBe('string');
            // Should not contain SQL injection patterns
            expect(sanitized).not.toMatch(/['";]|--|\*\/|\/\*/);
        });
    });

    describe('Error Handling and Information Disclosure', () => {
        test('Should not expose database errors in responses', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/line/check/invalid-uuid-format`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });

            if (response.statusCode >= 400) {
                const body = JSON.parse(response.body);
                
                // Should not expose database-specific error messages
                const errorMessage = body.message || body.error || '';
                expect(errorMessage.toLowerCase()).not.toMatch(
                    /prisma|postgresql|mysql|sqlite|database|sql|query|table|column/
                );
            }
        });

        test('Should handle malformed JSON in LINE webhook', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/line/webhook',
                headers: {
                    'content-type': 'application/json',
                    'x-line-signature': 'test-signature',
                },
                payload: '{"events":[{"type":"message","source":{"userId":"test\' OR \'1\'=\'1"},"message":{"type":"text","text":"test"}}]}',
            });

            expect([200, 400, 401, 403]).toContain(response.statusCode);
        });
    });

    describe('Rate Limiting and DoS Protection', () => {
        test('Should handle rapid SQL injection attempts', async () => {
            const promises = [];
            const payload = "' OR '1'='1--";

            // Send 10 rapid requests
            for (let i = 0; i < 10; i++) {
                promises.push(
                    app.inject({
                        method: 'GET',
                        url: `/api/line/check/${encodeURIComponent(payload)}`,
                        headers: {
                            authorization: `Bearer ${authToken}`,
                        },
                    })
                );
            }

            const responses = await Promise.all(promises);
            
            // All should be handled properly (not crash the server)
            responses.forEach(response => {
                expect([200, 400, 404, 422, 429]).toContain(response.statusCode);
            });
        });
    });
});
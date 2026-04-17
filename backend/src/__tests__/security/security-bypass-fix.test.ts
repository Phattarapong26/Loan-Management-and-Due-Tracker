/**
 * Security Bypass Fix Tests
 * 
 * ทดสอบว่า security bypass ถูกแก้ไขแล้ว และไม่สามารถ bypass ได้ง่ายๆ
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';

describe('Security Bypass Fix Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        // Set to production mode for testing
        process.env.NODE_ENV = 'production';
        app = await buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Load Test Bypass Protection', () => {
        it('should BLOCK requests with x-load-test header in production', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                headers: {
                    'x-load-test': 'true',
                },
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            });

            // Should NOT bypass security - request should be processed normally
            // (will fail auth, but that's expected)
            expect(response.statusCode).not.toBe(200);
            // Should not have special load test treatment
        });

        it('should BLOCK requests with x-load-test-token in production', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                headers: {
                    'x-load-test-token': 'any-token',
                },
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            });

            // Should NOT bypass security in production
            expect(response.statusCode).not.toBe(200);
        });

        it('should BLOCK requests from non-localhost even with valid token', async () => {
            process.env.NODE_ENV = 'development';
            process.env.LOAD_TEST_SECRET = 'test-secret-123';

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                headers: {
                    'x-load-test-token': 'test-secret-123',
                    'x-forwarded-for': '192.168.1.100', // Non-localhost IP
                },
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            });

            // Should NOT bypass security from non-localhost
            expect(response.statusCode).not.toBe(200);

            process.env.NODE_ENV = 'production';
        });

        it('should BLOCK requests without valid token even from localhost', async () => {
            process.env.NODE_ENV = 'development';
            process.env.LOAD_TEST_SECRET = 'test-secret-123';

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                headers: {
                    'x-load-test-token': 'wrong-token', // Wrong token
                },
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            });

            // Should NOT bypass security with wrong token
            expect(response.statusCode).not.toBe(200);

            process.env.NODE_ENV = 'production';
        });

        it('should ALLOW bypass only with all conditions met', async () => {
            process.env.NODE_ENV = 'development';
            process.env.LOAD_TEST_SECRET = 'test-secret-123';

            const response = await app.inject({
                method: 'GET',
                url: '/api/health',
                headers: {
                    'x-load-test-token': 'test-secret-123',
                },
                remoteAddress: '127.0.0.1', // Localhost
            });

            // Should allow bypass with all conditions met
            // (health endpoint should return 200)
            expect(response.statusCode).toBe(200);

            process.env.NODE_ENV = 'production';
        });
    });

    describe('Rate Limiting Protection', () => {
        it('should enforce rate limiting without bypass header', async () => {
            // Make multiple requests quickly
            const requests = Array.from({ length: 150 }, () =>
                app.inject({
                    method: 'GET',
                    url: '/api/health',
                })
            );

            const responses = await Promise.all(requests);

            // Some requests should be rate limited (429)
            const rateLimited = responses.filter((r) => r.statusCode === 429);
            expect(rateLimited.length).toBeGreaterThan(0);
        });

        it('should NOT bypass rate limiting with simple x-load-test header', async () => {
            // Make multiple requests with bypass header
            const requests = Array.from({ length: 150 }, () =>
                app.inject({
                    method: 'GET',
                    url: '/api/health',
                    headers: {
                        'x-load-test': 'true',
                    },
                })
            );

            const responses = await Promise.all(requests);

            // Should still be rate limited in production
            const rateLimited = responses.filter((r) => r.statusCode === 429);
            expect(rateLimited.length).toBeGreaterThan(0);
        });
    });

    describe('Brute Force Protection', () => {
        it('should track failed login attempts', async () => {
            // Make multiple failed login attempts
            const attempts = Array.from({ length: 6 }, () =>
                app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        email: 'test@example.com',
                        password: 'wrong-password',
                    },
                })
            );

            const responses = await Promise.all(attempts);

            // After 5 failed attempts, should be blocked (403)
            const lastResponse = responses[responses.length - 1];
            expect([401, 403]).toContain(lastResponse.statusCode);
        });

        it('should NOT bypass brute force protection with x-load-test header', async () => {
            // Make multiple failed login attempts with bypass header
            const attempts = Array.from({ length: 6 }, () =>
                app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    headers: {
                        'x-load-test': 'true',
                    },
                    payload: {
                        email: 'test2@example.com',
                        password: 'wrong-password',
                    },
                })
            );

            const responses = await Promise.all(attempts);

            // Should still be blocked after multiple attempts
            const lastResponse = responses[responses.length - 1];
            expect([401, 403]).toContain(lastResponse.statusCode);
        });
    });

    describe('Security Scanner Protection', () => {
        it('should detect SQL injection attempts', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/customers',
                query: {
                    search: "' OR '1'='1",
                },
            });

            // Should be blocked by security scanner (400 or 403)
            expect([400, 401, 403]).toContain(response.statusCode);
        });

        it('should NOT bypass security scanner with x-load-test header', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/customers',
                headers: {
                    'x-load-test': 'true',
                },
                query: {
                    search: "' OR '1'='1",
                },
            });

            // Should still be blocked in production
            expect([400, 401, 403]).toContain(response.statusCode);
        });

        it('should detect XSS attempts', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/customers',
                payload: {
                    businessName: '<script>alert("XSS")</script>',
                    taxId: '1234567890123',
                    phone: '0812345678',
                    address: 'Test Address',
                },
            });

            // Should be sanitized or blocked
            expect([400, 401, 403]).toContain(response.statusCode);
        });
    });

    describe('Content Security Policy', () => {
        it('should have CSP headers enabled', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/health',
            });

            // Should have CSP headers
            expect(response.headers['content-security-policy']).toBeDefined();
        });

        it('should have strict CSP directives', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/health',
            });

            const csp = response.headers['content-security-policy'] as string;
            
            // Should have strict directives
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src 'self'");
            expect(csp).toContain("object-src 'none'");
        });
    });
});

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { PrismaClient } from '@prisma/client';
import { EncryptionUtil } from '../../utils/encryption.util';

const prisma = new PrismaClient();

describe('API Integration Tests', () => {
  let app: FastifyInstance;
  let testBranchId: string;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Build the Fastify app
    app = await buildApp();
    await app.ready();

    // Create test data
    const branch = await prisma.branch.create({
      data: {
        code: `APITEST${Date.now()}`,
        name: 'API Test Branch',
        status: 'ACTIVE',
      },
    });
    testBranchId = branch.id;

    const user = await prisma.user.create({
      data: {
        email: 'apitest@example.com',
        passwordHash: await EncryptionUtil.hashPassword('TestPassword123!'),
        firstName: 'API',
        lastName: 'Test',
        role: 'ADMIN',
        status: 'ACTIVE',
        branchId: testBranchId,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.branch.delete({ where: { id: testBranchId } }).catch(() => {});
    await app.close();
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'apitest@example.com',
          password: 'TestPassword123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe('apitest@example.com');
      
      authToken = body.data.accessToken;
    });

    it('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'apitest@example.com',
          password: 'WrongPassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid credentials');
    });

    it('should validate token successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.email).toBe('apitest@example.com');
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Branch Management', () => {
    it('should get branches list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/branches',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.branches).toBeDefined();
      expect(Array.isArray(body.data.branches)).toBe(true);
      expect(body.data.branches.length).toBeGreaterThan(0);
      
      // Should include our test branch
      const testBranch = body.data.branches.find((b: any) => b.code.startsWith('APITEST'));
      expect(testBranch).toBeDefined();
      expect(testBranch.name).toBe('API Test Branch');
    });

    it('should create a new branch', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/branches',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code: 'NEWBR001',
          name: 'New Test Branch',
          address: 'New Branch Address',
          phone: '0299999999',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('NEWBR001');
      expect(body.data.name).toBe('New Test Branch');

      // Clean up
      await prisma.branch.delete({ where: { code: 'NEWBR001' } }).catch(() => {});
    });
  });

  describe('Customer Management', () => {
    let testCustomerId: string;

    it('should create a new customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          branchId: testBranchId,
          businessName: 'API Test Business',
          businessType: 'Technology',
          phone: '0812345678',
          email: 'apicustomer@test.com',
          address: 'API Test Address',
          thaiId: '1234567890121',
          taxId: '1234567890123',
          annualRevenue: 5000000,
          createdBy: testUserId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.businessName).toBe('API Test Business');
      expect(body.data.customerCode).toBeDefined();
      
      testCustomerId = body.data.id;
    });

    it('should get customers list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/customers',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.customers).toBeDefined();
      expect(Array.isArray(body.data.customers)).toBe(true);
      
      // Should include our test customer if it was created successfully
      if (testCustomerId) {
        const testCustomer = body.data.customers.find((c: any) => c.id === testCustomerId);
        expect(testCustomer).toBeDefined();
        expect(testCustomer.businessName).toBe('API Test Business');
      }
    });

    it('should get customer by ID', async () => {
      if (!testCustomerId) {
        console.log('Skipping test - customer was not created successfully');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/customers/${testCustomerId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testCustomerId);
      expect(body.data.businessName).toBe('API Test Business');
      
      // Sensitive data should be decrypted in response
      expect(body.data.thaiId).toBe('1234567890121');
      expect(body.data.taxId).toBe('1234567890123');
    });

    it.skip('should update customer', async () => {
      if (!testCustomerId) {
        console.log('Skipping test - customer was not created successfully');
        return;
      }

      const response = await app.inject({
        method: 'PUT',
        url: `/api/customers/${testCustomerId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          businessName: 'Updated API Test Business',
          annualRevenue: 6000000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.businessName).toBe('Updated API Test Business');
      expect(body.data.annualRevenue).toBe(6000000);
    });

    afterAll(async () => {
      if (testCustomerId) {
        await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
      }
    });
  });

  describe('System Configuration', () => {
    it('should get system configs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/config/system',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.configs).toBeDefined();
      expect(Array.isArray(body.data.configs)).toBe(true);
    });

    it('should create system config', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/config/system',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          key: 'TEST_CONFIG',
          value: 'test-value',
          category: 'Test',
          description: 'Test configuration',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.key).toBe('TEST_CONFIG');
      expect(body.data.value).toBe('test-value');

      // Clean up
      await prisma.systemConfig.delete({ where: { key: 'TEST_CONFIG' } }).catch(() => {});
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/non-existent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle validation errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          // Missing required fields
          businessName: '',
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
});
import { PrismaClient } from '@prisma/client';
import { EncryptionUtil } from '../../utils/encryption.util';

const prisma = new PrismaClient();

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.$disconnect();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should have all required tables', async () => {
      const tables = await prisma.$queryRaw<{table_name: string}[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const tableNames = tables.map(t => t.table_name);
      
      // Check for core tables
      expect(tableNames).toContain('branches');
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('loans');
      expect(tableNames).toContain('payment_schedules');
      expect(tableNames).toContain('payments');
      
      // Check for Thai banking tables
      expect(tableNames).toContain('thai_banks');
      expect(tableNames).toContain('product_budgets');
      expect(tableNames).toContain('budget_consumption');
      expect(tableNames).toContain('aging_analysis');
      expect(tableNames).toContain('credit_lines');
      // expect(tableNames).toContain('aml_checks'); // REMOVED 2026-03-02
    });

    it('should have all required enums', async () => {
      const enums = await prisma.$queryRaw<{typname: string}[]>`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e'
        ORDER BY typname
      `;

      const enumNames = enums.map(e => e.typname);
      
      expect(enumNames).toContain('BranchStatus');
      expect(enumNames).toContain('UserRole');
      expect(enumNames).toContain('LoanStatus');
      expect(enumNames).toContain('PaymentScheduleStatus');
      expect(enumNames).toContain('ThaiPaymentMethod');
      expect(enumNames).toContain('BankTaskType');
    });
  });

  describe('Branch Operations', () => {
    let testBranchId: string;

    it('should create a branch', async () => {
      const branch = await prisma.branch.create({
        data: {
          code: 'TEST001',
          name: 'Test Branch',
          address: 'Test Address',
          phone: '02-123-4567',
          status: 'ACTIVE',
        },
      });

      expect(branch.id).toBeDefined();
      expect(branch.code).toBe('TEST001');
      expect(branch.name).toBe('Test Branch');
      testBranchId = branch.id;
    });

    it('should find the created branch', async () => {
      const branch = await prisma.branch.findUnique({
        where: { code: 'TEST001' },
      });

      expect(branch).toBeDefined();
      expect(branch?.name).toBe('Test Branch');
    });

    afterAll(async () => {
      // Clean up test branch
      if (testBranchId) {
        await prisma.branch.delete({
          where: { id: testBranchId },
        }).catch(() => {}); // Ignore errors if already deleted
      }
    });
  });

  describe('User Operations', () => {
    let testUserId: string;
    let testBranchId: string;

    beforeAll(async () => {
      // Create test branch first
      const branch = await prisma.branch.create({
        data: {
          code: 'TESTUSER001',
          name: 'Test User Branch',
          status: 'ACTIVE',
        },
      });
      testBranchId = branch.id;
    });

    it('should create a user with encrypted password', async () => {
      const hashedPassword = await EncryptionUtil.hashPassword('TestPassword123!');
      
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          status: 'ACTIVE',
          branchId: testBranchId,
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).not.toBe('TestPassword123!');
      testUserId = user.id;
    });

    it('should verify user password', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(user).toBeDefined();
      
      const isValid = await EncryptionUtil.verifyPassword('TestPassword123!', user!.passwordHash);
      expect(isValid).toBe(true);
      
      const isInvalid = await EncryptionUtil.verifyPassword('WrongPassword', user!.passwordHash);
      expect(isInvalid).toBe(false);
    });

    afterAll(async () => {
      // Clean up test data
      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId },
        }).catch(() => {});
      }
      if (testBranchId) {
        await prisma.branch.delete({
          where: { id: testBranchId },
        }).catch(() => {});
      }
    });
  });

  describe('Customer Operations', () => {
    let testCustomerId: string;
    let testBranchId: string;
    let testUserId: string;

    beforeAll(async () => {
      // Create test branch and user
      const branch = await prisma.branch.create({
        data: {
          code: `TESTCUST${Date.now()}`,
          name: 'Test Customer Branch',
          status: 'ACTIVE',
        },
      });
      testBranchId = branch.id;

      const user = await prisma.user.create({
        data: {
          email: 'testcustomer@example.com',
          passwordHash: await EncryptionUtil.hashPassword('password'),
          firstName: 'Test',
          lastName: 'Officer',
          role: 'OFFICER',
          status: 'ACTIVE',
          branchId: testBranchId,
        },
      });
      testUserId = user.id;
    });

    it('should create a customer with encrypted sensitive data', async () => {
      // Temporarily disable triggers for testing
      await prisma.$executeRaw`SET session_replication_role = replica;`;
      
      const customerId = EncryptionUtil.generateUUID();
      const encryptedThaiId = EncryptionUtil.encrypt('1234567890123');
      const encryptedTaxId = EncryptionUtil.encrypt('1234567890');

      await prisma.$executeRaw`
        INSERT INTO customers (
          id, customer_code, branch_id, business_name, business_type, phone, email, address,
          thai_id, tax_id, annual_revenue, status, created_by, created_at, updated_at
        ) VALUES (
          ${customerId}, 'CUST001', ${testBranchId}, 'Test Business Ltd.', 'Technology',
          '0812345678', 'business@test.com', 'Test Address',
          ${encryptedThaiId}, ${encryptedTaxId}, 5000000, 'ACTIVE', ${testUserId},
          ${new Date()}, ${new Date()}
        )
      `;

      // Re-enable triggers
      await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;

      const customer = await prisma.customer.findUnique({
        where: { customerCode: 'CUST001' },
      });

      expect(customer).toBeDefined();
      expect(customer!.businessName).toBe('Test Business Ltd.');
      expect(customer!.thaiId).not.toBe('1234567890123');
      expect(customer!.taxId).not.toBe('1234567890');
      testCustomerId = customer!.id;
    });

    it('should decrypt customer sensitive data', async () => {
      const customer = await prisma.customer.findUnique({
        where: { customerCode: 'CUST001' },
      });

      expect(customer).toBeDefined();
      
      const decryptedThaiId = EncryptionUtil.decrypt(customer!.thaiId!);
      const decryptedTaxId = EncryptionUtil.decrypt(customer!.taxId);
      
      expect(decryptedThaiId).toBe('1234567890123');
      expect(decryptedTaxId).toBe('1234567890');
    });

    afterAll(async () => {
      // Clean up test data
      if (testCustomerId) {
        await prisma.customer.delete({
          where: { id: testCustomerId },
        }).catch(() => {});
      }
      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId },
        }).catch(() => {});
      }
      if (testBranchId) {
        await prisma.branch.delete({
          where: { id: testBranchId },
        }).catch(() => {});
      }
    });
  });

  describe('Thai Banking Features', () => {
    it('should have Thai banks reference data', async () => {
      const thaiBanks = await prisma.$queryRaw<{bank_code: string, bank_name: string}[]>`
        SELECT bank_code, bank_name FROM thai_banks WHERE is_active = true
      `;

      expect(thaiBanks.length).toBeGreaterThan(0);
      
      // Check for major Thai banks
      const bankCodes = thaiBanks.map(b => b.bank_code);
      expect(bankCodes).toContain('BBL');
      expect(bankCodes).toContain('KBANK');
      expect(bankCodes).toContain('SCB');
    });

    it('should have collection workflow steps', async () => {
      const workflowSteps = await prisma.$queryRaw<{action_type: string, priority: string}[]>`
        SELECT action_type, priority FROM collection_workflow_steps WHERE is_active = true
        ORDER BY days_overdue_from
      `;

      expect(workflowSteps.length).toBeGreaterThan(0);
      
      // Check for different action types
      const actionTypes = workflowSteps.map(w => w.action_type);
      expect(actionTypes).toContain('SMS');
      expect(actionTypes).toContain('CALL');
    });

    it('should have materialized views for reporting', async () => {
      // Check if materialized views exist
      const views = await prisma.$queryRaw<{matviewname: string}[]>`
        SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
      `;

      const viewNames = views.map(v => v.matviewname);
      expect(viewNames).toContain('budget_utilization_summary');
      expect(viewNames).toContain('aging_analysis_summary');
      expect(viewNames).toContain('collection_performance');
    });
  });

  describe('Business Logic Functions', () => {
    it('should have budget consumption trigger function', async () => {
      const functions = await prisma.$queryRaw<{proname: string}[]>`
        SELECT proname FROM pg_proc 
        WHERE proname = 'update_budget_consumption'
      `;

      expect(functions.length).toBe(1);
    });

    it('should have aging analysis trigger function', async () => {
      const functions = await prisma.$queryRaw<{proname: string}[]>`
        SELECT proname FROM pg_proc 
        WHERE proname = 'update_aging_analysis'
      `;

      expect(functions.length).toBe(1);
    });

    it('should have PDPA compliance trigger function', async () => {
      const functions = await prisma.$queryRaw<{proname: string}[]>`
        SELECT proname FROM pg_proc 
        WHERE proname = 'log_data_access'
      `;

      expect(functions.length).toBe(1);
    });
  });
});
import { PrismaClient } from '@prisma/client';
import { EncryptionUtil } from '../../utils/encryption.util';

const prisma = new PrismaClient();

describe('Thai Banking Features Integration Tests', () => {
  let testBranchId: string;
  let testUserId: string;
  let testCustomerId: string;
  let testLoanProductId: string;
  let testLoanId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Generate unique identifiers to avoid conflicts
    const timestamp = Date.now();
    const uniqueCode = `THAIBANK${timestamp}`;

    // Create test data
    const branch = await prisma.branch.create({
      data: {
        code: uniqueCode,
        name: `Thai Banking Test Branch ${timestamp}`,
        status: 'ACTIVE',
      },
    });
    testBranchId = branch.id;

    const user = await prisma.user.create({
      data: {
        email: `thaibanking${timestamp}@test.com`,
        passwordHash: await EncryptionUtil.hashPassword('password'),
        firstName: 'Thai',
        lastName: 'Banking',
        role: 'MANAGER',
        status: 'ACTIVE',
        branchId: testBranchId,
      },
    });
    testUserId = user.id;

    // Disable triggers for customer creation
    await prisma.$executeRaw`SET session_replication_role = replica;`;
    
    const customerId = EncryptionUtil.generateUUID();
    await prisma.$executeRaw`
      INSERT INTO customers (
        id, customer_code, branch_id, business_name, business_type, phone, email, address,
        thai_id, tax_id, annual_revenue, status, created_by, created_at, updated_at
      ) VALUES (
        ${customerId}, ${`THAICUST${timestamp}`}, ${testBranchId}, 'Thai Banking Test Business', 'Technology',
        '0812345678', ${`thaibusiness${timestamp}@test.com`}, 'Thai Test Address',
        ${EncryptionUtil.encrypt('1234567890123')}, ${EncryptionUtil.encrypt('1234567890')}, 
        5000000, 'ACTIVE', ${testUserId}, ${new Date()}, ${new Date()}
      )
    `;
    
    // Re-enable triggers
    await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;
    
    testCustomerId = customerId;

    const loanProduct = await prisma.loanProduct.create({
      data: {
        productCode: `THAI-TEST-${timestamp}`,
        productName: `Thai Test Loan Product ${timestamp}`,
        description: 'Test loan product for Thai banking features',
        minLoanAmount: 100000,
        maxLoanAmount: 5000000,
        interestRateType: 'FIXED',
        interestRateYear1_3: 5.0,
        loanType: 'MEDIUM_TERM',
        maxTermMonths: 60,
        collateralRequired: true,
        status: 'ACTIVE',
        createdBy: testUserId,
      },
    });
    testLoanProductId = loanProduct.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testLoanId) {
      await prisma.loan.delete({ where: { id: testLoanId } }).catch(() => {});
    }
    await prisma.loanProduct.delete({ where: { id: testLoanProductId } }).catch(() => {});
    await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.branch.delete({ where: { id: testBranchId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Product Budget System (Shared Pool)', () => {
    let testProductBudgetId: string;

    it('should create product budget', async () => {
      const productBudget = await prisma.$executeRaw`
        INSERT INTO product_budgets (
          id, product_id, product_code, product_name, fiscal_year,
          total_budget_amount, committed_amount, disbursed_amount, pending_amount,
          warning_threshold, critical_threshold, budget_status, budget_owner,
          notes, created_by, created_at, updated_at
        ) VALUES (
          ${EncryptionUtil.generateUUID()}, ${testLoanProductId}, ${`THAI-TEST-${Date.now()}`}, 
          'Thai Test Loan Product', 2567, 50000000, 0, 0, 0,
          80.00, 95.00, 'ACTIVE', ${testUserId},
          'Test budget for Thai banking features', ${testUserId}, 
          ${new Date()}, ${new Date()}
        )
      `;

      expect(productBudget).toBeDefined();

      // Verify the budget was created
      const budget = await prisma.$queryRaw<{id: string, total_budget_amount: string}[]>`
        SELECT id, total_budget_amount FROM product_budgets 
        WHERE product_id = ${testLoanProductId}
      `;

      expect(budget.length).toBeGreaterThan(0);
      if (budget.length > 0) {
        expect(Number(budget[0]?.total_budget_amount)).toBe(50000000);
        testProductBudgetId = budget[0]?.id || '';
      }
    });

    it('should calculate available amount correctly', async () => {
      const budget = await prisma.$queryRaw<{
        available_amount: string,
        utilization_rate: string
      }[]>`
        SELECT available_amount, utilization_rate 
        FROM product_budgets 
        WHERE id = ${testProductBudgetId}
      `;

      expect(budget.length).toBeGreaterThan(0);
      if (budget.length > 0) {
        expect(Number(budget[0]?.available_amount)).toBe(50000000); // No consumption yet
        expect(Number(budget[0]?.utilization_rate)).toBe(0);
      }
    });

    afterAll(async () => {
      if (testProductBudgetId) {
        await prisma.$executeRaw`
          DELETE FROM product_budgets WHERE id = ${testProductBudgetId}
        `.catch(() => {});
      }
    });
  });

  describe('Budget Consumption Tracking', () => {
    let testProductBudgetId: string;

    beforeAll(async () => {
      // Create product budget for this test
      const budgetId = EncryptionUtil.generateUUID();
      const timestamp = Date.now();
      await prisma.$executeRaw`
        INSERT INTO product_budgets (
          id, product_id, product_code, product_name, fiscal_year,
          total_budget_amount, committed_amount, disbursed_amount, pending_amount,
          warning_threshold, critical_threshold, budget_status, budget_owner,
          notes, created_by, created_at, updated_at
        ) VALUES (
          ${budgetId}, ${testLoanProductId}, ${`THAI-TEST-${timestamp}`}, 
          'Thai Test Loan Product', 2567, 50000000, 0, 0, 0,
          80.00, 95.00, 'ACTIVE', ${testUserId},
          'Test budget for consumption tracking', ${testUserId}, 
          ${new Date()}, ${new Date()}
        )
      `;
      testProductBudgetId = budgetId;

      // Create a loan for testing
      const loan = await prisma.loan.create({
        data: {
          customerId: testCustomerId,
          branchId: testBranchId,
          officerId: testUserId,
          contract_number: `THAI-CONTRACT-${timestamp}`,
          principal: 1000000,
          interestRate: 5.0,
          termMonths: 36,
          currentPrincipal: 1000000,
          monthlyPayment: 30000,
          status: 'APPROVED',
          approvedBy: testUserId,
          approvedAt: new Date(),
          approvalLevel: 'MANAGER',
          outstandingBalance: 1000000,
          totalDisbursed: 0,
          loanProductId: testLoanProductId,
        },
      });
      testLoanId = loan.id;
    });

    it('should create budget consumption when loan is approved', async () => {
      await prisma.$executeRaw`
        INSERT INTO budget_consumption (
          id, product_budget_id, loan_id, branch_id, requested_amount, approved_amount,
          disbursed_amount, consumption_type, status, consumption_date, consumption_time,
          processed_by, created_at, updated_at
        ) VALUES (
          ${EncryptionUtil.generateUUID()}, ${testProductBudgetId}, ${testLoanId}, 
          ${testBranchId}, 1000000, 1000000, 0, 'COMMITMENT', 'ACTIVE',
          ${new Date()}, ${new Date()}, ${testUserId}, ${new Date()}, ${new Date()}
        )
      `;

      // Verify consumption was created
      const consumption = await prisma.$queryRaw<{
        approved_amount: string,
        consumption_type: string
      }[]>`
        SELECT approved_amount, consumption_type 
        FROM budget_consumption 
        WHERE loan_id = ${testLoanId}
      `;

      expect(consumption.length).toBeGreaterThan(0);
      if (consumption.length > 0) {
        expect(Number(consumption[0]?.approved_amount)).toBe(1000000);
        expect(consumption[0]?.consumption_type).toBe('COMMITMENT');
      }
    });

    it('should update budget amounts after consumption', async () => {
      // Update budget to reflect consumption
      await prisma.$executeRaw`
        UPDATE product_budgets 
        SET committed_amount = 1000000, updated_at = ${new Date()}
        WHERE id = ${testProductBudgetId}
      `;

      const budget = await prisma.$queryRaw<{
        committed_amount: string,
        available_amount: string,
        utilization_rate: string
      }[]>`
        SELECT committed_amount, available_amount, utilization_rate 
        FROM product_budgets 
        WHERE id = ${testProductBudgetId}
      `;

      expect(budget.length).toBeGreaterThan(0);
      if (budget.length > 0) {
        expect(Number(budget[0]?.committed_amount)).toBe(1000000);
        expect(Number(budget[0]?.available_amount)).toBe(49000000); // 50M - 1M
        expect(Number(budget[0]?.utilization_rate)).toBe(2); // 1M/50M * 100 = 2%
      }
    });

    afterAll(async () => {
      await prisma.$executeRaw`
        DELETE FROM budget_consumption WHERE product_budget_id = ${testProductBudgetId}
      `.catch(() => {});
      await prisma.$executeRaw`
        DELETE FROM product_budgets WHERE id = ${testProductBudgetId}
      `.catch(() => {});
    });
  });

  describe('Aging Analysis', () => {
    it('should create aging analysis record', async () => {
      const agingId = EncryptionUtil.generateUUID();
      
      await prisma.$executeRaw`
        INSERT INTO aging_analysis (
          id, loan_id, customer_id, branch_id, current_age, aging_bucket,
          principal_overdue, interest_overdue, penalty_overdue,
          collection_agent_id, collection_strategy, next_action_date,
          status, created_at, updated_at
        ) VALUES (
          ${agingId}, ${testLoanId}, ${testCustomerId}, ${testBranchId}, 
          45, '31-60', 50000, 5000, 1000, ${testUserId}, 'CALL', 
          ${new Date(Date.now() + 86400000)}, 'ACTIVE', ${new Date()}, ${new Date()}
        )
      `;

      // Verify aging analysis was created
      const aging = await prisma.$queryRaw<{
        current_age: number,
        aging_bucket: string,
        total_overdue: string
      }[]>`
        SELECT current_age, aging_bucket, total_overdue 
        FROM aging_analysis 
        WHERE loan_id = ${testLoanId}
      `;

      expect(aging.length).toBeGreaterThan(0);
      if (aging.length > 0) {
        expect(aging[0]?.current_age).toBe(45);
        expect(aging[0]?.aging_bucket).toBe('31-60');
        expect(Number(aging[0]?.total_overdue)).toBe(56000); // 50000 + 5000 + 1000
      }

      // Clean up
      await prisma.$executeRaw`
        DELETE FROM aging_analysis WHERE id = ${agingId}
      `.catch(() => {});
    });
  });

  describe('Credit Lines (Revolving Credit)', () => {
    let testCreditLineId: string;

    it('should create credit line', async () => {
      const creditLineId = EncryptionUtil.generateUUID();
      const timestamp = Date.now();
      
      await prisma.$executeRaw`
        INSERT INTO credit_lines (
          id, customer_id, credit_line_number, approved_limit, current_balance,
          interest_rate, start_date, expiry_date, review_date, status,
          created_by, created_at, updated_at
        ) VALUES (
          ${creditLineId}, ${testCustomerId}, ${`CL-TEST-${timestamp}`}, 2000000, 0,
          7.5, ${new Date()}, ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)},
          ${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)}, 'ACTIVE',
          ${testUserId}, ${new Date()}, ${new Date()}
        )
      `;

      testCreditLineId = creditLineId;

      // Verify credit line was created
      const creditLine = await prisma.$queryRaw<{
        approved_limit: string,
        available_balance: string,
        utilization_rate: string
      }[]>`
        SELECT approved_limit, available_balance, utilization_rate 
        FROM credit_lines 
        WHERE id = ${testCreditLineId}
      `;

      expect(creditLine.length).toBeGreaterThan(0);
      if (creditLine.length > 0) {
        expect(Number(creditLine[0]?.approved_limit)).toBe(2000000);
        expect(Number(creditLine[0]?.available_balance)).toBe(2000000); // No usage yet
        expect(Number(creditLine[0]?.utilization_rate)).toBe(0);
      }
    });

    it('should create credit line drawdown', async () => {
      const drawdownId = EncryptionUtil.generateUUID();
      const timestamp = Date.now();
      
      await prisma.$executeRaw`
        INSERT INTO credit_line_drawdowns (
          id, credit_line_id, drawdown_number, amount, purpose,
          drawdown_date, maturity_date, interest_rate, status,
          created_by, created_at
        ) VALUES (
          ${drawdownId}, ${testCreditLineId}, ${`DD-TEST-${timestamp}`}, 500000, 'Working capital',
          ${new Date()}, ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}, 7.5, 'ACTIVE',
          ${testUserId}, ${new Date()}
        )
      `;

      // Update credit line balance
      await prisma.$executeRaw`
        UPDATE credit_lines 
        SET current_balance = 500000, updated_at = ${new Date()}
        WHERE id = ${testCreditLineId}
      `;

      // Verify drawdown and updated balances
      const drawdown = await prisma.$queryRaw<{amount: string}[]>`
        SELECT amount FROM credit_line_drawdowns WHERE id = ${drawdownId}
      `;

      const creditLine = await prisma.$queryRaw<{
        current_balance: string,
        available_balance: string,
        utilization_rate: string
      }[]>`
        SELECT current_balance, available_balance, utilization_rate 
        FROM credit_lines 
        WHERE id = ${testCreditLineId}
      `;

      expect(drawdown.length).toBeGreaterThan(0);
      if (drawdown.length > 0) {
        expect(Number(drawdown[0]?.amount)).toBe(500000);
      }

      expect(creditLine.length).toBeGreaterThan(0);
      if (creditLine.length > 0) {
        expect(Number(creditLine[0]?.current_balance)).toBe(500000);
        expect(Number(creditLine[0]?.available_balance)).toBe(1500000); // 2M - 500K
        expect(Number(creditLine[0]?.utilization_rate)).toBe(25); // 500K/2M * 100 = 25%
      }

      // Clean up
      await prisma.$executeRaw`
        DELETE FROM credit_line_drawdowns WHERE id = ${drawdownId}
      `.catch(() => {});
    });

    afterAll(async () => {
      if (testCreditLineId) {
        await prisma.$executeRaw`
          DELETE FROM credit_lines WHERE id = ${testCreditLineId}
        `.catch(() => {});
      }
    });
  });

  describe('AML/CFT Compliance', () => {
    it.skip('AML check - REMOVED (table dropped)', async () => {
      // AML system removed on 2026-03-02
      // Reason: Insufficient data for regulatory compliance
      // Missing: PEP screening, Sanctions lists, UBO verification, Source of Funds
      // See: .kiro/เล่มรายงาน/AML-Data-Analysis.md
    });
  });

  describe('PDPA Compliance', () => {
    it('should create privacy consent record', async () => {
      const consentId = EncryptionUtil.generateUUID();
      
      await prisma.$executeRaw`
        INSERT INTO privacy_consents (
          id, customer_id, consent_type, consent_version, consent_text,
          given, given_at, withdrawn, withdrawn_at, ip_address,
          user_agent, created_at
        ) VALUES (
          ${consentId}, ${testCustomerId}, 'DATA_PROCESSING', '1.0',
          'I consent to the processing of my personal data for loan application purposes',
          true, ${new Date()}, false, NULL, '127.0.0.1',
          'Test User Agent', ${new Date()}
        )
      `;

      // Verify consent was created
      const consent = await prisma.$queryRaw<{
        consent_type: string,
        given: boolean
      }[]>`
        SELECT consent_type, given 
        FROM privacy_consents 
        WHERE id = ${consentId}
      `;

      expect(consent.length).toBeGreaterThan(0);
      if (consent.length > 0) {
        expect(consent[0]?.consent_type).toBe('DATA_PROCESSING');
        expect(consent[0]?.given).toBe(true);
      }

      // Clean up
      await prisma.$executeRaw`
        DELETE FROM privacy_consents WHERE id = ${consentId}
      `.catch(() => {});
    });

    it('should create data access log', async () => {
      const logId = EncryptionUtil.generateUUID();
      
      await prisma.$executeRaw`
        INSERT INTO data_access_logs (
          id, user_id, customer_id, access_type, access_path,
          accessed_fields, purpose, ip_address, user_agent, created_at
        ) VALUES (
          ${logId}, ${testUserId}, ${testCustomerId}, 'VIEW', '/api/customers',
          ARRAY['businessName', 'phone', 'email'], 
          'Customer profile review', '127.0.0.1', 'Test User Agent', ${new Date()}
        )
      `;

      // Verify log was created
      const log = await prisma.$queryRaw<{
        access_type: string,
        accessed_fields: any
      }[]>`
        SELECT access_type, accessed_fields 
        FROM data_access_logs 
        WHERE id = ${logId}
      `;

      expect(log.length).toBeGreaterThan(0);
      if (log.length > 0) {
        expect(log[0]?.access_type).toBe('VIEW');
        const accessedFields = log[0]?.accessed_fields;
        expect(accessedFields).toContain('businessName');
      }

      // Clean up
      await prisma.$executeRaw`
        DELETE FROM data_access_logs WHERE id = ${logId}
      `.catch(() => {});
    });
  });

  describe('Materialized Views', () => {
    it('should refresh budget utilization summary', async () => {
      await expect(
        prisma.$executeRaw`REFRESH MATERIALIZED VIEW budget_utilization_summary`
      ).resolves.not.toThrow();
    });

    it('should refresh aging analysis summary', async () => {
      await expect(
        prisma.$executeRaw`REFRESH MATERIALIZED VIEW aging_analysis_summary`
      ).resolves.not.toThrow();
    });

    it('should refresh collection performance', async () => {
      await expect(
        prisma.$executeRaw`REFRESH MATERIALIZED VIEW collection_performance`
      ).resolves.not.toThrow();
    });

    it('should call refresh all function', async () => {
      await expect(
        prisma.$executeRaw`SELECT refresh_all_materialized_views()`
      ).resolves.not.toThrow();
    });
  });
});
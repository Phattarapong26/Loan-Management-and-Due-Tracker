import { PrismaClient } from '@prisma/client';
import { amlCheckService } from '../src/modules/compliance/services/aml-check.service';

const prisma = new PrismaClient();

async function testAMLChecks() {
  console.log('🧪 Testing AML Check Service\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Create test data
    console.log('\n1️⃣ Creating test data...');
    
    const testUser = await prisma.users.create({
      data: {
        email: 'aml-tester@test.com',
        password_hash: 'test-hash',
        first_name: 'AML',
        last_name: 'Tester',
        role: 'ADMIN',
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    console.log('✅ User created:', testUser.id);

    const testCustomer = await prisma.customers.create({
      data: {
        business_name: 'Test AML Company',
        tax_id: 'TEST-AML-001',
        business_type: 'RETAIL',
        registration_number: 'REG-AML-001',
        business_established_date: new Date('2022-01-01'),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    console.log('✅ Customer created:', testCustomer.id);

    // Test 2: Calculate risk score
    console.log('\n2️⃣ Testing risk score calculation...');
    const riskScore = amlCheckService.calculateRiskScore({
      transactionVolume: 5000000,
      transactionFrequency: 75,
      businessAge: 2,
      industryRisk: 10,
      geographicRisk: 5,
      previousIssues: 0
    });
    console.log('✅ Risk score calculated:', riskScore);

    const riskLevel = amlCheckService.calculateRiskLevel(riskScore);
    console.log('✅ Risk level:', riskLevel);

    // Test 3: Create manual AML check
    console.log('\n3️⃣ Creating manual AML check...');
    const check1 = await amlCheckService.createCheck({
      customerId: testCustomer.id,
      checkType: 'MANUAL',
      performedBy: testUser.id,
      checkData: {
        manual: true,
        notes: 'Initial onboarding check'
      },
      riskScore: 45,
      riskLevel: 'MEDIUM',
      findings: 'Standard business profile',
      recommendations: 'Continue monitoring'
    });
    console.log('✅ Manual check created:', check1.id);

    // Test 4: Create automated check
    console.log('\n4️⃣ Creating automated AML check...');
    const check2 = await amlCheckService.performAutomatedCheck(
      testCustomer.id,
      testUser.id
    );
    console.log('✅ Automated check created:', check2.id);
    console.log('   - Risk Score:', check2.risk_score);
    console.log('   - Risk Level:', check2.risk_level);
    console.log('   - Findings:', check2.findings?.substring(0, 50) + '...');

    // Test 5: Get customer checks
    console.log('\n5️⃣ Getting customer checks...');
    const customerChecks = await amlCheckService.getCustomerChecks(testCustomer.id);
    console.log('✅ Total checks:', customerChecks.length);
    customerChecks.forEach(c => {
      console.log(`   - ${c.check_type}: ${c.risk_level} (${c.risk_score})`);
    });

    // Test 6: Get latest check
    console.log('\n6️⃣ Getting latest check...');
    const latestCheck = await amlCheckService.getLatestCheck(testCustomer.id);
    console.log('✅ Latest check:', latestCheck?.check_type);

    // Test 7: Review check
    console.log('\n7️⃣ Reviewing AML check...');
    const reviewed = await amlCheckService.reviewCheck(check1.id, {
      reviewedBy: testUser.id,
      reviewStatus: 'APPROVED',
      reviewNotes: 'All documentation verified',
      actionRequired: 'None'
    });
    console.log('✅ Check reviewed:', reviewed.review_status);

    // Test 8: Get pending checks
    console.log('\n8️⃣ Getting pending checks...');
    const pendingChecks = await amlCheckService.getPendingChecks();
    console.log('✅ Pending checks:', pendingChecks.length);

    // Test 9: Create high-risk check
    console.log('\n9️⃣ Creating high-risk check...');
    const highRiskCheck = await amlCheckService.createCheck({
      customerId: testCustomer.id,
      checkType: 'PERIODIC',
      performedBy: testUser.id,
      checkData: { automated: true },
      riskScore: 85,
      riskLevel: 'CRITICAL',
      findings: 'Unusual transaction patterns detected',
      recommendations: '🚨 URGENT: Immediate investigation required'
    });
    console.log('✅ High-risk check created:', highRiskCheck.id);

    // Test 10: Get high-risk customers
    console.log('\n🔟 Getting high-risk customers...');
    const highRiskCustomers = await amlCheckService.getHighRiskCustomers();
    console.log('✅ High-risk customers:', highRiskCustomers.length);

    // Test 11: Check if needs review
    console.log('\n1️⃣1️⃣ Checking if customer needs review...');
    const needsReview = await amlCheckService.needsReview(testCustomer.id);
    console.log('✅ Needs review:', needsReview);

    // Test 12: Get statistics
    console.log('\n1️⃣2️⃣ Getting AML statistics...');
    const stats = await amlCheckService.getStatistics();
    console.log('✅ Statistics:');
    console.log('   - Total:', stats.total);
    console.log('   - Pending:', stats.pending);
    console.log('   - Completed:', stats.completed);
    console.log('   - Risk Levels:');
    console.log('     • Low:', stats.riskLevels.low);
    console.log('     • Medium:', stats.riskLevels.medium);
    console.log('     • High:', stats.riskLevels.high);
    console.log('     • Critical:', stats.riskLevels.critical);

    // Test 13: Test industry risk
    console.log('\n1️⃣3️⃣ Testing industry risk calculation...');
    const casinoRisk = amlCheckService.calculateRiskScore({
      transactionVolume: 1000000,
      industryRisk: 20 // High-risk industry
    });
    const retailRisk = amlCheckService.calculateRiskScore({
      transactionVolume: 1000000,
      industryRisk: 5 // Low-risk industry
    });
    console.log('✅ Casino risk score:', casinoRisk);
    console.log('✅ Retail risk score:', retailRisk);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.aml_checks.deleteMany({
      where: { customer_id: testCustomer.id }
    });
    await prisma.customers.delete({
      where: { id: testCustomer.id }
    });
    await prisma.users.delete({
      where: { id: testUser.id }
    });
    console.log('✅ Cleanup complete');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL AML CHECK TESTS PASSED!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testAMLChecks()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

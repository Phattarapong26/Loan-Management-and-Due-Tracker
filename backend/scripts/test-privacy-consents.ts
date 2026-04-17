import { PrismaClient } from '@prisma/client';
import { privacyConsentService } from '../src/modules/customers/services/privacy-consent.service';

const prisma = new PrismaClient();

async function testPrivacyConsents() {
  console.log('🧪 Testing Privacy Consent Service\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Create test customer
    console.log('\n1️⃣ Creating test customer...');
    const testCustomer = await prisma.customers.create({
      data: {
        business_name: 'Test Privacy Company',
        tax_id: 'TEST-PRIVACY-001',
        business_type: 'RETAIL',
        registration_number: 'REG-TEST-001',
        business_established_date: new Date('2020-01-01'),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    console.log('✅ Customer created:', testCustomer.id);

    // Test 2: Create single consent
    console.log('\n2️⃣ Creating single consent...');
    const consent1 = await privacyConsentService.createConsent({
      customerId: testCustomer.id,
      consentType: 'PERSONAL_DATA_COLLECTION',
      consentVersion: '1.0',
      consentText: 'I consent to data collection',
      granted: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent'
    });
    console.log('✅ Consent created:', consent1.id);

    // Test 3: Check if customer has consent
    console.log('\n3️⃣ Checking consent status...');
    const hasConsent = await privacyConsentService.hasConsent(
      testCustomer.id,
      'PERSONAL_DATA_COLLECTION'
    );
    console.log('✅ Has consent:', hasConsent);

    // Test 4: Create bulk consents
    console.log('\n4️⃣ Creating bulk consents...');
    await privacyConsentService.createBulkConsents(testCustomer.id, [
      {
        consentType: 'PERSONAL_DATA_USAGE',
        consentVersion: '1.0',
        consentText: 'I consent to data usage',
        granted: true
      },
      {
        consentType: 'MARKETING_COMMUNICATION',
        consentVersion: '1.0',
        consentText: 'I consent to marketing',
        granted: false
      }
    ]);
    console.log('✅ Bulk consents created');

    // Test 5: Get customer consents
    console.log('\n5️⃣ Getting customer consents...');
    const consents = await privacyConsentService.getCustomerConsents(testCustomer.id);
    console.log('✅ Total consents:', consents.length);
    consents.forEach(c => {
      console.log(`   - ${c.consent_type}: ${c.granted ? '✓' : '✗'}`);
    });

    // Test 6: Get latest consent
    console.log('\n6️⃣ Getting latest consent...');
    const latest = await privacyConsentService.getLatestConsent(
      testCustomer.id,
      'PERSONAL_DATA_COLLECTION'
    );
    console.log('✅ Latest consent:', latest?.consent_type);

    // Test 7: Revoke consent
    console.log('\n7️⃣ Revoking consent...');
    await privacyConsentService.revokeConsent(consent1.id, 'Customer request');
    const hasConsentAfterRevoke = await privacyConsentService.hasConsent(
      testCustomer.id,
      'PERSONAL_DATA_COLLECTION'
    );
    console.log('✅ Consent revoked. Has consent now:', hasConsentAfterRevoke);

    // Test 8: Get consent history
    console.log('\n8️⃣ Getting consent history...');
    const history = await privacyConsentService.getConsentHistory(testCustomer.id);
    console.log('✅ History entries:', history.length);

    // Test 9: Check if needs update
    console.log('\n9️⃣ Checking if needs consent update...');
    const needsUpdate = await privacyConsentService.needsConsentUpdate(
      testCustomer.id,
      'PERSONAL_DATA_COLLECTION',
      '2.0' // New version
    );
    console.log('✅ Needs update:', needsUpdate);

    // Test 10: Get statistics
    console.log('\n🔟 Getting consent statistics...');
    const stats = await privacyConsentService.getConsentStats();
    console.log('✅ Statistics:');
    console.log('   - Total:', stats.total);
    console.log('   - Granted:', stats.granted);
    console.log('   - Revoked:', stats.revoked);
    console.log('   - Grant Rate:', stats.grantedPercentage.toFixed(2) + '%');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.privacy_consents.deleteMany({
      where: { customer_id: testCustomer.id }
    });
    await prisma.customers.delete({
      where: { id: testCustomer.id }
    });
    console.log('✅ Cleanup complete');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL PRIVACY CONSENT TESTS PASSED!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testPrivacyConsents()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

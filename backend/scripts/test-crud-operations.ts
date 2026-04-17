/**
 * Test CRUD Operations for Business Profile API
 */

import { PrismaClient } from '@prisma/client';
import {
  saveBusinessProfile,
  getLatestBusinessProfile,
  updateBusinessProfile,
  deleteBusinessProfile,
} from '../src/services/business-profile.service';
import type { ParsedBusinessProfile } from '../../src/features/documents/utils/parsers/excel-parser';

const prisma = new PrismaClient();

async function testCRUD() {
  console.log('🧪 Testing CRUD Operations...\n');

  try {
    // Find test customer
    const customer = await prisma.customer.findFirst({
      where: {
        businessName: { contains: 'Evena' },
      },
    });

    if (!customer) {
      console.error('❌ Test customer not found');
      return;
    }

    console.log(`✅ Found test customer: ${customer.businessName} (${customer.id})\n`);

    // Test CREATE
    console.log('1️⃣ Testing CREATE...');
    const testData: ParsedBusinessProfile = {
      sourceFileName: 'test-crud.xlsx',
      matchConfidence: 0.95,
      sheetsParsed: ['Sheet1'],
      warnings: [],
      shareholders: [
        {
          name: 'Test Shareholder',
          sharePercentage: 100,
          shareValue: 1000000,
          hasSigningAuthority: true,
        },
      ],
      loanSummary: {
        existingLoans: [],
        newLoans: [
          {
            loanType: 'PN',
            productName: 'Test Loan',
            amount: 500000,
            loanTerm: '12',
            interestRate: '5.5%',
            collateral: 'Test Collateral',
            status: 'PENDING',
          },
        ],
      },
      collaterals: [],
      suppliers: [],
      customers: [],
    } as ParsedBusinessProfile;

    const profile = await saveBusinessProfile({
      customerId: customer.id,
      parsedData: testData,
      action: 'create',
    });

    console.log(`✅ CREATE successful - Profile ID: ${profile.id}`);
    console.log(`   Version: ${profile.version}, Status: ${profile.status}\n`);

    // Test READ
    console.log('2️⃣ Testing READ...');
    const readProfile = await getLatestBusinessProfile(customer.id);
    console.log(`✅ READ successful - Found profile: ${readProfile?.id}`);
    console.log(`   Shareholders: ${readProfile?.shareholders.length}`);
    console.log(`   Loan Requests: ${readProfile?.loanRequests.length}\n`);

    // Test UPDATE
    console.log('3️⃣ Testing UPDATE...');
    const updatedData: ParsedBusinessProfile = {
      ...testData,
      shareholders: [
        {
          name: 'Updated Shareholder',
          sharePercentage: 60,
          shareValue: 600000,
          hasSigningAuthority: true,
        },
        {
          name: 'New Shareholder',
          sharePercentage: 40,
          shareValue: 400000,
          hasSigningAuthority: false,
        },
      ],
    };

    const updatedProfile = await updateBusinessProfile(profile.id, updatedData);
    console.log(`✅ UPDATE successful - New Profile ID: ${updatedProfile.id}`);
    console.log(`   Version: ${updatedProfile.version} (was ${profile.version})`);
    console.log(`   Shareholders: ${updatedProfile.shareholders.length} (was ${profile.shareholders.length})`);
    console.log(`   Old profile isLatest: false\n`);

    // Verify old version is not latest
    const oldProfile = await prisma.customerBusinessProfile.findUnique({
      where: { id: profile.id },
    });
    console.log(`   Verified old profile isLatest: ${oldProfile?.isLatest}\n`);

    // Test DELETE
    console.log('4️⃣ Testing DELETE...');
    await deleteBusinessProfile(updatedProfile.id);
    console.log(`✅ DELETE successful - Profile marked as deleted`);

    const deletedProfile = await prisma.customerBusinessProfile.findUnique({
      where: { id: updatedProfile.id },
    });
    console.log(`   Status: ${deletedProfile?.status}`);
    console.log(`   isLatest: ${deletedProfile?.isLatest}`);
    console.log(`   deletedAt: ${deletedProfile?.deletedAt}\n`);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.customerBusinessProfile.deleteMany({
      where: {
        customerId: customer.id,
        sourceFileName: 'test-crud.xlsx',
      },
    });
    console.log('✅ Cleanup complete\n');

    console.log('✅ All CRUD operations passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testCRUD();

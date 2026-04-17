#!/usr/bin/env tsx
/**
 * Test Interest Rate Update
 * 
 * This script tests updating MLR/MRR rates to ensure the system works correctly.
 */

import { prisma } from '../../src/core/config/database.config';
import { interestRateService } from '../../src/modules/loans/calculators/interest-rate.service';

async function testInterestRateUpdate() {
    console.log('🧪 Testing Interest Rate Update...\n');

    try {
        // Get admin user
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!admin) {
            console.log('❌ No admin user found');
            return;
        }

        console.log(`👤 Testing with admin: ${admin.firstName} ${admin.lastName}\n`);

        // Get current rates
        console.log('📊 Current Rates:');
        const currentRates = await interestRateService.getAllRates();
        console.log(`   MLR: ${currentRates.mlr}%`);
        console.log(`   MRR: ${currentRates.mrr}%`);
        console.log(`   Last Updated: ${new Date(currentRates.lastUpdated).toLocaleString('th-TH')}`);
        if (currentRates.updatedBy) {
            console.log(`   Updated By: ${currentRates.updatedBy.name} (${currentRates.updatedBy.role})`);
        }

        // Test updating MLR
        console.log('\n🔄 Testing MLR Update...');
        const newMLR = 7.000;
        await interestRateService.updateMLR(newMLR, admin.id);
        console.log(`✅ MLR updated to ${newMLR}%`);

        // Test updating MRR
        console.log('\n🔄 Testing MRR Update...');
        const newMRR = 7.250;
        await interestRateService.updateMRR(newMRR, admin.id);
        console.log(`✅ MRR updated to ${newMRR}%`);

        // Get updated rates
        console.log('\n📊 Updated Rates:');
        const updatedRates = await interestRateService.getAllRates();
        console.log(`   MLR: ${updatedRates.mlr}%`);
        console.log(`   MRR: ${updatedRates.mrr}%`);
        console.log(`   Last Updated: ${new Date(updatedRates.lastUpdated).toLocaleString('th-TH')}`);
        if (updatedRates.updatedBy) {
            console.log(`   Updated By: ${updatedRates.updatedBy.name} (${updatedRates.updatedBy.role})`);
        }

        // Restore original rates
        console.log('\n🔄 Restoring original rates...');
        await interestRateService.updateMLR(currentRates.mlr, admin.id);
        await interestRateService.updateMRR(currentRates.mrr, admin.id);
        console.log('✅ Original rates restored');

        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testInterestRateUpdate()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });

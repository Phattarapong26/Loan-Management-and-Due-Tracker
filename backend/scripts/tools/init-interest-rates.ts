#!/usr/bin/env tsx
/**
 * Initialize Interest Rates (MLR/MRR)
 * 
 * This script sets up the initial MLR and MRR rates in the system.
 */

import { prisma } from '../../src/core/config/database.config';

async function initInterestRates() {
    console.log('🔧 Initializing Interest Rates...\n');

    try {
        // Default rates (as of 2024)
        const defaultMLR = 6.875; // Minimum Loan Rate
        const defaultMRR = 7.125; // Minimum Retail Rate

        // Check if rates already exist
        const mlrConfig = await prisma.systemConfig.findUnique({
            where: { key: 'interest_rate.mlr' }
        });

        const mrrConfig = await prisma.systemConfig.findUnique({
            where: { key: 'interest_rate.mrr' }
        });

        if (mlrConfig && mrrConfig) {
            console.log('✅ Interest rates already configured:');
            console.log(`   MLR: ${mlrConfig.value}%`);
            console.log(`   MRR: ${mrrConfig.value}%`);
            console.log('\nℹ️  Use the Settings page to update these rates.');
            return;
        }

        // Find admin user for initial setup
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!admin) {
            console.log('❌ No admin user found. Please create an admin user first.');
            return;
        }

        // Create MLR config
        if (!mlrConfig) {
            await prisma.systemConfig.upsert({
                where: { key: 'interest_rate.mlr' },
                create: {
                    key: 'interest_rate.mlr',
                    value: defaultMLR.toString(),
                    description: 'Minimum Loan Rate (อัตราดอกเบี้ยเงินกู้ขั้นต่ำ)',
                    category: 'INTEREST_RATE',
                    updatedBy: admin.id,
                },
                update: {}
            });
            console.log(`✅ MLR initialized: ${defaultMLR}%`);
        }

        // Create MRR config
        if (!mrrConfig) {
            await prisma.systemConfig.upsert({
                where: { key: 'interest_rate.mrr' },
                create: {
                    key: 'interest_rate.mrr',
                    value: defaultMRR.toString(),
                    description: 'Minimum Retail Rate (อัตราดอกเบี้ยเงินกู้รายย่อยขั้นต่ำ)',
                    category: 'INTEREST_RATE',
                    updatedBy: admin.id,
                },
                update: {}
            });
            console.log(`✅ MRR initialized: ${defaultMRR}%`);
        }

        // Create last updated timestamp
        await prisma.systemConfig.upsert({
            where: { key: 'interest_rate.last_updated' },
            create: {
                key: 'interest_rate.last_updated',
                value: new Date().toISOString(),
                description: 'Last time interest rates were updated',
                category: 'INTEREST_RATE',
                updatedBy: admin.id,
            },
            update: {
                value: new Date().toISOString(),
                updatedBy: admin.id,
            }
        });

        console.log('\n✅ Interest rates initialized successfully!');
        console.log('\n📝 Summary:');
        console.log(`   MLR: ${defaultMLR}%`);
        console.log(`   MRR: ${defaultMRR}%`);
        console.log(`   Updated by: ${admin.firstName} ${admin.lastName} (${admin.email})`);
        console.log('\n💡 You can now update these rates from the Settings page.');

    } catch (error) {
        console.error('❌ Error initializing interest rates:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
initInterestRates()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Initialization failed:', error);
        process.exit(1);
    });

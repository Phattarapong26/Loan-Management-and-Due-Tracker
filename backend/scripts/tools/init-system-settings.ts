#!/usr/bin/env tsx
/**
 * Initialize System Settings
 * 
 * This script sets up default system settings in the database.
 */

import { prisma } from '../../src/core/config/database.config';

async function initSystemSettings() {
    console.log('🔧 Initializing System Settings...\n');

    try {
        // Find admin user for initial setup
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!admin) {
            console.log('❌ No admin user found. Please create an admin user first.');
            return;
        }

        console.log(`👤 Initializing with admin: ${admin.firstName} ${admin.lastName}\n`);

        // Default settings
        const defaultSettings = [
            // Company Settings
            {
                key: 'company.name',
                value: 'บริษัท สินเชื่อไทย จำกัด',
                category: 'company',
                description: 'Company name'
            },
            {
                key: 'company.email',
                value: 'contact@thailoan.co.th',
                category: 'company',
                description: 'Company contact email'
            },
            {
                key: 'company.phone',
                value: '02-123-4567',
                category: 'company',
                description: 'Company contact phone'
            },
            {
                key: 'system.language',
                value: 'th',
                category: 'system',
                description: 'System default language'
            },

            // Notification Settings
            {
                key: 'notifications.email_enabled',
                value: 'true',
                category: 'notifications',
                description: 'Enable email notifications'
            },
            {
                key: 'notifications.line_enabled',
                value: 'true',
                category: 'notifications',
                description: 'Enable LINE notifications'
            },
            {
                key: 'notifications.reminder_days',
                value: '3',
                category: 'notifications',
                description: 'Days before payment due date to send reminder'
            },
            {
                key: 'notifications.daily_report',
                value: 'true',
                category: 'notifications',
                description: 'Send daily report at 08:00'
            },
            {
                key: 'notifications.npl_alert',
                value: 'true',
                category: 'notifications',
                description: 'Alert when loan becomes NPL'
            },

            // Security Settings
            {
                key: 'security.session_timeout',
                value: '24',
                category: 'security',
                description: 'Session timeout in hours'
            },
            {
                key: 'security.password_expiry',
                value: '90',
                category: 'security',
                description: 'Password expiry in days'
            },
            {
                key: 'security.two_factor',
                value: 'false',
                category: 'security',
                description: 'Enable two-factor authentication'
            },
            {
                key: 'security.login_attempts',
                value: '5',
                category: 'security',
                description: 'Maximum login attempts before lock'
            },
        ];

        let created = 0;
        let existing = 0;

        for (const setting of defaultSettings) {
            const existingConfig = await prisma.systemConfig.findUnique({
                where: { key: setting.key }
            });

            if (existingConfig) {
                existing++;
                console.log(`⏭️  ${setting.key}: Already exists (${existingConfig.value})`);
            } else {
                await prisma.systemConfig.create({
                    data: {
                        key: setting.key,
                        value: setting.value,
                        category: setting.category,
                        description: setting.description,
                        updatedBy: admin.id,
                    }
                });
                created++;
                console.log(`✅ ${setting.key}: Created (${setting.value})`);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   ✅ Created: ${created} settings`);
        console.log(`   ⏭️  Existing: ${existing} settings`);
        console.log(`   📝 Total: ${defaultSettings.length} settings`);
        console.log(`\n💡 You can now manage these settings from the Settings page.`);

    } catch (error) {
        console.error('❌ Error initializing system settings:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
initSystemSettings()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Initialization failed:', error);
        process.exit(1);
    });

#!/usr/bin/env tsx
/**
 * Check Manager LINE Registration Status
 * 
 * This script checks if all managers have registered their LINE accounts
 * and are ready to receive notifications.
 */

import { prisma } from '../../src/core/config/database.config';

interface ManagerStatus {
    id: string;
    email: string;
    name: string;
    branchName: string;
    lineUserId: string | null;
    lineLinkedAt: Date | null;
    lineNotificationsEnabled: boolean;
    status: 'READY' | 'NOT_REGISTERED' | 'DISABLED';
}

async function checkManagerLineStatus() {
    console.log('🔍 Checking Manager LINE Registration Status...\n');

    try {
        // Get all active managers
        const managers = await prisma.user.findMany({
            where: {
                role: 'MANAGER',
                status: 'ACTIVE',
            },
            include: {
                branch: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                email: 'asc',
            },
        });

        if (managers.length === 0) {
            console.log('⚠️  No active managers found in the system.');
            return;
        }

        const statuses: ManagerStatus[] = managers.map((manager) => {
            let status: 'READY' | 'NOT_REGISTERED' | 'DISABLED' = 'NOT_REGISTERED';

            if (manager.lineUserId) {
                if (manager.lineNotificationsEnabled) {
                    status = 'READY';
                } else {
                    status = 'DISABLED';
                }
            }

            return {
                id: manager.id,
                email: manager.email,
                name: `${manager.firstName} ${manager.lastName}`,
                branchName: manager.branch?.name || 'No Branch',
                lineUserId: manager.lineUserId,
                lineLinkedAt: manager.lineLinkedAt,
                lineNotificationsEnabled: manager.lineNotificationsEnabled,
                status,
            };
        });

        // Summary
        const ready = statuses.filter((s) => s.status === 'READY').length;
        const notRegistered = statuses.filter((s) => s.status === 'NOT_REGISTERED').length;
        const disabled = statuses.filter((s) => s.status === 'DISABLED').length;

        console.log('📊 Summary:');
        console.log(`   Total Managers: ${managers.length}`);
        console.log(`   ✅ Ready: ${ready}`);
        console.log(`   ❌ Not Registered: ${notRegistered}`);
        console.log(`   🔕 Disabled: ${disabled}`);
        console.log('');

        // Details
        console.log('📋 Manager Details:\n');
        console.log('─'.repeat(120));
        console.log(
            'Status'.padEnd(12) +
            'Name'.padEnd(25) +
            'Email'.padEnd(30) +
            'Branch'.padEnd(25) +
            'LINE Linked'
        );
        console.log('─'.repeat(120));

        for (const manager of statuses) {
            const statusIcon =
                manager.status === 'READY'
                    ? '✅ Ready'
                    : manager.status === 'DISABLED'
                    ? '🔕 Disabled'
                    : '❌ Not Reg';

            const linkedDate = manager.lineLinkedAt
                ? new Date(manager.lineLinkedAt).toLocaleDateString('th-TH')
                : '-';

            console.log(
                statusIcon.padEnd(12) +
                manager.name.padEnd(25) +
                manager.email.padEnd(30) +
                manager.branchName.padEnd(25) +
                linkedDate
            );
        }
        console.log('─'.repeat(120));

        // Recommendations
        if (notRegistered > 0) {
            console.log('\n💡 Recommendations:');
            console.log('   Managers who have not registered should:');
            console.log('   1. Add LINE Official Account as friend');
            console.log('   2. Send "ลงทะเบียน" or "register" message');
            console.log('   3. Click the registration link and login');
            console.log('   4. System will automatically link their LINE account');
        }

        if (disabled > 0) {
            console.log('\n⚠️  Warning:');
            console.log('   Some managers have disabled LINE notifications.');
            console.log('   They will not receive loan approval requests via LINE.');
        }

        // List managers who need to register
        const needRegistration = statuses.filter((s) => s.status === 'NOT_REGISTERED');
        if (needRegistration.length > 0) {
            console.log('\n📝 Managers who need to register:');
            for (const manager of needRegistration) {
                console.log(`   • ${manager.name} (${manager.email}) - ${manager.branchName}`);
            }
        }

    } catch (error) {
        console.error('❌ Error checking manager LINE status:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
checkManagerLineStatus()
    .then(() => {
        console.log('\n✅ Check completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Check failed:', error);
        process.exit(1);
    });

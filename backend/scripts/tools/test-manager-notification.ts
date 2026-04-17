#!/usr/bin/env tsx
/**
 * Test Manager Notification System
 * 
 * This script tests the notification system by sending a test notification
 * to a manager when an officer creates a loan application.
 */

import { prisma } from '../../src/core/config/database.config';
import { notificationHelper } from '../../src/modules/notifications/services/notification-helper.service';

async function testManagerNotification() {
    console.log('🧪 Testing Manager Notification System...\n');

    try {
        // 1. Find an active manager with LINE
        const manager = await prisma.user.findFirst({
            where: {
                role: 'MANAGER',
                status: 'ACTIVE',
                lineUserId: { not: null },
                lineNotificationsEnabled: true,
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!manager || !manager.branch) {
            console.log('❌ No active manager with LINE found.');
            console.log('   Please ensure at least one manager has:');
            console.log('   - Active status');
            console.log('   - LINE account linked');
            console.log('   - LINE notifications enabled');
            console.log('   - Assigned to a branch');
            return;
        }

        console.log('✅ Found manager:');
        console.log(`   Name: ${manager.firstName} ${manager.lastName}`);
        console.log(`   Email: ${manager.email}`);
        console.log(`   Branch: ${manager.branch.name}`);
        console.log(`   LINE User ID: ${manager.lineUserId}`);
        console.log('');

        // 2. Find an officer in the same branch
        const officer = await prisma.user.findFirst({
            where: {
                role: { in: ['OFFICER', 'USER'] },
                status: 'ACTIVE',
                branchId: manager.branchId,
            },
        });

        if (!officer) {
            console.log('⚠️  No officer found in the same branch. Using test data.');
        }

        const officerName = officer
            ? `${officer.firstName} ${officer.lastName}`
            : 'สมชาย ใจดี (Test)';

        console.log('✅ Officer:');
        console.log(`   Name: ${officerName}`);
        console.log('');

        // 3. Find a customer or use test data
        const customer = await prisma.customer.findFirst({
            where: {
                branchId: manager.branchId,
            },
        });

        const customerName = customer?.businessName || 'บริษัท ทดสอบ จำกัด';

        console.log('✅ Customer:');
        console.log(`   Name: ${customerName}`);
        console.log('');

        // 4. Send test notification
        console.log('📤 Sending test notification...');

        const testLoanId = 'test-loan-' + Date.now();
        const testAmount = 500000;

        const result = await notificationHelper.sendLoanApprovalRequest({
            loanId: testLoanId,
            branchId: manager.branchId!,
            customerName,
            amount: testAmount,
            officerName,
        });

        if (result) {
            console.log('✅ Notification sent successfully!');
            console.log(`   Notification ID: ${result.id}`);
            console.log(`   Type: ${result.type}`);
            console.log(`   Title: ${result.title}`);
            console.log(`   Message: ${result.message}`);
            console.log('');

            console.log('📱 Check the following:');
            console.log('   1. Manager should receive in-app notification');
            console.log('   2. Manager should receive LINE message');
            console.log('   3. LINE message should have "ดูรายละเอียด" button');
            console.log('');

            console.log('🔍 To verify:');
            console.log(`   - Check notifications: GET /api/notifications?userId=${manager.id}`);
            console.log(`   - Check LINE chat with manager`);
        } else {
            console.log('❌ Failed to send notification');
        }

    } catch (error) {
        console.error('❌ Error testing notification:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
testManagerNotification()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });

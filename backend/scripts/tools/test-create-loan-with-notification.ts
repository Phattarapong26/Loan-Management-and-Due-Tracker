import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCreateLoanWithNotification() {
    try {
        console.log('🔔 Testing Loan Creation with Notification...\n');

        // Get officer and manager from same branch
        const officer = await prisma.user.findFirst({
            where: {
                role: 'OFFICER',
                status: 'ACTIVE',
            },
            include: {
                branch: true,
            },
        });

        if (!officer || !officer.branchId) {
            console.log('❌ No active officer with branch found');
            return;
        }

        console.log(`✅ Officer: ${officer.firstName} ${officer.lastName}`);
        console.log(`   Branch: ${officer.branch?.name || 'N/A'} (${officer.branchId})`);

        const manager = await prisma.user.findFirst({
            where: {
                branchId: officer.branchId,
                role: 'MANAGER',
                status: 'ACTIVE',
            },
        });

        if (!manager) {
            console.log(`❌ No active manager found in branch ${officer.branch?.name}`);
            return;
        }

        console.log(`✅ Manager: ${manager.firstName} ${manager.lastName}\n`);

        // Get a customer
        const customer = await prisma.customer.findFirst({
            where: {
                branchId: officer.branchId,
                status: 'ACTIVE',
            },
        });

        if (!customer) {
            console.log('❌ No active customer found');
            return;
        }

        console.log(`✅ Customer: ${customer.businessName}\n`);

        // Count notifications before
        const notificationsBefore = await prisma.notification.count({
            where: {
                userId: manager.id,
            },
        });

        console.log(`📊 Manager notifications before: ${notificationsBefore}\n`);

        // Create a test loan
        console.log('📝 Creating test loan...\n');

        const loan = await prisma.loan.create({
            data: {
                customerId: customer.id,
                branchId: officer.branchId,
                officerId: officer.id,
                contract_number: `TEST-${Date.now()}`,
                principal: 500000,
                interestRate: 8.5,
                termMonths: 12,
                paymentDay: 1,
                dscr: 1.5,
                dscrStatus: 'GOOD',
                monthlyPayment: 45000,
                totalInterest: 40000,
                outstandingBalance: 500000,
                status: 'PENDING_APPROVAL',
                approvalLevel: 'MANAGER',
            },
        });

        console.log(`✅ Loan created: ${loan.id}\n`);

        // Manually trigger notification (simulating what loan service should do)
        console.log('📤 Sending notification to manager...\n');

        const notification = await prisma.notification.create({
            data: {
                userId: manager.id,
                type: 'REMINDER',
                priority: 'HIGH',
                title: '📋 คำขออนุมัติสินเชื่อใหม่',
                message: `${officer.firstName} ${officer.lastName} ขออนุมัติสินเชื่อสำหรับ ${customer.businessName} จำนวน 500,000 บาท`,
                link: `/loans/${loan.id}`,
                metadata: {
                    loanId: loan.id,
                    customerName: customer.businessName,
                    amount: 500000,
                    officerName: `${officer.firstName} ${officer.lastName}`,
                    notificationType: 'LOAN_APPROVAL_REQUEST',
                },
                read: false,
            },
        });

        console.log(`✅ Notification sent: ${notification.id}\n`);

        // Count notifications after
        const notificationsAfter = await prisma.notification.count({
            where: {
                userId: manager.id,
            },
        });

        console.log(`📊 Manager notifications after: ${notificationsAfter}`);
        console.log(`   New notifications: ${notificationsAfter - notificationsBefore}\n`);

        // Show recent notifications
        const recentNotifications = await prisma.notification.findMany({
            where: {
                userId: manager.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 3,
        });

        console.log('📋 Recent Manager Notifications:\n');
        recentNotifications.forEach((notif, index) => {
            const readStatus = notif.read ? '✓' : '○';
            console.log(`   ${index + 1}. ${readStatus} [${notif.priority}] ${notif.title}`);
            console.log(`      ${notif.message}`);
            console.log(`      Link: ${notif.link}`);
            console.log(`      Created: ${notif.createdAt.toLocaleString('th-TH')}\n`);
        });

        console.log('✅ Test completed successfully!');
        console.log('\n💡 Note: In production, the notification should be sent automatically by LoanService.processLoanCreation()');
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

testCreateLoanWithNotification();

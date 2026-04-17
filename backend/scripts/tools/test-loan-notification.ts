import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLoanNotification() {
    try {
        console.log('🔔 Testing Loan Approval Notification...\n');

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

        if (!officer) {
            console.log('❌ No active officer found');
            return;
        }

        console.log(`✅ Found Officer: ${officer.firstName} ${officer.lastName}`);
        console.log(`   Branch: ${officer.branch?.name || 'N/A'}`);

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

        console.log(`✅ Found Manager: ${manager.firstName} ${manager.lastName}\n`);

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

        console.log(`✅ Found Customer: ${customer.businessName}\n`);

        // Simulate loan creation notification
        console.log('📝 Creating loan approval request notification...\n');

        const notification = await prisma.notification.create({
            data: {
                userId: manager.id,
                type: 'REMINDER',
                priority: 'HIGH',
                title: '📋 คำขออนุมัติสินเชื่อใหม่',
                message: `${officer.firstName} ${officer.lastName} ขออนุมัติสินเชื่อสำหรับ ${customer.businessName} จำนวน 500,000 บาท`,
                link: `/loans/test-loan-id`,
                metadata: {
                    customerName: customer.businessName,
                    amount: 500000,
                    officerName: `${officer.firstName} ${officer.lastName}`,
                    notificationType: 'LOAN_APPROVAL_REQUEST',
                },
                read: false,
            },
        });

        console.log('✅ Notification created successfully!\n');
        console.log('📋 Notification Details:');
        console.log(`   ID: ${notification.id}`);
        console.log(`   To: ${manager.firstName} ${manager.lastName} (Manager)`);
        console.log(`   Type: ${notification.type}`);
        console.log(`   Priority: ${notification.priority}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Message: ${notification.message}`);
        console.log(`   Link: ${notification.link}`);

        // Check manager's notifications
        console.log('\n📊 Manager Notifications:');
        const managerNotifications = await prisma.notification.findMany({
            where: {
                userId: manager.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 5,
        });

        console.log(`   Total: ${managerNotifications.length} notifications`);
        console.log(`   Unread: ${managerNotifications.filter(n => !n.read).length} notifications\n`);

        managerNotifications.forEach((notif, index) => {
            const readStatus = notif.read ? '✓' : '○';
            console.log(`   ${index + 1}. ${readStatus} [${notif.priority}] ${notif.title}`);
            console.log(`      ${notif.message}`);
            console.log(`      Created: ${notif.createdAt.toLocaleString('th-TH')}\n`);
        });

        console.log('✅ Test completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

testLoanNotification();

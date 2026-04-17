import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNotifications() {
    try {
        console.log('🔔 Testing Notifications System...\n');

        // Get all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
            },
        });

        console.log(`Found ${users.length} users:\n`);
        users.forEach((user) => {
            console.log(`  - ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
        });

        // Create test notifications for each user
        console.log('\n📝 Creating test notifications...\n');

        for (const user of users) {
            // Create a welcome notification
            const notification1 = await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: 'SYSTEM_ALERT',
                    priority: 'MEDIUM',
                    title: 'ยินดีต้อนรับสู่ระบบ',
                    message: `สวัสดี ${user.firstName}! ยินดีต้อนรับสู่ระบบ SME D Bank`,
                    read: false,
                },
            });

            console.log(`✅ Created notification for ${user.firstName}: ${notification1.title}`);

            // Create a payment reminder notification
            const notification2 = await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: 'PAYMENT_DUE',
                    priority: 'HIGH',
                    title: 'แจ้งเตือนการชำระเงิน',
                    message: 'มีลูกค้า 3 รายที่ใกล้ถึงกำหนดชำระเงินภายใน 7 วัน',
                    link: '/collections',
                    read: false,
                },
            });

            console.log(`✅ Created notification for ${user.firstName}: ${notification2.title}`);

            // Create an approval notification for managers and admins
            if (user.role === 'MANAGER' || user.role === 'ADMIN') {
                const notification3 = await prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'LOAN_APPROVED',
                        priority: 'URGENT',
                        title: 'รออนุมัติสินเชื่อ',
                        message: 'มีคำขอสินเชื่อ 2 รายการรออนุมัติ',
                        link: '/approvals',
                        read: false,
                    },
                });

                console.log(`✅ Created notification for ${user.firstName}: ${notification3.title}`);
            }
        }

        // Get notification counts
        console.log('\n📊 Notification Statistics:\n');

        const totalNotifications = await prisma.notification.count();
        const unreadNotifications = await prisma.notification.count({
            where: { read: false },
        });

        console.log(`  Total notifications: ${totalNotifications}`);
        console.log(`  Unread notifications: ${unreadNotifications}`);

        // Show notifications by user
        console.log('\n📋 Notifications by User:\n');

        for (const user of users) {
            const userNotifications = await prisma.notification.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });

            console.log(`\n${user.firstName} ${user.lastName} (${userNotifications.length} notifications):`);
            userNotifications.forEach((notif) => {
                const readStatus = notif.read ? '✓' : '○';
                console.log(`  ${readStatus} [${notif.priority}] ${notif.title}`);
                console.log(`     ${notif.message}`);
            });
        }

        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

testNotifications();

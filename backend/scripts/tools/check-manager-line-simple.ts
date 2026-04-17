import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkManagerLineStatus() {
    try {
        console.log('🔍 Checking Manager LINE Status...\n');

        const managers = await prisma.user.findMany({
            where: {
                role: 'MANAGER',
                status: 'ACTIVE',
            },
            include: {
                branch: true,
            },
        });

        console.log(`Found ${managers.length} active managers:\n`);

        for (const manager of managers) {
            console.log(`👤 ${manager.firstName} ${manager.lastName}`);
            console.log(`   Email: ${manager.email}`);
            console.log(`   Branch: ${manager.branch?.name || 'N/A'}`);
            console.log(`   LINE User ID: ${manager.lineUserId || '❌ Not registered'}`);
            console.log(`   LINE Display Name: ${manager.lineDisplayName || 'N/A'}`);
            
            if (manager.lineUserId) {
                console.log(`   ✅ Can receive LINE notifications`);
            } else {
                console.log(`   ⚠️  Cannot receive LINE notifications - needs to register`);
            }
            console.log('');
        }

        const registeredCount = managers.filter(m => m.lineUserId).length;
        console.log(`\n📊 Summary:`);
        console.log(`   Total managers: ${managers.length}`);
        console.log(`   Registered with LINE: ${registeredCount}`);
        console.log(`   Not registered: ${managers.length - registeredCount}`);

        if (registeredCount < managers.length) {
            console.log(`\n💡 Tip: Managers need to scan QR code to register with LINE Bot`);
            console.log(`   They can get QR code from: /line/register/manager`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

checkManagerLineStatus();

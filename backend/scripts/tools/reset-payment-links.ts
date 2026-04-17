import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function resetPaymentLinks() {
    console.log('🔄 Resetting all payment schedule links...');

    try {
        const result = await prisma.payment.updateMany({
            data: {
                paymentScheduleId: null
            }
        });

        console.log(`✅ Reset ${result.count} payment schedule links`);
    } catch (error) {
        console.error('❌ Error resetting payment links:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPaymentLinks().catch(console.error);
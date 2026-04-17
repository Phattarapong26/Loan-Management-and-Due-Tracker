import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

/**
 * Fix existing payments that don't have paymentScheduleId
 * Link them to the appropriate payment schedule in chronological order
 */
async function fixPaymentScheduleLinks() {
    console.log('🔧 Starting to fix payment schedule links...');

    try {
        // Get all loans that have payments without paymentScheduleId
        const loansWithUnlinkedPayments = await prisma.loan.findMany({
            where: {
                payments: {
                    some: {
                        paymentScheduleId: null
                    }
                }
            },
            include: {
                payments: {
                    where: {
                        paymentScheduleId: null
                    },
                    orderBy: { paymentDate: 'asc' }
                },
                customer: {
                    select: {
                        businessName: true
                    }
                }
            }
        });

        console.log(`📋 Found ${loansWithUnlinkedPayments.length} loans with unlinked payments`);

        let totalFixedCount = 0;

        for (const loan of loansWithUnlinkedPayments) {
            console.log(`\n🏦 Processing loan ${loan.id} - ${loan.customer?.businessName}`);
            console.log(`   Found ${loan.payments.length} unlinked payments`);

            // Get all payment schedules for this loan in order
            const schedules = await prisma.paymentSchedule.findMany({
                where: {
                    loanId: loan.id
                },
                orderBy: { paymentNumber: 'asc' }
            });

            if (schedules.length === 0) {
                console.log(`   ⚠️  No payment schedules found for loan ${loan.id}`);
                continue;
            }

            // Sort payments by date
            const sortedPayments = loan.payments.sort((a, b) => 
                new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
            );

            let currentScheduleIndex = 0;
            let remainingScheduleAmount = Number(schedules[0]?.totalPayment || 0);

            for (const payment of sortedPayments) {
                const paymentAmount = Number(payment.amount);
                console.log(`\n   💰 Processing payment: ${paymentAmount} on ${payment.paymentDate}`);

                // Find the appropriate schedule for this payment
                while (currentScheduleIndex < schedules.length) {
                    const currentSchedule = schedules[currentScheduleIndex];
                    
                    console.log(`      📋 Checking schedule ${currentSchedule.paymentNumber}: remaining ${remainingScheduleAmount}`);

                    if (paymentAmount <= remainingScheduleAmount) {
                        // Payment fits in current schedule
                        console.log(`      ✅ Linking payment to schedule ${currentSchedule.paymentNumber}`);
                        
                        await prisma.payment.update({
                            where: { id: payment.id },
                            data: { paymentScheduleId: currentSchedule.id }
                        });

                        remainingScheduleAmount -= paymentAmount;
                        totalFixedCount++;

                        // If schedule is fully paid, move to next schedule
                        if (remainingScheduleAmount <= 0.01) { // Allow for small rounding errors
                            currentScheduleIndex++;
                            if (currentScheduleIndex < schedules.length) {
                                remainingScheduleAmount = Number(schedules[currentScheduleIndex].totalPayment);
                                console.log(`      ➡️  Moving to next schedule ${schedules[currentScheduleIndex].paymentNumber}`);
                            }
                        }
                        break;
                    } else {
                        // Payment is larger than remaining schedule amount
                        // This payment will span multiple schedules, but link to current one
                        console.log(`      ✅ Linking large payment to schedule ${currentSchedule.paymentNumber} (spans multiple schedules)`);
                        
                        await prisma.payment.update({
                            where: { id: payment.id },
                            data: { paymentScheduleId: currentSchedule.id }
                        });

                        totalFixedCount++;

                        // Calculate how many schedules this payment covers
                        let remainingPayment = paymentAmount;
                        while (remainingPayment > 0 && currentScheduleIndex < schedules.length) {
                            const scheduleAmount = Number(schedules[currentScheduleIndex].totalPayment);
                            if (remainingPayment >= scheduleAmount) {
                                remainingPayment -= scheduleAmount;
                                currentScheduleIndex++;
                            } else {
                                remainingScheduleAmount = scheduleAmount - remainingPayment;
                                remainingPayment = 0;
                            }
                        }

                        if (currentScheduleIndex < schedules.length) {
                            remainingScheduleAmount = Number(schedules[currentScheduleIndex].totalPayment);
                        }
                        break;
                    }
                }

                if (currentScheduleIndex >= schedules.length) {
                    console.log(`      ⚠️  All schedules are covered, but more payments remain`);
                    // Link remaining payments to the last schedule
                    const lastSchedule = schedules[schedules.length - 1];
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: { paymentScheduleId: lastSchedule.id }
                    });
                    totalFixedCount++;
                }
            }
        }

        console.log(`\n🎉 Fixed ${totalFixedCount} payment schedule links`);

    } catch (error) {
        console.error('❌ Error fixing payment schedule links:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixPaymentScheduleLinks().catch(console.error);
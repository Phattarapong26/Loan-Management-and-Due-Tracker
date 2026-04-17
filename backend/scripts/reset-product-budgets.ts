import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetBudgets() {
  try {
    console.log('🔄 กำลัง Reset งบประมาณทั้งหมด...\n');

    // 1. ลบ budget consumption records ทั้งหมด
    const deletedConsumptions = await prisma.budget_consumption.deleteMany({});
    console.log(`✅ ลบ budget consumption: ${deletedConsumptions.count} รายการ`);

    // 2. ลบ product budgets ทั้งหมด
    const deletedBudgets = await prisma.product_budgets.deleteMany({});
    console.log(`✅ ลบ product budgets: ${deletedBudgets.count} รายการ`);

    console.log('\n✅ Reset งบประมาณเรียบร้อย!');
    console.log('📝 ตอนนี้คุณสามารถสร้างงบประมาณใหม่ได้แล้ว');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetBudgets();

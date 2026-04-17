import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBudgets() {
  try {
    console.log('🔧 กำลังแก้ไขการคำนวณงบประมาณ...\n');

    const budgets = await prisma.product_budgets.findMany({
      select: {
        id: true,
        product_name: true,
        fiscal_year: true,
        total_budget_amount: true,
        committed_amount: true,
        disbursed_amount: true,
        available_amount: true,
      }
    });

    for (const budget of budgets) {
      const totalBudget = Number(budget.total_budget_amount);
      const committed = Number(budget.committed_amount || 0);
      const disbursed = Number(budget.disbursed_amount || 0);
      
      // คำนวณ available ที่ถูกต้อง
      const correctAvailable = totalBudget - committed - disbursed;
      
      // คำนวณ utilization rate
      const totalUsed = committed + disbursed;
      const utilizationRate = (totalUsed / totalBudget) * 100;

      console.log(`📊 ${budget.product_name} (${budget.fiscal_year})`);
      console.log(`   Total: ฿${totalBudget.toLocaleString()}`);
      console.log(`   Committed: ฿${committed.toLocaleString()}`);
      console.log(`   Disbursed: ฿${disbursed.toLocaleString()}`);
      console.log(`   Available (เดิม): ฿${Number(budget.available_amount).toLocaleString()}`);
      console.log(`   Available (ถูกต้อง): ฿${correctAvailable.toLocaleString()}`);
      console.log(`   Utilization: ${utilizationRate.toFixed(2)}%`);

      if (Number(budget.available_amount) !== correctAvailable) {
        console.log(`   ⚠️  ต้องแก้ไข!\n`);
        
        await prisma.product_budgets.update({
          where: { id: budget.id },
          data: {
            available_amount: correctAvailable,
            utilization_rate: utilizationRate,
            updated_at: new Date(),
          }
        });
        
        console.log(`   ✅ แก้ไขเรียบร้อย\n`);
      } else {
        console.log(`   ✓ ถูกต้องแล้ว\n`);
      }
    }

    console.log('✅ เสร็จสิ้น!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBudgets();

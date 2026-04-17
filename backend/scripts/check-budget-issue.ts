import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    // Check approved loans
    const approvedLoans = await prisma.loan.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        contract_number: true,
        principal: true,
        status: true,
        loanProductId: true,
        customer: {
          select: { businessName: true }
        }
      }
    });

    console.log('=== Approved Loans (หักงบประมาณแล้ว) ===');
    console.log('จำนวน:', approvedLoans.length);
    if (approvedLoans.length > 0) {
      approvedLoans.forEach(loan => {
        console.log(`- ${loan.contract_number}: ${loan.customer.businessName} - ฿${Number(loan.principal).toLocaleString()}`);
      });
    }

    // Check product budgets
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

    console.log('\n=== Product Budgets ===');
    budgets.forEach(b => {
      console.log(`${b.product_name} (${b.fiscal_year}):`);
      console.log(`  Total: ฿${Number(b.total_budget_amount).toLocaleString()}`);
      console.log(`  Committed: ฿${Number(b.committed_amount).toLocaleString()}`);
      console.log(`  Disbursed: ฿${Number(b.disbursed_amount).toLocaleString()}`);
      console.log(`  Available: ฿${Number(b.available_amount).toLocaleString()}`);
    });

    // Check budget consumption
    const consumptions = await prisma.budget_consumption.findMany({
      select: {
        id: true,
        consumption_type: true,
        status: true,
        requested_amount: true,
        approved_amount: true,
        loans: {
          select: {
            contract_number: true,
            status: true,
          }
        }
      }
    });

    console.log('\n=== Budget Consumption Records ===');
    console.log('จำนวน:', consumptions.length);
    consumptions.forEach(c => {
      console.log(`- ${c.loans.contract_number} (${c.loans.status}): ${c.consumption_type} - ${c.status} - ฿${Number(c.approved_amount).toLocaleString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const products = await p.loanProduct.findMany({ select: { id: true, productCode: true } });
  const productIds = products.map(pr => pr.id);
  const fiscalYear = 2026;
  const quarter = 2;

  const budgets = await p.product_budgets.findMany({
    where: { product_id: { in: productIds }, fiscal_year: fiscalYear, quarter: quarter },
    select: {
      id: true, product_id: true, product_code: true, fiscal_year: true, quarter: true,
      total_budget_amount: true, available_amount: true, committed_amount: true,
      disbursed_amount: true, budget_status: true
    }
  });

  console.log('Query result:', budgets.length, 'budgets for FY' + fiscalYear + ' Q' + quarter);
  budgets.forEach(b => console.log('  ' + b.product_code + ' | status: ' + b.budget_status + ' | available: ' + Number(b.available_amount).toLocaleString()));

  // Build map like the service does
  const budgetMap = {};
  for (const b of budgets) budgetMap[b.product_id] = b;
  for (const id of productIds) {
    if (!budgetMap[id]) budgetMap[id] = null;
  }

  console.log('\nBudget map (what frontend receives):');
  products.forEach(prod => {
    const b = budgetMap[prod.id];
    if (b) {
      console.log('  ' + prod.productCode + ': HAS BUDGET (available=' + Number(b.available_amount).toLocaleString() + ', status=' + b.budget_status + ')');
    } else {
      console.log('  ' + prod.productCode + ': NULL - no budget found');
    }
  });

  // Check what frontend checks: hasBudget = budget && Number(budget.available_amount || 0) > 0
  console.log('\nFrontend hasBudget check:');
  products.forEach(prod => {
    const b = budgetMap[prod.id];
    const hasBudget = b && Number(b.available_amount || 0) > 0;
    console.log('  ' + prod.productCode + ': hasBudget=' + hasBudget);
  });
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());

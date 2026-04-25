const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const budgets = await p.product_budgets.findMany({
    include: { loan_products: { select: { productCode: true, productName: true } } },
    orderBy: { fiscal_year: 'asc' }
  });
  console.log('Total budgets:', budgets.length);
  budgets.forEach(b => {
    console.log(
      `  ${b.loan_products?.productCode} | FY${b.fiscal_year} Q${b.quarter}`,
      `| total: ${Number(b.total_budget_amount).toLocaleString()}`,
      `| available: ${Number(b.available_amount).toLocaleString()}`,
      `| status: ${b.status}`
    );
  });

  const products = await p.loanProduct.findMany({ select: { id: true, productCode: true } });
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  console.log(`\nCurrent: FY${year} Q${quarter}`);
  for (const prod of products) {
    const budget = await p.product_budgets.findFirst({
      where: { product_id: prod.id, fiscal_year: year, quarter, status: 'ACTIVE' }
    });
    console.log(`  ${prod.productCode}: ${budget ? `available=${Number(budget.available_amount).toLocaleString()}` : 'NOT FOUND for current period'}`);
  }
}
main().catch(e => console.error(e.message)).finally(() => p.$disconnect());

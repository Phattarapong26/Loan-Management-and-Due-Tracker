import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Dropping all existing constraints...\n');
  
  const constraints = [
    // Loans
    'chk_loans_outstanding_balance_positive',
    'chk_loans_principal_positive',
    'chk_loans_current_principal_positive',
    'chk_loans_interest_rate_range',
    'chk_loans_term_months_positive',
    'chk_loans_accumulated_interest_positive',
    'chk_loans_total_disbursed_positive',
    'chk_loans_total_disbursed_max',
    // Product Budgets
    'chk_product_budgets_total_positive',
    'chk_product_budgets_available_positive',
    'chk_product_budgets_committed_positive',
    'chk_product_budgets_disbursed_positive',
    'chk_product_budgets_total_balance',
    // Payments
    'chk_payments_amount_positive',
    'chk_payments_date_not_future',
    'chk_payments_penalty_positive',
    // Payment Schedules
    'chk_payment_schedules_principal_positive',
    'chk_payment_schedules_interest_positive',
    'chk_payment_schedules_total_positive',
    'chk_payment_schedules_total_sum',
    'chk_payment_schedules_remaining_positive',
    'chk_payment_schedules_penalty_positive',
    // Loan Disbursements
    'chk_loan_disbursements_amount_positive',
    // Budget Consumption
    'chk_budget_consumption_requested_positive',
    'chk_budget_consumption_approved_positive',
    'chk_budget_consumption_disbursed_positive',
    'chk_budget_consumption_approved_max',
    'chk_budget_consumption_disbursed_max',
  ];
  
  for (const constraint of constraints) {
    try {
      const table = constraint.split('_')[1];
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint}`);
      console.log(`✓ Dropped ${constraint}`);
    } catch (e: any) {
      console.log(`- ${constraint} (not found)`);
    }
  }
  
  console.log('\n✅ All constraints dropped');
  await prisma.$disconnect();
}

main();

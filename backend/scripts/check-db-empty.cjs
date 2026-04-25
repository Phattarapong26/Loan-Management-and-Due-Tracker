const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const counts = await Promise.all([
    p.user.count().then(n => ['users', n]),
    p.branch.count().then(n => ['branches', n]),
    p.customer.count().then(n => ['customers', n]),
    p.loan.count().then(n => ['loans', n]),
    p.loanProduct.count().then(n => ['loanProducts', n]),
    p.paymentSchedule.count().then(n => ['paymentSchedules', n]),
    p.payment.count().then(n => ['payments', n]),
    p.paymentReceipt.count().then(n => ['paymentReceipts', n]),
    p.nextPaymentInvoice.count().then(n => ['invoices', n]),
    p.loanDisbursement.count().then(n => ['disbursements', n]),
  ]);
  let allEmpty = true;
  counts.forEach(([table, count]) => {
    const status = count === 0 ? '✅ empty' : `⚠️  ${count} rows`;
    console.log(`  ${table.padEnd(20)}: ${status}`);
    if (count > 0) allEmpty = false;
  });
  console.log(allEmpty ? '\n✅ Database is completely empty' : '\n⚠️  Database has existing data');
}
main().catch(e => console.error(e.message)).finally(() => p.$disconnect());

import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const [
    totalSchedules,
    schedulesWithTimeline,
    totalInvoices,
    schedulesWithInvoice,
  ] = await Promise.all([
    p.paymentSchedule.count(),
    p.paymentSchedule.count({ where: { paymentTimelineEvents: { some: {} } } }),
    p.nextPaymentInvoice.count(),
    p.paymentSchedule.count({ where: { nextPaymentInvoices: { some: {} } } }),
  ]);

  console.log({
    schedules: {
      total: totalSchedules,
      withTimeline: schedulesWithTimeline,
      missingTimeline: totalSchedules - schedulesWithTimeline,
    },
    invoices: {
      total: totalInvoices,
      schedulesWithInvoice,
      schedulesWithoutInvoice: totalSchedules - schedulesWithInvoice,
    },
  });
}
main().finally(() => p.$disconnect());

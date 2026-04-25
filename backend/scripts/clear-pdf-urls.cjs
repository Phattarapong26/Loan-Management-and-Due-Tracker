/**
 * clear-pdf-urls.cjs
 * Clears disbursementPdfUrl from all loans' productConfig
 * so the backfill job will regenerate all contract PDFs.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Count loans with PDF URLs
  const loans = await p.loan.findMany({
    where: { status: { in: ['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'] } },
    select: { id: true, productConfig: true, contract_number: true }
  });

  const withPdf = loans.filter(l => {
    const cfg = l.productConfig;
    return cfg && typeof cfg === 'object' && cfg.disbursementPdfUrl;
  });

  console.log(`Total loans: ${loans.length}`);
  console.log(`Loans with PDF URL: ${withPdf.length}`);
  console.log(`Loans without PDF URL: ${loans.length - withPdf.length}`);

  if (withPdf.length === 0) {
    console.log('\nNo PDFs to clear — backfill will generate all contracts');
    return;
  }

  // Clear disbursementPdfUrl from productConfig
  let cleared = 0;
  for (const loan of withPdf) {
    const cfg = loan.productConfig;
    if (cfg && typeof cfg === 'object') {
      const newCfg = { ...cfg };
      delete newCfg.disbursementPdfUrl;
      await p.loan.update({
        where: { id: loan.id },
        data: { productConfig: newCfg }
      });
      cleared++;
      console.log(`  ✅ Cleared PDF URL for ${loan.contract_number || loan.id.substring(0, 8)}`);
    }
  }

  console.log(`\n✅ Cleared ${cleared} PDF URLs`);
  console.log('Now run backfill to regenerate all contract PDFs');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); }).finally(() => p.$disconnect());

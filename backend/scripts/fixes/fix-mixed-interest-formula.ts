import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMixedInterestFormula() {
  console.log('🔧 Fixing MIXED interest rate formulas...');

  // Find all MIXED type loan products
  const mixedProducts = await prisma.loanProduct.findMany({
    where: {
      interestRateType: 'MIXED'
    }
  });

  console.log(`Found ${mixedProducts.length} MIXED products`);

  for (const product of mixedProducts) {
    if (product.interestRateFormula) {
      // Extract only the formula part (e.g., "MRR + 1.5%" from "ปีที่ 4+: MRR + 1.5%")
      const match = product.interestRateFormula.match(/(MLR|MRR)\s*\+\s*[\d.]+%/i);
      
      if (match) {
        const cleanFormula = match[0];
        console.log(`Updating ${product.productCode}: "${product.interestRateFormula}" -> "${cleanFormula}"`);
        
        await prisma.loanProduct.update({
          where: { id: product.id },
          data: {
            interestRateFormula: cleanFormula
          }
        });
      }
    }
  }

  console.log('✅ Fixed all MIXED interest rate formulas');
}

fixMixedInterestFormula()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

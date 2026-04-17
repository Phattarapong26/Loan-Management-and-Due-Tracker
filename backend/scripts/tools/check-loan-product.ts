#!/usr/bin/env tsx
/**
 * Check specific loan product details
 */

import { prisma } from '../../src/core/config/database.config';

async function checkLoanProduct() {
    try {
        const product = await prisma.loanProduct.findFirst({
            where: {
                productName: {
                    contains: 'ดิจิทัล',
                    mode: 'insensitive'
                }
            },
            include: {
                yearInterestTiers: true,
                interestRateTiers: true,
            }
        });

        if (!product) {
            console.log('❌ Product not found');
            return;
        }

        console.log('📋 Product Details:');
        console.log(JSON.stringify(product, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLoanProduct();

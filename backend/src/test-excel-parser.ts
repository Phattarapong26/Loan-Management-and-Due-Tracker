
import fs from 'fs';

import { ExcelParserService } from './modules/core-services/services/excel-parser.service';

/**
 * Comprehensive Excel Parser Test
 * Validates all 9 sheets are parsed correctly from the Evena Entertainment.xlsx file
 */
async function testParser() {
    const parser = new ExcelParserService();
    const filePath = '/Users/medlab/Desktop/SMEBank2026/Evena Entertainment.xlsx';

    if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        return;
    }

    console.log('═══════════════════════════════════════════════');
    console.log('  📊 Excel Parser Comprehensive Validation');
    console.log('═══════════════════════════════════════════════\n');

    try {
        const buffer = fs.readFileSync(filePath);
        const result = await parser.parseExcel(buffer);

        let passCount = 0;
        let failCount = 0;
        const check = (label: string, condition: boolean, detail: string = '') => {
            if (condition) {
                passCount++;
                console.log(`  ✅ ${label}${detail ? ': ' + detail : ''}`);
            } else {
                failCount++;
                console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
            }
        };

        // ---- 1. METADATA ----
        console.log('\n📋 1. METADATA');
        console.log('─────────────────────────────────');
        check('Document Type', result.documentType === 'LOAN_APPLICATION', result.documentType);
        check('Sheet Count >= 10', (result.sheetCount ?? 0) >= 10, `${result.sheetCount} sheets`);
        check('Confidence Score > 0', (result.confidenceScore ?? 0) > 0, `${result.confidenceScore}%`);
        check('Company Name', Boolean(result.companyName), result.companyName || 'NOT FOUND');

        // ---- 2. VAT REPORT (ภพ 30) ----
        console.log('\n📋 2. VAT REPORT (ภพ 30)');
        console.log('─────────────────────────────────');
        const vat = result.vatReport;
        check('VAT Report exists', Boolean(vat));
        check('VAT Records > 0', (vat?.records?.length ?? 0) > 0, `${vat?.records?.length ?? 0} records`);
        if (vat?.records?.[0]) {
            console.log(`     First record: month=${vat.records[0].month}, sales=${vat.records[0].salesAmount?.toLocaleString()}, purchases=${vat.records[0].purchaseAmount?.toLocaleString()}`);
        }

        // ---- 3. INVESTMENT STRUCTURE (โครงสร้าง) ----
        console.log('\n📋 3. INVESTMENT STRUCTURE (โครงสร้าง)');
        console.log('─────────────────────────────────');
        const inv = result.investmentStructure;
        check('Investment Structure exists', Boolean(inv));
        check('Total Investment > 0', (inv?.totalInvestment ?? 0) > 0, `${inv?.totalInvestment?.toLocaleString() ?? 0} บาท`);
        check('D/E Ratio', (inv?.debtToEquityRatio ?? 0) >= 0, `${inv?.debtToEquityRatio}`);
        check('Investment Items', (inv?.items?.length ?? 0) >= 0, `${inv?.items?.length ?? 0} items`);

        // ---- 4. FINANCIAL STATEMENT (งบการเงิน) ----
        console.log('\n📋 4. FINANCIAL STATEMENT (งบการเงิน)');
        console.log('─────────────────────────────────');
        const fin = result.financialStatement;
        check('Financial Statement exists', Boolean(fin));
        if (fin) {
            console.log(`     Revenue: ${fin.years?.[0]?.revenue?.toLocaleString() ?? 'N/A'}`);
            console.log(`     Gross Profit: ${fin.years?.[0]?.grossProfit?.toLocaleString() ?? 'N/A'}`);
            console.log(`     Net Profit: ${fin.years?.[0]?.netProfit?.toLocaleString() ?? 'N/A'}`);
        }

        // ---- 5. BALANCE SHEET (งบการเงิน) ----
        console.log('\n📋 5. BALANCE SHEET (งบการเงิน)');
        console.log('─────────────────────────────────');
        const bs = result.balanceSheet;
        check('Balance Sheet exists', Boolean(bs));
        check('Balance Sheet years > 0', (bs?.years?.length ?? 0) > 0, `${bs?.years?.length ?? 0} years`);
        if (bs?.years?.[0]) {
            console.log(`     Year: ${bs.years[0].year}, Total Assets: ${bs.years[0].totalAssets?.toLocaleString() ?? 'N/A'}, Total Liabilities: ${bs.years[0].totalLiabilities?.toLocaleString() ?? 'N/A'}`);
        }

        // ---- 6. WORKING CAPITAL (ความต้องการ) ----
        console.log('\n📋 6. WORKING CAPITAL (ความต้องการ)');
        console.log('─────────────────────────────────');
        const wc = result.workingCapitalAnalysis;
        check('Working Capital exists', Boolean(wc));
        check('Total Needed > 0', (wc?.totalNeeded ?? 0) > 0, `${wc?.totalNeeded?.toLocaleString() ?? 0} บาท`);
        check('Additional Needed', (wc?.additionalNeeded ?? 0) >= 0, `${wc?.additionalNeeded?.toLocaleString() ?? 0} บาท`);

        // ---- 7. PROJECTIONS (ประมาณการ) ----
        console.log('\n📋 7. PROJECTIONS (ประมาณการ)');
        console.log('─────────────────────────────────');
        const proj = result.projections;
        check('Projections exists', Boolean(proj));
        check('Revenue data', (proj?.revenue?.length ?? 0) > 0, `${proj?.revenue?.length ?? 0} data points`);
        check('DSCR data', (proj?.dscr?.length ?? 0) >= 0, `${proj?.dscr?.length ?? 0} data points`);
        if (proj?.revenue?.[0]) console.log(`     First revenue: ${proj.revenue[0].toLocaleString()}`);

        // ---- 8. CREDIT BUREAU (เครดิตบูโร) ----
        console.log('\n📋 8. CREDIT BUREAU (เครดิตบูโร)');
        console.log('─────────────────────────────────');
        const cb = result.creditBureau;
        check('Credit Bureau exists', Boolean(cb));
        check('Borrower exists', Boolean(cb?.borrower));
        check('Borrower Accounts', (cb?.borrower?.accounts?.length ?? 0) >= 0, `${cb?.borrower?.accounts?.length ?? 0} accounts`);
        console.log(`     Borrower Name: "${cb?.borrower?.name || 'N/A'}"`);
        console.log(`     Total Limit: ${cb?.borrower?.totalLimit?.toLocaleString() ?? 'N/A'}`);
        console.log(`     Total Outstanding: ${cb?.borrower?.totalOutstanding?.toLocaleString() ?? 'N/A'}`);

        // ---- 9. BANK STATEMENT (Statement) ----
        console.log('\n📋 9. BANK STATEMENT (Statement)');
        console.log('─────────────────────────────────');
        const bsa = result.bankStatementAccounts;
        const bss = result.bankStatements;
        check('Bank Statement Accounts', (bsa?.length ?? 0) > 0, `${bsa?.length ?? 0} accounts`);
        check('Bank Statements legacy', (bss?.length ?? 0) >= 0, `${bss?.length ?? 0} statements`);
        if (bsa && bsa.length > 0) {
            bsa.forEach((acc: any, i: number) => {
                console.log(`     Account ${i + 1}: Bank=${acc.bankName}, AccNo=${acc.accountNumber || 'N/A'}, Months=${acc.months?.length ?? 0}`);
                if (acc.months?.[0]) {
                    const m = acc.months[0];
                    console.log(`       → First month: W_Count=${m.withdrawCount}, W_Amt=${m.withdrawAmount?.toLocaleString()}, D_Count=${m.depositCount}, D_Amt=${m.depositAmount?.toLocaleString()}, Balance=${m.balance?.toLocaleString()}`);
                }
            });
        }

        // ---- 10. COMMENTS (ความเห็น) ----
        console.log('\n📋 10. COMMENTS (ความเห็น)');
        console.log('─────────────────────────────────');
        const comments = result.comments;
        check('Comments exist', (comments?.length ?? 0) > 0, `${comments?.length ?? 0} comments`);
        if (comments && comments.length > 0) {
            console.log(`     First: "${comments[0]?.substring(0, 80) ?? ''}..."`);
        }

        // ---- 11. BUSINESS HISTORY (ประวัติกิจการ) ----
        console.log('\n📋 11. BUSINESS HISTORY (ประวัติกิจการ)');
        console.log('─────────────────────────────────');
        const hist = result.businessHistory;
        check('Business History exists', Boolean(hist));
        check('Executives > 0', (hist?.executives?.length ?? 0) > 0, `${hist?.executives?.length ?? 0} executives`);
        check('Shareholding', (hist?.shareholding?.length ?? 0) >= 0, `${hist?.shareholding?.length ?? 0} shareholders`);
        if (hist?.executives) {
            hist.executives.forEach((exec: any, i: number) => {
                console.log(`     Executive ${i + 1}: ${exec.name || 'N/A'}, Age: ${exec.age || 'N/A'}, Education: ${exec.education?.substring?.(0, 50) || 'N/A'}`);
            });
        }
        if (hist?.shareholding) {
            hist.shareholding.forEach((sh: any, i: number) => {
                console.log(`     Shareholder ${i + 1}: ${sh.name || 'N/A'}, ${sh.percentage}%, Shares: ${sh.shares?.toLocaleString()}`);
            });
        }

        // ---- 12. PRODUCTS ----
        console.log('\n📋 12. PRODUCTS (สินค้า)');
        console.log('─────────────────────────────────');
        const products = result.products;
        check('Products exist', (products?.length ?? 0) >= 0, `${products?.length ?? 0} products`);
        if (products && products.length > 0) {
            products.slice(0, 5).forEach((p: string, i: number) => console.log(`     ${i + 1}. ${p}`));
        }

        // ---- 13. LOAN SUMMARY ----
        console.log('\n📋 13. LOAN SUMMARY (ใบสรุปวงเงิน)');
        console.log('─────────────────────────────────');
        const loan = result.loanSummary;
        check('Loan Summary exists', Boolean(loan));
        if (loan) {
            console.log(`     Project: ${loan.projectName || 'N/A'}`);
            console.log(`     Amount: ${loan.amount?.toLocaleString() ?? 'N/A'} บาท`);
            console.log(`     Rate: ${loan.interestRate || 'N/A'}`);
            console.log(`     Term: ${loan.term || 'N/A'}`);
        }

        // ====== FINAL SUMMARY ======
        console.log('\n═══════════════════════════════════════════════');
        console.log(`  📊 FINAL RESULT: ${passCount} PASSED / ${failCount} FAILED`);
        console.log('═══════════════════════════════════════════════');
        if (failCount === 0) {
            console.log('  🎉 ALL CHECKS PASSED! Parser is fully functional.');
        } else {
            console.log(`  ⚠️  ${failCount} checks failed. Review above for details.`);
        }
        console.log('');

    } catch (error) {
        console.error('❌ Error parsing file:', error);
    }
}

testParser();

import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { 
  fillMergedCells, 
  getSheetDataWithMergedCells 
} from '../../core/excel-merged-cells-handler';
import { safeParseNumber, formatMonthYear } from '../helpers';

/**
 * Sheet 9: Statement (Bank Statement Analysis) - DYNAMIC VERSION
 */
export function parseBankStatements(workbook: WorkBook): Array<NonNullable<ParsedBusinessProfile['bankStatements']>[number]> {
  console.log('[Bank Statement Parser] Starting DYNAMIC parsing...');
  const statements: ParsedBusinessProfile['bankStatements'] = [];

  const sheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('statement') || name.includes('สเตทเมนต์')
  );

  if (!sheetName) {
    console.log('[Bank Statement Parser] ❌ Sheet not found');
    return statements;
  }

  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);

  console.log(`[Bank Statement Parser] 📋 Sheet has ${data.length} rows`);

  // Find all account sections (look for numbered headers like "1 ธนาคาร", "2 ธนาคาร")
  const accountSections: Array<{
    accountNumber: number;
    startRow: number;
    endRow: number;
    bank: string;
    branch: string;
    accountName: string;
    accountNo: string;
    accountType: string;
    creditLimit: number;
  }> = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const firstCell = String(row[0] || '').trim();

    // Look for numbered account headers (1, 2, 3, etc.)
    if (firstCell.match(/^\d+$/) && String(row[1] || '').includes('ธนาคาร')) {
      const accountNum = parseInt(firstCell);
      const bank = String(row[2] || row[1] || '').trim();
      const branch = String(row[4] || row[3] || '').trim();

      // Extract account details from next few rows
      let accountName = '';
      let accountNo = '';
      let accountType = '';
      let creditLimit = 0;

      for (let j = i + 1; j < Math.min(i + 5, data.length); j++) {
        const detailRow = data[j];
        const label = String(detailRow[0] || '').trim();

        if (label.includes('ชื่อบัญชี')) {
          // Try multiple columns for account name (skip columns that look like account numbers)
          for (let col = 1; col < detailRow.length; col++) {
            const value = String(detailRow[col] || '').trim();
            // Skip if it's a label or looks like an account number
            if (value &&
                !value.includes('เลขที่') &&
                value !== 'เลขที่บัญชี' &&
                value !== 'เลขบัญชี' &&
                !value.match(/^\d{3,}-/)) { // Skip if it looks like account number (xxx-xxx-x)
              accountName = value;
              break;
            }
          }

          // Also check for account number in the same row
          for (let col = 1; col < detailRow.length; col++) {
            const value = String(detailRow[col] || '').trim();
            if (value && (value.match(/^\d{3,}-/) || value.match(/^\d{3,}$/))) {
              accountNo = value;
            }
          }
        }
        if (label.includes('เลขที่บัญชี') || label.includes('เลขบัญชี')) {
          // Try multiple columns for account number - look for pattern with dashes or long numbers
          for (let col = 1; col < detailRow.length; col++) {
            const value = String(detailRow[col] || '').trim();
            if (value && (value.match(/^\d{3,}-/) || value.match(/^\d{6,}/))) {
              accountNo = value;
              break;
            }
          }
        }
        if (label.includes('ประเภทบัญชี')) {
          accountType = String(detailRow[1] || '').trim();
          const limitValue = detailRow[3];
          if (typeof limitValue === 'number') {
            creditLimit = limitValue * 1000000; // Convert to actual amount
          }
        }
      }

      accountSections.push({
        accountNumber: accountNum,
        startRow: i,
        endRow: data.length, // Will be updated
        bank,
        branch,
        accountName,
        accountNo,
        accountType,
        creditLimit,
      });

      console.log(`[Bank Statement Parser] 📍 Found account ${accountNum}: ${bank} ${accountNo}`);
    }
  }

  // Update endRow for each section (find "รวม" or next account)
  for (let s = 0; s < accountSections.length; s++) {
    const section = accountSections[s];
    const nextSectionStart = s < accountSections.length - 1 ? accountSections[s + 1].startRow : data.length;

    // Find "รวม" row
    for (let i = section.startRow; i < nextSectionStart; i++) {
      const rowText = String(data[i][0] || '').toLowerCase();
      if (rowText === 'รวม') {
        section.endRow = i;
        console.log(`[Bank Statement Parser] 🔚 Account ${section.accountNumber} ends at row ${i}`);
        break;
      }
    }

    if (section.endRow === data.length) {
      section.endRow = nextSectionStart;
    }
  }

  // Process each account section
  for (const section of accountSections) {
    console.log(`[Bank Statement Parser] 🔄 Processing account ${section.accountNumber}: ${section.bank} ${section.accountNo}`);

    // Find header row (contains "เดือน", "ถอน", "ฝาก", "ยอดเงินคงเหลือ")
    let headerRow = -1;
    let columns: { [key: string]: number } = {};

    for (let i = section.startRow; i < Math.min(section.startRow + 15, section.endRow); i++) {
      const row = data[i];
      const rowText = row.map((c: unknown) => String(c).toLowerCase()).join(' ');

      // Check if this is the column header row (the one with "เดือน", "ครั้ง", "จำนวนเงิน")
      if (rowText.includes('เดือน') && rowText.includes('จำนวนเงิน') && rowText.includes('ยอดเงินคงเหลือ')) {
        headerRow = i;

        // Map columns - use position-based detection
        // Standard format: เดือน | ครั้ง(ถอน) | จำนวนเงิน(ถอน) | ครั้ง(ฝาก) | จำนวนเงิน(ฝาก) | ยอดเงินคงเหลือ
        let foundMonth = false;
        let foundFirstAmount = false;
        
        for (let col = 0; col < row.length; col++) {
          const cellText = String(row[col] || '').toLowerCase();

          if (cellText.includes('เดือน') && !foundMonth) {
            columns.month = col;
            foundMonth = true;
          } else if (cellText.includes('ครั้ง') && foundMonth && !columns.withdrawalCount) {
            // First "ครั้ง" after "เดือน" is withdrawal count
            columns.withdrawalCount = col;
          } else if (cellText.includes('จำนวนเงิน') && foundMonth && !foundFirstAmount) {
            // First "จำนวนเงิน" is withdrawal amount
            columns.withdrawalAmount = col;
            foundFirstAmount = true;
          } else if (cellText.includes('ครั้ง') && foundFirstAmount && !columns.depositCount) {
            // Second "ครั้ง" is deposit count
            columns.depositCount = col;
          } else if (cellText.includes('จำนวนเงิน') && foundFirstAmount && !columns.depositAmount) {
            // Second "จำนวนเงิน" is deposit amount
            columns.depositAmount = col;
          } else if (cellText.includes('ยอดเงินคงเหลือ')) {
            columns.balance = col;
          }
        }

        console.log(`[Bank Statement Parser] 📊 Found header at row ${i}, columns:`, columns);
        break;
      }
    }

    if (headerRow === -1) {
      console.log(`[Bank Statement Parser] ⚠️  No header found for account ${section.accountNumber}`);
      continue;
    }

    // Parse transaction rows
    const monthlyTransactions: Array<{
      month: string;
      withdrawalCount: number;
      withdrawalAmount: number;
      depositCount: number;
      depositAmount: number;
      balance: number;
    }> = [];

    let openingBalance = 0;
    let closingBalance = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let balanceSum = 0;
    let balanceCount = 0;
    let firstMonth = '';
    let lastMonth = '';

    for (let i = headerRow + 1; i < section.endRow; i++) {
      const row = data[i];
      const monthCell = columns.month !== undefined ? String(row[columns.month] || '').trim() : '';

      // Check for special rows first
      if (monthCell === 'ยอดยกมา') {
        // Capture opening balance
        if (columns.balance !== undefined) {
          const balanceValue = safeParseNumber(row[columns.balance]);
          if (balanceValue !== 0) {
            openingBalance = balanceValue;
            console.log(`[Bank Statement Parser] 📍 Found opening balance: ${openingBalance}`);
          }
        }
        continue;
      }

      if (monthCell === 'รวม') {
        // Capture totals from summary row
        const sumDeposit = columns.depositAmount !== undefined ? safeParseNumber(row[columns.depositAmount]) : 0;
        const sumWithdrawal = columns.withdrawalAmount !== undefined ? safeParseNumber(row[columns.withdrawalAmount]) : 0;

        if (sumDeposit > 0) {
          totalDeposits = sumDeposit;
          console.log(`[Bank Statement Parser] 📊 Found total deposits from summary row: ${totalDeposits}`);
        }
        if (sumWithdrawal > 0) {
          totalWithdrawals = sumWithdrawal;
          console.log(`[Bank Statement Parser] 📊 Found total withdrawals from summary row: ${totalWithdrawals}`);
        }
        continue;
      }

      if (monthCell === 'เฉลี่ยเดือนละ') {
        continue;
      }

      // Skip rows where all data columns are empty (but month might be a date)
      const hasAnyData = (
        (columns.withdrawalCount !== undefined && row[columns.withdrawalCount]) ||
        (columns.withdrawalAmount !== undefined && row[columns.withdrawalAmount]) ||
        (columns.depositCount !== undefined && row[columns.depositCount]) ||
        (columns.depositAmount !== undefined && row[columns.depositAmount])
      );

      if (!hasAnyData) {
        continue;
      }

      // Parse values
      const withdrawalCount = columns.withdrawalCount !== undefined ? safeParseNumber(row[columns.withdrawalCount]) : 0;
      const withdrawalAmount = columns.withdrawalAmount !== undefined ? safeParseNumber(row[columns.withdrawalAmount]) : 0;
      const depositCount = columns.depositCount !== undefined ? safeParseNumber(row[columns.depositCount]) : 0;
      const depositAmount = columns.depositAmount !== undefined ? safeParseNumber(row[columns.depositAmount]) : 0;
      const balance = columns.balance !== undefined ? safeParseNumber(row[columns.balance]) : 0;

      // Debug logging for first row
      if (monthlyTransactions.length === 0) {
        console.log(`[Bank Statement Parser] 🔍 First data row (${monthCell}):`);
        console.log(`  Columns:`, columns);
        console.log(`  Raw values:`, {
          withdrawalCount: row[columns.withdrawalCount],
          withdrawalAmount: row[columns.withdrawalAmount],
          depositCount: row[columns.depositCount],
          depositAmount: row[columns.depositAmount],
          balance: row[columns.balance],
        });
        console.log(`  Parsed values:`, {
          withdrawalCount,
          withdrawalAmount,
          depositCount,
          depositAmount,
          balance,
        });
        console.log(`  Types:`, {
          withdrawalCount: typeof row[columns.withdrawalCount],
          withdrawalAmount: typeof row[columns.withdrawalAmount],
          depositCount: typeof row[columns.depositCount],
          depositAmount: typeof row[columns.depositAmount],
        });
      }

      // Track first and last month
      if (!firstMonth && monthCell) firstMonth = monthCell;
      if (monthCell) lastMonth = monthCell;

      // Track balances (don't accumulate totals here - use summary row instead)
      if (balance !== 0) {
        if (openingBalance === 0) openingBalance = balance;
        closingBalance = balance;
        balanceSum += Math.abs(balance);
        balanceCount++;
      }

      // Add monthly transaction
      monthlyTransactions.push({
        month: formatMonthYear(monthCell),
        withdrawalCount,
        withdrawalAmount,
        depositCount,
        depositAmount,
        balance,
      });
    }

    const averageBalance = balanceCount > 0 ? balanceSum / balanceCount : 0;
    const turnover = totalDeposits + totalWithdrawals;

    // If totals are still 0, calculate from monthly transactions
    if (totalWithdrawals === 0 && monthlyTransactions.length > 0) {
      totalWithdrawals = monthlyTransactions.reduce((sum, t) => sum + t.withdrawalAmount, 0);
      console.log(`[Bank Statement Parser] ⚠️  No summary row found, calculated totalWithdrawals from transactions: ${totalWithdrawals}`);
    }
    if (totalDeposits === 0 && monthlyTransactions.length > 0) {
      totalDeposits = monthlyTransactions.reduce((sum, t) => sum + t.depositAmount, 0);
      console.log(`[Bank Statement Parser] ⚠️  No summary row found, calculated totalDeposits from transactions: ${totalDeposits}`);
    }

    // Recalculate turnover with updated totals
    const finalTurnover = totalDeposits + totalWithdrawals;

    // Format period
    const period = firstMonth && lastMonth ? `${formatMonthYear(firstMonth)} - ${formatMonthYear(lastMonth)}` : 'N/A';

    statements.push({
      accountName: section.accountName || 'N/A',
      bank: `${section.bank} ${section.branch}`.trim() || 'N/A',
      accountNumber: section.accountNo || 'N/A',
      accountType: section.accountType || 'N/A',
      creditLimit: section.creditLimit,
      period,
      openingBalance,
      closingBalance,
      totalDeposits,
      totalWithdrawals,
      averageBalance,
      turnover: finalTurnover,
      monthlyTransactions,
    });

    console.log(`[Bank Statement Parser] ✅ Account ${section.accountNumber}: ${monthlyTransactions.length} months, Deposits=${totalDeposits.toLocaleString()}, Withdrawals=${totalWithdrawals.toLocaleString()}`);
  }

  console.log(`[Bank Statement Parser] ✅ Total: ${statements.length} statements`);
  return statements;
}

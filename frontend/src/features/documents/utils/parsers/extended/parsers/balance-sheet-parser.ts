/**
 * Balance Sheet Parser (Sheet 5: งบการเงิน - Balance Sheet Section)
 */

import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { fillMergedCells, getSheetDataWithMergedCells } from '../../core/excel-merged-cells-handler';
import { detectTablesInSheet, extractTableData } from '../../core/excel-table-detector';
import { 
  safeParseNumber, 
  findYearColumns, 
  verifyYearColumns,
  PARSING_CONSTANTS 
} from '../helpers';

export function parseBalanceSheets(workbook: WorkBook): Array<NonNullable<ParsedBusinessProfile['balanceSheets']>[number]> {
  console.log('[Balance Sheet Parser] Starting DYNAMIC parsing...');
  const balanceSheets: ParsedBusinessProfile['balanceSheets'] = [];
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('งบการเงิน') || name.toLowerCase().includes('financial')
  );
  
  if (!sheetName) {
    console.log('[Balance Sheet Parser] ❌ Sheet not found');
    return balanceSheets;
  }
  
  const sheet = workbook.Sheets[sheetName];
  const tables = detectTablesInSheet(sheet, sheetName);
  console.log(`[Balance Sheet Parser] 🔍 Detected ${tables.length} tables`);
  
  // Find Balance Sheet table
  const balanceSheetTable = tables.find(t => 
    t.tableName.includes('งบดุล') || 
    t.tableName.includes('balance') ||
    t.headerRow > 20
  );
  
  if (!balanceSheetTable) {
    console.log('[Balance Sheet Parser] ⚠️ No Balance Sheet table detected, using fallback...');
    return parseBalanceSheetsLegacy(workbook);
  }
  
  console.log(`[Balance Sheet Parser] ✅ Found Balance Sheet table: ${balanceSheetTable.tableName}`);
  
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  const tableData = extractTableData(data, balanceSheetTable);
  
  // Find year columns
  const yearColumns = balanceSheetTable.columns.filter(c => 
    c.name.includes('ปี') || c.name.match(/25\d{2}/)
  );
  
  console.log(`[Balance Sheet Parser] 📊 Found ${yearColumns.length} year columns`);
  
  // Parse each year
  for (const yearCol of yearColumns) {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let equity = 0;
    
    for (const row of tableData) {
      const label = String(row['รายการ'] || row[balanceSheetTable.columns[0].name] || '').toLowerCase();
      const value = Number(row[yearCol.name] || 0);
      
      if (value > 0 && value < PARSING_CONSTANTS.MAX_TIMESTAMP_VALUE) {
        if (label.includes('รวมสินทรัพย์') || label === 'total assets') {
          totalAssets = value;
        }
        
        if (label === 'รวมหนี้สิน' || label === 'total liabilities') {
          totalLiabilities = value;
        }
        
        if (label.includes('รวมส่วนของผู้') || label.includes('รวมส่วนของเจ้าของ') || label === 'total equity') {
          equity = value;
        }
      }
    }
    
    if (equity === 0 && totalAssets > 0) {
      equity = totalAssets - totalLiabilities;
    }
    
    if (totalAssets > 0 || equity > 0) {
      balanceSheets.push({
        period: yearCol.name,
        totalAssets,
        totalLiabilities,
        equity,
      });
      
      console.log(`[Balance Sheet Parser] ✅ ${yearCol.name}: Assets=${totalAssets}, Liabilities=${totalLiabilities}, Equity=${equity}`);
    }
  }
  
  console.log(`[Balance Sheet Parser] ✅ Extracted ${balanceSheets.length} periods`);
  return balanceSheets;
}

/**
 * Legacy Balance Sheet parser (fallback)
 */
function parseBalanceSheetsLegacy(workbook: WorkBook): Array<NonNullable<ParsedBusinessProfile['balanceSheets']>[number]> {
  console.log('[Balance Sheet Parser] Starting legacy parsing...');
  const balanceSheets: ParsedBusinessProfile['balanceSheets'] = [];
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('งบการเงิน') || name.toLowerCase().includes('financial')
  );
  
  if (!sheetName) {
    console.log('[Balance Sheet Parser] ❌ Sheet not found');
    return balanceSheets;
  }
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  // Find Balance Sheet section
  let balanceSheetStart = -1;
  for (let i = 0; i < data.length; i++) {
    const rowText = data[i].join(' ').toLowerCase();
    if (rowText.includes('งบดุล') || rowText.includes('balance sheet')) {
      balanceSheetStart = i;
      console.log(`[Balance Sheet Parser] 🔍 Balance Sheet starts at row ${i}`);
      break;
    }
  }
  
  if (balanceSheetStart === -1) {
    console.log('[Balance Sheet Parser] ❌ Balance Sheet section not found');
    return balanceSheets;
  }
  
  // Find year columns
  const yearColumns = findYearColumns(data, balanceSheetStart, data.length);
  if (yearColumns.length === 0) {
    console.log('[Balance Sheet Parser] ❌ No year columns found');
    return balanceSheets;
  }
  
  // Verify columns
  const verifiedYearColumns = verifyYearColumns(
    data,
    yearColumns,
    balanceSheetStart + 1,
    data.length,
    PARSING_CONSTANTS.MAX_BALANCE_SHEET_YEARS
  );
  
  console.log(`[Balance Sheet Parser] 🔍 Found ${verifiedYearColumns.length} year columns (verified)`);
  
  // Parse Balance Sheet for each year
  for (const yearCol of verifiedYearColumns) {
    let currentAssets = 0;
    let nonCurrentAssets = 0;
    let totalAssets = 0;
    let currentLiabilities = 0;
    let nonCurrentLiabilities = 0;
    let totalLiabilities = 0;
    let equity = 0;
    
    for (let i = balanceSheetStart; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const label = String(row[0] || '').toLowerCase().trim();
      const value = safeParseNumber(row[yearCol.col]);
      
      if (value > PARSING_CONSTANTS.MAX_TIMESTAMP_VALUE || (value > 0 && value < 1)) continue;
      
      // Assets
      if (label.includes('สินทรัพย์หมุนเวียน')) currentAssets = value;
      if (label.includes('สินทรัพย์ไม่หมุนเวียน')) nonCurrentAssets = value;
      if (label.includes('รวมสินทรัพย์')) totalAssets = value;
      
      // Liabilities
      if (label === 'หนี้สินหมุนเวียน') currentLiabilities = value;
      if (label === 'หนี้สินไม่หมุนเวียน') nonCurrentLiabilities = value;
      if (label === 'รวมหนี้สิน') {
        totalLiabilities = value;
        console.log(`[Balance Sheet Parser] ${yearCol.year} ✅ Total Liabilities: ${totalLiabilities}`);
      }
      
      // Skip "รวมหนี้สินและส่วนผู้ถือหุ้น"
      if (label.includes('รวมหนี้สินและส่วนผู้ถือหุ้น')) continue;
      
      // Equity
      if (label.includes('รวมส่วนของผู้เป็นหุ้นส่วน') || label.includes('รวมส่วนของเจ้าของ')) {
        equity = value;
      }
    }
    
    // Calculate if not found
    if (totalAssets === 0 && currentAssets > 0) {
      totalAssets = currentAssets + nonCurrentAssets;
    }
    
    if (totalLiabilities === 0 && currentLiabilities > 0) {
      totalLiabilities = currentLiabilities + nonCurrentLiabilities;
    }
    
    if (equity === 0 && totalAssets > 0) {
      equity = totalAssets - totalLiabilities;
    }
    
    if (totalAssets > 0 || equity > 0) {
      balanceSheets.push({
        period: yearCol.year,
        totalAssets,
        totalLiabilities,
        equity,
      });
    }
  }
  
  console.log(`[Balance Sheet Parser] ✅ Extracted ${balanceSheets.length} periods`);
  return balanceSheets;
}

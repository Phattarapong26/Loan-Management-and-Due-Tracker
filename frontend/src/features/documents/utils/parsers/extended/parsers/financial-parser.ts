/**
 * Financial Statements Parser (Sheet 5: งบการเงิน)
 */

import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { fillMergedCells, getSheetDataWithMergedCells } from '../../core/excel-merged-cells-handler';
import { 
  safeParseNumber, 
  findYearColumns, 
  verifyYearColumns,
  PARSING_CONSTANTS 
} from '../helpers';

export function parseFinancialStatements(workbook: WorkBook): Array<NonNullable<ParsedBusinessProfile['financialStatements']>[number]> {
  const statements: ParsedBusinessProfile['financialStatements'] = [];
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('งบการเงิน') || name.toLowerCase().includes('financial')
  );
  
  if (!sheetName) return statements;
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  // Find Income Statement section (before Balance Sheet)
  let incomeStatementEnd = data.length;
  for (let i = 0; i < data.length; i++) {
    const rowText = data[i].join(' ').toLowerCase();
    if (rowText.includes('งบดุล') || rowText.includes('balance sheet')) {
      incomeStatementEnd = i;
      break;
    }
  }
  
  // Find year columns
  const yearColumns = findYearColumns(data, 0, incomeStatementEnd);
  if (yearColumns.length === 0) return statements;
  
  // Verify columns
  const verifiedYearColumns = verifyYearColumns(
    data, 
    yearColumns, 
    4, 
    incomeStatementEnd,
    PARSING_CONSTANTS.MAX_YEAR_COLUMNS
  );
  
  // Parse Income Statement for each year
  for (const yearCol of verifiedYearColumns) {
    for (let i = 0; i < incomeStatementEnd; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const label = String(row[0] || '').trim();
      if (!label || label.length < 2) continue;
      
      // Skip header rows
      const lowerLabel = label.toLowerCase();
      if (lowerLabel.includes('งบกำไร') || lowerLabel.includes('income statement') || 
          lowerLabel.includes('บริษัท') || lowerLabel.includes('company') ||
          lowerLabel === 'รายการ' || lowerLabel === 'item') {
        continue;
      }
      
      const value = safeParseNumber(row[yearCol.col]);
      
      // Skip invalid values
      if (value > PARSING_CONSTANTS.MAX_TIMESTAMP_VALUE) continue;
      if (value > 0 && value < 1) continue;
      
      // Determine category
      let category: 'revenue' | 'cogs' | 'expense' | 'profit' | 'other' | 'balance-sheet' = 'other';
      
      if (lowerLabel.includes('รายได้') || lowerLabel.includes('ยอดขาย') || lowerLabel.includes('revenue') || lowerLabel.includes('sales')) {
        category = 'revenue';
      } else if (lowerLabel.includes('ต้นทุน') || lowerLabel.includes('cogs') || lowerLabel.includes('cost')) {
        category = 'cogs';
      } else if (lowerLabel.includes('ค่าใช้จ่าย') || lowerLabel.includes('ค่าเสื่อม') || lowerLabel.includes('expense') || lowerLabel.includes('depreciation')) {
        category = 'expense';
      } else if (lowerLabel.includes('กำไร') || lowerLabel.includes('ขาดทุน') || lowerLabel.includes('profit') || lowerLabel.includes('loss') || lowerLabel.includes('ebit') || lowerLabel.includes('ebt')) {
        category = 'profit';
      } else if (lowerLabel.includes('ดอกเบี้ย') || lowerLabel.includes('ภาษี') || lowerLabel.includes('interest') || lowerLabel.includes('tax')) {
        category = 'other';
      }
      
      statements.push({
        lineItem: label,
        year: yearCol.year,
        amount: value,
        category,
      });
    }
  }
  
  // Parse Balance Sheet section
  for (const yearCol of verifiedYearColumns) {
    for (let i = incomeStatementEnd; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const label = String(row[0] || '').trim();
      if (!label || label.length < 2) continue;
      
      const lowerLabel = label.toLowerCase();
      if (lowerLabel.includes('งบดุล') || lowerLabel.includes('balance sheet') || 
          lowerLabel.includes('งบแสดงฐานะ') || lowerLabel.includes('บริษัท') || 
          lowerLabel.includes('company') || lowerLabel === 'รายการ' || lowerLabel === 'item') {
        continue;
      }
      
      const value = safeParseNumber(row[yearCol.col]);
      
      if (value > PARSING_CONSTANTS.MAX_TIMESTAMP_VALUE) continue;
      if (value > 0 && value < 1) continue;
      
      statements.push({
        lineItem: label,
        year: yearCol.year,
        amount: value,
        category: 'balance-sheet',
      });
    }
  }
  
  return statements;
}

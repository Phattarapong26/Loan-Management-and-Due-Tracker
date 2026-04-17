/**
 * VAT Records Parser (Sheet 3: ภพ 30)
 */

import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { fillMergedCells, getSheetDataWithMergedCells } from '../../core/excel-merged-cells-handler';
import { detectTablesInSheet, extractTableData } from '../../core/excel-table-detector';
import { extractCompanyInfo } from '../helpers';

export function parseVATRecords(workbook: WorkBook): Array<NonNullable<ParsedBusinessProfile['vatRecords']>[number]> {
  const records: ParsedBusinessProfile['vatRecords'] = [];
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('ภพ') || name.includes('30') || name.toLowerCase().includes('vat')
  );
  
  if (!sheetName) {
    console.log('[VAT Parser] ❌ Sheet not found');
    return records;
  }
  
  const sheet = workbook.Sheets[sheetName];
  const tables = detectTablesInSheet(sheet, sheetName);
  
  if (tables.length === 0) {
    console.log('[VAT Parser] ❌ No tables detected');
    return records;
  }
  
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  const { companyName, taxId } = extractCompanyInfo(data);
  
  // Process each table
  for (const table of tables) {
    const tableData = extractTableData(data, table);
    
    // Find month/period column
    const monthCol = table.columns.find(c => {
      const name = c.name.toLowerCase();
      return (
        name.includes('เดือน') || 
        name.includes('งวด') || 
        name.includes('month') ||
        name.includes('period')
      );
    });
    
    if (!monthCol) continue;
    
    // Find sales columns
    const cashSalesCol = table.columns.find(c => {
      const name = c.name.toLowerCase();
      return (
        name.includes('เงินสด') ||
        name.includes('cash') ||
        (name.includes('ขาย') && name.includes('สด'))
      );
    });
    
    const creditSalesCol = table.columns.find(c => {
      const name = c.name.toLowerCase();
      return (
        (name.includes('เครดิต') && !name.includes('วงเงิน')) ||
        name.includes('credit') ||
        (name.includes('ขาย') && name.includes('เชื่อ'))
      );
    });
    
    const totalSalesCol = table.columns.find(c => {
      const name = c.name.toLowerCase();
      return (
        (name.includes('รวม') && name.includes('ขาย')) ||
        (name.includes('ยอดขาย') && name.includes('รวม')) ||
        name.includes('total sales')
      ) && !name.includes('เงินสด') && !name.includes('เครดิต');
    });
    
    const salesCol = totalSalesCol || table.columns.find(c => {
      const name = c.name.toLowerCase();
      return (
        name.includes('ยอดขาย') ||
        name.includes('รายได้') ||
        name.includes('sales') ||
        name.includes('revenue')
      ) && !name.includes('เงินสด') && !name.includes('เครดิต');
    });
    
    // Find tax columns
    const salesTaxCol = table.columns.find(c => 
      c.name.toLowerCase().includes('ภาษีขาย') || c.name.toLowerCase().includes('sales tax')
    );
    
    const purchaseCol = table.columns.find(c => 
      c.name.toLowerCase().includes('ยอดซื้อ') || c.name.toLowerCase().includes('purchase')
    );
    
    const purchaseTaxCol = table.columns.find(c => 
      c.name.toLowerCase().includes('ภาษีซื้อ') || c.name.toLowerCase().includes('purchase tax')
    );
    
    const taxWithheldCol = table.columns.find(c => {
      const name = c.name.toLowerCase();
      return (
        name.includes('ภาษีที่ต้องชำระ') || 
        name.includes('ภาษีสุทธิ') || 
        name.includes('ภาษีชำระ') ||
        name.includes('tax payable')
      );
    });
    
    // Parse each row
    for (const row of tableData) {
      const period = monthCol ? String(row[monthCol.name] || '') : '';
      if (!period) continue;
      
      const cashSales = cashSalesCol ? Number(row[cashSalesCol.name] || 0) : 0;
      const creditSales = creditSalesCol ? Number(row[creditSalesCol.name] || 0) : 0;
      const totalSales = totalSalesCol ? Number(row[totalSalesCol.name] || 0) : 0;
      const fallbackSales = salesCol && !totalSalesCol ? Number(row[salesCol.name] || 0) : 0;
      
      let salesAmount = 0;
      if (totalSales > 0) {
        salesAmount = totalSales;
      } else if (cashSales > 0 || creditSales > 0) {
        salesAmount = cashSales + creditSales;
      } else if (fallbackSales > 0) {
        salesAmount = fallbackSales;
      }
      
      const salesTax = salesTaxCol ? Number(row[salesTaxCol.name] || 0) : 0;
      const purchaseAmount = purchaseCol ? Number(row[purchaseCol.name] || 0) : 0;
      const purchaseTax = purchaseTaxCol ? Number(row[purchaseTaxCol.name] || 0) : 0;
      const taxWithheld = taxWithheldCol ? Number(row[taxWithheldCol.name] || 0) : 0;
      
      if (salesAmount > 0 || purchaseAmount > 0 || cashSales > 0 || creditSales > 0) {
        records.push({
          period,
          companyName: companyName || 'N/A',
          taxId: taxId || 'N/A',
          salesAmount,
          salesTax,
          purchaseAmount,
          purchaseTax,
          taxWithheld,
          tableName: table.tableName,
          cashSales: cashSales > 0 ? cashSales : undefined,
          creditSales: creditSales > 0 ? creditSales : undefined,
        });
      }
    }
  }
  
  return records;
}

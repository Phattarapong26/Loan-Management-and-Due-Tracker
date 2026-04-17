import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { 
  fillMergedCells, 
  getSheetDataWithMergedCells 
} from '../../core/excel-merged-cells-handler';
import { safeParseNumber } from '../helpers';

/**
 * Sheet: ประมาณการ (Revenue Projection) - DETAILED VERSION
 * Parses the complete revenue projection table with tax years and projections
 */
export function parseRevenueProjectionDetailed(workbook: WorkBook): NonNullable<ParsedBusinessProfile['revenueProjection']> {
  console.log('[Revenue Projection Detailed Parser] Starting...');

  const defaultResult: NonNullable<ParsedBusinessProfile['revenueProjection']> = {
    taxYears: [],
    projectionYears: [],
    rows: [],
  };

  // Find the sheet
  const sheetName = workbook.SheetNames.find(name =>
    name.includes('ประมาณการ') || name.toLowerCase().includes('projection')
  );

  if (!sheetName) {
    console.log('[Revenue Projection Detailed Parser] ❌ Sheet not found');
    return defaultResult;
  }

  console.log(`[Revenue Projection Detailed Parser] ✅ Found sheet: "${sheetName}"`);

  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);

  console.log(`[Revenue Projection Detailed Parser] 📋 Sheet has ${data.length} rows`);

  // Step 1: Parse header rows (rows 2-4)
  const taxYears: Array<{ year: string; period?: string }> = [];
  const projectionYears: Array<{ year: string; period?: string }> = [];
  
  if (data.length < 4) {
    console.log('[Revenue Projection Detailed Parser] ⚠️ Not enough rows for headers');
    return defaultResult;
  }

  // Row 3 contains year labels (ปี 2567, etc.)
  const yearRow = data[2];
  // Row 4 contains period info (ภ.พ.30 ม.ค.68-มิ.ย.68, etc.)
  const periodRow = data[3];

  console.log('[Revenue Projection Detailed Parser] 🔍 Parsing headers...');
  console.log('  Year row:', yearRow.slice(0, 12));
  console.log('  Period row:', periodRow.slice(0, 12));

  // First, find where projection section starts by looking at row 2
  let projectionStartCol = -1;
  const sectionRow = data[1]; // Row 2 (index 1)
  for (let col = 1; col < sectionRow.length; col++) {
    const label = String(sectionRow[col] || '').trim();
    if (label.includes('ประมาณการ')) {
      projectionStartCol = col;
      console.log(`[Revenue Projection Detailed Parser] 📍 Projection section starts at column ${col}`);
      break;
    }
  }

  // Parse tax years (before projection section)
  const taxYearCols: number[] = [];
  const projectionYearCols: number[] = [];
  
  for (let col = 1; col < yearRow.length; col++) {
    const yearCell = String(yearRow[col] || '').trim();
    
    // Skip percentage columns
    if (yearCell === '%' || yearCell === '') {
      continue;
    }

    // Check if this column has a year
    if (yearCell.includes('ปี')) {
      const periodCell = String(periodRow[col] || '').trim();
      const yearData = {
        year: yearCell,
        period: periodCell || undefined,
      };

      // Determine if tax or projection based on column position
      if (projectionStartCol === -1 || col < projectionStartCol) {
        // Tax year
        taxYears.push(yearData);
        taxYearCols.push(col);
        console.log(`[Revenue Projection Detailed Parser]   Tax year col ${col}: ${yearCell}${periodCell ? ` (${periodCell})` : ''}`);
      } else {
        // Projection year
        projectionYears.push(yearData);
        projectionYearCols.push(col);
        console.log(`[Revenue Projection Detailed Parser]   Projection year col ${col}: ${yearCell}${periodCell ? ` (${periodCell})` : ''}`);
      }
    }
  }

  console.log(`[Revenue Projection Detailed Parser] ✅ Found ${taxYears.length} tax years, ${projectionYears.length} projection years`);

  // Step 2: Parse data rows (row 5 onwards)
  const rows: NonNullable<ParsedBusinessProfile['revenueProjection']>['rows'] = [];
  
  console.log('[Revenue Projection Detailed Parser] 🔍 Parsing data rows...');
  
  for (let rowIdx = 4; rowIdx < Math.min(data.length, 50); rowIdx++) {
    const row = data[rowIdx];
    const label = String(row[0] || '').trim();
    
    // Skip empty rows
    if (!label) continue;
    
    // Determine row type and indent
    let rowType: NonNullable<ParsedBusinessProfile['revenueProjection']>['rows'][number]['rowType'] = 'revenue';
    let indent = 0;
    
    // Check for indentation (rows starting with spaces or dashes)
    if (label.startsWith(' -') || label.startsWith('-')) {
      indent = 1;
    } else if (label.startsWith('  ')) {
      indent = 2;
    }
    
    // Determine row type based on label
    if (label.includes('รวม') || label.includes('Total')) {
      rowType = 'total';
    } else if (label.includes('EBITDA') || label.includes('EBIT')) {
      rowType = 'ebitda';
    } else if (label.includes('กำไร') || label.includes('ขาดทุน') || label.includes('Profit') || label.includes('Loss')) {
      rowType = 'profit';
    } else if (label.includes('ต้นทุน') || label.includes('Cost') || label.includes('ค่าใช้จ่าย') || label.includes('Expense')) {
      rowType = 'cost';
    } else if (label.includes('ชำระหนี้') || label.includes('Debt') || label.includes('Payment')) {
      rowType = 'debt';
    } else if (label.includes('DSCR') || label.includes('คงเหลือ')) {
      rowType = 'dscr';
    } else if (label.includes('อัตราการเติบโต') || label.includes('Growth')) {
      rowType = 'header';
    }
    
    // Extract tax data and percentages
    const taxData: number[] = [];
    const taxPercent: number[] = [];
    
    for (let i = 0; i < taxYearCols.length; i++) {
      const col = taxYearCols[i];
      const value = safeParseNumber(row[col]);
      const percent = safeParseNumber(row[col + 1]); // Next column is %
      
      taxData.push(value);
      taxPercent.push(percent);
    }
    
    // Extract projection data and percentages
    const projectionData: number[] = [];
    const projectionPercent: number[] = [];
    
    for (let i = 0; i < projectionYearCols.length; i++) {
      const col = projectionYearCols[i];
      const value = safeParseNumber(row[col]);
      const percent = safeParseNumber(row[col + 1]); // Next column is %
      
      projectionData.push(value);
      projectionPercent.push(percent);
    }
    
    // Only add rows that have some data
    const hasData = taxData.some(v => v !== 0) || projectionData.some(v => v !== 0);
    if (hasData || rowType === 'header' || rowType === 'total') {
      rows.push({
        label: label.trim(),
        taxData,
        taxPercent,
        projectionData,
        projectionPercent,
        rowType,
        indent,
        isEditable: true,
      });
      
      if (rows.length <= 10) {
        console.log(`[Revenue Projection Detailed Parser]   Row ${rowIdx}: ${label.substring(0, 30)} (${rowType}, indent: ${indent})`);
      }
      
      // Stop after DSCR row
      if (label.includes('DSCR')) {
        console.log(`[Revenue Projection Detailed Parser] 🛑 Stopping at DSCR row`);
        break;
      }
    }
  }
  
  console.log(`[Revenue Projection Detailed Parser] ✅ Parsed ${rows.length} data rows`);

  return {
    taxYears,
    projectionYears,
    rows,
  };
}

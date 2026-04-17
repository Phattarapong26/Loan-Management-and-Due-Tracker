import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { 
  fillMergedCells, 
  getSheetDataWithMergedCells 
} from '../../core/excel-merged-cells-handler';
import { safeParseNumber, DSCR_STATUS } from '../helpers';

/**
 * Sheet 11: DSCR (Debt Service Coverage Ratio) - ENHANCED WITH DEBUG v2
 */
export function parseDSCR(workbook: WorkBook): NonNullable<ParsedBusinessProfile['dscr']> {
  console.log('[DSCR Parser] Starting...');
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('DSCR') || name.includes('dscr')
  );
  
  if (!sheetName) {
    console.log('[DSCR Parser] ❌ Sheet not found. Available sheets:', workbook.SheetNames);
    return {
      customerName: '',
      analysisYear: new Date().getFullYear(),
      netOperatingIncome: 0,
      totalDebtService: 0,
      dscrRatio: 0,
      dscrStatus: 'ไม่พบข้อมูล',
    };
  }
  
  console.log(`[DSCR Parser] ✅ Found sheet: "${sheetName}"`);
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[DSCR Parser] Processing ${data.length} rows`);
  
  // DEBUG: Show first 15 rows
  console.log('[DSCR Parser] 🔍 First 15 rows:', data.slice(0, 15).map((row, i) => ({
    row: i,
    data: row.slice(0, 8)
  })));
  
  let customerName = '';
  const analysisYear = new Date().getFullYear();
  let netOperatingIncome: number = 0;
  let totalDebtService: number = 0;
  let dscrRatio: number = 0;
  
  // Track all candidate values for better selection
  const noiCandidates: Array<{ row: number; label: string; value: number; priority: number }> = [];
  const debtServiceCandidates: Array<{ row: number; label: string; value: number; priority: number }> = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const rowText = row.join(' ').toLowerCase();
    const firstCell = String(row[0] || '').toLowerCase().trim();
    
    if (rowText.includes('บริษัท') && !customerName) {
      const match = rowText.match(/บริษัท\s+([^\s]+(?:\s+[^\s]+)*?)\s+จำกัด/);
      if (match) customerName = match[0];
    }
    
    // Extract numbers from this row (filter out timestamps and tiny values)
    const numbers: Array<number> = [];
    for (const cell of row) {
      const num = safeParseNumber(cell);
      if (num > 100 && num < 1000000000) numbers.push(num);
    }
    
    // NOI detection - prioritize specific labels over generic ones
    if (numbers.length > 0) {
      if (firstCell.includes('noi') || rowText.includes('net operating income')) {
        noiCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 1 });
      } else if (firstCell.includes('รายได้สุทธิ') || firstCell.includes('กำไรสุทธิจากการดำเนินงาน')) {
        noiCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 2 });
      } else if (
        (firstCell.includes('กำไร') && firstCell.includes('สุทธิ')) ||
        firstCell.includes('net profit') ||
        firstCell.includes('net income')
      ) {
        noiCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 3 });
      } else if (firstCell.includes('กำไร') && !firstCell.includes('ขั้นต้น')) {
        // "กำไร" but not "กำไรขั้นต้น" (gross profit)
        noiCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 4 });
      }
      // NOTE: Intentionally NOT matching just "รายได้" alone — too generic, could be total revenue
    }
    
    // Debt Service detection - prioritize specific labels
    if (numbers.length > 0) {
      if (firstCell.includes('debt service') || firstCell.includes('total debt service')) {
        debtServiceCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 1 });
      } else if (firstCell.includes('ภาระหนี้') && firstCell.includes('รวม')) {
        debtServiceCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 2 });
      } else if (firstCell.includes('ภาระหนี้') || firstCell.includes('ชำระหนี้')) {
        debtServiceCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 3 });
      } else if (firstCell.includes('หนี้สิน') && (firstCell.includes('รวม') || firstCell.includes('ต่อปี'))) {
        debtServiceCandidates.push({ row: i, label: firstCell, value: numbers[0], priority: 4 });
      }
    }
    
    // Direct DSCR ratio detection
    if (rowText.includes('dscr') || (firstCell.includes('อัตราส่วน') && rowText.includes('หนี้'))) {
      for (const cell of row) {
        const num = safeParseNumber(cell);
        // DSCR ratio is typically between 0.1 and 15
        if (num > 0.1 && num < 15 && dscrRatio === 0) {
          dscrRatio = num;
          console.log(`[DSCR Parser] 🔍 Found DSCR ratio directly at row ${i}: ${dscrRatio}`);
        }
      }
    }
  }
  
  // Select best NOI and Debt Service candidates (lowest priority number = best)
  if (noiCandidates.length > 0) {
    noiCandidates.sort((a, b) => a.priority - b.priority);
    netOperatingIncome = noiCandidates[0].value;
    console.log(`[DSCR Parser] 🔍 Selected NOI: ${netOperatingIncome} from row ${noiCandidates[0].row} ("${noiCandidates[0].label}", priority ${noiCandidates[0].priority})`);
    if (noiCandidates.length > 1) {
      console.log(`[DSCR Parser] 🔍 Other NOI candidates:`, noiCandidates.slice(1).map(c => `row ${c.row}: ${c.value} ("${c.label}")`));
    }
  }
  
  if (debtServiceCandidates.length > 0) {
    debtServiceCandidates.sort((a, b) => a.priority - b.priority);
    totalDebtService = debtServiceCandidates[0].value;
    console.log(`[DSCR Parser] 🔍 Selected Debt Service: ${totalDebtService} from row ${debtServiceCandidates[0].row} ("${debtServiceCandidates[0].label}", priority ${debtServiceCandidates[0].priority})`);
    if (debtServiceCandidates.length > 1) {
      console.log(`[DSCR Parser] 🔍 Other Debt Service candidates:`, debtServiceCandidates.slice(1).map(c => `row ${c.row}: ${c.value} ("${c.label}")`));
    }
  }
  
  // Calculate if not found directly
  if (dscrRatio === 0 && netOperatingIncome > 0 && totalDebtService > 0) {
    dscrRatio = netOperatingIncome / totalDebtService;
    console.log(`[DSCR Parser] 🔍 Calculated DSCR: ${dscrRatio.toFixed(2)}`);
  }
  
  // SANITY CHECK: if DSCR > 15, it's likely wrong — log a warning
  if (dscrRatio > 15) {
    console.warn(`[DSCR Parser] ⚠️ DSCR ratio of ${dscrRatio.toFixed(2)} seems unreasonably high. NOI=${netOperatingIncome}, DebtService=${totalDebtService}. This may indicate incorrect value matching.`);
  }
  
  const dscrStatus: string = dscrRatio >= 1.25 ? 'ดีมาก' : dscrRatio >= 1.0 ? 'พอใช้' : dscrRatio > 0 ? 'มีปัญหา' : 'ไม่พบข้อมูล';
  
  console.log(`[DSCR Parser] ✅ DSCR = ${dscrRatio.toFixed(2)} (${dscrStatus})`);
  console.log(`[DSCR Parser] NOI: ${netOperatingIncome}, Debt Service: ${totalDebtService}`);
  
  return {
    customerName: customerName || 'N/A',
    analysisYear,
    netOperatingIncome,
    totalDebtService,
    dscrRatio,
    dscrStatus,
  };
}

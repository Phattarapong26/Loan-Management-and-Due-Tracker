import { WorkSheet, fillMergedCells as fillMergedCellsAdapter, getMergedCellsStats as getMergedCellsStatsAdapter, getCellValue, sheetToJson } from './exceljs-adapter';

/**
 * Merged Cells Handler
 * Handles Excel merged cells properly to avoid data loss
 * Migrated to use ExcelJS adapter for security
 */

export interface MergedCellInfo {
  range: { s: { r: number; c: number }; e: { r: number; c: number } };
  value: unknown;
  startCell: string;
  endCell: string;
}

/**
 * Extract merged cells information from a sheet
 */
export function extractMergedCells(sheet: WorkSheet): Array<MergedCellInfo> {
  const merges = sheet.merges || [];
  const mergedCellsInfo: Array<MergedCellInfo> = [];
  
  for (const merge of merges) {
    const startCell = `${String.fromCharCode(65 + merge.s.c)}${merge.s.r + 1}`;
    const endCell = `${String.fromCharCode(65 + merge.e.c)}${merge.e.r + 1}`;
    const value = getCellValue(sheet, merge.s.r, merge.s.c);
    
    mergedCellsInfo.push({
      range: merge,
      value,
      startCell,
      endCell,
    });
  }
  
  return mergedCellsInfo;
}

/**
 * Fill merged cell values to all cells in the merged range
 * This prevents data loss when converting to JSON
 */
export function fillMergedCells(sheet: WorkSheet): WorkSheet {
  return fillMergedCellsAdapter(sheet);
}

/**
 * Get sheet data with merged cells properly handled
 */
export function getSheetDataWithMergedCells(sheet: WorkSheet): Array<Array<unknown>> {
  const filledSheet = fillMergedCells(sheet);
  return filledSheet.data;
}

/**
 * Find header row by detecting row with most non-empty cells
 */
export function findHeaderRow(
  sheet: WorkSheet,
  startRow = 0,
  maxSearchRows = 20
): number {
  const data = getSheetDataWithMergedCells(sheet);
  let maxNonEmptyCells = 0;
  let headerRowIndex = startRow;
  
  for (let i = startRow; i < Math.min(startRow + maxSearchRows, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    const nonEmptyCells = row.filter((cell: unknown) => 
      cell !== null && cell !== undefined && cell !== ''
    ).length;
    
    if (nonEmptyCells > maxNonEmptyCells) {
      maxNonEmptyCells = nonEmptyCells;
      headerRowIndex = i;
    }
  }
  
  return headerRowIndex;
}

/**
 * Extract data starting from a specific header row
 */
export function extractDataFromHeaderRow(
  sheet: WorkSheet,
  headerRow: number
): {
  headers: Array<string>;
  data: Array<Array<unknown>>;
} {
  const allData = getSheetDataWithMergedCells(sheet);
  
  if (headerRow >= allData.length) {
    return { headers: [], data: [] };
  }
  
  const headers = allData[headerRow].map((h: unknown) => String(h || '').trim());
  const data = allData.slice(headerRow + 1);
  
  return { headers, data };
}

/**
 * Convert sheet to structured data with proper header mapping
 */
export function sheetToStructuredData(
  sheet: WorkSheet,
  headerRow: number
): Array<Record<string, unknown>> {
  return sheetToJson(sheet, { header: headerRow });
}

/**
 * Get merged cell value by checking if a cell is part of a merged range
 */
export function getMergedCellValue(
  sheet: WorkSheet,
  row: number,
  col: number
): unknown {
  return getCellValue(sheet, row, col);
}

/**
 * Check if a cell is the start of a merged range
 */
export function isMergedCellStart(
  sheet: WorkSheet,
  row: number,
  col: number
): boolean {
  const merges = sheet.merges || [];
  
  for (const merge of merges) {
    if (merge.s.r === row && merge.s.c === col) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get statistics about merged cells in a sheet
 */
export function getMergedCellsStats(sheet: WorkSheet): {
  totalMergedRanges: number;
  totalMergedCells: number;
  largestMerge: { rows: number; cols: number } | null;
} {
  return getMergedCellsStatsAdapter(sheet);
}

/**
 * ExcelJS Adapter
 * Provides compatibility layer between xlsx and exceljs
 * Migrated from xlsx to exceljs for security (no Prototype Pollution/ReDoS)
 * 
 * PERFORMANCE: ExcelJS is lazy-loaded (289KB) - only imported when actually parsing Excel files
 */

import type ExcelJS from 'exceljs';

export interface WorkSheet {
  name: string;
  data: unknown[][];
  merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>;
  rowCount: number;
  columnCount: number;
}

export interface WorkBook {
  SheetNames: string[];
  Sheets: Record<string, WorkSheet>;
}

/**
 * Read Excel file from ArrayBuffer using ExcelJS
 * PERFORMANCE: Lazy loads ExcelJS (289KB) only when this function is called
 */
export async function readExcelFile(buffer: ArrayBuffer): Promise<WorkBook> {
  // Lazy load ExcelJS - only when actually parsing Excel files
  const ExcelJS = (await import('exceljs')).default;
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result: WorkBook = {
    SheetNames: [],
    Sheets: {},
  };

  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    result.SheetNames.push(sheetName);

    // Extract data as 2D array
    const data: unknown[][] = [];
    let maxRow = 0;
    let maxCol = 0;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowData: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Get cell value (handle formulas, dates, etc.)
        let value: unknown = cell.value;

        // Handle formula cells - extract the computed result
        if (cell.type === 2) { // ExcelJS.ValueType.Formula = 2
          if (cell.result !== undefined && cell.result !== null) {
            value = cell.result;
          } else if (value && typeof value === 'object' && 'result' in (value as Record<string, unknown>)) {
            value = (value as Record<string, unknown>).result;
          }
        }

        // Handle null objects FIRST (cells with formulas but no value)
        if (value === null || (typeof value === 'object' && value !== null && !(value instanceof Date) && !Array.isArray(value) && Object.keys(value as object).length === 0)) {
          value = '';
        }

        // Handle date cells - convert to ISO string for readability
        if (value instanceof Date) {
          value = value.toISOString();
        }
        // Also handle timestamps that are Date type cells
        if (cell.type === 3 && typeof value === 'number') { // ExcelJS.ValueType.Date = 3
          try {
            value = new Date(value).toISOString();
          } catch {
            // Keep as number if conversion fails
          }
        }

        // Handle formula objects that may still be present (e.g. from merged cells)
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          const obj = value as Record<string, unknown>;
          if ('result' in obj) {
            value = obj.result;
          } else if ('formula' in obj && !('result' in obj)) {
            value = ''; // Formula without result, treat as empty
          } else if ('richText' in obj) {
            // Handle rich text objects
            const richText = obj.richText as Array<{ text: string }>;
            value = richText.map(rt => rt.text).join('');
          } else if ('text' in obj && typeof obj.text === 'string') {
            // Handle text property
            value = obj.text;
          }
        }

        // Handle rich text
        if (cell.type === 6) { // ExcelJS.ValueType.RichText = 6
          value = cell.text;
        }

        rowData[colNumber - 1] = value;
        maxCol = Math.max(maxCol, colNumber);
      });

      data[rowNumber - 1] = rowData;
      maxRow = Math.max(maxRow, rowNumber);
    });

    // Fill empty cells with empty strings for consistency
    for (let r = 0; r < maxRow; r++) {
      if (!data[r]) data[r] = [];
      for (let c = 0; c < maxCol; c++) {
        if (data[r][c] === undefined) data[r][c] = '';
      }
    }

    // Extract merged cells
    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
    
    // ExcelJS stores merges in worksheet.model.merges
    const worksheetModel = worksheet as any;
    if (worksheetModel.model?.merges) {
      for (const mergeAddress of worksheetModel.model.merges) {
        // mergeAddress is like "A1:B2"
        const [start, end] = mergeAddress.split(':');
        const startPos = parseAddress(start);
        const endPos = parseAddress(end);
        
        merges.push({
          s: { r: startPos.row, c: startPos.col },
          e: { r: endPos.row, c: endPos.col },
        });
      }
    }

    result.Sheets[sheetName] = {
      name: sheetName,
      data,
      merges,
      rowCount: maxRow,
      columnCount: maxCol,
    };
  });

  return result;
}

/**
 * Get cell value from sheet
 */
export function getCellValue(sheet: WorkSheet, row: number, col: number): unknown {
  if (!sheet.data[row] || sheet.data[row][col] === undefined) {
    return '';
  }
  return sheet.data[row][col];
}

/**
 * Get cell value by address (e.g., "A1")
 */
export function getCellValueByAddress(sheet: WorkSheet, address: string): unknown {
  const { row, col } = parseAddress(address);
  return getCellValue(sheet, row, col);
}

/**
 * Parse cell address like "A1" to {row: 0, col: 0}
 */
function parseAddress(address: string): { row: number; col: number } {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell address: ${address}`);
  }

  const colStr = match[1];
  const rowStr = match[2];

  // Convert column letters to number (A=0, B=1, ..., Z=25, AA=26, etc.)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1; // 0-indexed

  const row = parseInt(rowStr) - 1; // 0-indexed

  return { row, col };
}

/**
 * Encode cell position to address (e.g., {row: 0, col: 0} -> "A1")
 */
export function encodeAddress(row: number, col: number): string {
  let colStr = '';
  let c = col + 1; // 1-indexed for Excel

  while (c > 0) {
    const remainder = (c - 1) % 26;
    colStr = String.fromCharCode(65 + remainder) + colStr;
    c = Math.floor((c - 1) / 26);
  }

  return `${colStr}${row + 1}`;
}

/**
 * Get sheet range (similar to XLSX.utils.decode_range)
 */
export function getSheetRange(sheet: WorkSheet): { s: { r: number; c: number }; e: { r: number; c: number } } {
  return {
    s: { r: 0, c: 0 },
    e: { r: sheet.rowCount - 1, c: sheet.columnCount - 1 },
  };
}

/**
 * Convert sheet to JSON (similar to XLSX.utils.sheet_to_json)
 */
export function sheetToJson<T = any>(sheet: WorkSheet, options?: { header?: number | string[] }): T[] {
  const result: T[] = [];
  const headerRow = typeof options?.header === 'number' ? options.header : 0;

  if (sheet.data.length === 0) return result;

  // Get headers
  const headers: string[] = [];
  if (Array.isArray(options?.header)) {
    headers.push(...options.header);
  } else {
    const headerRowData = sheet.data[headerRow] || [];
    for (let i = 0; i < headerRowData.length; i++) {
      headers.push(String(headerRowData[i] || `Column${i + 1}`));
    }
  }

  // Convert rows to objects
  for (let r = headerRow + 1; r < sheet.data.length; r++) {
    const row = sheet.data[r];
    if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue; // Skip empty rows
    }

    const obj: any = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] !== undefined ? row[c] : '';
    }
    result.push(obj as T);
  }

  return result;
}

/**
 * Fill merged cells with the value from the top-left cell
 */
export function fillMergedCells(sheet: WorkSheet): WorkSheet {
  const filledSheet = {
    ...sheet,
    data: sheet.data.map(row => [...row]), // Deep copy
  };

  for (const merge of sheet.merges) {
    const value = getCellValue(sheet, merge.s.r, merge.s.c);

    // Fill all cells in the merged range
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (!filledSheet.data[r]) filledSheet.data[r] = [];
        filledSheet.data[r][c] = value;
      }
    }
  }

  return filledSheet;
}

/**
 * Get sheet data as 2D array (compatibility function)
 */
export function getSheetData(sheet: WorkSheet): unknown[][] {
  return sheet.data;
}

/**
 * Safe parse number from various formats
 */
export function safeParseNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    // Skip ISO date strings like "2557-08-19T00:00:00.000Z"
    if (value.match(/^\d{4}-\d{2}-\d{2}T/)) return 0;
    const cleaned = value.replace(/[,\s฿]/g, '').replace(/บาท/g, '').replace(/ล้าน/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    if (value.includes('ล้าน')) return parsed * 1000000;
    return parsed;
  }
  // Handle formula objects that weren't resolved
  if (value && typeof value === 'object' && 'result' in (value as Record<string, unknown>)) {
    return safeParseNumber((value as Record<string, unknown>).result);
  }
  return 0;
}

/**
 * Get merged cells statistics
 */
export function getMergedCellsStats(sheet: WorkSheet): {
  totalMergedRanges: number;
  totalMergedCells: number;
  largestMerge: { rows: number; cols: number } | null;
} {
  const totalMergedRanges = sheet.merges.length;
  let totalMergedCells = 0;
  let largestMerge: { rows: number; cols: number } | null = null;

  for (const merge of sheet.merges) {
    const rows = merge.e.r - merge.s.r + 1;
    const cols = merge.e.c - merge.s.c + 1;
    const cells = rows * cols;

    totalMergedCells += cells;

    if (!largestMerge || cells > largestMerge.rows * largestMerge.cols) {
      largestMerge = { rows, cols };
    }
  }

  return {
    totalMergedRanges,
    totalMergedCells,
    largestMerge,
  };
}

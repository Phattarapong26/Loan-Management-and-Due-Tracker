/**
 * ExcelJS Adapter for Backend
 * Provides compatibility layer between xlsx and exceljs
 * Migrated from xlsx to exceljs for security (no Prototype Pollution/ReDoS)
 */

import ExcelJS from 'exceljs';

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
 * Read Excel file from Buffer using ExcelJS
 */
export async function readExcelFile(buffer: Buffer): Promise<WorkBook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any); // Type cast for compatibility

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

        // Handle formula cells
        if (cell.type === ExcelJS.ValueType.Formula && cell.result !== undefined) {
          value = cell.result;
        }

        // Handle date cells
        if (cell.type === ExcelJS.ValueType.Date && value instanceof Date) {
          value = value.getTime(); // Convert to timestamp for compatibility
        }

        // Handle rich text
        if (cell.type === ExcelJS.ValueType.RichText) {
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
      const currentRow = data[r];
      if (currentRow) {
        for (let c = 0; c < maxCol; c++) {
          if (currentRow[c] === undefined) currentRow[c] = '';
        }
      }
    }

    // Extract merged cells
    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
    
    // ExcelJS stores merges in worksheet.model.merges
    const worksheetModel = worksheet as any;
    if (worksheetModel.model?.merges) {
      for (const mergeAddress of worksheetModel.model.merges) {
        // mergeAddress is like "A1:B2"
        if (typeof mergeAddress === 'string' && mergeAddress.includes(':')) {
          const [start, end] = mergeAddress.split(':');
          if (start && end) {
            const startPos = parseAddress(start);
            const endPos = parseAddress(end);
            
            merges.push({
              s: { r: startPos.row, c: startPos.col },
              e: { r: endPos.row, c: endPos.col },
            });
          }
        }
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
 * Parse cell address like "A1" to {row: 0, col: 0}
 */
function parseAddress(address: string): { row: number; col: number } {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match || !match[1] || !match[2]) {
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
 * Get sheet data as 2D array
 */
export function getSheetData(sheet: WorkSheet): unknown[][] {
  return sheet.data;
}

/**
 * Convert sheet to JSON
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
      const header = headers[c];
      if (header) {
        obj[header] = row[c] !== undefined ? row[c] : '';
      }
    }
    result.push(obj as T);
  }

  return result;
}

/**
 * Safe number parsing
 */
export function safeParseNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s฿บาท]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

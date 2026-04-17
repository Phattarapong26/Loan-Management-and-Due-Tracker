/**
 * Excel Table Detector - Dynamic Table Detection
 * ตรวจจับตารางใน Excel แบบ dynamic โดยไม่ต้อง hardcode row/column
 */

import { WorkSheet } from './exceljs-adapter';
import { getSheetDataWithMergedCells, fillMergedCells } from './excel-merged-cells-handler';

// ===== INTERFACES =====

export interface DetectedTable {
  tableName: string;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number;
  closingRows: ClosingRow[];
  columns: ColumnInfo[];
  confidence: number;
}

export interface ColumnInfo {
  name: string;
  index: number;
  type: 'string' | 'number' | 'date' | 'percentage' | 'currency';
}

export interface ClosingRow {
  rowIndex: number;
  keyword: string;
  type: 'sum' | 'average' | 'total' | 'summary';
}

// ===== CLOSING KEYWORDS =====

export const CLOSING_KEYWORDS = {
  sum: ['รวม', 'รวมทั้งหมด', 'รวมทั้งสิ้น', 'ยอดรวม', 'total', 'sum'],
  average: ['เฉลี่ย', 'เฉลี่ยเดือนละ', 'เฉลี่ยต่อเดือน', 'ค่าเฉลี่ย', 'average', 'avg'],
  total: ['รายได้ต่อปี', 'รายได้รวมต่อปี', 'ยอดรวมต่อปี', 'annual total'],
  summary: ['สรุป', 'ยอดสุทธิ', 'คงเหลือ', 'ยอดคงเหลือ', 'summary', 'net'],
};

// ===== HEADER DETECTION KEYWORDS =====

const HEADER_KEYWORDS = [
  'ลำดับ', 'ลำดับที่', 'เดือน', 'รายการ', 'ประเภท', 'วงเงิน', 'จำนวนเงิน',
  'ยอด', 'ชื่อ', 'วันที่', 'ปี', 'no', 'name', 'type', 'amount', 'date', 'month'
];

// ===== MAIN DETECTION FUNCTIONS =====

/**
 * Detect all tables in a sheet
 */
export function detectTablesInSheet(sheet: WorkSheet, sheetName: string): DetectedTable[] {
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  const tables: DetectedTable[] = [];
  let currentRow = 0;
  
  while (currentRow < data.length) {
    // Try to detect a table starting from currentRow
    const tableResult = detectTableAt(data, currentRow, sheetName);
    
    if (tableResult) {
      tables.push(tableResult);
      currentRow = tableResult.dataEndRow + tableResult.closingRows.length + 1;
    } else {
      currentRow++;
    }
  }
  
  return tables;
}

/**
 * Detect a single table starting from a specific row
 */
function detectTableAt(data: unknown[][], startRow: number, sheetName: string): DetectedTable | null {
  // Skip empty rows
  while (startRow < data.length && isEmptyRow(data[startRow])) {
    startRow++;
  }
  
  if (startRow >= data.length) {
    return null;
  }
  
  // Try to detect header row
  const headerResult = detectHeaderRow(data, startRow);
  
  if (!headerResult.isHeader) {
    return null;
  }
  
  const headerRow = headerResult.rowIndex;
  const columns = headerResult.columns;
  
  // Find data end row (where closing keywords appear or empty rows)
  let dataEndRow = headerRow;
  const closingRows: ClosingRow[] = [];
  
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    
    // Check if empty row
    if (isEmptyRow(row)) {
      // Allow 1 empty row, but 2+ consecutive empty rows = end of table
      if (i + 1 < data.length && isEmptyRow(data[i + 1])) {
        break;
      }
      continue;
    }
    
    // Check if closing row
    const closingResult = detectClosingRow(row);
    
    if (closingResult.isClosing) {
      closingRows.push({
        rowIndex: i,
        keyword: closingResult.keyword!,
        type: closingResult.type!,
      });
      
      // Check if there's a new header row after this closing row (indicates new table)
      const nextHeaderCheck = detectHeaderRow(data, i + 1);
      if (nextHeaderCheck.isHeader) {
        // New table detected, end current table
        break;
      }
      
      // Check if there are more data rows after this closing row
      const hasMoreData = checkForMoreDataRows(data, i + 1);
      if (!hasMoreData) {
        break;
      }
    } else {
      // Regular data row
      dataEndRow = i;
    }
  }
  
  // Generate table name
  const tableName = generateTableName(sheetName, columns, dataEndRow - headerRow);
  
  return {
    tableName,
    headerRow,
    dataStartRow: headerRow + 1,
    dataEndRow,
    closingRows,
    columns,
    confidence: headerResult.confidence,
  };
}

/**
 * Detect if a row is a header row
 */
function detectHeaderRow(
  data: unknown[][],
  startRow: number
): {
  isHeader: boolean;
  rowIndex: number;
  columns: ColumnInfo[];
  confidence: number;
} {
  // Check up to 5 rows for header
  for (let i = startRow; i < Math.min(startRow + 5, data.length); i++) {
    const row = data[i];
    
    if (!row || row.length === 0) {
      continue;
    }
    
    const columns: ColumnInfo[] = [];
    let textCellCount = 0;
    let headerKeywordCount = 0;
    let nonEmptyCellCount = 0;
    
    for (let col = 0; col < row.length; col++) {
      const cell = row[col];
      
      if (cell !== null && cell !== undefined && cell !== '') {
        nonEmptyCellCount++;
        
        if (typeof cell === 'string') {
          textCellCount++;
          
          const cellText = String(cell).trim().toLowerCase();
          
          // Check if contains header keywords
          if (HEADER_KEYWORDS.some(keyword => cellText.includes(keyword))) {
            headerKeywordCount++;
          }
          
          // Detect column type from header name
          const columnType = detectColumnType(String(cell));
          
          columns.push({
            name: String(cell).trim(),
            index: col,
            type: columnType,
          });
        }
      }
    }
    
    // Header criteria:
    // 1. At least 30% of cells are text
    // 2. At least 2 non-empty cells
    // 3. At least 1 header keyword found
    // 4. Next row should have data
    const textRatio = nonEmptyCellCount > 0 ? textCellCount / nonEmptyCellCount : 0;
    const hasHeaderKeywords = headerKeywordCount > 0;
    const isHeader = textRatio >= 0.3 && nonEmptyCellCount >= 2 && hasHeaderKeywords;
    
    if (!isHeader) {
      continue;
    }
    
    // Check if next row has data
    let hasDataBelow = false;
    if (i + 1 < data.length) {
      const nextRow = data[i + 1];
      const nextRowHasNumbers = nextRow.some(cell => typeof cell === 'number' && cell > 0);
      const nextRowHasText = nextRow.some(cell => typeof cell === 'string' && String(cell).length > 0);
      hasDataBelow = nextRowHasNumbers || nextRowHasText;
    }
    
    if (!hasDataBelow) {
      continue;
    }
    
    // Calculate confidence
    const confidence = Math.min(
      0.5 + (textRatio * 0.2) + (headerKeywordCount * 0.1),
      1.0
    );
    
    return {
      isHeader: true,
      rowIndex: i,
      columns,
      confidence,
    };
  }
  
  return {
    isHeader: false,
    rowIndex: -1,
    columns: [],
    confidence: 0,
  };
}

/**
 * Detect column type from header name
 */
function detectColumnType(columnName: string): ColumnInfo['type'] {
  const lower = columnName.toLowerCase();
  
  // Percentage columns
  if (lower.includes('%') || lower.includes('เปอร์เซ็นต์') || lower.includes('ร้อยละ') || lower.includes('สัดส่วน')) {
    return 'percentage';
  }
  
  // Currency columns
  if (
    lower.includes('บาท') ||
    lower.includes('จำนวนเงิน') ||
    lower.includes('ยอด') ||
    lower.includes('มูลค่า') ||
    lower.includes('ราคา') ||
    lower.includes('วงเงิน') ||
    lower.includes('ภาษี') ||
    lower.includes('ทุน') ||
    lower.includes('หนี้') ||
    lower.includes('สินทรัพย์') ||
    lower.includes('รายได้') ||
    lower.includes('ค่าใช้จ่าย') ||
    lower.includes('กำไร') ||
    lower.includes('ขาดทุน') ||
    lower.includes('amount') ||
    lower.includes('value') ||
    lower.includes('price')
  ) {
    return 'currency';
  }
  
  // Date columns
  if (
    lower.includes('วันที่') ||
    lower.includes('เดือน') ||
    lower.includes('ปี') ||
    lower.includes('งวด') ||
    lower.includes('ระยะเวลา') ||
    lower.includes('date') ||
    lower.includes('month') ||
    lower.includes('year')
  ) {
    return 'date';
  }
  
  // Number columns
  if (
    lower.includes('จำนวน') ||
    lower.includes('ลำดับ') ||
    lower.includes('เลขที่') ||
    lower.includes('อายุ') ||
    lower.includes('คน') ||
    lower.includes('number') ||
    lower.includes('no') ||
    lower.includes('count')
  ) {
    return 'number';
  }
  
  // Default to string
  return 'string';
}

/**
 * Detect if a row is a closing row
 */
function detectClosingRow(row: unknown[]): {
  isClosing: boolean;
  keyword?: string;
  type?: ClosingRow['type'];
} {
  // Check first 3 cells for closing keywords
  for (let i = 0; i < Math.min(3, row.length); i++) {
    const cell = row[i];
    
    if (typeof cell === 'string') {
      const cellText = String(cell).trim().toLowerCase();
      
      // Check each keyword category
      for (const [type, keywords] of Object.entries(CLOSING_KEYWORDS)) {
        for (const keyword of keywords) {
          if (cellText.includes(keyword.toLowerCase())) {
            return {
              isClosing: true,
              keyword,
              type: type as ClosingRow['type'],
            };
          }
        }
      }
    }
  }
  
  return {
    isClosing: false,
  };
}

/**
 * Check if row is empty
 */
function isEmptyRow(row: unknown[]): boolean {
  if (!row || row.length === 0) {
    return true;
  }
  
  return row.every(cell => cell === null || cell === undefined || cell === '' || cell === 0);
}

/**
 * Check if there are more data rows after current position
 */
function checkForMoreDataRows(data: unknown[][], startRow: number): boolean {
  // Look ahead up to 3 rows
  for (let i = startRow; i < Math.min(startRow + 3, data.length); i++) {
    const row = data[i];
    
    if (!isEmptyRow(row)) {
      // Check if it's a data row (has numbers or meaningful text)
      const hasNumbers = row.some(cell => typeof cell === 'number' && cell > 0);
      const hasText = row.some(cell => typeof cell === 'string' && String(cell).length > 2);
      
      if (hasNumbers || hasText) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Generate table name
 */
function generateTableName(sheetName: string, columns: ColumnInfo[], rowCount: number): string {
  // Try to use meaningful column names
  const meaningfulColumns = columns
    .filter(col => col.name.length > 2 && !col.name.match(/^\d+$/))
    .slice(0, 2)
    .map(col => col.name);
  
  if (meaningfulColumns.length > 0) {
    return `${sheetName}_${meaningfulColumns.join('_')}`;
  }
  
  return `${sheetName}_table_${rowCount}rows`;
}

/**
 * Extract data from detected table
 */
export function extractTableData(
  data: unknown[][],
  table: DetectedTable
): Record<string, unknown>[] {
  const tableData: Record<string, unknown>[] = [];
  
  for (let i = table.dataStartRow; i <= table.dataEndRow; i++) {
    const row = data[i];
    
    if (!row || isEmptyRow(row)) {
      continue;
    }
    
    const rowData: Record<string, unknown> = {};
    
    for (const col of table.columns) {
      if (col.index >= row.length) {
        rowData[col.name] = null;
        continue;
      }
      
      const cellValue = row[col.index];
      rowData[col.name] = parseCellValue(cellValue, col.type);
    }
    
    // Only add if row has at least one non-null value
    if (Object.values(rowData).some(v => v !== null && v !== undefined && v !== '')) {
      tableData.push(rowData);
    }
  }
  
  return tableData;
}

/**
 * Parse cell value based on column type
 */
function parseCellValue(value: unknown, type: ColumnInfo['type']): unknown {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  switch (type) {
    case 'number':
    case 'currency':
      return safeParseNumber(value);
    
    case 'percentage':
      return safeParsePercentage(value);
    
    case 'date':
      return parseDateValue(value);
    
    case 'string':
    default:
      return String(value).trim();
  }
}

/**
 * Safe parse number
 */
function safeParseNumber(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[,\s฿บาท]/g, '')
      .replace(/ล้าน/g, '')
      .trim();
    
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) {
      return null;
    }
    
    // Handle millions
    if (value.includes('ล้าน')) {
      return parsed * 1000000;
    }
    
    return parsed;
  }
  
  return null;
}

/**
 * Safe parse percentage
 */
function safeParsePercentage(value: unknown): number | null {
  const num = safeParseNumber(value);
  
  if (num === null) {
    return null;
  }
  
  // If value contains %, it's already a percentage
  if (typeof value === 'string' && value.includes('%')) {
    return num;
  }
  
  // If value is between 0-1, convert to percentage
  if (num > 0 && num <= 1) {
    return num * 100;
  }
  
  return num;
}

/**
 * Parse date value
 */
function parseDateValue(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (typeof value === 'string') {
    return value.trim();
  }
  
  return null;
}

/**
 * Extract closing row values
 */
export function extractClosingRowValues(
  data: unknown[][],
  closingRow: ClosingRow,
  columns: ColumnInfo[]
): Record<string, unknown> {
  const row = data[closingRow.rowIndex];
  const values: Record<string, unknown> = {};
  
  if (!row) {
    return values;
  }
  
  for (const col of columns) {
    if (col.index < row.length) {
      values[col.name] = parseCellValue(row[col.index], col.type);
    }
  }
  
  return values;
}

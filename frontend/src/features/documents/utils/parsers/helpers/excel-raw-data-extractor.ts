/**
 * Raw Data Extractor - เก็บข้อมูลแบบเต็มจาก Excel
 * ใช้สำหรับแสดงตารางและข้อความที่ parser ปกติไม่ได้เก็บ
 */

import { WorkBook, WorkSheet } from '../core/exceljs-adapter';
import { fillMergedCells, getSheetDataWithMergedCells } from '../core/excel-merged-cells-handler';

// ===== INTERFACES =====

export interface RawSheetData {
  sheetName: string;
  sheetIndex: number;
  rowCount: number;
  columnCount: number;
  headers: string[];
  rows: RawRow[];
  tables: RawTable[];
  textBlocks: TextBlock[];
  metadata: {
    hasMergedCells: boolean;
    hasFormulas: boolean;
    isEmpty: boolean;
  };
}

export interface RawRow {
  rowIndex: number;
  cells: RawCell[];
  isHeader: boolean;
  isEmpty: boolean;
}

export interface RawCell {
  columnIndex: number;
  value: unknown;
  displayValue: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'formula' | 'empty';
  formula?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    backgroundColor?: string;
  };
}

export interface RawTable {
  name: string;
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
  headers: string[];
  rows: unknown[][];
  confidence: number;
}

export interface TextBlock {
  startRow: number;
  endRow: number;
  content: string;
  type: 'paragraph' | 'list' | 'heading';
}

export interface ExtendedFinancialStatement {
  // Structured (เดิม)
  period: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  netProfit: number;
  
  // Extended (ใหม่)
  otherIncome?: number;
  totalRevenue?: number;
  ebitda?: number;
  financialExpenses?: number;
  interestExpense?: number;
  depreciation?: number;
  amortization?: number;
  profitBeforeTax?: number;
  tax?: number;
  
  // Breakdown
  revenueBreakdown?: Array<{
    item: string;
    amount: number;
    percentage: number;
  }>;
  expenseBreakdown?: Array<{
    item: string;
    amount: number;
    percentage: number;
  }>;
}

export interface ExtendedBalanceSheet {
  // Structured (เดิม)
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  
  // Extended (ใหม่)
  currentAssets?: {
    cash: number;
    accountsReceivable: number;
    inventory: number;
    otherCurrentAssets: number;
    total: number;
  };
  nonCurrentAssets?: {
    ppe: number;
    intangibleAssets: number;
    investments: number;
    otherNonCurrentAssets: number;
    total: number;
  };
  currentLiabilities?: {
    accountsPayable: number;
    shortTermLoans: number;
    otherCurrentLiabilities: number;
    total: number;
  };
  nonCurrentLiabilities?: {
    longTermLoans: number;
    otherNonCurrentLiabilities: number;
    total: number;
  };
  equityBreakdown?: {
    registeredCapital: number;
    retainedEarnings: number;
    otherEquity: number;
    total: number;
  };
}

export interface ExecutiveProfile {
  name: string;
  position: string;
  dateOfBirth?: string;
  age?: number;
  maritalStatus?: string;
  idCard?: string;
  address?: string;
  registeredAddress?: string;
  education?: string;
  experience?: string;
  shareholding?: {
    shares: number;
    percentage: number;
    value: number;
  };
}

export interface LoanRationale {
  purpose: string;
  usageDetails: string;
  repaymentCapability: string;
  businessStrengths: string[];
  businessWeaknesses: string[];
  riskFactors: string[];
  mitigationPlans: string[];
}

export interface DetailedApprovalComments {
  // Structured (เดิม)
  marketingOfficer?: {
    name: string;
    comments: string;
    date: string;
  };
  creditOfficer?: {
    name: string;
    riskAssessment: string;
    comments: string;
    recommendation: string;
    date: string;
  };
  branchManager?: {
    name: string;
    comments: string;
    recommendation: string;
    date: string;
  };
  approver?: {
    name: string;
    position: string;
    decision: string;
    approvedAmount: number;
    specialConditions: string;
    approvalDate: string;
  };
  
  // Extended (ใหม่)
  fullText: string;
  loanDetails: Array<{
    loanType: string;
    amount: number;
    purpose: string;
    term: string;
    interestRate: string;
    conditions: string[];
  }>;
  collateralDetails: Array<{
    type: string;
    description: string;
    owner: string;
    estimatedValue?: number;
  }>;
  guarantorDetails: Array<{
    name: string;
    relationship: string;
    guaranteeAmount: number;
  }>;
  machineryList?: Array<{
    order: number;
    item: string;
    ownFunding: number;
    loanAmount: number;
    total: number;
  }>;
  shareholderSigningAuthority?: Array<{
    name: string;
    sharePercentage: number;
    shareValue: number;
    signingAuthority: string;
    conditions: string;
  }>;
}

// ===== MAIN EXTRACTOR =====

export function extractRawData(workbook: WorkBook): {
  sheets: RawSheetData[];
  summary: {
    totalSheets: number;
    totalRows: number;
    totalTables: number;
    totalTextBlocks: number;
  };
} {
  console.log('[Raw Data Extractor] Starting extraction...');
  
  const sheets: RawSheetData[] = [];
  let totalRows = 0;
  let totalTables = 0;
  let totalTextBlocks = 0;
  
  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];
    
    const rawSheet = extractSheetData(sheet, sheetName, i);
    sheets.push(rawSheet);
    
    totalRows += rawSheet.rowCount;
    totalTables += rawSheet.tables.length;
    totalTextBlocks += rawSheet.textBlocks.length;
  }
  
  console.log(`[Raw Data Extractor] ✅ Extracted ${sheets.length} sheets, ${totalRows} rows, ${totalTables} tables, ${totalTextBlocks} text blocks`);
  
  return {
    sheets,
    summary: {
      totalSheets: sheets.length,
      totalRows,
      totalTables,
      totalTextBlocks,
    },
  };
}

function extractSheetData(sheet: WorkSheet, sheetName: string, sheetIndex: number): RawSheetData {
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  const rows: RawRow[] = [];
  const headers: string[] = [];
  let hasMergedCells = false;
  let hasFormulas = false;
  
  // Extract rows
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const cells: RawCell[] = [];
    let isEmptyRow = true;
    
    for (let j = 0; j < row.length; j++) {
      const cellValue = row[j];
      const cell = extractCellData(cellValue, i, j);
      
      if (cell.type !== 'empty') isEmptyRow = false;
      if (cell.formula) hasFormulas = true;
      
      cells.push(cell);
    }
    
    const isHeader = detectHeaderRow(cells, i, data);
    
    rows.push({
      rowIndex: i,
      cells,
      isHeader,
      isEmpty: isEmptyRow,
    });
    
    // Collect headers
    if (isHeader && headers.length === 0) {
      for (const cell of cells) {
        if (cell.type === 'string' && cell.displayValue) {
          headers.push(cell.displayValue);
        }
      }
    }
  }
  
  // Extract tables
  const tables = extractTables(data, sheetName);
  
  // Extract text blocks
  const textBlocks = extractTextBlocks(data);
  
  return {
    sheetName,
    sheetIndex,
    rowCount: rows.length,
    columnCount: rows[0]?.cells.length || 0,
    headers,
    rows,
    tables,
    textBlocks,
    metadata: {
      hasMergedCells,
      hasFormulas,
      isEmpty: rows.every(r => r.isEmpty),
    },
  };
}

function extractCellData(value: unknown, rowIndex: number, columnIndex: number): RawCell {
  let type: RawCell['type'] = 'empty';
  let displayValue = '';
  let formula: string | undefined;
  
  if (value === null || value === undefined || value === '') {
    type = 'empty';
  } else if (typeof value === 'string') {
    if (value.startsWith('=')) {
      type = 'formula';
      formula = value;
      displayValue = value;
    } else {
      type = 'string';
      displayValue = value;
    }
  } else if (typeof value === 'number') {
    type = 'number';
    displayValue = value.toString();
  } else if (typeof value === 'boolean') {
    type = 'boolean';
    displayValue = value.toString();
  } else if (value instanceof Date) {
    type = 'date';
    displayValue = value.toISOString();
  } else {
    type = 'string';
    displayValue = String(value);
  }
  
  return {
    columnIndex,
    value,
    displayValue,
    type,
    formula,
  };
}

function detectHeaderRow(cells: RawCell[], rowIndex: number, allData: unknown[][]): boolean {
  // Header detection logic
  const textCells = cells.filter(c => c.type === 'string' && c.displayValue.length > 0);
  
  // If more than 30% of cells are text and row is in first 20 rows
  if (textCells.length >= cells.length * 0.3 && rowIndex < 20) {
    // Check if next row has numbers (data row)
    if (rowIndex + 1 < allData.length) {
      const nextRow = allData[rowIndex + 1];
      const numberCount = nextRow.filter(cell => typeof cell === 'number').length;
      if (numberCount >= nextRow.length * 0.3) {
        return true;
      }
    }
  }
  
  return false;
}

function extractTables(data: unknown[][], sheetName: string): RawTable[] {
  const tables: RawTable[] = [];
  
  let currentTable: Partial<RawTable> | null = null;
  let headerRow: number = -1;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) {
      // Empty row might end a table
      if (currentTable && currentTable.rows && currentTable.rows.length > 0) {
        tables.push(currentTable as RawTable);
        currentTable = null;
        headerRow = -1;
      }
      continue;
    }
    
    // Detect header row
    const textCells = row.filter(cell => typeof cell === 'string' && String(cell).length > 0);
    if (textCells.length >= row.length * 0.3 && !currentTable) {
      // Start new table
      headerRow = i;
      currentTable = {
        name: `${sheetName}_table_${tables.length + 1}`,
        startRow: i,
        startColumn: 0,
        headers: row.map(cell => String(cell || '')),
        rows: [],
        confidence: 0.8,
      };
      continue;
    }
    
    // Add data row to current table
    if (currentTable && headerRow >= 0) {
      currentTable.rows!.push(row);
      currentTable.endRow = i;
      currentTable.endColumn = row.length - 1;
    }
  }
  
  // Add last table if exists
  if (currentTable && currentTable.rows && currentTable.rows.length > 0) {
    tables.push(currentTable as RawTable);
  }
  
  return tables;
}

function extractTextBlocks(data: unknown[][]): TextBlock[] {
  const textBlocks: TextBlock[] = [];
  
  let currentBlock: Partial<TextBlock> | null = null;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) {
      // End current block
      if (currentBlock && currentBlock.content) {
        textBlocks.push(currentBlock as TextBlock);
        currentBlock = null;
      }
      continue;
    }
    
    // Check if row is text (not numbers)
    const firstCell = row[0];
    if (typeof firstCell === 'string' && firstCell.length > 10) {
      const hasNumbers = row.some(cell => typeof cell === 'number');
      
      if (!hasNumbers) {
        // Text row
        if (!currentBlock) {
          currentBlock = {
            startRow: i,
            content: String(firstCell),
            type: 'paragraph',
          };
        } else {
          currentBlock.content += '\n' + String(firstCell);
          currentBlock.endRow = i;
        }
      } else {
        // Mixed row, end block
        if (currentBlock && currentBlock.content) {
          textBlocks.push(currentBlock as TextBlock);
          currentBlock = null;
        }
      }
    }
  }
  
  // Add last block
  if (currentBlock && currentBlock.content) {
    textBlocks.push(currentBlock as TextBlock);
  }
  
  return textBlocks;
}

// ===== HELPER FUNCTIONS =====

export function findSheetByName(sheets: RawSheetData[], pattern: string | RegExp): RawSheetData | undefined {
  return sheets.find(sheet => {
    if (typeof pattern === 'string') {
      return sheet.sheetName.includes(pattern);
    } else {
      return pattern.test(sheet.sheetName);
    }
  });
}

export function findTableInSheet(sheet: RawSheetData, tableName?: string): RawTable | undefined {
  if (!tableName) return sheet.tables[0];
  return sheet.tables.find(table => table.name.includes(tableName));
}

export function getTextBlocksInRange(sheet: RawSheetData, startRow: number, endRow: number): TextBlock[] {
  return sheet.textBlocks.filter(block => 
    block.startRow >= startRow && block.endRow <= endRow
  );
}

export function getCellValue(sheet: RawSheetData, rowIndex: number, columnIndex: number): unknown {
  const row = sheet.rows[rowIndex];
  if (!row) return null;
  
  const cell = row.cells[columnIndex];
  if (!cell) return null;
  
  return cell.value;
}

export function findRowsByPattern(sheet: RawSheetData, pattern: string | RegExp): RawRow[] {
  return sheet.rows.filter(row => {
    const firstCell = row.cells[0];
    if (!firstCell || firstCell.type !== 'string') return false;
    
    if (typeof pattern === 'string') {
      return firstCell.displayValue.includes(pattern);
    } else {
      return pattern.test(firstCell.displayValue);
    }
  });
}

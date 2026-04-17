/**
 * Excel Parsers - Main Export
 * Centralized export for all parser modules
 */

// Main parser
// Main parser
export { parseExcel, formatCurrency } from './excel-parser';
export type { ParsedBusinessProfile } from './excel-parser';

// Core utilities
export {
  readExcelFile,
  getCellValue,
  getCellValueByAddress,
  encodeAddress,
  getSheetRange,
  sheetToJson,
  fillMergedCells,
  getSheetData,
  safeParseNumber,
  getMergedCellsStats,
} from './core/exceljs-adapter';

export type {
  WorkBook,
  WorkSheet,
} from './core/exceljs-adapter';

export {
  detectTablesInSheet,
  extractTableData,
  extractClosingRowValues,
  CLOSING_KEYWORDS,
} from './core/excel-table-detector';

export type {
  DetectedTable,
  ColumnInfo,
  ClosingRow,
} from './core/excel-table-detector';

export {
  getSheetDataWithMergedCells,
  extractDataFromHeaderRow,
  sheetToStructuredData,
} from './core/excel-merged-cells-handler';

// Extended parsers
export {
  parseVATRecords,
  parseFinancialStatements,
  parseBalanceSheets,
  parseCreditBureauReports,
  parseBankStatements,
  parseDSCR,
  parseSuppliersAndCustomers,
} from './extended/excel-parser-extended';

export {
  parseRevenueProjection,
  parseApprovalComments,
  parseBusinessHistory,
  parseWorkingCapitalRequirements,
  parseInvestmentStructure,
} from './extended/excel-sheet-parsers';

export {
  parseExtendedFinancialStatements,
  parseExtendedBalanceSheets,
  parseExecutiveProfiles,
  parseLoanRationale,
  parseDetailedApprovalComments,
} from './extended/excel-enhanced-parsers';

// Helpers
export {
  calculateConfidence,
} from './helpers/excel-parser-confidence';

export type {
  ConfidenceReport,
} from './helpers/excel-parser-confidence';

export {
  getSheetConfig,
  detectDocumentType,
  validateSheetStructure,
  SHEET_CONFIGS,
} from './helpers/excel-sheet-config';

export type {
  SheetConfig,
} from './helpers/excel-sheet-config';

export {
  extractRawData,
  findSheetByName,
  findTableInSheet,
  getTextBlocksInRange,
  getCellValue as getRawCellValue,
  findRowsByPattern,
} from './helpers/excel-raw-data-extractor';

export type {
  RawSheetData,
  RawRow,
  RawCell,
  RawTable,
  TextBlock,
} from './helpers/excel-raw-data-extractor';

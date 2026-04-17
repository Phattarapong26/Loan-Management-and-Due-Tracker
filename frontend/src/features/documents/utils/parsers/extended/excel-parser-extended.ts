/**
 * Extended parsers for additional sheets - REFACTORED VERSION
 * ✅ Uses merged cells handler
 * ✅ Multiple pattern matching
 * ✅ Robust number extraction
 * ✅ Comprehensive logging
 * ✅ Modular structure with helpers
 * 
 * All parsers have been extracted to separate files in ./parsers/
 * All helpers have been extracted to separate files in ./helpers/
 */

// Re-export all specialized parsers
export {
  parseVATRecords,
  parseFinancialStatements,
  parseBalanceSheets,
  parseCreditBureauReports,
  parseBankStatements,
  parseDSCR,
  parseSuppliersAndCustomers,
} from './parsers';

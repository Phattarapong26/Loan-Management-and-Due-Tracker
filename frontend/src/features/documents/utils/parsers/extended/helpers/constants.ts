/**
 * Constants for Excel parsing
 */

export const PARSING_CONSTANTS = {
  MAX_TIMESTAMP_VALUE: 1_000_000_000,
  MIN_MEANINGFUL_VALUE: 100,
  MIN_PERCENTAGE: 0.1,
  MAX_PERCENTAGE: 1,
  MIN_DSCR: 0.1,
  MAX_DSCR: 15,
  MIN_DATA_POINTS: 3,
  MAX_YEAR_COLUMNS: 3,
  MAX_BALANCE_SHEET_YEARS: 2,
  MAX_HEADER_SEARCH_ROWS: 10,
  MAX_COMPANY_INFO_SEARCH_ROWS: 30,
} as const;

export const THAI_KEYWORDS = {
  company: /บริษัท\s+([^\s]+(?:\s+[^\s]+)*?)\s+จำกัด/,
  taxId: /(\d{13})/,
  person: /(นาย|นาง|นางสาว|น\.ส\.)[\s]*([^\s]+)[\s]+([^\s]+)/,
  reportDate: /ตรวจสอบ\s*ณ\s*วันที่\s*(\d{1,2}\s*[ก-ฮ\.]+\s*\d{2,4})/,
  year: /ปี\s*(25\d{2})/,
  months: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
} as const;

export const FINANCIAL_CATEGORIES = {
  REVENUE: 'revenue',
  COGS: 'cogs',
  EXPENSE: 'expense',
  PROFIT: 'profit',
  OTHER: 'other',
  BALANCE_SHEET: 'balance-sheet',
} as const;

export const DSCR_STATUS = {
  EXCELLENT: { threshold: 1.25, label: 'ดีมาก' },
  ACCEPTABLE: { threshold: 1.0, label: 'พอใช้' },
  PROBLEMATIC: { threshold: 0, label: 'มีปัญหา' },
  NO_DATA: { threshold: -1, label: 'ไม่พบข้อมูล' },
} as const;

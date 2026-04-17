/**
 * Text extraction utilities for Thai and English patterns
 */

import { THAI_KEYWORDS } from './constants';

/**
 * Extract company name from row text
 */
export function extractCompanyName(rowText: string): string | null {
  const match = rowText.match(THAI_KEYWORDS.company);
  return match ? match[0].trim() : null;
}

/**
 * Extract tax ID from row text
 */
export function extractTaxId(rowText: string): string | null {
  const match = rowText.match(THAI_KEYWORDS.taxId);
  return match ? match[1] : null;
}

/**
 * Extract person name from row text
 */
export function extractPersonName(rowText: string): string | null {
  const match = rowText.match(THAI_KEYWORDS.person);
  return match ? `${match[1]}${match[2]} ${match[3]}`.trim() : null;
}

/**
 * Extract report date from row text
 */
export function extractReportDate(rowText: string): string | null {
  const match = rowText.match(THAI_KEYWORDS.reportDate);
  return match ? match[1] : null;
}

/**
 * Extract company info from data rows
 */
export function extractCompanyInfo(
  data: Array<Array<unknown>>,
  maxRows: number = 30
): { companyName: string; taxId: string } {
  let companyName = '';
  let taxId = '';

  for (let i = 0; i < Math.min(maxRows, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const rowText = row.join(' ');

    if (!companyName) {
      const name = extractCompanyName(rowText);
      if (name) companyName = name;
    }

    if (!taxId) {
      const id = extractTaxId(rowText);
      if (id) taxId = id;
    }

    if (companyName && taxId) break;
  }

  return { companyName, taxId };
}

/**
 * Format month/year from Excel date or Thai format
 * Handles: ISO strings, Date objects, Thai format, English format
 */
export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';

  // Try to parse as date
  let date: Date | null = null;
  
  // Case 1: ISO string with timezone (2024-01-01T00:00:00.000Z or 1968-01-01T00:00:00.000Z)
  if (typeof dateStr === 'string' && (dateStr.includes('T') || dateStr.includes('Z'))) {
    date = new Date(dateStr);
  }
  // Case 2: Already formatted (Jan-68, ม.ค. 68, ม.ค.-68)
  else if (typeof dateStr === 'string' && dateStr.match(/^[a-zA-Zก-ฮ\.]+\s*-?\s*\d{2}$/)) {
    return dateStr;
  }
  // Case 3: Try parsing as date string
  else if (typeof dateStr === 'string') {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }
  
  // Format date if successfully parsed
  if (date && !isNaN(date.getTime())) {
    const month = THAI_KEYWORDS.months[date.getMonth()];
    const year = (date.getFullYear() + 543).toString().slice(-2);
    return `${month} ${year}`;
  }
  
  // Return as-is if can't parse
  return String(dateStr);
}

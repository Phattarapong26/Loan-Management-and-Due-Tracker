/**
 * Column detection and verification utilities
 */

import { THAI_KEYWORDS, PARSING_CONSTANTS } from './constants';
import { safeParseNumber, isValidDataValue } from './number-utils';

/**
 * Find year columns in data rows
 */
export function findYearColumns(
  data: Array<Array<unknown>>,
  startRow: number,
  endRow: number
): Array<{ col: number; year: string }> {
  const yearColumns: Array<{ col: number; year: string }> = [];
  const seenYears = new Set<string>();

  for (let i = startRow; i < Math.min(startRow + PARSING_CONSTANTS.MAX_HEADER_SEARCH_ROWS, endRow); i++) {
    const row = data[i];
    if (!row) continue;

    for (let col = 0; col < row.length; col++) {
      const cellStr = String(row[col] || '').trim();
      const match = cellStr.match(THAI_KEYWORDS.year);
      if (match) {
        const year = match[1];
        const yearLabel = `ปี ${year}`;

        if (!seenYears.has(year)) {
          seenYears.add(year);
          yearColumns.push({ col, year: yearLabel });
        }
      }
    }

    if (yearColumns.length > 0) break;
  }

  return yearColumns;
}

/**
 * Verify which columns have actual data
 */
export function verifyYearColumns(
  data: Array<Array<unknown>>,
  yearColumns: Array<{ col: number; year: string }>,
  startRow: number,
  endRow: number,
  maxYears?: number
): Array<{ col: number; year: string }> {
  const verifiedColumns: Array<{ col: number; year: string }> = [];
  const usedColumns = new Set<number>();

  for (const yearCol of yearColumns) {
    let dataCol = -1;
    let maxValue = 0;

    // Check columns near the year header
    for (let testCol = yearCol.col; testCol <= yearCol.col + 1; testCol++) {
      if (usedColumns.has(testCol)) continue;

      let sum = 0;
      let count = 0;

      for (let testRow = startRow; testRow < Math.min(startRow + 10, endRow); testRow++) {
        const value = safeParseNumber(data[testRow]?.[testCol]);
        if (isValidDataValue(value)) {
          sum += value;
          count++;
        }
      }

      if (count >= PARSING_CONSTANTS.MIN_DATA_POINTS && sum > maxValue) {
        maxValue = sum;
        dataCol = testCol;
      }
    }

    if (dataCol === -1 || maxValue === 0) continue;

    verifiedColumns.push({ col: dataCol, year: yearCol.year });
    usedColumns.add(dataCol);
  }

  // Limit to max years if specified
  if (maxYears && verifiedColumns.length > maxYears) {
    verifiedColumns.splice(maxYears);
  }

  return verifiedColumns;
}

/**
 * Find column by keywords
 */
export function findColumnByKeywords(
  columns: Array<{ name: string; index: number }>,
  keywords: string[]
): { name: string; index: number } | undefined {
  return columns.find(col => {
    const name = col.name.toLowerCase();
    return keywords.some(keyword => name.includes(keyword));
  });
}

/**
 * Find multiple columns by pattern
 */
export function findColumnsByPattern(
  columns: Array<{ name: string; index: number }>,
  pattern: RegExp
): Array<{ name: string; index: number }> {
  return columns.filter(col => pattern.test(col.name.toLowerCase()));
}

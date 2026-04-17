/**
 * Number parsing and validation utilities
 */

import { PARSING_CONSTANTS } from './constants';

/**
 * Safely parse a value to number
 */
export function safeParseNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[,\s฿]/g, '')
      .replace(/บาท/g, '')
      .replace(/ล้าน/g, '')
      .trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  // Handle formula objects that weren't resolved
  if (value && typeof value === 'object' && 'result' in (value as Record<string, unknown>)) {
    return safeParseNumber((value as Record<string, unknown>).result);
  }
  return 0;
}

/**
 * Check if value is a valid data value (not timestamp, not percentage)
 */
export function isValidDataValue(value: number): boolean {
  return (
    value > PARSING_CONSTANTS.MIN_MEANINGFUL_VALUE &&
    value < PARSING_CONSTANTS.MAX_TIMESTAMP_VALUE
  );
}

/**
 * Check if value is a percentage (0 < value <= 1)
 */
export function isPercentageValue(value: number): boolean {
  return value > 0 && value <= PARSING_CONSTANTS.MAX_PERCENTAGE;
}

/**
 * Extract numbers from a row
 */
export function extractNumbersFromRow(row: Array<unknown>): number[] {
  const numbers: number[] = [];
  for (const cell of row) {
    const num = safeParseNumber(cell);
    if (isValidDataValue(num)) {
      numbers.push(num);
    }
  }
  return numbers;
}

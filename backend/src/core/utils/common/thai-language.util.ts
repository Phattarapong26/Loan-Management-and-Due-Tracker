/**
 * Thai Language Support Utilities (Backend)
 * 
 * Utilities for Thai language support including date formatting
 */

import { format } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Convert Gregorian year to Buddhist Era year
 */
export function toBuddhistYear(year: number): number {
  return year + 543;
}

/**
 * Convert Buddhist Era year to Gregorian year
 */
export function toGregorianYear(buddhistYear: number): number {
  return buddhistYear - 543;
}

/**
 * Format date in Thai Buddhist calendar
 */
export function formatThaiDate(
  date: Date,
  formatStr: string = 'd MMMM yyyy',
  options: { showBuddhistEra?: boolean; showGregorianYear?: boolean } = {}
): string {
  const { showBuddhistEra = true, showGregorianYear = false } = options;

  const formatted = format(date, formatStr, { locale: th });
  
  if (!showBuddhistEra) {
    return formatted;
  }

  const gregorianYear = date.getFullYear();
  const buddhistYear = toBuddhistYear(gregorianYear);

  // Replace Gregorian year with Buddhist year
  const withBuddhistYear = formatted.replace(
    gregorianYear.toString(),
    buddhistYear.toString()
  );

  if (showGregorianYear) {
    return `${withBuddhistYear} (${gregorianYear})`;
  }

  return withBuddhistYear;
}

/**
 * Thai month abbreviations
 */
export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Thai month full names
 */
export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

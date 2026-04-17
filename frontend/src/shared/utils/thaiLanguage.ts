/**
 * Thai Language Support Utilities
 * 
 * Utilities for Thai language support including fonts, formatting, and search
 * 
 * Features:
 * - Thai-friendly fonts configuration
 * - Thai Buddhist calendar formatting
 * - Thai Baht symbol formatting
 * - Thai keyword search with tone marks
 * - Implements Property 51: Thai Language Support
 * 
 * @module thaiLanguage
 */

import { format } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Thai-friendly font families
 * Recommended fonts with proper Thai character support
 */
export const THAI_FONTS = {
  sarabun: '"Sarabun", sans-serif',
  prompt: '"Prompt", sans-serif',
  kanit: '"Kanit", sans-serif',
  default: '"Sarabun", "Prompt", "Kanit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/**
 * Thai text CSS configuration
 */
export const THAI_TEXT_CONFIG = {
  fontFamily: THAI_FONTS.default,
  lineHeight: '1.7', // Proper line height for Thai characters
  letterSpacing: '0.01em',
};

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

/**
 * Thai day of week abbreviations
 */
export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/**
 * Thai day of week full names
 */
export const THAI_DAYS_FULL = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ',
  'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

/**
 * Format number as Thai Baht currency
 */
export function formatThaiCurrency(
  amount: number,
  options: {
    showSymbol?: boolean;
    showUnit?: boolean;
    decimals?: number;
  } = {}
): string {
  const {
    showSymbol = true,
    showUnit = true,
    decimals = 2,
  } = options;

  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  let result = formatted;

  if (showSymbol) {
    result = `฿${result}`;
  }

  if (showUnit) {
    result = `${result} บาท`;
  }

  return result;
}

/**
 * Convert Arabic numerals to Thai numerals
 */
export function toThaiNumerals(num: number | string): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().replace(/\d/g, (digit) => thaiDigits[parseInt(digit)]);
}

/**
 * Convert Thai numerals to Arabic numerals
 */
export function fromThaiNumerals(str: string): string {
  const thaiToArabic: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
  };
  return str.replace(/[๐-๙]/g, (digit) => thaiToArabic[digit] || digit);
}

/**
 * Normalize Thai text for search
 * Handles tone marks and vowels correctly
 */
export function normalizeThaiText(text: string): string {
  // Remove extra whitespace
  let normalized = text.trim().replace(/\s+/g, ' ');

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  // Normalize Thai characters (NFD normalization)
  normalized = normalized.normalize('NFD');

  return normalized;
}

/**
 * Thai keyword search
 * Properly handles Thai tone marks and vowels
 */
export function searchThaiText(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;

  const normalizedText = normalizeThaiText(text);
  const normalizedKeyword = normalizeThaiText(keyword);

  return normalizedText.includes(normalizedKeyword);
}

/**
 * Highlight Thai search matches
 */
export function highlightThaiMatch(
  text: string,
  keyword: string,
  highlightClass: string = 'bg-yellow-200'
): string {
  if (!keyword) return text;

  const normalizedKeyword = normalizeThaiText(keyword);
  const regex = new RegExp(`(${normalizedKeyword})`, 'gi');

  return text.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
}

/**
 * Thai text truncation with proper word boundaries
 */
export function truncateThaiText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) return text;

  // Try to break at word boundary (space)
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + suffix;
  }

  return truncated + suffix;
}

/**
 * Check if text contains Thai characters
 */
export function containsThaiCharacters(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Get Thai text statistics
 */
export function getThaiTextStats(text: string): {
  totalChars: number;
  thaiChars: number;
  englishChars: number;
  numbers: number;
  spaces: number;
  hasThaiNumerals: boolean;
} {
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const numbers = (text.match(/[0-9]/g) || []).length;
  const spaces = (text.match(/\s/g) || []).length;
  const hasThaiNumerals = /[๐-๙]/.test(text);

  return {
    totalChars: text.length,
    thaiChars,
    englishChars,
    numbers,
    spaces,
    hasThaiNumerals,
  };
}

/**
 * Thai polite particles
 */
export const THAI_POLITE_PARTICLES = {
  male: 'ครับ',
  female: 'ค่ะ',
  question: 'ไหม',
  please: 'กรุณา',
  respectful: 'นะคะ',
};

/**
 * Add polite particle to Thai sentence
 */
export function addPoliteParticle(
  sentence: string,
  gender: 'male' | 'female' = 'female'
): string {
  const particle = THAI_POLITE_PARTICLES[gender];
  
  // Check if sentence already ends with a polite particle
  if (sentence.endsWith('ครับ') || sentence.endsWith('ค่ะ') || sentence.endsWith('นะคะ')) {
    return sentence;
  }

  // Remove trailing punctuation
  const cleaned = sentence.replace(/[.!?]+$/, '');

  return `${cleaned}${particle}`;
}

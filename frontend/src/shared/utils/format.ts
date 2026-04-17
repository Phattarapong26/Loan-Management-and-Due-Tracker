/**
 * Formatting Utilities
 * 
 * Common formatting functions for currency, numbers, dates, etc.
 * 
 * @module format
 */

/**
 * Format number as Thai Baht currency
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "1,000,000.00 บาท")
 * 
 * @example
 * ```ts
 * formatCurrency(1000000) // "1,000,000.00 บาท"
 * formatCurrency(1234.56) // "1,234.56 บาท"
 * ```
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} บาท`;
}

/**
 * Format number with thousand separators
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 * 
 * @example
 * ```ts
 * formatNumber(1000000) // "1,000,000"
 * formatNumber(1234.567, 2) // "1,234.57"
 * ```
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage
 * 
 * @param value - Value to format (0-100 or 0-1)
 * @param decimals - Number of decimal places (default: 2)
 * @param isDecimal - Whether input is in decimal form (0-1) or percentage form (0-100)
 * @returns Formatted percentage string
 * 
 * @example
 * ```ts
 * formatPercentage(12.5) // "12.50%"
 * formatPercentage(0.125, 2, true) // "12.50%"
 * ```
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  isDecimal: boolean = false
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format Thai phone number
 * 
 * @param phone - Phone number (10 digits)
 * @returns Formatted phone number (XXX-XXX-XXXX)
 * 
 * @example
 * ```ts
 * formatPhoneNumber('0812345678') // "081-234-5678"
 * ```
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;
  
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

/**
 * Format Thai ID or Tax ID
 * 
 * @param id - ID number (13 digits)
 * @returns Formatted ID (X-XXXX-XXXXX-XX-X)
 * 
 * @example
 * ```ts
 * formatThaiId('1234567890123') // "1-2345-67890-12-3"
 * ```
 */
export function formatThaiId(id: string): string {
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length !== 13) return id;
  
  return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned.slice(12)}`;
}

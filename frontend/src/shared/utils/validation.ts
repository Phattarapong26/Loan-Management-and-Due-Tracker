/**
 * Validation Utilities for SME Loan Management System
 * 
 * Implements robust validation logic with empathy-tone error messages in Thai.
 * All validators follow the principle: "Explain what's wrong and how to fix it"
 * 
 * @module validation
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestion?: string | number;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Thai National ID (บัตรประชาชน) Validation
 * 
 * Format: X-XXXX-XXXXX-XX-X (13 digits)
 * Uses mod 11 checksum algorithm
 * 
 * Algorithm:
 * 1. Multiply each of the first 12 digits by (13 - position)
 * 2. Sum all products
 * 3. Calculate (11 - (sum % 11)) % 10
 * 4. Compare with the 13th digit (checksum)
 * 
 * @param thaiId - Thai national ID (with or without dashes)
 * @returns Validation result with empathy-tone message
 * 
 * @example
 * validateThaiId('1-1234-56789-12-3') // Valid
 * validateThaiId('1123456789123') // Valid (without dashes)
 * validateThaiId('1-1234-56789-12-4') // Invalid checksum
 */
export function validateThaiId(thaiId: string): ValidationResult {
  // Remove all non-digit characters
  const digits = thaiId.replace(/\D/g, '');

  // Check length
  if (digits.length === 0) {
    return {
      isValid: false,
      message: 'กรุณากรอกเลขบัตรประชาชนด้วยค่ะ 🙏',
      severity: 'error'
    };
  }

  if (digits.length !== 13) {
    return {
      isValid: false,
      message: `เลขบัตรประชาชนต้องมี 13 หลักค่ะ (ตอนนี้มี ${digits.length} หลัก)\nรูปแบบที่ถูกต้อง: X-XXXX-XXXXX-XX-X`,
      severity: 'error'
    };
  }

  // Calculate checksum using mod 11 algorithm
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (13 - i);
  }

  const checksumDigit = (11 - (sum % 11)) % 10;
  const lastDigit = parseInt(digits[12]);

  if (checksumDigit !== lastDigit) {
    return {
      isValid: false,
      message: 'เลขบัตรประชาชนไม่ถูกต้องค่ะ ตัวเลขตรวจสอบไม่ตรงกัน\nกรุณาตรวจสอบอีกครั้งนะคะ 🙏',
      severity: 'error'
    };
  }

  return {
    isValid: true,
    severity: 'info'
  };
}

/**
 * Tax ID (เลขประจำตัวผู้เสียภาษี) Validation
 * 
 * Format: X-XXXX-XXXXX-XX-X (13 digits)
 * Uses same mod 11 checksum algorithm as Thai ID
 * 
 * @param taxId - Tax identification number (with or without dashes)
 * @returns Validation result with empathy-tone message
 * 
 * @example
 * validateTaxId('0-1055-48011-53-1') // Valid
 * validateTaxId('0105548011531') // Valid (without dashes)
 */
export function validateTaxId(taxId: string): ValidationResult {
  // Remove all non-digit characters
  const digits = taxId.replace(/\D/g, '');

  // Check length
  if (digits.length === 0) {
    return {
      isValid: false,
      message: 'กรุณากรอกเลขประจำตัวผู้เสียภาษีด้วยค่ะ 🙏',
      severity: 'error'
    };
  }

  if (digits.length !== 13) {
    return {
      isValid: false,
      message: `เลขประจำตัวผู้เสียภาษีต้องมี 13 หลักค่ะ (ตอนนี้มี ${digits.length} หลัก)\nรูปแบบที่ถูกต้อง: X-XXXX-XXXXX-XX-X`,
      severity: 'error'
    };
  }

  // Calculate checksum using mod 11 algorithm (same as Thai ID)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (13 - i);
  }

  const checksumDigit = (11 - (sum % 11)) % 10;
  const lastDigit = parseInt(digits[12]);

  if (checksumDigit !== lastDigit) {
    return {
      isValid: false,
      message: 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้องค่ะ\nกรุณาตรวจสอบจากหนังสือรับรองบริษัทอีกครั้งนะคะ 🙏',
      severity: 'error'
    };
  }

  return {
    isValid: true,
    severity: 'info'
  };
}

/**
 * Format Thai ID or Tax ID with dashes
 * 
 * @param id - 13-digit ID number
 * @returns Formatted ID: X-XXXX-XXXXX-XX-X
 * 
 * @example
 * formatThaiId('1123456789123') // '1-1234-56789-12-3'
 */
export function formatThaiId(id: string): string {
  const digits = id.replace(/\D/g, '');
  
  if (digits.length !== 13) {
    return id; // Return as-is if not 13 digits
  }

  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
}

/**
 * Phone Number Validation and Formatting
 * 
 * Rules:
 * - Must be exactly 10 digits
 * - Must start with 0
 * - Auto-formats to XXX-XXX-XXXX
 * 
 * @param phone - Phone number (with or without dashes/spaces)
 * @returns Validation result with formatted phone number
 * 
 * @example
 * validatePhoneNumber('0812345678') // Valid, formatted: '081-234-5678'
 * validatePhoneNumber('081-234-5678') // Valid
 * validatePhoneNumber('812345678') // Invalid (doesn't start with 0)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Check if empty
  if (digits.length === 0) {
    return {
      isValid: false,
      message: 'กรุณากรอกเบอร์โทรศัพท์ด้วยค่ะ 🙏',
      severity: 'error'
    };
  }

  // Check length
  if (digits.length !== 10) {
    return {
      isValid: false,
      message: `เบอร์โทรศัพท์ต้องมี 10 หลักค่ะ (ตอนนี้มี ${digits.length} หลัก)\nเช่น 081-234-5678`,
      severity: 'error'
    };
  }

  // Check if starts with 0
  if (!digits.startsWith('0')) {
    return {
      isValid: false,
      message: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 ค่ะ\nเช่น 081-234-5678',
      severity: 'error'
    };
  }

  // Format phone number
  const formatted = formatPhoneNumber(digits);

  return {
    isValid: true,
    suggestion: formatted,
    severity: 'info'
  };
}

/**
 * Format phone number with dashes
 * 
 * @param phone - 10-digit phone number
 * @returns Formatted phone: XXX-XXX-XXXX
 * 
 * @example
 * formatPhoneNumber('0812345678') // '081-234-5678'
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length !== 10) {
    return phone; // Return as-is if not 10 digits
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Email Validation
 * 
 * @param email - Email address
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      message: 'กรุณากรอกอีเมลด้วยค่ะ 🙏',
      severity: 'error'
    };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'รูปแบบอีเมลไม่ถูกต้องค่ะ\nกรุณากรอกในรูปแบบ example@company.com นะคะ',
      severity: 'error'
    };
  }

  return {
    isValid: true,
    severity: 'info'
  };
}

/**
 * Required Field Validation
 * 
 * @param value - Field value
 * @param fieldName - Display name of the field (in Thai)
 * @returns Validation result
 */
export function validateRequired(value: string | number | null | undefined, fieldName: string): ValidationResult {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
    return {
      isValid: false,
      message: `กรุณากรอก${fieldName}ด้วยค่ะ ข้อมูลนี้จำเป็นสำหรับการดำเนินการต่อ 🙏`,
      severity: 'error'
    };
  }

  return {
    isValid: true,
    severity: 'info'
  };
}

/**
 * Company Name Validation
 * 
 * Rules:
 * - Minimum 3 characters
 * - Cannot contain special characters except .,()-
 * 
 * @param companyName - Company name
 * @returns Validation result
 */
export function validateCompanyName(companyName: string): ValidationResult {
  if (!companyName || companyName.trim().length === 0) {
    return {
      isValid: false,
      message: 'กรุณากรอกชื่อบริษัทด้วยค่ะ 🙏',
      severity: 'error'
    };
  }

  if (companyName.trim().length < 3) {
    return {
      isValid: false,
      message: 'ชื่อบริษัทต้องมีอย่างน้อย 3 ตัวอักษรค่ะ',
      severity: 'error'
    };
  }

  // Allow Thai, English, numbers, spaces, and specific special characters
  const validPattern = /^[ก-๙a-zA-Z0-9\s.,()\\-]+$/;
  
  if (!validPattern.test(companyName)) {
    return {
      isValid: false,
      message: 'ชื่อบริษัทไม่สามารถใช้อักขระพิเศษได้ค่ะ (ยกเว้น . , ( ) -)',
      severity: 'error'
    };
  }

  return {
    isValid: true,
    severity: 'info'
  };
}

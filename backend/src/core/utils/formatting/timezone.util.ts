/**
 * Thailand Timezone Utility
 * Handles timezone conversion for Thailand (UTC+7)
 * Optimized for Cloudflare and server environments
 */

const THAILAND_TIMEZONE_OFFSET = 7 * 60; // 7 hours in minutes
const THAILAND_TZ = 'Asia/Bangkok';

export class TimezoneUtil {
  /**
   * Get current Thailand time
   * Uses Intl.DateTimeFormat for better cross-platform support
   */
  static now(): Date {
    // Force timezone to be set
    if (process.env.TZ !== THAILAND_TZ) {
      process.env.TZ = THAILAND_TZ;
    }
    
    // Use Intl API for more reliable timezone conversion
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: THAILAND_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    
    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Convert UTC date to Thailand time
   * More reliable method using Intl API
   */
  static toThailandTime(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    // Use Intl API for reliable timezone conversion
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: THAILAND_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(dateObj);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    
    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Convert Thailand time to UTC
   */
  static toUTC(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    // Assume input is Thailand time, convert to UTC
    const utcTime = new Date(dateObj.getTime() - (THAILAND_TIMEZONE_OFFSET * 60 * 1000));
    return utcTime;
  }

  /**
   * Format date in Thailand timezone
   * Enhanced with more format options
   */
  static format(date: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    const thailandTime = this.toThailandTime(dateObj);
    
    // Enhanced format implementation
    const year = thailandTime.getFullYear();
    const month = String(thailandTime.getMonth() + 1).padStart(2, '0');
    const day = String(thailandTime.getDate()).padStart(2, '0');
    const hours = String(thailandTime.getHours()).padStart(2, '0');
    const minutes = String(thailandTime.getMinutes()).padStart(2, '0');
    const seconds = String(thailandTime.getSeconds()).padStart(2, '0');
    
    // Thai month names
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const thaiMonth = thaiMonths[thailandTime.getMonth()] || 'ไม่ทราบ';
    const buddhistYear = year + 543;
    
    return formatStr
      .replace('yyyy', year.toString())
      .replace('YYYY', buddhistYear.toString()) // Buddhist year
      .replace('MM', month)
      .replace('MMM', thaiMonth) // Thai month name
      .replace('dd', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Get Thailand timezone offset
   */
  static getTimezoneOffset(): string {
    return '+07:00';
  }

  /**
   * Check if current time is within business hours (9 AM - 6 PM Thailand time)
   */
  static isBusinessHours(): boolean {
    const now = this.now();
    const hour = now.getHours();
    return hour >= 9 && hour < 18;
  }

  /**
   * Get next business day at specific hour (Thailand time)
   */
  static getNextBusinessDay(hour: number = 9): Date {
    const now = this.now();
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 1);
    nextDay.setHours(hour, 0, 0, 0);
    
    // Skip weekends
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
  }

  /**
   * Create a date at specific time in Thailand timezone
   */
  static createThailandDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0): Date {
    // Create date in Thailand timezone first
    const date = new Date();
    date.setFullYear(year, month - 1, day);
    date.setHours(hour, minute, 0, 0);
    
    // Return the date as-is since we want it to represent Thailand time
    // The database will store it as UTC, but when we read it back and convert to Thailand time, it will be correct
    return date;
  }

  /**
   * Get start of day in Thailand timezone
   */
  static startOfDay(date?: Date): Date {
    const targetDate = date || this.now();
    const thailandDate = this.toThailandTime(targetDate);
    thailandDate.setHours(0, 0, 0, 0);
    return this.toUTC(thailandDate);
  }

  /**
   * Get end of day in Thailand timezone
   */
  static endOfDay(date?: Date): Date {
    const targetDate = date || this.now();
    const thailandDate = this.toThailandTime(targetDate);
    thailandDate.setHours(23, 59, 59, 999);
    return this.toUTC(thailandDate);
  }

  /**
   * Get formatted time for LINE messages
   */
  static formatForLine(date: Date | string): string {
    return this.format(date, 'dd/MM/yyyy HH:mm');
  }

  /**
   * Check if date is today in Thailand timezone
   */
  static isToday(date: Date | string): boolean {
    const targetDate = this.toThailandTime(date);
    const today = this.now();
    
    return targetDate.getDate() === today.getDate() &&
           targetDate.getMonth() === today.getMonth() &&
           targetDate.getFullYear() === today.getFullYear();
  }

  /**
   * Get days difference in Thailand timezone
   */
  static daysDifference(date1: Date | string, date2: Date | string): number {
    const d1 = this.toThailandTime(date1);
    const d2 = this.toThailandTime(date2);
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

// Export timezone constant
export const THAILAND_TIMEZONE = THAILAND_TZ;
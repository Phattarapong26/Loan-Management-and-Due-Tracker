/**
 * Frontend Timezone Utility
 * Handles timezone conversion for Thailand (UTC+7) on client side
 */

const THAILAND_TZ = 'Asia/Bangkok';

export class TimezoneUtil {
  /**
   * Get current Thailand time
   */
  static now(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: THAILAND_TZ }));
  }

  /**
   * Convert any date to Thailand time
   */
  static toThailandTime(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    return new Date(dateObj.toLocaleString("en-US", { timeZone: THAILAND_TZ }));
  }

  /**
   * Format date in Thailand timezone
   */
  static format(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: THAILAND_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    return dateObj.toLocaleString('th-TH', { ...defaultOptions, ...options });
  }

  /**
   * Format date for display (Thai format)
   */
  static formatDisplay(date: Date | string): string {
    return this.format(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format date for forms (ISO-like format)
   */
  static formatForInput(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    const thailandTime = this.toThailandTime(dateObj);
    
    const year = thailandTime.getFullYear();
    const month = String(thailandTime.getMonth() + 1).padStart(2, '0');
    const day = String(thailandTime.getDate()).padStart(2, '0');
    const hours = String(thailandTime.getHours()).padStart(2, '0');
    const minutes = String(thailandTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
   * Get relative time string (e.g., "2 hours ago")
   */
  static getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    const now = this.now();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'เมื่อสักครู่';
    if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    
    return this.formatDisplay(dateObj);
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
   * Get start of day in Thailand timezone
   */
  static startOfDay(date?: Date): Date {
    const targetDate = date ? this.toThailandTime(date) : this.now();
    targetDate.setHours(0, 0, 0, 0);
    return targetDate;
  }

  /**
   * Get end of day in Thailand timezone
   */
  static endOfDay(date?: Date): Date {
    const targetDate = date ? this.toThailandTime(date) : this.now();
    targetDate.setHours(23, 59, 59, 999);
    return targetDate;
  }

  /**
   * Convert server timestamp to local display
   */
  static fromServerTime(timestamp: string | number): Date {
    const date = new Date(timestamp);
    return this.toThailandTime(date);
  }

  /**
   * Prepare date for server submission (ensure UTC)
   */
  static toServerTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    
    // Validate date before calling toISOString()
    if (isNaN(dateObj.getTime())) {
      console.warn('[TimezoneUtil] Invalid date provided to toServerTime:', date);
      throw new Error('Invalid date provided');
    }
    
    return dateObj.toISOString();
  }
}

/**
 * React hook for timezone utilities
 */
export function useTimezone() {
  return {
    now: TimezoneUtil.now,
    format: TimezoneUtil.format,
    formatDisplay: TimezoneUtil.formatDisplay,
    formatForInput: TimezoneUtil.formatForInput,
    isBusinessHours: TimezoneUtil.isBusinessHours,
    getRelativeTime: TimezoneUtil.getRelativeTime,
    isToday: TimezoneUtil.isToday,
    startOfDay: TimezoneUtil.startOfDay,
    endOfDay: TimezoneUtil.endOfDay,
    fromServerTime: TimezoneUtil.fromServerTime,
    toServerTime: TimezoneUtil.toServerTime,
  };
}

export default TimezoneUtil;
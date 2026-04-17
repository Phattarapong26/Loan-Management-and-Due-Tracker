/**
 * Thailand Time Component
 * Displays time in Thailand timezone with auto-refresh
 */

import React, { useState, useEffect } from 'react';
import { TimezoneUtil } from '@/shared/lib/timezone';

interface ThailandTimeProps {
  date?: Date | string;
  format?: 'display' | 'input' | 'relative' | 'custom';
  customOptions?: Intl.DateTimeFormatOptions;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
  className?: string;
  showTimezone?: boolean;
}

export const ThailandTime: React.FC<ThailandTimeProps> = ({
  date,
  format = 'display',
  customOptions,
  autoRefresh = false,
  refreshInterval = 60,
  className = '',
  showTimezone = false,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(
    date ? TimezoneUtil.toThailandTime(date) : TimezoneUtil.now()
  );

  useEffect(() => {
    if (!autoRefresh || date) return;

    const interval = setInterval(() => {
      setCurrentTime(TimezoneUtil.now());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, date]);

  const formatTime = () => {
    const targetDate = date ? TimezoneUtil.toThailandTime(date) : currentTime;

    switch (format) {
      case 'display':
        return TimezoneUtil.formatDisplay(targetDate);
      case 'input':
        return TimezoneUtil.formatForInput(targetDate);
      case 'relative':
        return TimezoneUtil.getRelativeTime(targetDate);
      case 'custom':
        return TimezoneUtil.format(targetDate, customOptions);
      default:
        return TimezoneUtil.formatDisplay(targetDate);
    }
  };

  const timeString = formatTime();
  const timezoneString = showTimezone ? ' (เวลาไทย)' : '';

  return (
    <span className={className} title={`เวลาไทย: ${TimezoneUtil.formatDisplay(currentTime)}`}>
      {timeString}{timezoneString}
    </span>
  );
};

/**
 * Business Hours Indicator Component
 */
export const BusinessHoursIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isBusinessHours, setIsBusinessHours] = useState(TimezoneUtil.isBusinessHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBusinessHours(TimezoneUtil.isBusinessHours());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${
          isBusinessHours ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-600">
        {isBusinessHours ? 'เวลาทำการ' : 'นอกเวลาทำการ'}
      </span>
    </div>
  );
};

/**
 * Server Time Sync Component
 */
export const ServerTimeSync: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [serverTime, setServerTime] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const response = await fetch('/api/timezone');
        const data = await response.json();
        setServerTime(data.currentTime.thailand);
      } catch (error) {
        console.error('Failed to fetch server time:', error);
        setServerTime('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setLoading(false);
      }
    };

    fetchServerTime();
    const interval = setInterval(fetchServerTime, 30000); // Sync every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className={className}>กำลังโหลด...</div>;
  }

  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      เวลาเซิร์ฟเวอร์: {serverTime}
    </div>
  );
};

export default ThailandTime;
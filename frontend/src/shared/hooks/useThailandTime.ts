/**
 * Thailand Time React Hook
 * Custom hook for managing Thailand timezone in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { TimezoneUtil } from '@/shared/lib/timezone';

interface UseThailandTimeOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

export function useThailandTime(options: UseThailandTimeOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60 } = options;
  const [currentTime, setCurrentTime] = useState<Date>(TimezoneUtil.now());

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCurrentTime(TimezoneUtil.now());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const formatTime = useCallback((date?: Date | string, options?: Intl.DateTimeFormatOptions) => {
    return TimezoneUtil.format(date || currentTime, options);
  }, [currentTime]);

  const formatDisplay = useCallback((date?: Date | string) => {
    return TimezoneUtil.formatDisplay(date || currentTime);
  }, [currentTime]);

  const getRelativeTime = useCallback((date: Date | string) => {
    return TimezoneUtil.getRelativeTime(date);
  }, []);

  return {
    currentTime,
    formatTime,
    formatDisplay,
    getRelativeTime,
    isBusinessHours: TimezoneUtil.isBusinessHours(),
    isToday: (date: Date | string) => TimezoneUtil.isToday(date),
    toServerTime: TimezoneUtil.toServerTime,
    fromServerTime: TimezoneUtil.fromServerTime,
    refresh: () => setCurrentTime(TimezoneUtil.now()),
  };
}

/**
 * Hook for business hours status
 */
export function useBusinessHours() {
  const [isBusinessHours, setIsBusinessHours] = useState(TimezoneUtil.isBusinessHours());

  useEffect(() => {
    const checkBusinessHours = () => {
      setIsBusinessHours(TimezoneUtil.isBusinessHours());
    };

    // Check every minute
    const interval = setInterval(checkBusinessHours, 60000);

    return () => clearInterval(interval);
  }, []);

  return isBusinessHours;
}

/**
 * Hook for server time synchronization
 */
export function useServerTimeSync() {
  const [serverTime, setServerTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServerTime = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/timezone');
      if (!response.ok) {
        throw new Error('Failed to fetch server time');
      }
      
      const data = await response.json();
      setServerTime(data.currentTime.thailand);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch server time:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServerTime();
    
    // Sync every 30 seconds
    const interval = setInterval(fetchServerTime, 30000);
    
    return () => clearInterval(interval);
  }, [fetchServerTime]);

  return {
    serverTime,
    isLoading,
    error,
    refresh: fetchServerTime,
  };
}

export default useThailandTime;
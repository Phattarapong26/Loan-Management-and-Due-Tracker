/**
 * Offline Detection Hook
 * 
 * Detects internet connectivity and manages offline state
 * 
 * Features:
 * - Real-time connectivity detection
 * - Offline/online event listeners
 * - Connection quality estimation
 * - Implements Property 46: Offline State Handling
 * 
 * @module useOfflineDetection
 */

import { useState, useEffect, useCallback } from 'react';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

export interface UseOfflineDetectionOptions {
  /**
   * Callback when going offline
   */
  onOffline?: () => void;

  /**
   * Callback when coming back online
   */
  onOnline?: () => void;

  /**
   * Ping URL to verify connectivity
   * Default: null (use navigator.onLine only)
   */
  pingUrl?: string;

  /**
   * Ping interval in milliseconds
   * Default: 30000 (30 seconds)
   */
  pingInterval?: number;

  /**
   * Ping timeout in milliseconds
   * Default: 5000 (5 seconds)
   */
  pingTimeout?: number;
}

/**
 * Hook for detecting offline/online state
 * 
 * @param options - Configuration options
 * @returns Offline state and utilities
 * 
 * @example
 * ```tsx
 * const { isOffline, isOnline, wasOffline } = useOfflineDetection({
 *   onOffline: () => toast.error('คุณออฟไลน์'),
 *   onOnline: () => toast.success('กลับมาออนไลน์แล้ว'),
 * });
 * 
 * {isOffline && <OfflineIndicator />}
 * ```
 */
export function useOfflineDetection(options: UseOfflineDetectionOptions = {}) {
  const {
    onOffline,
    onOnline,
    pingUrl,
    pingInterval = 30000,
    pingTimeout = 5000,
  } = options;

  const [state, setState] = useState<OfflineState>(() => ({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    wasOffline: false,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
  }));

  /**
   * Get network information if available
   */
  const getNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      return {
        connectionType: connection.type || null,
        effectiveType: connection.effectiveType || null,
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
      };
    }

    return {
      connectionType: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
    };
  }, []);

  /**
   * Ping server to verify connectivity
   */
  const pingServer = useCallback(async (): Promise<boolean> => {
    if (!pingUrl) return navigator.onLine;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), pingTimeout);

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, [pingUrl, pingTimeout]);

  /**
   * Update online state
   */
  const updateOnlineState = useCallback(
    async (isOnline: boolean) => {
      const networkInfo = getNetworkInfo();

      setState(prev => {
        const wasOffline = prev.isOffline;
        const newState = {
          isOnline,
          isOffline: !isOnline,
          wasOffline,
          ...networkInfo,
        };

        // Trigger callbacks
        if (!isOnline && !prev.isOffline && onOffline) {
          onOffline();
        } else if (isOnline && prev.isOffline && onOnline) {
          onOnline();
        }

        return newState;
      });
    },
    [getNetworkInfo, onOffline, onOnline]
  );

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    updateOnlineState(true);
  }, [updateOnlineState]);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    updateOnlineState(false);
  }, [updateOnlineState]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updateOnlineState(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, updateOnlineState]);

  /**
   * Setup periodic ping if URL provided
   */
  useEffect(() => {
    if (!pingUrl) return;

    const interval = setInterval(async () => {
      const isOnline = await pingServer();
      if (isOnline !== state.isOnline) {
        updateOnlineState(isOnline);
      }
    }, pingInterval);

    return () => clearInterval(interval);
  }, [pingUrl, pingInterval, pingServer, state.isOnline, updateOnlineState]);

  /**
   * Listen to connection changes
   */
  useEffect(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (!connection) return;

    const handleConnectionChange = () => {
      const networkInfo = getNetworkInfo();
      setState(prev => ({ ...prev, ...networkInfo }));
    };

    connection.addEventListener('change', handleConnectionChange);

    return () => {
      connection.removeEventListener('change', handleConnectionChange);
    };
  }, [getNetworkInfo]);

  return {
    ...state,
    refresh: () => updateOnlineState(navigator.onLine),
  };
}

/**
 * Get connection quality description in Thai
 */
export function getConnectionQuality(state: OfflineState): {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  description: string;
  color: string;
} {
  if (state.isOffline) {
    return {
      quality: 'offline',
      description: 'ออฟไลน์',
      color: 'text-red-600',
    };
  }

  const { effectiveType, rtt, downlink } = state;

  // Use effective type if available
  if (effectiveType) {
    switch (effectiveType) {
      case '4g':
        return {
          quality: 'excellent',
          description: 'สัญญาณดีมาก (4G)',
          color: 'text-green-600',
        };
      case '3g':
        return {
          quality: 'good',
          description: 'สัญญาณดี (3G)',
          color: 'text-blue-600',
        };
      case '2g':
        return {
          quality: 'fair',
          description: 'สัญญาณปานกลาง (2G)',
          color: 'text-yellow-600',
        };
      case 'slow-2g':
        return {
          quality: 'poor',
          description: 'สัญญาณอ่อน',
          color: 'text-orange-600',
        };
    }
  }

  // Use RTT and downlink if available
  if (rtt !== null && downlink !== null) {
    if (rtt < 100 && downlink > 5) {
      return {
        quality: 'excellent',
        description: 'สัญญาณดีมาก',
        color: 'text-green-600',
      };
    } else if (rtt < 300 && downlink > 1.5) {
      return {
        quality: 'good',
        description: 'สัญญาณดี',
        color: 'text-blue-600',
      };
    } else if (rtt < 500 && downlink > 0.5) {
      return {
        quality: 'fair',
        description: 'สัญญาณปานกลาง',
        color: 'text-yellow-600',
      };
    } else {
      return {
        quality: 'poor',
        description: 'สัญญาณอ่อน',
        color: 'text-orange-600',
      };
    }
  }

  // Default to good if online but no info
  return {
    quality: 'good',
    description: 'ออนไลน์',
    color: 'text-green-600',
  };
}

/**
 * Sync Status Hook
 * 
 * Manages external data sync status and provides sync functionality
 * 
 * Features:
 * - Track last sync timestamp
 * - Color-coded status indicators
 * - Manual sync trigger
 * - Stale data warnings
 * - Implements Property 52: External Data Sync Status Display
 * 
 * @module useSyncStatus
 */

import { useState, useEffect, useCallback } from 'react';

export type SyncStatus = 'syncing' | 'success' | 'error' | 'stale' | 'critical';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  error: string | null;
  isSyncing: boolean;
}

export interface UseSyncStatusOptions {
  /**
   * API endpoint to sync data from
   */
  syncEndpoint?: string;

  /**
   * Interval to check sync status (in milliseconds)
   * Default: 60000 (1 minute)
   */
  checkInterval?: number;

  /**
   * Hours before data is considered stale
   * Default: 6
   */
  staleThresholdHours?: number;

  /**
   * Hours before data is considered critical
   * Default: 24
   */
  criticalThresholdHours?: number;

  /**
   * Auto-sync on mount
   * Default: false
   */
  autoSync?: boolean;

  /**
   * Callback when sync completes successfully
   */
  onSyncSuccess?: (data: any) => void;

  /**
   * Callback when sync fails
   */
  onSyncError?: (error: Error) => void;
}

/**
 * Hook for managing external data sync status
 * 
 * @param options - Configuration options
 * @returns Sync state and control functions
 * 
 * @example
 * ```tsx
 * const { status, lastSyncTime, sync, isSyncing } = useSyncStatus({
 *   syncEndpoint: '/api/sync/customer-data',
 *   staleThresholdHours: 6,
 *   criticalThresholdHours: 24,
 *   onSyncSuccess: (data) => console.log('Synced:', data),
 * });
 * 
 * <SyncStatusIndicator
 *   status={status}
 *   lastSyncTime={lastSyncTime}
 *   onSync={sync}
 *   isSyncing={isSyncing}
 * />
 * ```
 */
export function useSyncStatus(options: UseSyncStatusOptions = {}) {
  const {
    syncEndpoint,
    checkInterval = 60000, // 1 minute
    staleThresholdHours = 6,
    criticalThresholdHours = 24,
    autoSync = false,
    onSyncSuccess,
    onSyncError,
  } = options;

  const [syncState, setSyncState] = useState<SyncState>({
    status: 'success',
    lastSyncTime: null,
    error: null,
    isSyncing: false,
  });

  /**
   * Calculate sync status based on last sync time
   */
  const calculateStatus = useCallback(
    (lastSync: Date | null): SyncStatus => {
      if (!lastSync) return 'critical';

      const now = new Date();
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSync > criticalThresholdHours) {
        return 'critical';
      } else if (hoursSinceSync > staleThresholdHours) {
        return 'stale';
      }

      return 'success';
    },
    [staleThresholdHours, criticalThresholdHours]
  );

  /**
   * Perform sync operation
   */
  const sync = useCallback(async () => {
    if (!syncEndpoint) {
      console.warn('No sync endpoint provided');
      return;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, status: 'syncing' }));

    try {
      const response = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      const now = new Date();

      setSyncState({
        status: 'success',
        lastSyncTime: now,
        error: null,
        isSyncing: false,
      });

      // Store last sync time in localStorage
      localStorage.setItem('lastSyncTime', now.toISOString());

      if (onSyncSuccess) {
        onSyncSuccess(data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        isSyncing: false,
      }));

      if (onSyncError) {
        onSyncError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }, [syncEndpoint, onSyncSuccess, onSyncError]);

  /**
   * Load last sync time from localStorage
   */
  useEffect(() => {
    const storedTime = localStorage.getItem('lastSyncTime');
    if (storedTime) {
      const lastSync = new Date(storedTime);
      const status = calculateStatus(lastSync);
      setSyncState(prev => ({
        ...prev,
        lastSyncTime: lastSync,
        status,
      }));
    }
  }, [calculateStatus]);

  /**
   * Auto-sync on mount if enabled
   */
  useEffect(() => {
    if (autoSync) {
      sync();
    }
  }, [autoSync, sync]);

  /**
   * Periodically check sync status
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncState.lastSyncTime) {
        const status = calculateStatus(syncState.lastSyncTime);
        setSyncState(prev => ({ ...prev, status }));
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [syncState.lastSyncTime, calculateStatus, checkInterval]);

  return {
    ...syncState,
    sync,
    refresh: sync, // Alias for sync
  };
}

/**
 * Get sync status color
 */
export function getSyncStatusColor(status: SyncStatus): string {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'stale':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'syncing':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get sync status message in Thai
 */
export function getSyncStatusMessage(
  status: SyncStatus,
  lastSyncTime: Date | null
): string {
  if (!lastSyncTime) {
    return 'ยังไม่เคยซิงค์ข้อมูล';
  }

  const now = new Date();
  const hoursSinceSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);

  switch (status) {
    case 'success':
      if (hoursSinceSync < 1) {
        return 'ข้อมูลเป็นปัจจุบัน';
      }
      return `ซิงค์ล่าสุด ${Math.floor(hoursSinceSync)} ชั่วโมงที่แล้ว`;
    case 'stale':
      return `ข้อมูลอาจล้าสมัย (${Math.floor(hoursSinceSync)} ชั่วโมงที่แล้ว)`;
    case 'critical':
      return `ข้อมูลล้าสมัยมาก (${Math.floor(hoursSinceSync)} ชั่วโมงที่แล้ว)`;
    case 'error':
      return 'เกิดข้อผิดพลาดในการซิงค์';
    case 'syncing':
      return 'กำลังซิงค์ข้อมูล...';
    default:
      return 'ไม่ทราบสถานะ';
  }
}

/**
 * Format last sync time for display
 */
export function formatSyncTime(date: Date | null): string {
  if (!date) return 'ไม่เคยซิงค์';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'เมื่อสักครู่';
  } else if (diffMins < 60) {
    return `${diffMins} นาทีที่แล้ว`;
  } else if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`;
  } else if (diffDays < 7) {
    return `${diffDays} วันที่แล้ว`;
  } else {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

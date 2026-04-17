/**
 * Sync Status Indicator Component
 * 
 * Displays external data sync status with color coding
 * Implements Property 52: External Data Sync Status Display
 */

import React from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import {
  SyncStatus,
  getSyncStatusColor,
  getSyncStatusMessage,
  formatSyncTime,
} from '@/shared/hooks/useSyncStatus';

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncTime: Date | null;
  error?: string | null;
  isSyncing?: boolean;
  onSync?: () => void;
  compact?: boolean;
  showSyncButton?: boolean;
}

/**
 * Get icon for sync status
 */
function getSyncStatusIcon(status: SyncStatus, isSyncing: boolean) {
  if (isSyncing) {
    return <RefreshCw className="h-4 w-4 animate-spin" />;
  }

  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4" />;
    case 'stale':
      return <Clock className="h-4 w-4" />;
    case 'critical':
      return <AlertTriangle className="h-4 w-4" />;
    case 'error':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

/**
 * Sync Status Indicator
 * 
 * Displays sync status with color coding and last sync time
 * 
 * @example
 * ```tsx
 * <SyncStatusIndicator
 *   status="success"
 *   lastSyncTime={new Date()}
 *   onSync={handleSync}
 *   isSyncing={false}
 * />
 * ```
 */
export function SyncStatusIndicator({
  status,
  lastSyncTime,
  error,
  isSyncing = false,
  onSync,
  compact = false,
  showSyncButton = true,
}: SyncStatusIndicatorProps) {
  const statusColor = getSyncStatusColor(status);
  const statusMessage = getSyncStatusMessage(status, lastSyncTime);
  const syncTimeText = formatSyncTime(lastSyncTime);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${statusColor}`}>
              {getSyncStatusIcon(status, isSyncing)}
              <span className="text-xs font-medium">{syncTimeText}</span>
              {showSyncButton && onSync && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onSync}
                  disabled={isSyncing}
                  aria-label="ซิงค์ข้อมูล"
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusMessage}</p>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border ${statusColor}`}>
      <div className="flex items-center gap-3">
        {getSyncStatusIcon(status, isSyncing)}
        <div>
          <p className="text-sm font-medium">{statusMessage}</p>
          <p className="text-xs opacity-75">ซิงค์ล่าสุด: {syncTimeText}</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
      {showSyncButton && onSync && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ตอนนี้'}
        </Button>
      )}
    </div>
  );
}

/**
 * Stale Data Warning Banner
 * 
 * Shows prominent warning when data is stale or critical
 * 
 * @example
 * ```tsx
 * <StaleDataWarning
 *   status="critical"
 *   lastSyncTime={new Date(Date.now() - 25 * 60 * 60 * 1000)}
 *   onSync={handleSync}
 *   onAcknowledge={() => setAcknowledged(true)}
 * />
 * ```
 */
export function StaleDataWarning({
  status,
  lastSyncTime,
  onSync,
  onAcknowledge,
  disableCriticalActions = false,
}: {
  status: SyncStatus;
  lastSyncTime: Date | null;
  onSync?: () => void;
  onAcknowledge?: () => void;
  disableCriticalActions?: boolean;
}) {
  if (status !== 'stale' && status !== 'critical') {
    return null;
  }

  const isCritical = status === 'critical';
  const syncTimeText = formatSyncTime(lastSyncTime);

  return (
    <Alert variant={isCritical ? 'destructive' : 'default'} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isCritical ? '⚠️ ข้อมูลล้าสมัยมาก' : '⚠️ ข้อมูลอาจล้าสมัย'}
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          {isCritical
            ? `ข้อมูลล่าสุดซิงค์เมื่อ ${syncTimeText} ซึ่งเกิน 24 ชั่วโมง กรุณาซิงค์ข้อมูลก่อนดำเนินการต่อ`
            : `ข้อมูลล่าสุดซิงค์เมื่อ ${syncTimeText} แนะนำให้ซิงค์ข้อมูลเพื่อความแม่นยำ`}
        </p>
        {disableCriticalActions && isCritical && (
          <p className="mb-3 text-sm font-semibold">
            🚫 การดำเนินการสำคัญถูกปิดใช้งานจนกว่าจะซิงค์ข้อมูล
          </p>
        )}
        <div className="flex gap-2">
          {onSync && (
            <Button size="sm" onClick={onSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              ซิงค์ข้อมูลตอนนี้
            </Button>
          )}
          {onAcknowledge && !isCritical && (
            <Button size="sm" variant="outline" onClick={onAcknowledge}>
              รับทราบและดำเนินการต่อ
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Sync Error Alert
 * 
 * Shows error message when sync fails
 * 
 * @example
 * ```tsx
 * <SyncErrorAlert
 *   error="Connection timeout"
 *   onRetry={handleRetry}
 *   onContactSupport={() => window.open('mailto:support@example.com')}
 * />
 * ```
 */
export function SyncErrorAlert({
  error,
  onRetry,
  onContactSupport,
}: {
  error: string;
  onRetry?: () => void;
  onContactSupport?: () => void;
}) {
  return (
    <Alert variant="destructive" className="mb-4">
      <XCircle className="h-4 w-4" />
      <AlertTitle>❌ เกิดข้อผิดพลาดในการซิงค์ข้อมูล</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{error}</p>
        <div className="flex gap-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองอีกครั้ง
            </Button>
          )}
          {onContactSupport && (
            <Button size="sm" variant="outline" onClick={onContactSupport}>
              ติดต่อฝ่ายสนับสนุน
            </Button>
          )}
        </div>
        <p className="text-xs mt-3 opacity-75">
          หากปัญหายังคงอยู่ กรุณาติดต่อฝ่ายสนับสนุนพร้อมรหัสข้อผิดพลาดนี้
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Sync Success Notification
 * 
 * Shows success message when sync completes
 * 
 * @example
 * ```tsx
 * {showSuccess && (
 *   <SyncSuccessNotification
 *     timestamp={new Date()}
 *     onDismiss={() => setShowSuccess(false)}
 *   />
 * )}
 * ```
 */
export function SyncSuccessNotification({
  timestamp,
  onDismiss,
  autoHideDuration = 5000,
}: {
  timestamp: Date;
  onDismiss?: () => void;
  autoHideDuration?: number;
}) {
  React.useEffect(() => {
    if (autoHideDuration > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onDismiss]);

  return (
    <Alert className="mb-4 bg-green-50 border-green-200">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">✅ ซิงค์ข้อมูลสำเร็จ</AlertTitle>
      <AlertDescription className="text-green-700">
        <p>ข้อมูลได้รับการอัพเดทเรียบร้อยแล้ว</p>
        <p className="text-xs mt-1 opacity-75">
          เวลา: {timestamp.toLocaleString('th-TH')}
        </p>
      </AlertDescription>
    </Alert>
  );
}

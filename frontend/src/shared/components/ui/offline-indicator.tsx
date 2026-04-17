/**
 * Offline Indicator Component
 * 
 * Displays offline status and queued actions
 * Implements Property 46: Offline State Handling
 */

import React from 'react';
import { WifiOff, Wifi, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { Badge } from './badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { useOfflineDetection, getConnectionQuality } from '@/shared/hooks/useOfflineDetection';
import { useOfflineQueue } from '@/shared/hooks/useOfflineQueue';

/**
 * Offline Banner
 * 
 * Shows prominent banner when offline
 * 
 * @example
 * ```tsx
 * <OfflineBanner />
 * ```
 */
export function OfflineBanner() {
  const { isOffline } = useOfflineDetection();

  if (!isOffline) return null;

  return (
    <Alert variant="destructive" className="mb-4 border-2">
      <WifiOff className="h-5 w-5" />
      <AlertTitle className="text-lg font-bold">🔴 คุณออฟไลน์</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ กรุณาตรวจสอบการเชื่อมต่อของคุณ
        </p>
        <p className="text-sm opacity-90">
          💡 คุณยังสามารถดูข้อมูลที่มีอยู่ได้ แต่ไม่สามารถทำรายการที่ต้องใช้อินเทอร์เน็ตได้
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Connection Status Indicator
 * 
 * Small indicator showing connection status
 * 
 * @example
 * ```tsx
 * <ConnectionStatusIndicator />
 * ```
 */
export function ConnectionStatusIndicator() {
  const state = useOfflineDetection();
  const quality = getConnectionQuality(state);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card text-card-foreground">
      {state.isOffline ? (
        <WifiOff className="h-4 w-4 text-red-600" />
      ) : (
        <Wifi className={`h-4 w-4 ${quality.color}`} />
      )}
      <span className={`text-xs font-medium ${quality.color}`}>
        {quality.description}
      </span>
    </div>
  );
}

/**
 * Offline Queue Status
 * 
 * Shows number of queued actions
 * 
 * @example
 * ```tsx
 * <OfflineQueueStatus
 *   onProcess={processQueue}
 *   onViewQueue={() => setShowQueue(true)}
 * />
 * ```
 */
export function OfflineQueueStatus({
  onProcess,
  onViewQueue,
}: {
  onProcess?: () => void;
  onViewQueue?: () => void;
}) {
  const { isOnline } = useOfflineDetection();
  const { pendingCount, failedCount, isProcessing } = useOfflineQueue();

  if (pendingCount === 0 && failedCount === 0) return null;

  return (
    <Alert className="mb-4">
      <Clock className="h-4 w-4" />
      <AlertTitle>รายการรอดำเนินการ</AlertTitle>
      <AlertDescription>
        <div className="flex items-center gap-4 mb-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{pendingCount}</Badge>
              <span className="text-sm">รายการรอส่ง</span>
            </div>
          )}
          {failedCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{failedCount}</Badge>
              <span className="text-sm">รายการล้มเหลว</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isOnline && pendingCount > 0 && onProcess && (
            <Button
              size="sm"
              onClick={onProcess}
              disabled={isProcessing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'กำลังส่ง...' : 'ส่งตอนนี้'}
            </Button>
          )}
          {onViewQueue && (
            <Button size="sm" variant="outline" onClick={onViewQueue}>
              ดูรายการทั้งหมด
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Offline Queue Dialog
 * 
 * Shows detailed list of queued actions
 * 
 * @example
 * ```tsx
 * <OfflineQueueDialog
 *   open={showQueue}
 *   onOpenChange={setShowQueue}
 *   onRetry={retryFailed}
 *   onClear={clearFailed}
 * />
 * ```
 */
export function OfflineQueueDialog({
  open,
  onOpenChange,
  onRetry,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
  onClear?: () => void;
}) {
  const { queue } = useOfflineQueue();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'สำเร็จ';
      case 'failed':
        return 'ล้มเหลว';
      case 'processing':
        return 'กำลังดำเนินการ';
      default:
        return 'รอดำเนินการ';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายการรอดำเนินการ</DialogTitle>
          <DialogDescription>
            รายการที่บันทึกไว้เมื่อออฟไลน์ จะถูกส่งอัตโนมัติเมื่อกลับมาออนไลน์
          </DialogDescription>
        </DialogHeader>

        {queue.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>ไม่มีรายการรอดำเนินการ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map(action => (
              <div
                key={action.id}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card"
              >
                {getStatusIcon(action.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{action.type}</span>
                    <Badge variant={action.status === 'failed' ? 'destructive' : 'secondary'}>
                      {getStatusText(action.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(action.timestamp).toLocaleString('th-TH')}
                  </p>
                  {action.error && (
                    <p className="text-sm text-red-600 mt-1">
                      ข้อผิดพลาด: {action.error}
                    </p>
                  )}
                  {action.retries > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      พยายามแล้ว {action.retries}/{action.maxRetries} ครั้ง
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {queue.some(a => a.status === 'failed') && (
          <div className="flex gap-2 pt-4 border-t">
            {onRetry && (
              <Button onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                ลองใหม่ทั้งหมด
              </Button>
            )}
            {onClear && (
              <Button variant="outline" onClick={onClear}>
                ล้างรายการที่ล้มเหลว
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Offline Action Blocker
 * 
 * Prevents actions that require internet when offline
 * 
 * @example
 * ```tsx
 * <OfflineActionBlocker>
 *   <Button onClick={handleSubmit}>ส่งข้อมูล</Button>
 * </OfflineActionBlocker>
 * ```
 */
export function OfflineActionBlocker({
  children,
  message = 'การดำเนินการนี้ต้องใช้อินเทอร์เน็ต',
}: {
  children: React.ReactNode;
  message?: string;
}) {
  const { isOffline } = useOfflineDetection();

  if (!isOffline) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4 text-red-600" />
            <span>{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reconnected Notification
 * 
 * Shows notification when connection is restored
 * 
 * @example
 * ```tsx
 * <ReconnectedNotification />
 * ```
 */
export function ReconnectedNotification() {
  const { isOnline, wasOffline } = useOfflineDetection();
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (isOnline && wasOffline) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <Alert className="mb-4 bg-green-50 border-green-200">
      <Wifi className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">✅ กลับมาออนไลน์แล้ว</AlertTitle>
      <AlertDescription className="text-green-700">
        <p>เชื่อมต่ออินเทอร์เน็ตสำเร็จ คุณสามารถทำรายการได้ตามปกติ</p>
      </AlertDescription>
    </Alert>
  );
}

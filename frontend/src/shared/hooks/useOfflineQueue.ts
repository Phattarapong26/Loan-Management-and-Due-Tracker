/**
 * Offline Queue Hook
 * 
 * Manages queued actions when offline
 * 
 * Features:
 * - Queue actions when offline
 * - Auto-process when back online
 * - Persist queue to localStorage
 * - Retry failed actions
 * - Implements Property 46: Offline State Handling
 * 
 * @module useOfflineQueue
 */

import { useState, useEffect, useCallback } from 'react';
import { useOfflineDetection } from './useOfflineDetection';

export interface QueuedAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
}

export interface UseOfflineQueueOptions {
  /**
   * Storage key for persisting queue
   * Default: 'offline-queue'
   */
  storageKey?: string;

  /**
   * Maximum number of retries per action
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Auto-process queue when online
   * Default: true
   */
  autoProcess?: boolean;

  /**
   * Callback to process action
   */
  onProcess?: (action: QueuedAction) => Promise<void>;

  /**
   * Callback when action succeeds
   */
  onSuccess?: (action: QueuedAction) => void;

  /**
   * Callback when action fails
   */
  onError?: (action: QueuedAction, error: Error) => void;
}

/**
 * Hook for managing offline action queue
 * 
 * @param options - Configuration options
 * @returns Queue state and control functions
 * 
 * @example
 * ```tsx
 * const { queue, addToQueue, processQueue, clearQueue } = useOfflineQueue({
 *   onProcess: async (action) => {
 *     await api.submitForm(action.data);
 *   },
 *   onSuccess: (action) => {
 *     toast.success('ส่งข้อมูลสำเร็จ');
 *   },
 * });
 * 
 * const handleSubmit = async (data) => {
 *   if (isOffline) {
 *     addToQueue('submit-form', data);
 *     toast.info('บันทึกไว้แล้ว จะส่งเมื่อกลับมาออนไลน์');
 *   } else {
 *     await api.submitForm(data);
 *   }
 * };
 * ```
 */
export function useOfflineQueue(options: UseOfflineQueueOptions = {}) {
  const {
    storageKey = 'offline-queue',
    maxRetries = 3,
    autoProcess = true,
    onProcess,
    onSuccess,
    onError,
  } = options;

  const { isOnline, wasOffline } = useOfflineDetection();
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Load queue from localStorage
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setQueue(parsed);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }, [storageKey]);

  /**
   * Save queue to localStorage
   */
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }, [queue, storageKey]);

  /**
   * Add action to queue
   */
  const addToQueue = useCallback(
    (type: string, data: any, customMaxRetries?: number) => {
      const action: QueuedAction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: customMaxRetries ?? maxRetries,
        status: 'pending',
      };

      setQueue(prev => [...prev, action]);
      return action.id;
    },
    [maxRetries]
  );

  /**
   * Remove action from queue
   */
  const removeFromQueue = useCallback((actionId: string) => {
    setQueue(prev => prev.filter(action => action.id !== actionId));
  }, []);

  /**
   * Update action status
   */
  const updateAction = useCallback(
    (actionId: string, updates: Partial<QueuedAction>) => {
      setQueue(prev =>
        prev.map(action =>
          action.id === actionId ? { ...action, ...updates } : action
        )
      );
    },
    []
  );

  /**
   * Process single action
   */
  const processAction = useCallback(
    async (action: QueuedAction) => {
      if (!onProcess) {
        console.warn('No onProcess handler provided');
        return;
      }

      updateAction(action.id, { status: 'processing' });

      try {
        await onProcess(action);
        updateAction(action.id, { status: 'success' });

        if (onSuccess) {
          onSuccess(action);
        }

        // Remove successful action after delay
        setTimeout(() => {
          removeFromQueue(action.id);
        }, 1000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const newRetries = action.retries + 1;

        if (newRetries >= action.maxRetries) {
          // Max retries reached, mark as failed
          updateAction(action.id, {
            status: 'failed',
            error: errorMessage,
            retries: newRetries,
          });

          if (onError) {
            onError(action, error instanceof Error ? error : new Error(errorMessage));
          }
        } else {
          // Retry
          updateAction(action.id, {
            status: 'pending',
            error: errorMessage,
            retries: newRetries,
          });
        }
      }
    },
    [onProcess, onSuccess, onError, updateAction, removeFromQueue]
  );

  /**
   * Process all pending actions
   */
  const processQueue = useCallback(async () => {
    if (isProcessing || !isOnline) return;

    const pendingActions = queue.filter(
      action => action.status === 'pending' && action.retries < action.maxRetries
    );

    if (pendingActions.length === 0) return;

    setIsProcessing(true);

    for (const action of pendingActions) {
      await processAction(action);
    }

    setIsProcessing(false);
  }, [queue, isOnline, isProcessing, processAction]);

  /**
   * Clear all actions
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  /**
   * Clear failed actions
   */
  const clearFailed = useCallback(() => {
    setQueue(prev => prev.filter(action => action.status !== 'failed'));
  }, []);

  /**
   * Retry failed actions
   */
  const retryFailed = useCallback(() => {
    setQueue(prev =>
      prev.map(action =>
        action.status === 'failed'
          ? { ...action, status: 'pending' as const, retries: 0, error: undefined }
          : action
      )
    );
  }, []);

  /**
   * Auto-process when coming back online
   */
  useEffect(() => {
    if (autoProcess && isOnline && wasOffline && queue.length > 0) {
      processQueue();
    }
  }, [autoProcess, isOnline, wasOffline, queue.length, processQueue]);

  return {
    queue,
    pendingCount: queue.filter(a => a.status === 'pending').length,
    failedCount: queue.filter(a => a.status === 'failed').length,
    successCount: queue.filter(a => a.status === 'success').length,
    isProcessing,
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    clearFailed,
    retryFailed,
  };
}

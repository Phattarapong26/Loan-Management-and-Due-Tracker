/**
 * Form Auto-Save Hook
 * 
 * Custom hook for auto-saving form data to localStorage
 * 
 * Features:
 * - Auto-save form data every 30 seconds
 * - Save on session expiry
 * - Restore on re-login
 * - Show "Draft saved at HH:MM" indicator
 * - Implements Property 41: Form Data Persistence on Session Expiry
 * 
 * @module useFormAutoSave
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';

export interface FormAutoSaveConfig<T> {
  /** Unique key for localStorage */
  storageKey: string;
  /** Form data to save */
  data: T;
  /** Auto-save interval in milliseconds (default: 30 seconds) */
  interval?: number;
  /** Callback when data is saved */
  onSave?: (data: T) => void;
  /** Callback when data is restored */
  onRestore?: (data: T) => void;
  /** Enable auto-save (default: true) */
  enabled?: boolean;
}

export interface UseFormAutoSaveReturn<T> {
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Whether data is currently being saved */
  isSaving: boolean;
  /** Manually trigger save */
  save: () => void;
  /** Restore saved data */
  restore: () => T | null;
  /** Clear saved data */
  clear: () => void;
  /** Check if saved data exists */
  hasSavedData: boolean;
}

/**
 * Hook for auto-saving form data
 * 
 * @example
 * ```tsx
 * const { lastSaved, save, restore, clear, hasSavedData } = useFormAutoSave({
 *   storageKey: 'loan-application-draft',
 *   data: formData,
 *   interval: 30000, // 30 seconds
 *   onSave: (data) => console.log('Saved:', data),
 *   onRestore: (data) => setFormData(data),
 * });
 * 
 * // Show last saved indicator
 * {lastSaved && (
 *   <p>Draft saved at {format(lastSaved, 'HH:mm')}</p>
 * )}
 * ```
 */
export function useFormAutoSave<T = any>(
  config: FormAutoSaveConfig<T>
): UseFormAutoSaveReturn<T> {
  const {
    storageKey,
    data,
    interval = 30000, // 30 seconds
    onSave,
    onRestore,
    enabled = true,
  } = config;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef<T>(data);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Check if saved data exists on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setHasSavedData(!!saved);
    } catch (error) {
      console.error('Error checking saved data:', error);
    }
  }, [storageKey]);

  // Save data to localStorage
  const save = useCallback(() => {
    if (!enabled) return;

    try {
      setIsSaving(true);
      const dataToSave = {
        data: dataRef.current,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      const savedTime = new Date();
      setLastSaved(savedTime);
      setHasSavedData(true);
      onSave?.(dataRef.current);
    } catch (error) {
      console.error('Error saving form data:', error);
    } finally {
      setIsSaving(false);
    }
  }, [storageKey, enabled, onSave]);

  // Restore data from localStorage
  const restore = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      const restoredData = parsed.data as T;
      
      if (parsed.timestamp) {
        setLastSaved(new Date(parsed.timestamp));
      }

      onRestore?.(restoredData);
      return restoredData;
    } catch (error) {
      console.error('Error restoring form data:', error);
      return null;
    }
  }, [storageKey, onRestore]);

  // Clear saved data
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setLastSaved(null);
      setHasSavedData(false);
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
  }, [storageKey]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      save();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, save]);

  // Save on unmount (component cleanup)
  useEffect(() => {
    return () => {
      if (enabled && dataRef.current) {
        try {
          const dataToSave = {
            data: dataRef.current,
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        } catch (error) {
          console.error('Error saving on unmount:', error);
        }
      }
    };
  }, [storageKey, enabled]);

  // Save on page unload (browser close/refresh)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (dataRef.current) {
        try {
          const dataToSave = {
            data: dataRef.current,
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        } catch (error) {
          console.error('Error saving on unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [storageKey, enabled]);

  return {
    lastSaved,
    isSaving,
    save,
    restore,
    clear,
    hasSavedData,
  };
}

/**
 * Format last saved time for display
 */
export function formatLastSaved(lastSaved: Date | null): string {
  if (!lastSaved) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - lastSaved.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'เพิ่งบันทึก';
  } else if (diffMins < 60) {
    return `บันทึกเมื่อ ${diffMins} นาทีที่แล้ว`;
  } else {
    return `บันทึกเมื่อ ${format(lastSaved, 'HH:mm')}`;
  }
}

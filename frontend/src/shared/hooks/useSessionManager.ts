/**
 * Session Manager Hook
 * 
 * Custom hook for managing user session with expiry warnings and auto-save
 * 
 * Features:
 * - Warn 5 minutes before expiry
 * - Show countdown timer
 * - Provide "Extend Session" button
 * - Detect inactivity (15 minutes)
 * - Implements Property 40: Session Expiry Warning
 * - Implements Property 43: Session Extension Confirmation
 * 
 * @module useSessionManager
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SessionConfig {
  /** Session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
  /** Warning time before expiry in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Inactivity timeout in milliseconds (default: 15 minutes) */
  inactivityTimeout?: number;
  /** Callback when session expires */
  onSessionExpire?: () => void;
  /** Callback when session is extended */
  onSessionExtend?: () => void;
  /** Callback when inactivity detected */
  onInactivityDetected?: () => void;
}

export interface SessionState {
  /** Whether session is active */
  isActive: boolean;
  /** Whether warning should be shown */
  showWarning: boolean;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Whether user is inactive */
  isInactive: boolean;
  /** Last activity timestamp */
  lastActivity: Date;
}

export interface UseSessionManagerReturn extends SessionState {
  /** Extend the session */
  extendSession: () => void;
  /** Mark user as active */
  markActivity: () => void;
  /** Dismiss inactivity warning */
  dismissInactivity: () => void;
  /** Manually expire session */
  expireSession: () => void;
}

/**
 * Hook for managing user session
 * 
 * @example
 * ```tsx
 * const {
 *   showWarning,
 *   timeRemaining,
 *   isInactive,
 *   extendSession,
 *   markActivity,
 *   dismissInactivity
 * } = useSessionManager({
 *   sessionTimeout: 30 * 60 * 1000, // 30 minutes
 *   warningTime: 5 * 60 * 1000, // 5 minutes
 *   inactivityTimeout: 15 * 60 * 1000, // 15 minutes
 *   onSessionExpire: () => logout(),
 * });
 * ```
 */
export function useSessionManager(config: SessionConfig = {}): UseSessionManagerReturn {
  const {
    sessionTimeout = 30 * 60 * 1000, // 30 minutes
    warningTime = 5 * 60 * 1000, // 5 minutes
    inactivityTimeout = 15 * 60 * 1000, // 15 minutes
    onSessionExpire,
    onSessionExtend,
    onInactivityDetected,
  } = config;

  const [isActive, setIsActive] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(sessionTimeout / 1000);
  const [isInactive, setIsInactive] = useState(false);
  const [lastActivity, setLastActivity] = useState(new Date());

  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Start countdown timer
  const startCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - sessionStartRef.current;
      const remaining = Math.max(0, Math.floor((sessionTimeout - elapsed) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    }, 1000);
  }, [sessionTimeout]);

  // Expire session
  const expireSession = useCallback(() => {
    clearAllTimers();
    setIsActive(false);
    setShowWarning(false);
    setTimeRemaining(0);
    onSessionExpire?.();
  }, [clearAllTimers, onSessionExpire]);

  // Extend session
  const extendSession = useCallback(() => {
    clearAllTimers();
    sessionStartRef.current = Date.now();
    setIsActive(true);
    setShowWarning(false);
    setTimeRemaining(sessionTimeout / 1000);
    setLastActivity(new Date());
    onSessionExtend?.();

    // Restart timers
    // Warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();
    }, sessionTimeout - warningTime);

    // Session expiry timer
    sessionTimerRef.current = setTimeout(() => {
      expireSession();
    }, sessionTimeout);

    // Inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      setIsInactive(true);
      onInactivityDetected?.();
    }, inactivityTimeout);
  }, [
    clearAllTimers,
    sessionTimeout,
    warningTime,
    inactivityTimeout,
    onSessionExtend,
    onInactivityDetected,
    expireSession,
    startCountdown,
  ]);

  // Mark user activity
  const markActivity = useCallback(() => {
    setLastActivity(new Date());
    setIsInactive(false);

    // Reset inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      setIsInactive(true);
      onInactivityDetected?.();
    }, inactivityTimeout);
  }, [inactivityTimeout, onInactivityDetected]);

  // Dismiss inactivity warning
  const dismissInactivity = useCallback(() => {
    setIsInactive(false);
    markActivity();
  }, [markActivity]);

  // Initialize session on mount
  useEffect(() => {
    extendSession();

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => markActivity();

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      clearAllTimers();
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isActive,
    showWarning,
    timeRemaining,
    isInactive,
    lastActivity,
    extendSession,
    markActivity,
    dismissInactivity,
    expireSession,
  };
}

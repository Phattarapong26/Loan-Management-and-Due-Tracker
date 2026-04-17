/**
 * Session Warning Dialog Component
 * 
 * Dialog to warn users about session expiry with countdown timer
 * 
 * @module SessionWarningDialog
 */

import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

export interface SessionWarningDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Callback when extend session is clicked */
  onExtend: () => void;
  /** Callback when logout is clicked */
  onLogout?: () => void;
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Session Warning Dialog Component
 */
export function SessionWarningDialog({
  open,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionWarningDialogProps) {
  const isUrgent = timeRemaining <= 60; // Less than 1 minute

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${isUrgent ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertTriangle className={`h-6 w-6 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <AlertDialogTitle>
              {isUrgent ? 'เซสชันกำลังจะหมดอายุ!' : 'เซสชันของคุณกำลังจะหมดอายุ'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="flex items-center justify-center">
              <div className={`p-6 rounded-2xl ${isUrgent ? 'bg-red-50 border-2 border-red-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                  <Clock className={`h-8 w-8 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
                  <div>
                    <p className="text-sm text-slate-600 mb-1">เวลาที่เหลือ</p>
                    <p className={`text-4xl font-bold font-mono ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                      {formatTime(timeRemaining)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-slate-700">
                เซสชันของคุณจะหมดอายุในอีก <strong>{formatTime(timeRemaining)}</strong> นาที
              </p>
              <p className="text-slate-600">
                หากคุณยังต้องการใช้งานต่อ กรุณากดปุ่ม "ต่ออายุเซสชัน" 
                มิฉะนั้นคุณจะถูกออกจากระบบโดยอัตโนมัติ
              </p>
            </div>

            {isUrgent && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ ข้อมูลที่ยังไม่ได้บันทึกอาจสูญหาย กรุณาบันทึกงานของคุณ
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {onLogout && (
            <AlertDialogCancel onClick={onLogout}>
              ออกจากระบบ
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={onExtend} className="bg-blue-600 hover:bg-blue-700">
            ต่ออายุเซสชัน
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Inactivity Warning Dialog Component
 */
export interface InactivityWarningDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when "I'm still here" is clicked */
  onDismiss: () => void;
  /** Callback when logout is clicked */
  onLogout?: () => void;
}

export function InactivityWarningDialog({
  open,
  onDismiss,
  onLogout,
}: InactivityWarningDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <AlertDialogTitle>คุณยังอยู่หรือไม่?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="text-center py-6">
              <p className="text-6xl mb-4">👋</p>
              <p className="text-lg text-slate-700 mb-2">
                เราสังเกตว่าคุณไม่ได้ใช้งานมาสักพักแล้ว
              </p>
              <p className="text-sm text-slate-600">
                หากคุณยังต้องการใช้งานต่อ กรุณากดปุ่ม "ฉันยังอยู่"
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>เคล็ดลับ:</strong> เพื่อความปลอดภัยของข้อมูล 
                ระบบจะออกจากระบบอัตโนมัติหากไม่มีการใช้งานเป็นเวลานาน
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {onLogout && (
            <AlertDialogCancel onClick={onLogout}>
              ออกจากระบบ
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={onDismiss} className="bg-blue-600 hover:bg-blue-700">
            ฉันยังอยู่
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

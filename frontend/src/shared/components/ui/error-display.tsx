/**
 * Error Display Component - แสดง Error พร้อม Next Steps และ Support Contact
 * รองรับ Error Response จาก Backend ที่มี userMessage, nextSteps, supportContact
 */

import { AlertCircle, Phone, Mail, RefreshCw, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { cn } from '@/shared/lib/utils';
import { Link } from 'react-router-dom';

export interface ErrorInfo {
  message: string;              // User-friendly message
  technicalMessage?: string;    // Technical message (for debug)
  code?: string;
  nextSteps?: string[];         // ขั้นตอนที่ผู้ใช้ควรทำต่อ
  supportContact?: string;      // ช่องทางติดต่อ Support
  referenceId?: string;         // รหัสอ้างอิงสำหรับติดต่อ Support
  retryable?: boolean;          // บอกว่าลองใหม่ได้หรือไม่
  details?: {                   // Additional details (e.g., existingLoanId)
    existingLoanId?: string;
    [key: string]: any;
  };
}

interface ErrorDisplayProps {
  error: ErrorInfo | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'default' | 'destructive';
  showTechnicalDetails?: boolean; // แสดง Technical Message (สำหรับ Dev Mode)
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className,
  variant = 'destructive',
  showTechnicalDetails = false,
}: ErrorDisplayProps) {
  // แปลง string error เป็น ErrorInfo
  const errorInfo: ErrorInfo = typeof error === 'string' 
    ? { message: error }
    : error;

  const {
    message,
    technicalMessage,
    code,
    nextSteps,
    supportContact,
    referenceId,
    retryable = true,
    details,
  } = errorInfo;

  // Check if this is a duplicate loan error with existing loan ID
  const isDuplicateLoan = code === 'DUPLICATE_LOAN_APPLICATION' && details?.existingLoanId;

  return (
    <Alert variant={variant} className={cn('border-l-4', className)}>
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold mb-2">
        {message}
      </AlertTitle>
      <AlertDescription className="space-y-4">
        {/* Link to Existing Loan (for Duplicate errors) */}
        {isDuplicateLoan && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                พบคำขอสินเชื่อที่มีอยู่แล้ว
              </p>
              <Link
                to={`/loans/${details.existingLoanId}`}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                ดูคำขอสินเชื่อที่มีอยู่
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {nextSteps && nextSteps.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">สิ่งที่คุณสามารถทำได้:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {nextSteps.map((step, index) => (
                <li key={index} className="text-muted-foreground">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Support Contact */}
        {supportContact && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">ต้องการความช่วยเหลือ?</p>
              <p className="text-muted-foreground">{supportContact}</p>
            </div>
          </div>
        )}

        {/* Reference ID */}
        {referenceId && (
          <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded">
            รหัสอ้างอิง: {referenceId}
          </div>
        )}

        {/* Technical Details (Dev Mode) */}
        {showTechnicalDetails && technicalMessage && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              รายละเอียดทางเทคนิค
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {technicalMessage}
              {code && `\nError Code: ${code}`}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {retryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              ลองใหม่อีกครั้ง
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
            >
              ปิด
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Inline Error Display - สำหรับแสดง Error ใน Form Fields
 */
interface InlineErrorProps {
  message: string;
  hint?: string;
  example?: string;
  className?: string;
}

export function InlineError({ message, hint, example, className }: InlineErrorProps) {
  return (
    <div className={cn('text-sm space-y-1', className)}>
      <p className="text-destructive font-medium">{message}</p>
      {hint && (
        <p className="text-muted-foreground">{hint}</p>
      )}
      {example && (
        <p className="text-muted-foreground">
          <span className="font-medium">ตัวอย่าง:</span> {example}
        </p>
      )}
    </div>
  );
}

/**
 * Network Error Display - สำหรับ Network Errors
 */
interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorDisplay
      error={{
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        nextSteps: [
          'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
          'ลองใหม่อีกครั้ง',
          'หากปัญหายังคงอยู่ กรุณาติดต่อเจ้าหน้าที่'
        ],
        supportContact: '02-XXX-XXXX',
        retryable: true
      }}
      onRetry={onRetry}
      className={className}
    />
  );
}

/**
 * Session Expired Error Display
 */
interface SessionExpiredProps {
  onLogin?: () => void;
  className?: string;
}

export function SessionExpired({ onLogin, className }: SessionExpiredProps) {
  return (
    <ErrorDisplay
      error={{
        message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
        nextSteps: [
          'คลิกปุ่ม "เข้าสู่ระบบ"',
          'ระบบจะนำคุณกลับไปยังหน้าเดิม'
        ],
        retryable: false
      }}
      onRetry={onLogin}
      className={className}
    />
  );
}

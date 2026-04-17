/**
 * Form Error Summary Component
 * 
 * Displays a summary of form validation errors with:
 * - Error count badge
 * - List of all errors
 * - Click to scroll to error field
 * - Empathy-tone messages in Thai
 * 
 * @module FormErrorSummary
 */

import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export interface FormError {
  field: string;
  fieldLabel: string;
  message: string;
  fieldId?: string;
}

export interface FormErrorSummaryProps {
  errors: FormError[];
  onDismiss?: () => void;
  className?: string;
}

/**
 * Form Error Summary Component
 * 
 * Shows all validation errors in a prominent alert box at the top of the form.
 * Allows users to click on an error to scroll to that field.
 * 
 * @example
 * ```tsx
 * <FormErrorSummary
 *   errors={[
 *     { field: 'thaiId', fieldLabel: 'เลขบัตรประชาชน', message: 'ไม่ถูกต้อง', fieldId: 'thai-id-input' },
 *     { field: 'phone', fieldLabel: 'เบอร์โทรศัพท์', message: 'ต้องขึ้นต้นด้วย 0', fieldId: 'phone-input' }
 *   ]}
 *   onDismiss={() => setErrors([])}
 * />
 * ```
 */
export function FormErrorSummary({ errors, onDismiss, className }: FormErrorSummaryProps) {
  if (errors.length === 0) {
    return null;
  }

  /**
   * Scroll to error field and focus it
   */
  const scrollToField = (fieldId?: string) => {
    if (!fieldId) return;

    const element = document.getElementById(fieldId);
    if (element) {
      // Scroll to element with offset for fixed headers
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      // Focus the element after scroll
      setTimeout(() => {
        element.focus();
      }, 300);
    }
  };

  return (
    <Alert
      variant="destructive"
      className={cn('animate-in slide-in-from-top-2 duration-300', className)}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        
        <div className="flex-1 space-y-2">
          <AlertTitle className="text-base font-semibold">
            พบข้อผิดพลาด {errors.length} จุด
          </AlertTitle>
          
          <AlertDescription className="text-sm space-y-1">
            <p className="text-red-100 mb-2">
              กรุณาตรวจสอบและแก้ไขข้อมูลต่อไปนี้ค่ะ 🙏
            </p>
            
            <ul className="space-y-1.5">
              {errors.map((error, index) => (
                <li key={`${error.field}-${index}`} className="flex items-start gap-2">
                  <span className="text-red-100 mt-0.5">•</span>
                  <button
                    type="button"
                    onClick={() => scrollToField(error.fieldId)}
                    className="text-left hover:underline focus:underline focus:outline-none text-red-50"
                  >
                    <span className="font-medium">{error.fieldLabel}:</span>{' '}
                    <span className="text-red-100">{error.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </div>

        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 hover:bg-red-800/20"
            onClick={onDismiss}
            aria-label="ปิดข้อความแจ้งเตือน"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

/**
 * Hook to manage form errors
 * 
 * @example
 * ```tsx
 * const { errors, addError, clearErrors, hasErrors } = useFormErrors();
 * 
 * const handleSubmit = () => {
 *   clearErrors();
 *   
 *   if (!thaiId) {
 *     addError('thaiId', 'เลขบัตรประชาชน', 'กรุณากรอกเลขบัตรประชาชน', 'thai-id-input');
 *   }
 *   
 *   if (hasErrors()) {
 *     return; // Don't submit
 *   }
 *   
 *   // Submit form...
 * };
 * ```
 */
export function useFormErrors() {
  const [errors, setErrors] = React.useState<FormError[]>([]);

  const addError = (field: string, fieldLabel: string, message: string, fieldId?: string) => {
    setErrors(prev => [...prev, { field, fieldLabel, message, fieldId }]);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const clearError = (field: string) => {
    setErrors(prev => prev.filter(e => e.field !== field));
  };

  const hasErrors = () => errors.length > 0;

  const getError = (field: string) => errors.find(e => e.field === field);

  return {
    errors,
    addError,
    clearErrors,
    clearError,
    hasErrors,
    getError,
  };
}

// Add React import for the hook
import React from 'react';

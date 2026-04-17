/**
 * Currency Input Component
 * 
 * Input component for Thai Baht currency with auto-formatting
 * 
 * Features:
 * - Auto-format with thousand separators
 * - Parse pasted formatted values
 * - Limit to 2 decimal places
 * - Display in Thai Baht format with ฿ symbol
 * - Confirm very large amounts
 * - Implements Property 48: Currency Input Auto-formatting
 * 
 * @module CurrencyInput
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
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
import { cn } from '@/shared/lib/utils';

export interface CurrencyInputProps {
  /** Current value (as number) */
  value?: number;
  /** Callback when value changes */
  onChange?: (value: number | undefined) => void;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Threshold for large amount confirmation (default: 10,000,000) */
  largeAmountThreshold?: number;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
}

/**
 * Format number as Thai Baht currency
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '';
  }

  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse currency string to number
 * Removes thousand separators and handles decimal points
 */
export function parseCurrency(value: string): number | undefined {
  if (!value || value.trim() === '') {
    return undefined;
  }

  // Remove thousand separators and non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');

  // Handle multiple decimal points (keep only first one)
  const parts = cleaned.split('.');
  const normalized = parts.length > 1
    ? `${parts[0]}.${parts.slice(1).join('')}`
    : cleaned;

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Currency Input Component
 * 
 * @example
 * ```tsx
 * <CurrencyInput
 *   label="จำนวนเงิน"
 *   value={amount}
 *   onChange={setAmount}
 *   min={0}
 *   max={100000000}
 *   largeAmountThreshold={10000000}
 *   placeholder="0.00"
 * />
 * ```
 */
export function CurrencyInput({
  value,
  onChange,
  label,
  placeholder = '0.00',
  min,
  max,
  largeAmountThreshold = 10000000,
  className,
  disabled = false,
  required = false,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLargeAmountDialog, setShowLargeAmountDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState<number | undefined>();

  // Update display value when value changes (only when not focused)
  useEffect(() => {
    if (!isFocused) {
      if (value !== undefined && value !== null && !isNaN(value)) {
        setDisplayValue(formatCurrency(value));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const validateValue = useCallback((val: number | undefined): string | null => {
    if (val === undefined) {
      return required ? 'กรุณาระบุจำนวนเงิน' : null;
    }

    if (min !== undefined && val < min) {
      return `จำนวนเงินต้องไม่ต่ำกว่า ${formatCurrency(min)} บาท`;
    }

    if (max !== undefined && val > max) {
      return `จำนวนเงินต้องไม่เกิน ${formatCurrency(max)} บาท`;
    }

    return null;
  }, [min, max, required]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);

    // Parse the input
    const parsed = parseCurrency(input);

    // Validate
    const validationError = validateValue(parsed);
    setError(validationError);

    // Check for large amount
    if (parsed !== undefined && parsed >= largeAmountThreshold && !validationError) {
      setPendingValue(parsed);
      setShowLargeAmountDialog(true);
    } else if (!validationError) {
      onChange?.(parsed);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number without formatting when focused
    if (value !== undefined && value !== null && !isNaN(value)) {
      setDisplayValue(value.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the display value
    if (value !== undefined && value !== null && !isNaN(value)) {
      setDisplayValue(formatCurrency(value));
    } else {
      setDisplayValue('');
    }
  };

  const handleLargeAmountConfirm = () => {
    if (pendingValue !== undefined) {
      onChange?.(pendingValue);
    }
    setShowLargeAmountDialog(false);
    setPendingValue(undefined);
  };

  const handleLargeAmountCancel = () => {
    setShowLargeAmountDialog(false);
    setPendingValue(undefined);
    // Reset to previous value
    if (value !== undefined && value !== null && !isNaN(value)) {
      setDisplayValue(formatCurrency(value));
    } else {
      setDisplayValue('');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="currency-input">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-semibold">
          ฿
        </span>
        <Input
          id="currency-input"
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pl-8 text-right font-mono',
            error && 'border-red-500 focus-visible:ring-red-500',
            !error && value !== undefined && 'border-green-500'
          )}
        />
        {!isFocused && value !== undefined && !error && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">
            บาท
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">
          ⚠️ {error}
        </p>
      )}

      {!error && value !== undefined && (
        <p className="text-sm text-green-600 font-medium">
          ✓ {formatCurrency(value)} บาท
        </p>
      )}

      <div className="text-xs text-slate-500">
        <p>💡 สามารถวางข้อมูลที่มีเครื่องหมายคั่นได้ (เช่น 1,000,000.00)</p>
        {min !== undefined && (
          <p>ขั้นต่ำ: {formatCurrency(min)} บาท</p>
        )}
        {max !== undefined && (
          <p>สูงสุด: {formatCurrency(max)} บาท</p>
        )}
      </div>

      {/* Large Amount Confirmation Dialog */}
      <AlertDialog open={showLargeAmountDialog} onOpenChange={setShowLargeAmountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันจำนวนเงินขนาดใหญ่</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                คุณกำลังระบุจำนวนเงินที่สูงมาก กรุณาตรวจสอบความถูกต้องอีกครั้ง
              </p>
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <p className="text-2xl font-bold text-amber-900 text-center">
                  {formatCurrency(pendingValue)} บาท
                </p>
                <p className="text-sm text-amber-700 text-center mt-2">
                  ({pendingValue?.toLocaleString('th-TH')} บาท)
                </p>
              </div>
              <p className="text-sm text-slate-600">
                ⚠️ จำนวนเงินนี้เกิน {formatCurrency(largeAmountThreshold)} บาท 
                กรุณาตรวจสอบให้แน่ใจว่าถูกต้อง
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLargeAmountCancel}>
              ยกเลิก แก้ไขใหม่
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLargeAmountConfirm}>
              ยืนยัน จำนวนเงินถูกต้อง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

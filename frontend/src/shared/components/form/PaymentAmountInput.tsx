/**
 * Payment Amount Input Component
 * 
 * Specialized input for payment amounts with:
 * - Real-time balance calculation display
 * - Error messages with specific amounts
 * - Suggestion for correct amount
 * - Celebration message for full payoff
 * - Auto-formatting with thousand separators
 * 
 * Implements Properties 12, 13, 14, 15 from the design document.
 * 
 * @module PaymentAmountInput
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, PartyPopper, AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  validatePaymentAmount,
  formatCurrency,
  type LoanInfo,
  type PaymentValidationResult,
} from '@/shared/utils/paymentValidation';

export interface PaymentAmountInputProps {
  label?: string;
  loanInfo: LoanInfo;
  value: string;
  onChange: (value: string, validationResult: PaymentValidationResult) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
}

/**
 * Payment Amount Input Component
 * 
 * Validates payment amounts in real-time and displays:
 * - Remaining balance after payment
 * - Error messages for invalid amounts
 * - Warning for unusually high payments
 * - Celebration message for exact payoff
 * 
 * @example
 * ```tsx
 * <PaymentAmountInput
 *   label="ยอดชำระ"
 *   loanInfo={{
 *     outstandingBalance: 100000,
 *     regularInstallment: 10000,
 *     loanId: 'L001'
 *   }}
 *   value={paymentAmount}
 *   onChange={(value, result) => {
 *     setPaymentAmount(value);
 *     setIsValid(result.isValid);
 *   }}
 * />
 * ```
 */
export function PaymentAmountInput({
  label = 'ยอดชำระ',
  loanInfo,
  value,
  onChange,
  onValidationChange,
  className,
  disabled = false,
  required = false,
  helperText,
}: PaymentAmountInputProps) {
  const [validationResult, setValidationResult] = useState<PaymentValidationResult>({
    isValid: true,
  });

  // Parse numeric value from formatted string
  const parseAmount = (formattedValue: string): number => {
    const cleaned = formattedValue.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Format value with thousand separators
  const formatValue = (numericValue: string): string => {
    const cleaned = numericValue.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    
    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Limit decimal places to 2
    if (parts[1]) {
      parts[1] = parts[1].substring(0, 2);
    }
    
    return parts.join('.');
  };

  // Validate payment amount
  useEffect(() => {
    // Don't validate empty value
    if (!value || value.trim() === '') {
      setValidationResult({ isValid: true });
      if (onValidationChange) {
        onValidationChange(true);
      }
      return;
    }

    const amount = parseAmount(value);
    const result = validatePaymentAmount(amount, loanInfo);
    
    setValidationResult(result);
    
    if (onValidationChange) {
      onValidationChange(result.isValid);
    }
  }, [value, loanInfo, onValidationChange]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only numbers, commas, and decimal point
    if (inputValue && !/^[0-9,]*\.?[0-9]{0,2}$/.test(inputValue.replace(/,/g, ''))) {
      return;
    }

    const formatted = formatValue(inputValue);
    
    const amount = parseAmount(formatted);
    const result = validatePaymentAmount(amount, loanInfo);
    
    onChange(formatted, result);
  };

  // Handle blur - ensure proper formatting
  const handleBlur = () => {
    if (!value || value.trim() === '') {
      return;
    }
    
    const amount = parseAmount(value);
    if (amount > 0) {
      const formatted = formatCurrency(amount);
      const result = validatePaymentAmount(amount, loanInfo);
      onChange(formatted, result);
    }
  };

  // Get input border color based on validation state
  const getBorderColor = () => {
    if (validationResult.celebration) {
      return 'border-green-500 focus-visible:ring-green-500';
    }
    if (validationResult.error) {
      return 'border-red-500 focus-visible:ring-red-500';
    }
    if (validationResult.warning) {
      return 'border-amber-500 focus-visible:ring-amber-500';
    }
    return 'border-input focus-visible:ring-ring';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          ฿
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            getBorderColor()
          )}
          placeholder="0.00"
          aria-invalid={!validationResult.isValid}
          aria-describedby={
            validationResult.error || validationResult.warning || validationResult.celebration
              ? 'payment-validation-message'
              : undefined
          }
        />
      </div>

      {/* Helper Text */}
      {helperText && !validationResult.error && !validationResult.warning && !validationResult.celebration && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}

      {/* Loan Info Display */}
      <div className="text-sm space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>ยอดคงเหลือปัจจุบัน:</span>
          <span className="font-medium">฿{formatCurrency(loanInfo.outstandingBalance)}</span>
        </div>
        {loanInfo.regularInstallment > 0 && (
          <div className="flex justify-between">
            <span>งวดปกติ:</span>
            <span className="font-medium">฿{formatCurrency(loanInfo.regularInstallment)}</span>
          </div>
        )}
      </div>

      {/* Real-time Balance Calculation (Property 15) */}
      {validationResult.isValid && validationResult.remainingBalance !== undefined && !validationResult.celebration && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-blue-900">
                ยอดคงเหลือหลังชำระ
              </p>
              <p className="text-lg font-semibold text-blue-700">
                ฿{formatCurrency(validationResult.remainingBalance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Message (Property 14) */}
      {validationResult.celebration && (
        <div
          id="payment-validation-message"
          className="p-4 bg-green-50 border border-green-200 rounded-md animate-in slide-in-from-top-2 duration-300"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <PartyPopper className="h-6 w-6 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 whitespace-pre-line">
                {validationResult.celebration}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Message (Property 13) */}
      {validationResult.warning && (
        <div
          id="payment-validation-message"
          className="p-3 bg-amber-50 border border-amber-200 rounded-md"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-900 whitespace-pre-line">
                {validationResult.warning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message (Property 12) */}
      {validationResult.error && (
        <div
          id="payment-validation-message"
          className="p-3 bg-red-50 border border-red-200 rounded-md"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-900 whitespace-pre-line">
                {validationResult.error}
              </p>
              
              {/* Suggestion for correct amount */}
              {parseAmount(value) > loanInfo.outstandingBalance && (
                <button
                  type="button"
                  onClick={() => {
                    const correctAmount = formatCurrency(loanInfo.outstandingBalance);
                    const result = validatePaymentAmount(loanInfo.outstandingBalance, loanInfo);
                    onChange(correctAmount, result);
                  }}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
                >
                  คลิกเพื่อใช้ยอดคงเหลือทั้งหมด (฿{formatCurrency(loanInfo.outstandingBalance)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Quick Payment Amount Buttons
 * 
 * Provides quick selection buttons for common payment amounts.
 * 
 * @example
 * ```tsx
 * <QuickPaymentButtons
 *   loanInfo={loanInfo}
 *   onSelect={(amount) => setPaymentAmount(formatCurrency(amount))}
 * />
 * ```
 */
export interface QuickPaymentButtonsProps {
  loanInfo: LoanInfo;
  onSelect: (amount: number) => void;
  className?: string;
}

export function QuickPaymentButtons({
  loanInfo,
  onSelect,
  className,
}: QuickPaymentButtonsProps) {
  const { outstandingBalance, regularInstallment } = loanInfo;

  const quickAmounts = [
    { label: 'งวดปกติ', amount: regularInstallment, show: regularInstallment > 0 },
    { label: '50%', amount: outstandingBalance * 0.5, show: true },
    { label: 'ชำระเต็ม', amount: outstandingBalance, show: true },
  ].filter(item => item.show && item.amount > 0);

  if (quickAmounts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-muted-foreground">ยอดชำระด่วน:</p>
      <div className="flex flex-wrap gap-2">
        {quickAmounts.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(item.amount)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md',
              'border border-input bg-background',
              'hover:bg-accent hover:text-accent-foreground',
              'transition-colors duration-200'
            )}
          >
            {item.label}
            <span className="ml-2 text-xs text-muted-foreground">
              (฿{formatCurrency(item.amount)})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

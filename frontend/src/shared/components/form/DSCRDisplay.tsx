/**
 * DSCR Display Component
 * 
 * Displays DSCR (Debt Service Coverage Ratio) with:
 * - Color-coded risk level indicators (red/yellow/green)
 * - Risk level messages with visual explanation
 * - Warning for extreme values (<0.5 or >5.0)
 * - Conflict detection alert if DSCR conflicts with qualitative score
 * - Real-time calculation display
 * 
 * Implements Properties 16, 17, 18, 19, 20 from the design document.
 * 
 * @module DSCRDisplay
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  calculateDSCR,
  getDSCRColor,
  getDSCRBackgroundColor,
  getDSCRBorderColor,
  detectDSCRConflict,
  formatDSCR,
  type DSCRCalculationResult,
} from '@/shared/utils/dscrCalculation';

export interface DSCRDisplayProps {
  netIncome: number;
  totalDebtService: number;
  qualitativeScore?: number;
  showCalculation?: boolean;
  className?: string;
  onConflictDetected?: (hasConflict: boolean) => void;
  onExtremeValueDetected?: (hasExtreme: boolean) => void;
}

/**
 * DSCR Display Component
 * 
 * Calculates and displays DSCR with risk level messaging and warnings.
 * 
 * @example
 * ```tsx
 * <DSCRDisplay
 *   netIncome={150000}
 *   totalDebtService={100000}
 *   qualitativeScore={85}
 *   showCalculation={true}
 *   onConflictDetected={(hasConflict) => setHasConflict(hasConflict)}
 * />
 * ```
 */
export function DSCRDisplay({
  netIncome,
  totalDebtService,
  qualitativeScore,
  showCalculation = false,
  className,
  onConflictDetected,
  onExtremeValueDetected,
}: DSCRDisplayProps) {
  const [result, setResult] = useState<DSCRCalculationResult | null>(null);
  const [showExtremeConfirmation, setShowExtremeConfirmation] = useState(false);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // Calculate DSCR when inputs change
  useEffect(() => {
    const calculationResult = calculateDSCR(netIncome, totalDebtService);
    setResult(calculationResult);

    // Check for extreme values
    if (calculationResult.isValid && calculationResult.warning) {
      setShowExtremeConfirmation(true);
      if (onExtremeValueDetected) {
        onExtremeValueDetected(true);
      }
    } else {
      setShowExtremeConfirmation(false);
      if (onExtremeValueDetected) {
        onExtremeValueDetected(false);
      }
    }

    // Check for conflicts with qualitative score
    if (calculationResult.isValid && qualitativeScore !== undefined) {
      const conflict = detectDSCRConflict(calculationResult.dscr, qualitativeScore);
      setShowConflictWarning(conflict.hasConflict);
      if (onConflictDetected) {
        onConflictDetected(conflict.hasConflict);
      }
    } else {
      setShowConflictWarning(false);
      if (onConflictDetected) {
        onConflictDetected(false);
      }
    }
  }, [netIncome, totalDebtService, qualitativeScore, onConflictDetected, onExtremeValueDetected]);

  if (!result) {
    return null;
  }

  // Property 18: DSCR Validation Guidance
  if (!result.isValid) {
    return (
      <div className={cn('p-4 bg-red-50 border border-red-200 rounded-md', className)} role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 mb-1">
              ไม่สามารถคำนวณ DSCR ได้
            </p>
            <p className="text-sm text-red-800 whitespace-pre-line">
              {result.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { dscr, riskLevel, riskMessage } = result;

  // Get icon based on risk level
  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'high':
        return <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />;
      case 'medium':
        return <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />;
      case 'low':
        return <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />;
      default:
        return <Info className="h-6 w-6 text-gray-600 shrink-0" />;
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Property 16: DSCR Real-time Calculation Display */}
      <div
        className={cn(
          'p-4 border rounded-md transition-colors duration-200',
          getDSCRBackgroundColor(dscr),
          getDSCRBorderColor(dscr)
        )}
      >
        <div className="flex items-start gap-3">
          {getRiskIcon()}
          
          <div className="flex-1 space-y-2">
            {/* DSCR Value */}
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-gray-700">DSCR:</span>
              <span className={cn('text-2xl font-bold', getDSCRColor(dscr))}>
                {formatDSCR(dscr)}
              </span>
            </div>

            {/* Property 17: DSCR Risk Level Messaging */}
            {riskMessage && (
              <p className="text-sm whitespace-pre-line leading-relaxed">
                {riskMessage}
              </p>
            )}

            {/* Show calculation breakdown if requested */}
            {showCalculation && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                <p className="font-medium">การคำนวณ:</p>
                <p>รายได้สุทธิ: ฿{netIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                <p>ภาระหนี้ทั้งหมด: ฿{totalDebtService.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                <p className="font-medium mt-1">
                  DSCR = {netIncome.toLocaleString('th-TH')} ÷ {totalDebtService.toLocaleString('th-TH')} = {formatDSCR(dscr)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property 20: DSCR Extreme Value Confirmation */}
      {showExtremeConfirmation && result.warning && (
        <div
          className="p-4 bg-amber-50 border border-amber-300 rounded-md animate-in slide-in-from-top-2 duration-300"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">
                ตรวจพบค่า DSCR ผิดปกติ
              </p>
              <p className="text-sm text-amber-800 whitespace-pre-line">
                {result.warning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Property 19: DSCR Conflict Detection */}
      {showConflictWarning && qualitativeScore !== undefined && (
        <div
          className="p-4 bg-red-50 border border-red-300 rounded-md animate-in slide-in-from-top-2 duration-300"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-2">
                พบความขัดแย้งระหว่างข้อมูล
              </p>
              <p className="text-sm text-red-800 whitespace-pre-line">
                {detectDSCRConflict(dscr, qualitativeScore).message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Level Legend */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-xs font-medium text-gray-700 mb-2">เกณฑ์การประเมิน DSCR:</p>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>DSCR &lt; 1.25 = ความเสี่ยงสูง (รายได้ไม่เพียงพอชำระหนี้)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>DSCR 1.25-1.50 = ความเสี่ยงปานกลาง (รายได้พอชำระหนี้แต่มีความเสี่ยง)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>DSCR &gt; 1.50 = ความเสี่ยงต่ำ (รายได้เพียงพอชำระหนี้)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DSCR Input Component
 * 
 * Combined input fields for net income and total debt service with real-time DSCR display.
 * 
 * @example
 * ```tsx
 * <DSCRInput
 *   netIncome={netIncome}
 *   totalDebtService={totalDebtService}
 *   onNetIncomeChange={setNetIncome}
 *   onTotalDebtServiceChange={setTotalDebtService}
 *   qualitativeScore={85}
 * />
 * ```
 */
export interface DSCRInputProps {
  netIncome: number;
  totalDebtService: number;
  onNetIncomeChange: (value: number) => void;
  onTotalDebtServiceChange: (value: number) => void;
  qualitativeScore?: number;
  className?: string;
  disabled?: boolean;
}

export function DSCRInput({
  netIncome,
  totalDebtService,
  onNetIncomeChange,
  onTotalDebtServiceChange,
  qualitativeScore,
  className,
  disabled = false,
}: DSCRInputProps) {
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleNetIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseCurrency(e.target.value);
    onNetIncomeChange(value);
  };

  const handleTotalDebtServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseCurrency(e.target.value);
    onTotalDebtServiceChange(value);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Net Income Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">
          รายได้สุทธิ (Net Operating Income)
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ฿
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={formatCurrency(netIncome)}
            onChange={handleNetIncomeChange}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Total Debt Service Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">
          ภาระหนี้ทั้งหมด (Total Debt Service)
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ฿
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={formatCurrency(totalDebtService)}
            onChange={handleTotalDebtServiceChange}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* DSCR Display */}
      <DSCRDisplay
        netIncome={netIncome}
        totalDebtService={totalDebtService}
        qualitativeScore={qualitativeScore}
        showCalculation={true}
      />
    </div>
  );
}

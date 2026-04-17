/**
 * Character Count Component
 * 
 * Displays character count for text inputs with:
 * - Current count / Maximum count
 * - Visual warning when approaching limit
 * - Real-time updates
 * - Accessible with ARIA live region
 * 
 * @module CharacterCount
 */

import { cn } from '@/shared/lib/utils';

export interface CharacterCountProps {
  current: number;
  max: number;
  warningThreshold?: number; // Default: 0.8 (80%)
  className?: string;
}

/**
 * Character Count Display Component
 * 
 * Shows current character count and maximum with visual feedback.
 * Changes color when approaching limit.
 * 
 * @example
 * ```tsx
 * <CharacterCount current={45} max={100} />
 * // Output: "45 / 100"
 * 
 * <CharacterCount current={85} max={100} warningThreshold={0.8} />
 * // Output: "85 / 100" (in warning color)
 * 
 * <CharacterCount current={100} max={100} />
 * // Output: "100 / 100" (in error color)
 * ```
 */
export function CharacterCount({
  current,
  max,
  warningThreshold = 0.8,
  className,
}: CharacterCountProps) {
  const percentage = current / max;
  const isWarning = percentage >= warningThreshold && percentage < 1;
  const isError = percentage >= 1;
  const isOverLimit = current > max;

  /**
   * Get color class based on current count
   */
  const getColorClass = () => {
    if (isOverLimit) {
      return 'text-red-600 font-semibold';
    }
    if (isError) {
      return 'text-red-600 font-medium';
    }
    if (isWarning) {
      return 'text-amber-600 font-medium';
    }
    return 'text-muted-foreground';
  };

  /**
   * Get ARIA label for screen readers
   */
  const getAriaLabel = () => {
    if (isOverLimit) {
      return `เกินจำนวนตัวอักษรที่กำหนด ${current} จาก ${max} ตัวอักษร`;
    }
    if (isError) {
      return `ถึงจำนวนตัวอักษรสูงสุดแล้ว ${current} จาก ${max} ตัวอักษร`;
    }
    if (isWarning) {
      return `ใกล้ถึงจำนวนตัวอักษรสูงสุด ${current} จาก ${max} ตัวอักษร`;
    }
    return `${current} จาก ${max} ตัวอักษร`;
  };

  return (
    <div
      className={cn('text-sm transition-colors duration-200', getColorClass(), className)}
      role="status"
      aria-live="polite"
      aria-label={getAriaLabel()}
    >
      <span className="tabular-nums">{current.toLocaleString('th-TH')}</span>
      <span className="mx-1">/</span>
      <span className="tabular-nums">{max.toLocaleString('th-TH')}</span>
      
      {isOverLimit && (
        <span className="ml-2 text-xs">
          (เกิน {(current - max).toLocaleString('th-TH')} ตัวอักษร)
        </span>
      )}
    </div>
  );
}

/**
 * Text Input with Character Count
 * 
 * Combines textarea/input with character count display.
 * 
 * @example
 * ```tsx
 * <TextInputWithCount
 *   label="หมายเหตุ"
 *   maxLength={500}
 *   value={note}
 *   onChange={(e) => setNote(e.target.value)}
 * />
 * ```
 */
export interface TextInputWithCountProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  maxLength: number;
  warningThreshold?: number;
  showCount?: boolean;
  helperText?: string;
}

export function TextInputWithCount({
  label,
  maxLength,
  warningThreshold = 0.8,
  showCount = true,
  helperText,
  className,
  value = '',
  ...props
}: TextInputWithCountProps) {
  const currentLength = String(value).length;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          maxLength={maxLength}
          value={value}
          {...props}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        {helperText && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
        
        {showCount && (
          <CharacterCount
            current={currentLength}
            max={maxLength}
            warningThreshold={warningThreshold}
            className="ml-auto"
          />
        )}
      </div>
    </div>
  );
}

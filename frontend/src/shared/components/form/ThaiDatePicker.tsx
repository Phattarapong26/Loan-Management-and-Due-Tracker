/**
 * Thai Buddhist Calendar Date Picker Component
 * 
 * Date picker with Thai Buddhist calendar support (พ.ศ.)
 * 
 * Features:
 * - Display calendar in Thai Buddhist format (พ.ศ.)
 * - Show both formats: "25 ม.ค. 2568 (2025)"
 * - Accept multiple manual formats with auto-correction
 * - Validate future/past dates appropriately
 * - Display day of week for confirmation
 * - Implements Property 47: Date Input Thai Buddhist Calendar
 * 
 * @module ThaiDatePicker
 */

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parse, isValid, isBefore, isAfter, startOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { 
  toBuddhistYear, 
  toGregorianYear, 
  formatThaiDate as formatThaiDateUtil 
} from '@/shared/utils/thaiLanguage';

export interface ThaiDatePickerProps {
  /** Selected date */
  value?: Date;
  /** Callback when date changes */
  onChange?: (date: Date | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disable future dates */
  disableFuture?: boolean;
  /** Disable past dates */
  disablePast?: boolean;
  /** Minimum allowed date */
  minDate?: Date;
  /** Maximum allowed date */
  maxDate?: Date;
  /** Show Buddhist Era year */
  showBuddhistEra?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Format date in Thai Buddhist format (using shared utility)
 */
function formatThaiDate(date: Date, showBuddhistEra: boolean = true): string {
  return formatThaiDateUtil(date, 'EEEE d MMM yyyy', { showBuddhistEra, showGregorianYear: showBuddhistEra });
}

/**
 * Parse Thai date string to Date object
 * Supports multiple formats:
 * - DD/MM/YYYY (Buddhist or Gregorian)
 * - DD-MM-YYYY
 * - DD.MM.YYYY
 * - D MMM YYYY (Thai month names)
 */
function parseThaiDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const cleaned = dateStr.trim();

  // Try parsing DD/MM/YYYY format
  const slashMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);

    // Convert Buddhist year to Gregorian if year > 2500
    if (year > 2500) {
      year = toGregorianYear(year);
    }

    const date = new Date(year, month - 1, day);
    if (isValid(date)) {
      return date;
    }
  }

  // Try parsing with date-fns
  const formats = [
    'd MMM yyyy',
    'd MMMM yyyy',
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'dd.MM.yyyy',
  ];

  for (const formatStr of formats) {
    try {
      const parsed = parse(cleaned, formatStr, new Date(), { locale: th });
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Thai Buddhist Calendar Date Picker Component
 * 
 * @example
 * ```tsx
 * <ThaiDatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   showBuddhistEra={true}
 *   disableFuture={true}
 *   placeholder="เลือกวันที่"
 * />
 * ```
 */
export function ThaiDatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  disableFuture = false,
  disablePast = false,
  minDate,
  maxDate,
  showBuddhistEra = true,
  className,
  disabled = false,
}: ThaiDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Update input value when value changes
  useEffect(() => {
    if (value) {
      setInputValue(formatThaiDate(value, showBuddhistEra));
      setError(null);
    } else {
      setInputValue('');
    }
  }, [value, showBuddhistEra]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue.trim() === '') {
      onChange?.(undefined);
      setError(null);
      return;
    }

    const parsed = parseThaiDate(newValue);
    if (parsed) {
      // Validate date
      const validationError = validateDate(parsed);
      if (validationError) {
        setError(validationError);
      } else {
        onChange?.(parsed);
        setError(null);
      }
    } else {
      setError('รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้รูปแบบ DD/MM/YYYY');
    }
  };

  const handleInputBlur = () => {
    if (value && !error) {
      setInputValue(formatThaiDate(value, showBuddhistEra));
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const validationError = validateDate(date);
      if (validationError) {
        setError(validationError);
      } else {
        onChange?.(date);
        setError(null);
        setOpen(false);
      }
    }
  };

  const validateDate = (date: Date): string | null => {
    const today = startOfDay(new Date());

    if (disableFuture && isAfter(startOfDay(date), today)) {
      return 'ไม่สามารถเลือกวันที่ในอนาคตได้';
    }

    if (disablePast && isBefore(startOfDay(date), today)) {
      return 'ไม่สามารถเลือกวันที่ในอดีตได้';
    }

    if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) {
      return `วันที่ต้องไม่ก่อน ${formatThaiDate(minDate, false)}`;
    }

    if (maxDate && isAfter(startOfDay(date), startOfDay(maxDate))) {
      return `วันที่ต้องไม่หลัง ${formatThaiDate(maxDate, false)}`;
    }

    return null;
  };

  const getDisabledDates = (date: Date): boolean => {
    const today = startOfDay(new Date());

    if (disableFuture && isAfter(startOfDay(date), today)) {
      return true;
    }

    if (disablePast && isBefore(startOfDay(date), today)) {
      return true;
    }

    if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) {
      return true;
    }

    if (maxDate && isAfter(startOfDay(date), startOfDay(maxDate))) {
      return true;
    }

    return false;
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'flex-1',
              error && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                'px-3',
                !value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            disabled={getDisabledDates}
            initialFocus
            locale={th}
          />
          {showBuddhistEra && value && (
            <div className="p-3 border-t text-sm text-center text-muted-foreground">
              <p className="font-medium">
                {formatThaiDate(value, true)}
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-red-600 font-medium">
          ⚠️ {error}
        </p>
      )}

      {value && !error && (
        <p className="text-sm text-green-600 font-medium">
          ✓ {formatThaiDate(value, showBuddhistEra)}
        </p>
      )}

      <div className="text-xs text-slate-500">
        <p>💡 รูปแบบที่รองรับ: DD/MM/YYYY, DD-MM-YYYY, D MMM YYYY</p>
        <p>ตัวอย่าง: 25/01/2568, 25-01-2025, 25 ม.ค. 2568</p>
      </div>
    </div>
  );
}

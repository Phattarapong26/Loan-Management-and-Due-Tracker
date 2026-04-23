/**
 * Validated Input Component with Inline Validation
 * 
 * Features:
 * - Real-time validation with debouncing (300ms)
 * - Empathy-tone error messages in Thai
 * - Green checkmark for valid fields
 * - Auto-formatting for specific field types
 * - Accessible with ARIA labels
 * 
 * @module ValidatedInput
 */

import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  validateThaiId,
  validateTaxId,
  validatePhoneNumber,
  validateEmail,
  validateRequired,
  validateCompanyName,
  formatThaiId,
  formatPhoneNumber,
  type ValidationResult,
} from '@/shared/utils/validation';

export type ValidationType = 
  | 'thaiId' 
  | 'taxId' 
  | 'phone' 
  | 'email' 
  | 'required' 
  | 'companyName'
  | 'custom';

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  validationType?: ValidationType;
  customValidator?: (value: string) => ValidationResult;
  debounceMs?: number;
  showValidIcon?: boolean;
  fieldName?: string; // For required field validation
  onChange?: (value: string, isValid: boolean) => void;
  onValidationChange?: (result: ValidationResult) => void;
}

/**
 * Validated Input Component
 * 
 * Provides inline validation with empathy-tone error messages.
 * Validates as user types with configurable debouncing.
 * 
 * @example
 * ```tsx
 * <ValidatedInput
 *   label="เลขบัตรประชาชน"
 *   validationType="thaiId"
 *   onChange={(value, isValid) => {
 *     setThaiId(value);
 *     setIsThaiIdValid(isValid);
 *   }}
 * />
 * ```
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      validationType,
      customValidator,
      debounceMs = 300,
      showValidIcon = true,
      fieldName,
      onChange,
      onValidationChange,
      className,
      value: controlledValue,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useState<string>((controlledValue as string) || '');
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [touched, setTouched] = useState(false);

    // Sync with controlled value
    useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue as string);
      }
    }, [controlledValue]);

    /**
     * Get validator function based on validation type
     */
    const getValidator = useCallback((): ((val: string) => ValidationResult) | null => {
      switch (validationType) {
        case 'thaiId':
          return validateThaiId;
        case 'taxId':
          return validateTaxId;
        case 'phone':
          return validatePhoneNumber;
        case 'email':
          return validateEmail;
        case 'required':
          return (val: string) => validateRequired(val, fieldName || label);
        case 'companyName':
          return validateCompanyName;
        case 'custom':
          return customValidator || null;
        default:
          return null;
      }
    }, [validationType, customValidator, fieldName, label]);

    /**
     * Perform validation
     */
    const performValidation = useCallback((val: string) => {
      const validator = getValidator();
      
      if (!validator) {
        return;
      }

      setIsValidating(true);

      // Simulate async validation (in real app, might call API)
      setTimeout(() => {
        const result = validator(val);
        setValidationResult(result);
        setIsValidating(false);

        // Notify parent
        onValidationChange?.(result);
        onChange?.(val, result.isValid);
      }, 50);
    }, [getValidator, onChange, onValidationChange]);

    /**
     * Debounced validation
     */
    useEffect(() => {
      if (!touched || !value) {
        return;
      }

      const timeoutId = setTimeout(() => {
        performValidation(value);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    }, [value, touched, debounceMs, performValidation]);

    /**
     * Handle input change
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;

      // Auto-format for specific types
      if (validationType === 'phone' && newValue.length === 10 && !newValue.includes('-')) {
        newValue = formatPhoneNumber(newValue);
      } else if (validationType === 'thaiId' && newValue.length === 13 && !newValue.includes('-')) {
        newValue = formatThaiId(newValue);
      } else if (validationType === 'taxId' && newValue.length === 13 && !newValue.includes('-')) {
        newValue = formatThaiId(newValue);
      }

      setValue(newValue);
      
      // Clear validation result when user types
      if (validationResult && !validationResult.isValid) {
        setValidationResult(null);
      }
    };

    /**
     * Handle blur - mark as touched and validate immediately
     */
    const handleBlur = () => {
      setTouched(true);
      if (value) {
        performValidation(value);
      }
    };

    /**
     * Get input border color based on validation state
     */
    const getBorderColor = () => {
      if (!touched || !validationResult) {
        return '';
      }

      if (isValidating) {
        return 'border-blue-400';
      }

      return validationResult.isValid ? 'border-green-500' : 'border-red-500';
    };

    /**
     * Get validation icon
     */
    const getValidationIcon = () => {
      if (!touched || !showValidIcon) {
        return null;
      }

      if (isValidating) {
        return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      }

      if (!validationResult) {
        return null;
      }

      if (validationResult.isValid) {
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      }

      return <AlertCircle className="h-4 w-4 text-red-600" />;
    };

    // Generate unique ID if not provided
    const inputId = props.id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              'pr-10 transition-colors',
              getBorderColor(),
              className
            )}
            aria-invalid={touched && validationResult && !validationResult.isValid}
            aria-describedby={
              touched && validationResult && !validationResult.isValid
                ? `${inputId}-error`
                : undefined
            }
            {...props}
          />
          
          {/* Validation Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getValidationIcon()}
          </div>
        </div>

        {/* Error Message */}
        {touched && validationResult && !validationResult.isValid && validationResult.message && (
          <div
            id={`${inputId}-error`}
            className="flex items-start gap-2 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="whitespace-pre-line">{validationResult.message}</p>
          </div>
        )}

        {/* Success Message (optional) */}
        {touched && validationResult && validationResult.isValid && validationResult.suggestion && (
          <div className="flex items-start gap-2 text-sm text-green-600 animate-in fade-in slide-in-from-top-1 duration-200">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <p>รูปแบบที่ถูกต้อง: {validationResult.suggestion}</p>
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

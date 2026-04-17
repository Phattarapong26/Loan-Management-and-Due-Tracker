/**
 * Confirmation Dialog Component
 * 
 * Context-rich confirmation dialog for critical actions with:
 * - Large, readable fonts for critical information
 * - Before/after comparison where applicable
 * - Require scrolling to bottom before enabling confirm button
 * - Support for custom content and actions
 * 
 * Implements Property 11: Critical Action Confirmation
 * 
 * @module ConfirmationDialog
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export type ConfirmationVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: ConfirmationVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  requireScroll?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Confirmation Dialog Component
 * 
 * @example
 * ```tsx
 * <ConfirmationDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="ยืนยันการอนุมัติสินเชื่อ"
 *   description="กรุณาตรวจสอบข้อมูลก่อนอนุมัติ"
 *   variant="warning"
 *   confirmText="อนุมัติ"
 *   requireScroll={true}
 *   onConfirm={handleApprove}
 * >
 *   <LoanDetails loan={loan} />
 * </ConfirmationDialog>
 * ```
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'warning',
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
  requireScroll = false,
  children,
  disabled = false,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(!requireScroll);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset scroll state when dialog opens
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(!requireScroll);
      setIsLoading(false);
    }
  }, [open, requireScroll]);

  // Check if user has scrolled to bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!requireScroll) return;

    const element = e.currentTarget;
    const isAtBottom = Math.abs(
      element.scrollHeight - element.scrollTop - element.clientHeight
    ) < 10;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirmation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'success':
        return 'default';
      case 'info':
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-2 text-base">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content area */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className={cn(
            'flex-1 overflow-y-auto px-1 py-4',
            requireScroll && 'border-t border-b'
          )}
        >
          {children}
        </div>

        {/* Scroll indicator */}
        {requireScroll && !hasScrolledToBottom && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>กรุณาเลื่อนลงด้านล่างเพื่ออ่านข้อมูลทั้งหมดก่อนยืนยัน</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={getConfirmButtonVariant()}
            onClick={handleConfirm}
            disabled={disabled || isLoading || !hasScrolledToBottom}
            className="min-w-[100px]"
          >
            {isLoading ? 'กำลังดำเนินการ...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Confirmation Details Section
 * 
 * Helper component for displaying details in confirmation dialog
 */
export interface ConfirmationDetailsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ConfirmationDetailsSection({
  title,
  children,
  className,
}: ConfirmationDetailsSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/**
 * Confirmation Detail Row
 * 
 * Helper component for displaying key-value pairs
 */
export interface ConfirmationDetailRowProps {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  className?: string;
}

export function ConfirmationDetailRow({
  label,
  value,
  highlight = false,
  className,
}: ConfirmationDetailRowProps) {
  return (
    <div
      className={cn(
        'flex justify-between items-start py-2 border-b border-gray-200',
        highlight && 'bg-amber-50 px-3 rounded-md border-amber-200',
        className
      )}
    >
      <span className="text-sm font-medium text-gray-700">{label}:</span>
      <span
        className={cn(
          'text-sm text-gray-900 text-right',
          highlight && 'font-semibold text-lg'
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Before/After Comparison
 * 
 * Helper component for showing before/after values
 */
export interface BeforeAfterComparisonProps {
  label: string;
  before: React.ReactNode;
  after: React.ReactNode;
  className?: string;
}

export function BeforeAfterComparison({
  label,
  before,
  after,
  className,
}: BeforeAfterComparisonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-gray-700">{label}:</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600 mb-1">ก่อน</p>
          <p className="text-sm font-medium text-gray-900">{before}</p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-xs text-green-700 mb-1">หลัง</p>
          <p className="text-sm font-semibold text-green-900">{after}</p>
        </div>
      </div>
    </div>
  );
}

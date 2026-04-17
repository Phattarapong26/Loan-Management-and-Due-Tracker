/**
 * Loan Status Badge Component
 * 
 * Comprehensive status badge with icons and contextual information
 * 
 * Features:
 * - Green badge for active/current loans
 * - Yellow badge for pending with approval level
 * - Red badge for overdue with days count
 * - Critical warning badge for NPL
 * - Icons for better accessibility (not just colors)
 * - Implements Property 39: Loan Status Badge Display
 * 
 * @module LoanStatusBadge
 */

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle,
  FileCheck,
  HourglassIcon,
  Ban
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

export type LoanStatus = 
  | 'active'           // สินเชื่อปกติ
  | 'pending'          // รออนุมัติ
  | 'approved'         // อนุมัติแล้ว รอเบิกจ่าย
  | 'overdue'          // เกินกำหนดชำระ
  | 'npl'              // NPL (Non-Performing Loan)
  | 'closed'           // ปิดบัญชีแล้ว
  | 'rejected';        // ปฏิเสธ

export interface LoanStatusBadgeProps {
  /** Loan status */
  status: LoanStatus;
  /** Additional context (e.g., approval level, overdue days) */
  context?: string | number;
  /** Show icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  colorClasses: string;
}

const STATUS_CONFIG: Record<LoanStatus, StatusConfig> = {
  active: {
    label: 'ปกติ',
    icon: CheckCircle2,
    variant: 'default',
    colorClasses: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  },
  pending: {
    label: 'รออนุมัติ',
    icon: Clock,
    variant: 'secondary',
    colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  },
  approved: {
    label: 'อนุมัติแล้ว',
    icon: FileCheck,
    variant: 'default',
    colorClasses: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  },
  overdue: {
    label: 'เกินกำหนด',
    icon: AlertTriangle,
    variant: 'destructive',
    colorClasses: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  },
  npl: {
    label: 'NPL',
    icon: XCircle,
    variant: 'destructive',
    colorClasses: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  },
  closed: {
    label: 'ปิดบัญชี',
    icon: Ban,
    variant: 'outline',
    colorClasses: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
  },
  rejected: {
    label: 'ปฏิเสธ',
    icon: XCircle,
    variant: 'outline',
    colorClasses: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const ICON_SIZE_CLASSES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * Loan Status Badge Component
 * 
 * @example
 * ```tsx
 * // Active loan
 * <LoanStatusBadge status="active" />
 * 
 * // Pending with approval level
 * <LoanStatusBadge status="pending" context="ระดับ 2" />
 * 
 * // Overdue with days count
 * <LoanStatusBadge status="overdue" context={15} />
 * 
 * // NPL (critical)
 * <LoanStatusBadge status="npl" context="90+ วัน" />
 * ```
 */
export function LoanStatusBadge({
  status,
  context,
  showIcon = true,
  size = 'md',
  className,
}: LoanStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Format context based on status
  const getContextText = () => {
    if (!context) return null;

    switch (status) {
      case 'pending':
        return typeof context === 'string' ? context : `ระดับ ${context}`;
      case 'overdue':
        return typeof context === 'number' ? `${context} วัน` : context;
      case 'npl':
        return typeof context === 'string' ? context : `${context}+ วัน`;
      default:
        return context;
    }
  };

  const contextText = getContextText();

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold border',
        config.colorClasses,
        SIZE_CLASSES[size],
        className
      )}
    >
      {showIcon && <Icon className={ICON_SIZE_CLASSES[size]} />}
      <span>{config.label}</span>
      {contextText && (
        <span className="font-normal opacity-90">
          ({contextText})
        </span>
      )}
    </Badge>
  );
}

/**
 * Get loan status from loan data
 * Helper function to determine status from loan object
 */
export function getLoanStatus(loan: {
  status: string;
  overdueDays?: number;
  isNPL?: boolean;
}): LoanStatus {
  // Check NPL first (highest priority)
  if (loan.isNPL || (loan.overdueDays && loan.overdueDays >= 90)) {
    return 'npl';
  }

  // Check overdue
  if (loan.overdueDays && loan.overdueDays > 0) {
    return 'overdue';
  }

  // Map status string to LoanStatus
  const statusMap: Record<string, LoanStatus> = {
    'active': 'active',
    'current': 'active',
    'pending': 'pending',
    'approved': 'approved',
    'overdue': 'overdue',
    'npl': 'npl',
    'closed': 'closed',
    'rejected': 'rejected',
  };

  return statusMap[loan.status.toLowerCase()] || 'active';
}

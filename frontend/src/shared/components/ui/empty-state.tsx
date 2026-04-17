/**
 * Empty State Component - แสดงเมื่อไม่มีข้อมูล
 * พร้อม Icon, Message, และ Call-to-Action
 */

import { ReactNode } from 'react';
import { Button } from './button';
import { cn } from '@/shared/lib/utils';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      title: 'text-base',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center px-4 text-center',
      sizes.container,
      className
    )}>
      {/* Icon */}
      <div className={cn(
        'text-muted-foreground mb-4',
        sizes.icon
      )}>
        {icon}
      </div>

      {/* Title */}
      <h3 className={cn(
        'font-semibold mb-2 text-foreground',
        sizes.title
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn(
        'text-muted-foreground mb-6 max-w-md',
        sizes.description
      )}>
        {description}
      </p>

      {/* Action Button */}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * Empty State Variants - Pre-configured empty states
 */

interface EmptyStateVariantProps {
  onAction?: () => void;
  actionLabel?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

// No Customers
export function EmptyCustomers({ 
  onAction, 
  actionLabel = 'เพิ่มลูกค้า',
  description = 'เริ่มต้นโดยเพิ่มข้อมูลลูกค้ารายแรกของคุณ เพื่อสร้างสินเชื่อและจัดการข้อมูล',
  size = 'md'
}: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      }
      title="ยังไม่มีลูกค้าในระบบ"
      description={description}
      size={size}
      action={onAction && (
        <Button onClick={onAction}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </Button>
      )}
    />
  );
}

// No Loans
export function EmptyLoans({ 
  onAction, 
  actionLabel = 'สร้างสินเชื่อ',
  description = 'เริ่มต้นโดยสร้างสินเชื่อรายการแรกของคุณ เพื่อจัดการและติดตามสถานะ',
  size = 'md'
}: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      title="ยังไม่มีสินเชื่อในระบบ"
      description={description}
      size={size}
      action={onAction && (
        <Button onClick={onAction}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </Button>
      )}
    />
  );
}

// No Payments
export function EmptyPayments({ 
  onAction, 
  actionLabel = 'บันทึกการชำระเงิน',
  description = 'ยังไม่มีประวัติการชำระเงิน เมื่อมีการชำระเงินจะแสดงที่นี่',
  size = 'md'
}: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      }
      title="ยังไม่มีประวัติการชำระเงิน"
      description={description}
      size={size}
      action={onAction && (
        <Button onClick={onAction}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </Button>
      )}
    />
  );
}

// No Search Results
export function EmptySearchResults({ 
  searchTerm,
  onClear,
  size = 'md'
}: { 
  searchTerm?: string; 
  onClear?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      title="ไม่พบข้อมูลที่ค้นหา"
      description={searchTerm 
        ? `ไม่พบผลลัพธ์สำหรับ "${searchTerm}" ลองค้นหาด้วยคำอื่น`
        : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่เลือก'
      }
      size={size}
      action={onClear && (
        <Button variant="outline" onClick={onClear}>
          ล้างการค้นหา
        </Button>
      )}
    />
  );
}

// No Data (Generic)
export function EmptyData({ 
  title = 'ยังไม่มีข้อมูล',
  description = 'ยังไม่มีข้อมูลในส่วนนี้',
  size = 'md'
}: { 
  title?: string; 
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      }
      title={title}
      description={description}
      size={size}
    />
  );
}

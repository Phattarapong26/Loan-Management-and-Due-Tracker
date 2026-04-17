/**
 * Mobile Responsive Components
 * 
 * Components optimized for mobile devices
 * Implements Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useIsMobile, useIsTablet } from '@/shared/hooks/useMediaQuery';
import { Button } from './button';
import { Card } from './card';

/**
 * Mobile-optimized table that converts to cards on small screens
 * 
 * @example
 * ```tsx
 * <ResponsiveTable
 *   headers={['ชื่อ', 'อีเมล', 'สถานะ']}
 *   data={[
 *     { name: 'สมชาย', email: 'somchai@example.com', status: 'Active' },
 *   ]}
 *   renderRow={(item) => (
 *     <>
 *       <td>{item.name}</td>
 *       <td>{item.email}</td>
 *       <td>{item.status}</td>
 *     </>
 *   )}
 *   renderCard={(item) => (
 *     <div>
 *       <p><strong>ชื่อ:</strong> {item.name}</p>
 *       <p><strong>อีเมล:</strong> {item.email}</p>
 *       <p><strong>สถานะ:</strong> {item.status}</p>
 *     </div>
 *   )}
 * />
 * ```
 */
export function ResponsiveTable<T>({
  headers,
  data,
  renderRow,
  renderCard,
  keyExtractor,
  className,
}: {
  headers: string[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  renderCard: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Card layout for mobile
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <Card key={keyExtractor(item, index)} className="p-4">
            {renderCard(item, index)}
          </Card>
        ))}
      </div>
    );
  }

  // Table layout for desktop
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {headers.map((header, index) => (
              <th key={index} className="text-left p-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={keyExtractor(item, index)} className="border-b hover:bg-muted/50">
              {renderRow(item, index)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Mobile-optimized expandable section
 * 
 * @example
 * ```tsx
 * <MobileExpandable title="รายละเอียดเพิ่มเติม">
 *   <p>เนื้อหาที่ซ่อนไว้</p>
 * </MobileExpandable>
 * ```
 */
export function MobileExpandable({
  title,
  children,
  defaultExpanded = false,
  className,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const isMobile = useIsMobile();

  // Always show on desktop
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left font-medium"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
      </button>
      {isExpanded && <div className="p-4 pt-0">{children}</div>}
    </div>
  );
}

/**
 * Mobile-optimized button with minimum touch target size (44x44px)
 * 
 * @example
 * ```tsx
 * <TouchButton onClick={handleClick}>
 *   คลิก
 * </TouchButton>
 * ```
 */
export function TouchButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn('min-h-[44px] min-w-[44px] touch-manipulation', className)}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Mobile-optimized form with one field per row
 * 
 * @example
 * ```tsx
 * <MobileForm onSubmit={handleSubmit}>
 *   <MobileFormField label="ชื่อ">
 *     <Input name="name" />
 *   </MobileFormField>
 *   <MobileFormField label="อีเมล">
 *     <Input name="email" type="email" />
 *   </MobileFormField>
 * </MobileForm>
 * ```
 */
export function MobileForm({
  children,
  onSubmit,
  className,
}: {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}) {
  const isMobile = useIsMobile();

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'space-y-4',
        isMobile && 'space-y-6',
        className
      )}
    >
      {children}
    </form>
  );
}

/**
 * Mobile form field with label
 */
export function MobileFormField({
  label,
  required,
  error,
  description,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div className={cn('space-y-2', isMobile && 'space-y-3')}>
      <label className={cn('block font-medium', isMobile && 'text-base')}>
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

/**
 * Mobile-optimized sticky header
 * 
 * @example
 * ```tsx
 * <MobileStickyHeader>
 *   <h1>หน้าหลัก</h1>
 * </MobileStickyHeader>
 * ```
 */
export function MobileStickyHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-40 bg-background border-b',
        'backdrop-blur-sm bg-background/95',
        className
      )}
    >
      <div className="container mx-auto px-4 py-3">
        {children}
      </div>
    </div>
  );
}

/**
 * Mobile-optimized bottom navigation bar
 * 
 * @example
 * ```tsx
 * <MobileBottomNav>
 *   <MobileBottomNavItem icon={<Home />} label="หน้าหลัก" active />
 *   <MobileBottomNavItem icon={<Search />} label="ค้นหา" />
 * </MobileBottomNav>
 * ```
 */
export function MobileBottomNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background border-t',
        'backdrop-blur-sm bg-background/95',
        'safe-area-inset-bottom',
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {children}
      </div>
    </nav>
  );
}

/**
 * Mobile bottom navigation item
 */
export function MobileBottomNavItem({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center',
        'min-w-[60px] min-h-[44px] px-2',
        'transition-colors touch-manipulation',
        'relative',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}

/**
 * Mobile-optimized horizontal scroll container
 * 
 * @example
 * ```tsx
 * <MobileHorizontalScroll>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </MobileHorizontalScroll>
 * ```
 */
export function MobileHorizontalScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-4 overflow-x-auto pb-4',
        'snap-x snap-mandatory',
        'scrollbar-hide',
        '-mx-4 px-4',
        className
      )}
    >
      {React.Children.map(children, (child) => (
        <div className="snap-start flex-shrink-0">
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Show content only on mobile
 */
export function MobileOnly({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? <>{children}</> : null;
}

/**
 * Show content only on tablet
 */
export function TabletOnly({ children }: { children: React.ReactNode }) {
  const isTablet = useIsTablet();
  return isTablet ? <>{children}</> : null;
}

/**
 * Show content only on desktop
 */
export function DesktopOnly({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  return !isMobile && !isTablet ? <>{children}</> : null;
}

/**
 * Mobile-optimized spacing
 */
export function MobileSpacing({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(isMobile ? 'space-y-4' : 'space-y-6')}>
      {children}
    </div>
  );
}

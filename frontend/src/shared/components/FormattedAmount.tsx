import React from 'react';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';

interface FormattedAmountProps {
  amount: number;
  currency?: string;
  className?: string;
  compactThreshold?: number;
  showFullOnHover?: boolean;
}

/**
 * FormattedAmount component that handles large numbers responsively.
 * Shows compact notation (e.g., 1.2M) on small screens or for very large numbers,
 * with the full value available on hover via tooltip.
 */
export const FormattedAmount: React.FC<FormattedAmountProps> = ({
  amount,
  currency = 'บาท',
  className = '',
  compactThreshold = 1000000,
  showFullOnHover = true,
}) => {
  const isMobile = useIsMobile();
  
  // Always use compact if it's mobile OR if the amount is larger than the threshold
  const shouldCompact = isMobile || amount >= compactThreshold;

  const formatFull = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatCompact = (val: number) => {
    // We use th-TH because it will give Thai compact units (e.g. "ล้าน")
    // or we can use en-US for M, K, B if preferred. 
    // Usually for banking in Thailand, standard numeric suffixes are used or written in Thai.
    return new Intl.NumberFormat('th-TH', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (!shouldCompact) {
    return (
      <span className={cn('whitespace-nowrap', className)}>
        {formatFull(amount)} {currency}
      </span>
    );
  }

  const mainContent = (
    <span className={cn(
      'whitespace-nowrap', 
      showFullOnHover && 'cursor-help border-b border-dotted border-primary/40 hover:border-primary/80 transition-colors',
      className
    )}>
      {formatCompact(amount)} {currency}
    </span>
  );

  if (!showFullOnHover) return mainContent;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        {mainContent}
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-slate-900 border-slate-800 text-white p-2">
        <p className="font-semibold tracking-tight">
          {formatFull(amount)} <span className="text-xs text-slate-400 font-normal">{currency}</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

import { Badge } from '@/shared/components/ui/badge';
import { TrendingUp, TrendingDown, Building2, Calendar } from 'lucide-react';
import { getDSCRDisplay, getIndustryName } from '../utils/risk-scoring.util';
import { cn } from '@/shared/lib/utils';

interface FinancialContextProps {
  dscr?: number;
  dscrStatus?: string;
  industryCode?: string;
  businessAge?: number;
  nplStatus?: boolean;
  creditUtilization?: number;
}

export function FinancialContext({
  dscr,
  dscrStatus,
  industryCode,
  businessAge,
  nplStatus,
  creditUtilization,
}: FinancialContextProps) {
  const dscrDisplay = getDSCRDisplay(dscr);
  const industryName = getIndustryName(industryCode);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {/* DSCR Badge */}
      {dscr && (
        <div className="flex items-center gap-1.5 text-xs bg-background/80 px-2 py-1 rounded-md ring-1 ring-border">
          {dscr >= 1.2 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span className="text-muted-foreground">DSCR:</span>
          <span className={cn('font-semibold', dscrDisplay.color)}>{dscrDisplay.text}</span>
        </div>
      )}

      {/* NPL Status Badge */}
      {nplStatus && (
        <Badge variant="destructive" className="text-xs">
          NPL
        </Badge>
      )}

      {/* Credit Utilization */}
      {creditUtilization !== undefined && (
        <div className="flex items-center gap-1.5 text-xs bg-background/80 px-2 py-1 rounded-md ring-1 ring-border">
          <span className="text-muted-foreground">Credit:</span>
          <span
            className={cn(
              'font-semibold',
              creditUtilization > 80
                ? 'text-red-600'
                : creditUtilization > 50
                ? 'text-yellow-600'
                : 'text-green-600'
            )}
          >
            {creditUtilization.toFixed(0)}%
          </span>
        </div>
      )}

      {/* Industry */}
      {industryCode && (
        <div className="flex items-center gap-1.5 text-xs bg-background/80 px-2 py-1 rounded-md ring-1 ring-border">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{industryName}</span>
        </div>
      )}

      {/* Business Age */}
      {businessAge !== undefined && (
        <div className="flex items-center gap-1.5 text-xs bg-background/80 px-2 py-1 rounded-md ring-1 ring-border">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{businessAge} ปี</span>
        </div>
      )}
    </div>
  );
}

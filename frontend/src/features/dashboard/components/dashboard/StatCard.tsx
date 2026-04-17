import { TrendingUp, TrendingDown } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { StatCard as StatCardType } from '@/shared/types/user';

interface StatCardProps extends StatCardType {
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {

  const IconComponent = Icons[icon] || Icons.Activity;

  const variantStyles = {
    default: 'stat-card',
    primary: 'stat-card stat-card-primary',
    success: 'stat-card stat-card-success',
    warning: 'stat-card stat-card-warning',
    info: 'stat-card stat-card-info',
  };

  const isColored = variant !== 'default';

  return (
    <div className={cn(variantStyles[variant], 'animate-scale-in rounded-lg border p-4', className)}>
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'p-3 rounded-lg',
            isColored ? 'bg-white/20' : 'bg-primary/10'
          )}
        >
          <IconComponent
            className={cn('h-6 w-6', isColored ? 'text-white' : 'text-primary')}
          />
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              isColored
                ? 'bg-white/20 text-white'
                : trend.isPositive
                ? 'badge-trend-up'
                : 'badge-trend-down'
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p
          className={cn(
            'text-sm font-medium',
            isColored ? 'text-white/80' : 'text-muted-foreground'
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            'text-3xl font-bold mt-1',
            isColored ? 'text-white' : 'text-foreground'
          )}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );
}

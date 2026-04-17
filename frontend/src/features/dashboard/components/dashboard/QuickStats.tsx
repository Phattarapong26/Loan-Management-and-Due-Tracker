import { 
  TrendingUp, 
  Users, 
  FileText, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface QuickStatItemProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info';
}

function QuickStatItem({ title, value, change, icon, color }: QuickStatItemProps) {
  const isPositive = change >= 0;
  
  const colorStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-xl shadow-card rounded-lg border p-4 ">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', colorStyles[color])}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
      </div>
      <div className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isPositive ? 'text-success' : 'text-destructive'
      )}>
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {Math.abs(change)}%
      </div>
    </div>
  );
}

export function QuickStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <QuickStatItem
        title="Pageviews"
        value={12450}
        change={8.5}
        icon={<TrendingUp className="h-5 w-5" />}
        color="primary"
      />
      <QuickStatItem
        title="Clicks"
        value={8320}
        change={-2.3}
        icon={<Users className="h-5 w-5" />}
        color="info"
      />
    </div>
  );
}

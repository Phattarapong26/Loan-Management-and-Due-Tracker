import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { FormattedAmount } from '@/shared/components/FormattedAmount';

interface BranchStatsCardsProps {
  totalBranches: number;
  totalOfficers: number;
  totalLoans: number;
  totalOutstanding: number;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
  isLoading?: boolean;
  waveDirection?: 'left' | 'right';
}

const StatCard = ({
  title,
  value,
  unit,
  icon: Icon,
  gradient,
  iconBg,
  iconColor,
  trend,
  trendUp,
  isLoading = false,
  waveDirection = 'left'
}: StatCardProps) => {
  const waveClasses = waveDirection === 'right'
    ? "absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6"
    : "absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6";

  const wavePosition = waveDirection === 'right' ? 'right-0' : 'left-0';

  // For first 3 cards (without trend), show as integer
  const shouldShowAsInteger = !trend;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
      {/* Wave Background */}
      <div className={`absolute bottom-0 ${wavePosition} w-full h-full pointer-events-none overflow-hidden select-none`}>
        <svg viewBox="0 0 400 200" className={waveClasses} preserveAspectRatio="none">
          <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className={`${gradient} opacity-10`} />
          <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className={`${gradient} opacity-20`} />
          <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className={`${gradient} opacity-40`} />
        </svg>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`${iconBg} p-3 rounded-xl shadow-lg shadow-primary/20`}>
            <Icon className={`h-6 w-6 ${iconColor}`} strokeWidth={2} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${iconBg} backdrop-blur-sm px-2 py-1 rounded-lg`}>
              {trendUp ? (
                <ArrowUpRight className={`h-3 w-3 ${iconColor}`} />
              ) : (
                <ArrowDownRight className={`h-3 w-3 ${iconColor}`} />
              )}
              <span className={`text-xs font-semibold ${iconColor}`}>{trend}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="inline-block w-20 h-8 bg-slate-200 rounded animate-pulse" />
              ) : typeof value === 'number' ? (
                shouldShowAsInteger ? (
                  // Show as integer for first 3 cards
                  value.toLocaleString('th-TH', { maximumFractionDigits: 0 })
                ) : (
                  // Show with FormattedAmount for last card (currency)
                  <FormattedAmount 
                    amount={value} 
                    currency={unit} 
                    className="text-3xl font-bold text-slate-900 tracking-tight border-none hover:border-none" 
                    compactThreshold={1000}
                  />
                )
              ) : (
                value
              )}
            </h3>
            {unit && !isLoading && shouldShowAsInteger && (
              <span className="text-sm font-semibold text-slate-500">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
    </div>
  );
};

export function BranchStatsCards({
  totalBranches,
  totalOfficers,
  totalLoans,
  totalOutstanding,
  isLoading = false,
}: BranchStatsCardsProps) {
  const cards = [
    {
      title: 'สาขาทั้งหมด',
      value: totalBranches,
      unit: 'สาขา',
      icon: Building2,
      gradient: "text-blue-500",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      isLoading,
      waveDirection: 'left' as const
    },
    {
      title: 'เจ้าหน้าที่รวม',
      value: totalOfficers,
      unit: 'คน',
      icon: Users,
      gradient: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      isLoading,
      waveDirection: 'right' as const
    },
    {
      title: 'สินเชื่อรวม',
      value: totalLoans,
      unit: 'รายการ',
      icon: TrendingUp,
      gradient: "text-cyan-500",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-500",
      isLoading,
      waveDirection: 'left' as const
    },
    {
      title: 'ยอดคงค้างรวม',
      value: totalOutstanding,
      unit: 'บาท',
      icon: DollarSign,
      gradient: "text-amber-500",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      trend: "+8%",
      trendUp: true,
      isLoading,
      waveDirection: 'right' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}

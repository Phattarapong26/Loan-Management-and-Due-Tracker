import {
  FolderOpen,
  CheckCircle,
  Sparkles,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface DocumentStatsCardsProps {
  totalCount: number;
  completedCount: number;
  processingCount: number;
  errorCount: number;
  isLoading?: boolean;
}

const formatCompactNumber = (number: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
};

interface StatCardProps {
  title: string;
  value: string;
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
              ) : (
                value
              )}
            </h3>
            {unit && !isLoading && (
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

export function DocumentStatsCards({
  totalCount,
  completedCount,
  processingCount,
  errorCount,
  isLoading = false,
}: DocumentStatsCardsProps) {
  const cards = [
    {
      title: 'เอกสารทั้งหมด',
      value: formatCompactNumber(totalCount),
      unit: 'รายการ',
      icon: FolderOpen,
      gradient: "text-blue-500",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      trend: "+18%",
      trendUp: true,
      isLoading,
      waveDirection: 'left' as const
    },
    {
      title: 'ตรวจสอบสำเร็จ',
      value: formatCompactNumber(completedCount),
      unit: 'รายการ',
      icon: CheckCircle,
      gradient: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      trend: "+25%",
      trendUp: true,
      isLoading,
      waveDirection: 'right' as const
    },
    {
      title: 'รอการตรวจสอบ',
      value: formatCompactNumber(processingCount),
      unit: 'รายการ',
      icon: Sparkles,
      gradient: "text-cyan-500",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-500",
      isLoading,
      waveDirection: 'left' as const
    },
    {
      title: 'ข้อมูลไม่สมบูรณ์',
      value: formatCompactNumber(errorCount),
      unit: 'รายการ',
      icon: XCircle,
      gradient: "text-rose-500",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-500",
      trend: errorCount > 0 ? "-5%" : undefined,
      trendUp: false,
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

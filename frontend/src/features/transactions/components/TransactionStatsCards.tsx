import { Wallet, DollarSign, TrendingUp } from 'lucide-react';

interface TransactionStatsCardsProps {
  stats: {
    approved?: number;
    totalAmount?: number;
    pendingAmount?: number;
  };
  isLoading: boolean;
  activeTab: 'pending' | 'history';
}

const formatCompactNumber = (number: number): string => {
  if (isNaN(number) || !isFinite(number) || number === 0) return '0';
  
  const absNumber = Math.abs(number);
  
  // Use simple division and formatting
  if (absNumber >= 1000000000) {
    return (number / 1000000000).toFixed(1) + 'B';
  } else if (absNumber >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (absNumber >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  } else {
    return Math.round(number).toLocaleString('th-TH');
  }
};

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
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

export function TransactionStatsCards({ stats, isLoading, activeTab }: TransactionStatsCardsProps) {
  // Safely handle stats data with validation
  const safeStats = {
    approved: Math.max(0, Number(stats.approved) || 0),
    totalAmount: Math.max(0, Number(stats.totalAmount) || 0),
    pendingAmount: Math.max(0, Number(stats.pendingAmount) || 0),
  };

  const cards = activeTab === 'pending' 
    ? [
        {
          title: 'รายการรอเบิกจ่าย',
          value: formatCompactNumber(safeStats.approved),
          unit: 'รายการ',
          icon: Wallet,
          gradient: "text-emerald-500",
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-500",
          isLoading,
          waveDirection: 'left' as const
        },
        {
          title: 'มูลค่ารวมรอเบิกจ่าย',
          value: `฿${formatCompactNumber(safeStats.totalAmount)}`,
          unit: "",
          icon: DollarSign,
          gradient: "text-blue-500",
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-500",
          isLoading,
          waveDirection: 'right' as const
        },
        {
          title: 'ยอดรอดำเนินการ',
          value: `฿${formatCompactNumber(safeStats.pendingAmount)}`,
          unit: "",
          icon: TrendingUp,
          gradient: "text-amber-500",
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-500",
          isLoading,
          waveDirection: 'left' as const
        }
      ]
    : [
        {
          title: 'รายการเบิกจ่ายแล้ว',
          value: formatCompactNumber(safeStats.approved),
          unit: 'รายการ',
          icon: Wallet,
          gradient: "text-green-500",
          iconBg: "bg-green-500/10",
          iconColor: "text-green-500",
          isLoading,
          waveDirection: 'left' as const
        },
        {
          title: 'มูลค่าที่เบิกจ่ายแล้ว',
          value: `฿${formatCompactNumber(safeStats.totalAmount)}`,
          unit: "",
          icon: DollarSign,
          gradient: "text-blue-500",
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-500",
          isLoading,
          waveDirection: 'right' as const
        },
        {
          title: 'เฉลี่ยต่อรายการ',
          value: `฿${formatCompactNumber(safeStats.approved > 0 ? safeStats.totalAmount / safeStats.approved : 0)}`,
          unit: "",
          icon: TrendingUp,
          gradient: "text-purple-500",
          iconBg: "bg-purple-500/10",
          iconColor: "text-purple-500",
          isLoading,
          waveDirection: 'left' as const
        }
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}

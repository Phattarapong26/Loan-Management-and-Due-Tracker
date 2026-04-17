/**
 * Risk Gauge Component - Visual Risk Meter
 * Inspired by luxury car dashboards and financial trading terminals
 */

import { cn } from '@/shared/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface RiskGaugeProps {
  score: number; // 0 to 100 (higher = healthier / lower risk)
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'default' | 'light'; // Add variant prop
}

export function RiskGauge({ score, size = 'md', showLabel = true, variant = 'default' }: RiskGaugeProps) {
  // Clamp score to 0-100 for gauge
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  const sizes = {
    sm: { container: 'w-24 h-24', ring: 'w-20 h-20', text: 'text-xs', score: 'text-lg' },
    md: { container: 'w-32 h-32', ring: 'w-28 h-28', text: 'text-sm', score: 'text-2xl' },
    lg: { container: 'w-40 h-40', ring: 'w-36 h-36', text: 'text-base', score: 'text-3xl' },
  };

  const isLight = variant === 'light';

  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Circular Gauge */}
      <div className={cn('relative', sizes[size].container)}>
        {/* Background Ring */}
        <div className={cn(
          'absolute inset-0 rounded-full',
          isLight 
            ? 'bg-white/20 backdrop-blur-sm border border-white/30'
            : 'bg-slate-50 border border-slate-200'
        )} />
        
        {/* Progress Ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={isLight ? 'text-white/20' : 'text-slate-200'}
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${normalizedScore * 2.827} 282.7`}
            className={cn(
              'transition-all duration-1000 ease-out',
              isLight ? 'text-white' : 'text-primary'
            )}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {score < 40 ? (
            <TrendingDown className={cn('mb-1', size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6', isLight ? 'text-white' : 'text-slate-600')} />
          ) : (
            <TrendingUp className={cn('mb-1', size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6', isLight ? 'text-white' : 'text-slate-600')} />
          )}
          <div className={cn('font-bold tabular-nums', sizes[size].score, isLight ? 'text-white' : 'text-slate-900')}>
            {score}
          </div>
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className={cn('text-center', sizes[size].text)}>
          <div className={cn('font-semibold', isLight ? 'text-white' : 'text-slate-900')}>
            {score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL'}
          </div>
          <div className={cn('text-xs', isLight ? 'text-white/70' : 'text-slate-500')}>Risk Score</div>
        </div>
      )}
    </div>
  );
}

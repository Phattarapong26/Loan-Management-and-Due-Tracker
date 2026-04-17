import { Badge } from '@/shared/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { calculateRiskScore, getRiskBadgeText, type RiskFactors } from '../utils/risk-scoring.util';
import { cn } from '@/shared/lib/utils';

interface RiskBadgeProps {
  factors: RiskFactors;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ factors, showScore = true, size = 'md' }: RiskBadgeProps) {
  const riskScore = calculateRiskScore(factors);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const getIcon = () => {
    switch (riskScore.riskLevel) {
      case 'critical':
        return <AlertTriangle className={cn(iconSizes[size], 'animate-pulse')} />;
      case 'high':
        return <TrendingDown className={iconSizes[size]} />;
      case 'medium':
        return <Activity className={iconSizes[size]} />;
      case 'low':
        return <TrendingUp className={iconSizes[size]} />;
    }
  };

  return (
    <Badge
      className={cn(
        'flex items-center gap-1.5 font-semibold border',
        riskScore.riskColor,
        sizeClasses[size]
      )}
    >
      {getIcon()}
      <span>{getRiskBadgeText(riskScore.riskLevel)}</span>
      {showScore && <span className="ml-1">({riskScore.totalScore})</span>}
    </Badge>
  );
}

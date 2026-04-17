import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Phone, MessageSquare, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';
import { CreditGradeBadge } from './CreditGradeBadge';
import { FinancialContext } from './FinancialContext';
import { QuickActionMenu } from './QuickActionMenu';
import { CustomerDueStatus } from '../api/collections.api';

interface CustomerCardProps {
  schedule: CustomerDueStatus;
  variant?: 'critical' | 'overdue' | 'today' | 'soon';
}

export function CustomerCard({ schedule, variant = 'soon' }: CustomerCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const daysValue = Math.abs(schedule.daysUntilDue);
  
  const variantStyles = {
    critical: {
      container: 'border-b border-destructive/30 bg-white',
      icon: 'bg-destructive/20 ring-2 ring-destructive/30',
      iconColor: 'text-destructive animate-pulse',
      badge: 'bg-destructive text-destructive-foreground',
      badgeText: `เกิน ${daysValue} วัน`,
      amountColor: 'text-destructive',
      button: 'bg-destructive hover:bg-destructive/90',
      buttonText: 'โทรติดตามด่วน',
    },
    overdue: {
      container: 'border-b border-destructive/30 bg-white',
      icon: 'bg-destructive/10',
      iconColor: 'text-destructive',
      badge: 'bg-destructive text-destructive-foreground',
      badgeText: `เกิน ${daysValue} วัน`,
      amountColor: 'text-destructive',
      button: 'border-destructive/30 hover:bg-destructive/10',
      buttonText: 'โทรติดต่อ',
    },
    today: {
      container: 'border-b border-destructive/30 bg-white',
      icon: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: 'bg-primary text-primary-foreground',
      badgeText: 'ครบกำหนดวันนี้',
      amountColor: 'text-primary',
      button: 'bg-primary hover:bg-primary/90',
      buttonText: 'โทรแจ้งเตือน',
    },
    soon: {
      container: 'border-b border-destructive/30 bg-white',
      icon: 'bg-warning/10',
      iconColor: 'text-warning',
      badge: 'bg-warning text-warning-foreground',
      badgeText: `อีก ${daysValue} วัน`,
      amountColor: 'text-foreground',
      button: 'border-warning/30 hover:bg-warning/10',
      buttonText: 'โทรแจ้งเตือน',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn('group relative overflow-hidden rounded-xl hover:shadow-xl transition-all duration-300', styles.container)}>
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-current opacity-5 rounded-full -mr-20 -mt-20" />
      
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn('flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center', styles.icon)}>
            {variant === 'critical' || variant === 'overdue' ? (
              <AlertTriangle className={cn('h-7 w-7', styles.iconColor)} />
            ) : (
              <Clock className={cn('h-7 w-7', styles.iconColor)} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="font-bold text-lg text-foreground truncate">
                    {schedule.customerName || 'ไม่ระบุ'}
                  </h4>
                  <CreditGradeBadge
                    grade={schedule.creditGrade}
                    score={schedule.creditScore}
                    reasons={schedule.creditReasons}
                    nextActions={schedule.creditNextActions}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  งวดที่ {schedule.paymentNumber} • {format(new Date(schedule.dueDate), 'dd MMM yyyy', { locale: th })}
                </p>
              </div>
              <Badge className={cn('whitespace-nowrap flex-shrink-0 text-sm px-3 py-1', styles.badge)}>
                {styles.badgeText}
              </Badge>
            </div>

            {/* Metrics */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/90 ring-1 ring-border/50">
                <span className="text-xs text-muted-foreground font-medium">ยอดชำระ</span>
                <span className={cn('font-bold text-lg', styles.amountColor)}>
                  {formatCurrency(schedule.amountDue)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="font-medium">{schedule.customerPhone || 'ไม่มีเบอร์'}</span>
              </div>
              {schedule.lastContactDate && (
                <div className="flex items-center gap-2 text-xs bg-background/80 px-3 py-1.5 rounded-lg ring-1 ring-border/50">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">ติดต่อล่าสุด:</span>
                  <span className="font-medium">{format(new Date(schedule.lastContactDate), 'dd/MM/yy')}</span>
                  {schedule.lastContactStatus && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {schedule.lastContactStatus}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Financial Context */}
            <FinancialContext
              dscr={schedule.dscr}
              dscrStatus={schedule.dscrStatus}
              industryCode={schedule.industryCode}
              businessAge={schedule.businessAge}
              nplStatus={schedule.nplStatus}
              creditUtilization={schedule.creditUtilization}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-5 border-t border-current/10">
          <QuickActionMenu customer={schedule} variant={variant} />
        </div>
      </div>
    </div>
  );
}

import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { 
  Phone, 
  Clock, 
  CheckCircle,
  User,
  Calendar,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';
import { CreditGradeBadge } from './CreditGradeBadge';
import { QuickActionMenu } from './QuickActionMenu';
import { CustomerDueStatus } from '../api/collections.api';

interface CustomerTableProps {
  customers: CustomerDueStatus[];
  variant: 'critical' | 'overdue' | 'today' | 'soon';
  isLoading?: boolean;
}

export function CustomerTable({ customers, variant, isLoading }: CustomerTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'critical':
        return {
          badge: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-50',
        };
      case 'overdue':
        return {
          badge: 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-50',
        };
      case 'today':
      case 'soon':
        return {
          badge: 'bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-50',
        };
      default:
        return {
          badge: 'bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-50',
        };
    }
  };

  const getBadgeText = (customer: CustomerDueStatus, variant: string) => {
    const daysValue = Math.abs(customer.daysUntilDue);
    
    switch (variant) {
      case 'critical':
      case 'overdue':
        return `เกิน ${daysValue} วัน`;
      case 'today':
        return 'ครบกำหนดวันนี้';
      case 'soon':
        return `อีก ${daysValue} วัน`;
      default:
        return `${daysValue} วัน`;
    }
  };

  const styles = getVariantStyles(variant);

  if (isLoading) {
    return (
      <div className="bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-muted/30">
              <TableHead className="w-[280px] font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  ลูกค้า
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold text-foreground">งวดที่</TableHead>
              <TableHead className="text-center font-semibold text-foreground">วันครบกำหนด</TableHead>
              <TableHead className="text-right font-semibold text-foreground">ยอดชำระ</TableHead>
              <TableHead className="text-center font-semibold text-foreground">สถานะ</TableHead>
              <TableHead className="text-center font-semibold text-foreground">เครดิต</TableHead>
              <TableHead className="text-center font-semibold text-foreground">ติดต่อล่าสุด</TableHead>
              <TableHead className="text-center w-[180px] font-semibold text-foreground">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className="border-b border-border/50">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-xl animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center py-4">
                  <div className="w-8 h-8 bg-muted rounded-lg animate-pulse mx-auto" />
                </TableCell>
                <TableCell className="text-center py-4">
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded animate-pulse w-16 mx-auto" />
                    <div className="h-3 bg-muted rounded animate-pulse w-12 mx-auto" />
                  </div>
                </TableCell>
                <TableCell className="text-right py-4">
                  <div className="h-6 bg-muted rounded animate-pulse w-24 ml-auto" />
                </TableCell>
                <TableCell className="text-center py-4">
                  <div className="h-6 bg-muted rounded-full animate-pulse w-20 mx-auto" />
                </TableCell>
                <TableCell className="text-center py-4">
                  <div className="h-6 bg-muted rounded-full animate-pulse w-16 mx-auto" />
                </TableCell>
                <TableCell className="text-center py-4">
                  <div className="h-6 bg-muted rounded-full animate-pulse w-20 mx-auto" />
                </TableCell>
                <TableCell className="py-4">
                  <div className="h-8 bg-muted rounded-lg animate-pulse w-32 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (customers.length === 0) {
    const emptyMessages = {
      critical: { icon: CheckCircle, title: 'ไม่มีลูกหนี้เสีย', desc: 'ยอดเยี่ยม! ไม่มีรายการที่เกิน 30 วัน', color: 'text-emerald-500' },
      overdue: { icon: CheckCircle, title: 'ไม่มีรายการเกินกำหนด', desc: 'ยอดเยี่ยม! ไม่มีงวดชำระที่เลยกำหนด', color: 'text-emerald-500' },
      today: { icon: CheckCircle, title: 'ไม่มีรายการวันนี้', desc: 'ไม่มีงวดชำระที่ครบกำหนดวันนี้', color: 'text-blue-500' },
      soon: { icon: Clock, title: 'ไม่มีรายการใกล้ครบ', desc: 'ไม่มีงวดชำระที่จะครบกำหนดใน 7 วันข้างหน้า', color: 'text-amber-500' },
    };

    const message = emptyMessages[variant];
    const Icon = message.icon;

    return (
      <div className="bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg',
            'bg-gradient-to-br from-muted/50 to-muted'
          )}>
            <Icon className={cn('h-10 w-10', message.color)} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">{message.title}</h3>
          <p className="text-muted-foreground max-w-md leading-relaxed">{message.desc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b bg-muted/30">
            <TableHead className="w-[280px] font-semibold text-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                ลูกค้า
              </div>
            </TableHead>
            <TableHead className="text-center font-semibold text-foreground">
              <div className="flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                งวดที่
              </div>
            </TableHead>
            <TableHead className="text-center font-semibold text-foreground">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                วันครบกำหนด
              </div>
            </TableHead>
            <TableHead className="text-right font-semibold text-foreground">
              <div className="flex items-center justify-end gap-2">
                <TrendingUp className="h-4 w-4" />
                ยอดชำระ
              </div>
            </TableHead>
            <TableHead className="text-center font-semibold text-foreground">สถานะ</TableHead>
            <TableHead className="text-center font-semibold text-foreground">เครดิต</TableHead>
            <TableHead className="text-center font-semibold text-foreground">
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                ติดต่อล่าสุด
              </div>
            </TableHead>
            <TableHead className="text-center w-[180px] font-semibold text-foreground">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer, index) => (
            <TableRow 
              key={customer.scheduleId} 
              className="transition-colors hover:bg-slate-50 border-b border-slate-100"
            >
              {/* Customer Info */}
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate text-foreground mb-1">
                      {customer.customerName || 'ไม่ระบุ'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{customer.customerPhone || 'ไม่มีเบอร์'}</span>
                    </div>
                  </div>
                </div>
              </TableCell>

              {/* Payment Number */}
              <TableCell className="text-center py-4">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm">
                  {customer.paymentNumber}
                </div>
              </TableCell>

              {/* Due Date */}
              <TableCell className="text-center py-4">
                <div className="text-sm font-medium text-foreground">
                  {format(new Date(customer.dueDate), 'dd MMM', { locale: th })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(customer.dueDate), 'yyyy', { locale: th })}
                </div>
              </TableCell>

              {/* Amount */}
              <TableCell className="text-right py-4">
                <div className="text-base font-semibold text-slate-900">
                  {formatCurrency(customer.amountDue)}
                </div>
              </TableCell>

              {/* Status Badge */}
              <TableCell className="text-center py-4">
                <Badge className={cn('text-xs px-3 py-1.5 font-medium', styles.badge)}>
                  {getBadgeText(customer, variant)}
                </Badge>
              </TableCell>

              {/* Credit Grade */}
              <TableCell className="text-center py-4">
                <CreditGradeBadge
                  grade={customer.creditGrade}
                  score={customer.creditScore}
                  reasons={customer.creditReasons}
                  nextActions={customer.creditNextActions}
                />
              </TableCell>

              {/* Last Contact */}
              <TableCell className="text-center py-4">
                {customer.lastContactDate ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-foreground">
                      {format(new Date(customer.lastContactDate), 'dd/MM/yy')}
                    </div>
                    {customer.lastContactStatus && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {customer.lastContactStatus}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      ไม่มีข้อมูล
                    </div>
                  </div>
                )}
              </TableCell>

              {/* Actions */}
              <TableCell className="py-4">
                <div className="flex items-center justify-center">
                  <QuickActionMenu customer={customer} variant={variant} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

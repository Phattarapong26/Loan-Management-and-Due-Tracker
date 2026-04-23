import { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronRight,
  Layers,
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
  /** If provided, paginate at the customer-group level */
  page?: number;
  pageSize?: number;
  onTotalGroups?: (total: number) => void;
}

interface CustomerGroup {
  customerId: string;
  customerName: string;
  customerPhone: string;
  schedules: CustomerDueStatus[];
  // worst schedule (most overdue / most urgent) used for summary row
  worst: CustomerDueStatus;
  totalAmountDue: number;
}

function groupByCustomer(customers: CustomerDueStatus[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();

  for (const c of customers) {
    const key = c.customerId;
    if (!map.has(key)) {
      map.set(key, {
        customerId: c.customerId,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        schedules: [],
        worst: c,
        totalAmountDue: 0,
      });
    }
    const group = map.get(key)!;
    group.schedules.push(c);
    group.totalAmountDue += c.amountDue;

    // worst = lowest daysUntilDue (most overdue)
    if (c.daysUntilDue < group.worst.daysUntilDue) {
      group.worst = c;
    }
  }

  return Array.from(map.values());
}

export function CustomerTable({ customers, variant, isLoading, page = 1, pageSize, onTotalGroups }: CustomerTableProps) {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const allGroups = useMemo(() => groupByCustomer(customers), [customers]);

  // Notify parent of total group count for pagination
  const totalGroups = allGroups.length;
  useMemo(() => { onTotalGroups?.(totalGroups); }, [totalGroups]);

  // Paginate at group level
  const groups = useMemo(() => {
    if (!pageSize) return allGroups;
    const start = (page - 1) * pageSize;
    return allGroups.slice(start, start + pageSize);
  }, [allGroups, page, pageSize]);

  const toggleExpand = (customerId: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);

  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return { badge: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-50' };
      case 'overdue':
        return { badge: 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-50' };
      default:
        return { badge: 'bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-50' };
    }
  };

  const getBadgeText = (customer: CustomerDueStatus) => {
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

  const styles = getVariantStyles();

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-muted/30">
              <TableHead className="w-8" />
              <TableHead className="w-[280px] font-semibold text-foreground">
                <div className="flex items-center gap-2"><User className="h-4 w-4" />ลูกค้า</div>
              </TableHead>
              <TableHead className="text-center font-semibold text-foreground">งวดค้าง</TableHead>
              <TableHead className="text-center font-semibold text-foreground">วันครบกำหนด (เร็วสุด)</TableHead>
              <TableHead className="text-right font-semibold text-foreground">ยอดรวมค้าง</TableHead>
              <TableHead className="text-center font-semibold text-foreground">สถานะ</TableHead>
              <TableHead className="text-center font-semibold text-foreground">เครดิต</TableHead>
              <TableHead className="text-center font-semibold text-foreground">ติดต่อล่าสุด</TableHead>
              <TableHead className="text-center w-[180px] font-semibold text-foreground">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className="border-b border-border/50">
                <TableCell><div className="w-4 h-4 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                </TableCell>
                {[...Array(7)].map((_, j) => (
                  <TableCell key={j} className="py-4">
                    <div className="h-6 bg-muted rounded animate-pulse mx-auto w-16" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
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
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg bg-gradient-to-br from-muted/50 to-muted">
            <Icon className={cn('h-10 w-10', message.color)} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">{message.title}</h3>
          <p className="text-muted-foreground max-w-md leading-relaxed">{message.desc}</p>
        </div>
      </div>
    );
  }

  // ── Main table ────────────────────────────────────────────────────────────
  return (
    <div className="bg-card shadow-sm overflow-hidden rounded-lg border border-slate-100">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b bg-muted/30">
            {/* expand toggle col */}
            <TableHead className="w-10" />
            <TableHead className="w-[280px] font-semibold text-foreground">
              <div className="flex items-center gap-2"><User className="h-4 w-4" />ลูกค้า</div>
            </TableHead>
            <TableHead className="text-center font-semibold text-foreground">
              <div className="flex items-center justify-center gap-1"><Layers className="h-4 w-4" />งวดค้าง</div>
            </TableHead>
            <TableHead className="text-center font-semibold text-foreground">
              <div className="flex items-center justify-center gap-2"><Clock className="h-4 w-4" />วันครบกำหนด (เร็วสุด)</div>
            </TableHead>
            <TableHead className="text-right font-semibold text-foreground">
              <div className="flex items-center justify-end gap-2"><TrendingUp className="h-4 w-4" />ยอดรวมค้าง</div>
            </TableHead>
            <TableHead className="text-center font-semibold text-foreground">สถานะ</TableHead>
            <TableHead className="text-center font-semibold text-foreground">เครดิต</TableHead>
            <TableHead className="text-center font-semibold text-foreground">
              <div className="flex items-center justify-center gap-2"><MessageSquare className="h-4 w-4" />ติดต่อล่าสุด</div>
            </TableHead>
            <TableHead className="text-center w-[180px] font-semibold text-foreground">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const isExpanded = expandedCustomers.has(group.customerId);
            const hasMultiple = group.schedules.length > 1;

            return (
              <>
                {/* ── Summary row (one per customer) ── */}
                <TableRow
                  key={`group-${group.customerId}`}
                  className={cn(
                    'transition-colors border-b border-slate-100',
                    hasMultiple ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50',
                    isExpanded && 'bg-slate-50/80',
                  )}
                  onClick={() => hasMultiple && toggleExpand(group.customerId)}
                >
                  {/* Expand toggle */}
                  <TableCell className="py-4 pl-4 pr-0 w-10">
                    {hasMultiple ? (
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-500">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </div>
                    ) : null}
                  </TableCell>

                  {/* Customer info */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate text-foreground mb-1">
                          {group.customerName || 'ไม่ระบุ'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{group.customerPhone || 'ไม่มีเบอร์'}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Overdue schedule count */}
                  <TableCell className="text-center py-4">
                    <div className={cn(
                      'inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                      hasMultiple
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-slate-100 text-slate-600',
                    )}>
                      {group.schedules.length} งวด
                    </div>
                  </TableCell>

                  {/* Earliest due date */}
                  <TableCell className="text-center py-4">
                    <div className="text-sm font-medium text-foreground">
                      {format(new Date(group.worst.dueDate), 'dd MMM', { locale: th })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(group.worst.dueDate), 'yyyy', { locale: th })}
                    </div>
                  </TableCell>

                  {/* Total amount */}
                  <TableCell className="text-right py-4">
                    <div className="text-base font-semibold text-slate-900">
                      {formatCurrency(group.totalAmountDue)}
                    </div>
                    {hasMultiple && (
                      <div className="text-xs text-muted-foreground">
                        {group.schedules.length} งวด รวม
                      </div>
                    )}
                  </TableCell>

                  {/* Status badge (worst) */}
                  <TableCell className="text-center py-4">
                    <Badge className={cn('text-xs px-3 py-1.5 font-medium', styles.badge)}>
                      {getBadgeText(group.worst)}
                    </Badge>
                  </TableCell>

                  {/* Credit grade (worst) */}
                  <TableCell className="text-center py-4">
                    <CreditGradeBadge
                      grade={group.worst.creditGrade}
                      score={group.worst.creditScore}
                      reasons={group.worst.creditReasons}
                      nextActions={group.worst.creditNextActions}
                    />
                  </TableCell>

                  {/* Last contact (worst) */}
                  <TableCell className="text-center py-4">
                    {group.worst.lastContactDate ? (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-foreground">
                          {format(new Date(group.worst.lastContactDate), 'dd/MM/yy')}
                        </div>
                        {group.worst.lastContactStatus && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {group.worst.lastContactStatus}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <MessageSquare className="h-3 w-3" />ไม่มีข้อมูล
                      </div>
                    )}
                  </TableCell>

                  {/* Actions (worst schedule) */}
                  <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      <QuickActionMenu customer={group.worst} variant={variant} />
                    </div>
                  </TableCell>
                </TableRow>

                {/* ── Expanded: individual schedule rows ── */}
                {isExpanded && hasMultiple && group.schedules.map((schedule, idx) => (
                  <TableRow
                    key={`schedule-${schedule.scheduleId}`}
                    className="bg-slate-50/60 border-b border-slate-100/80 hover:bg-slate-100/60 transition-colors"
                  >
                    {/* indent */}
                    <TableCell className="py-3 pl-4 pr-0">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                          'w-px h-full min-h-[32px] bg-slate-200',
                          idx === group.schedules.length - 1 && 'h-1/2 self-start',
                        )} />
                      </div>
                    </TableCell>

                    {/* empty customer col — show loan id instead */}
                    <TableCell className="py-3 pl-6">
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        Loan: {schedule.loanId?.slice(-8)}
                      </div>
                    </TableCell>

                    {/* payment number */}
                    <TableCell className="text-center py-3">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm">
                        {schedule.paymentNumber}
                      </div>
                    </TableCell>

                    {/* due date */}
                    <TableCell className="text-center py-3">
                      <div className="text-sm font-medium text-foreground">
                        {format(new Date(schedule.dueDate), 'dd MMM', { locale: th })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(schedule.dueDate), 'yyyy', { locale: th })}
                      </div>
                    </TableCell>

                    {/* amount */}
                    <TableCell className="text-right py-3">
                      <div className="text-sm font-semibold text-slate-800">
                        {formatCurrency(schedule.amountDue)}
                      </div>
                    </TableCell>

                    {/* status */}
                    <TableCell className="text-center py-3">
                      <Badge className={cn('text-xs px-2 py-1 font-medium', styles.badge)}>
                        {getBadgeText(schedule)}
                      </Badge>
                    </TableCell>

                    {/* credit */}
                    <TableCell className="text-center py-3">
                      <CreditGradeBadge
                        grade={schedule.creditGrade}
                        score={schedule.creditScore}
                        reasons={schedule.creditReasons}
                        nextActions={schedule.creditNextActions}
                      />
                    </TableCell>

                    {/* last contact */}
                    <TableCell className="text-center py-3">
                      {schedule.lastContactDate ? (
                        <div className="text-xs font-medium text-foreground">
                          {format(new Date(schedule.lastContactDate), 'dd/MM/yy')}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">—</div>
                      )}
                    </TableCell>

                    {/* actions per schedule */}
                    <TableCell className="py-3">
                      <div className="flex items-center justify-center">
                        <QuickActionMenu customer={schedule} variant={variant} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

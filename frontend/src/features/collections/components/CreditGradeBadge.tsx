import { Badge } from '@/shared/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';

type CreditGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'RISKY' | 'CRITICAL';

const gradeConfig: Record<CreditGrade, { label: string; className: string }> = {
  EXCELLENT: { label: 'ดีเยี่ยม', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  GOOD: { label: 'ดี', className: 'text-green-700 bg-green-50 border-green-200' },
  FAIR: { label: 'พอใช้', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  RISKY: { label: 'เสี่ยง', className: 'text-orange-700 bg-orange-50 border-orange-200' },
  CRITICAL: { label: 'วิกฤต', className: 'text-red-700 bg-red-50 border-red-200' },
};

export function CreditGradeBadge({
  grade,
  score,
  reasons,
  nextActions,
  className,
}: {
  grade?: CreditGrade;
  score?: number;
  reasons?: string[];
  nextActions?: string[];
  className?: string;
}) {
  if (!grade) {
    return (
      <Badge variant="outline" className={cn('text-xs', className)}>
        ไม่ระบุ
      </Badge>
    );
  }

  const cfg = gradeConfig[grade];
  const displayScore = typeof score === 'number' ? Math.round(score) : undefined;
  const hasDetails = (reasons?.length || 0) > 0 || (nextActions?.length || 0) > 0;

  const badge = (
    <Badge variant="outline" className={cn('text-xs font-semibold', cfg.className, className)}>
      เครดิต: {cfg.label}
      {displayScore !== undefined ? ` (${displayScore})` : ''}
    </Badge>
  );

  if (!hasDetails) return badge;

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="font-semibold">
            เครดิต: {cfg.label}
            {displayScore !== undefined ? ` (${displayScore}/100)` : ''}
          </div>
          {reasons?.length ? (
            <div>
              <div className="text-sm font-medium mb-1">เหตุผล</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {reasons.slice(0, 6).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {nextActions?.length ? (
            <div>
              <div className="text-sm font-medium mb-1">สิ่งที่ควรทำต่อ</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {nextActions.slice(0, 6).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import type { BucketRollRatesAnalysis } from '../api/collections.api';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';

interface BucketRollRatesChartProps {
  data: BucketRollRatesAnalysis;
  isLoading?: boolean;
}

const bucketNames: Record<string, string> = {
  CURRENT: 'ปกติ',
  DPD_1_30: 'ค้าง 1-30 วัน',
  DPD_31_60: 'ค้าง 31-60 วัน',
  DPD_61_90: 'ค้าง 61-90 วัน',
  NPL: 'NPL (90+ วัน)',
};

const bucketColors: Record<string, string> = {
  CURRENT: 'bg-green-500',
  DPD_1_30: 'bg-yellow-500',
  DPD_31_60: 'bg-orange-500',
  DPD_61_90: 'bg-red-500',
  NPL: 'bg-destructive',
};

export function BucketRollRatesChart({ data, isLoading }: BucketRollRatesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bucket Roll Rates Analysis</CardTitle>
          <CardDescription>กำลังโหลดข้อมูล...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get all roll rates (including same bucket) sorted by roll rate
  const allRollRates = data.rollRates
    .sort((a, b) => b.rollRate - a.rollRate)
    .slice(0, 10); // Show top 10 instead of 5

  // Get roll rates that show bucket transitions (excluding same bucket)
  const transitionRollRates = data.rollRates
    .filter((r) => r.fromBucket !== r.toBucket)
    .sort((a, b) => b.rollRate - a.rollRate)
    .slice(0, 10);

  // Use transition rates if available, otherwise show all rates
  const topRollRates = transitionRollRates.length > 0 ? transitionRollRates : allRollRates;

  const intervalLabel = data.interval === 'week' ? 'สัปดาห์' : 'เดือน';
  const latestTrend = data.trends?.[data.trends.length - 1];

  const formatPeriodLabel = (t: BucketRollRatesAnalysis['trends'][number]) => {
    const asOf = new Date(t.asOfDate);
    if (data.interval === 'week') {
      const end = asOf;
      const start = subDays(end, 6);
      return {
        primary: `${format(start, 'd MMM', { locale: th })} – ${format(end, 'd MMM yyyy', { locale: th })}`,
        secondary: t.month,
      };
    }

    const start = startOfMonth(asOf);
    const end = endOfMonth(asOf);
    return {
      primary: format(asOf, 'MMM yyyy', { locale: th }),
      secondary: `${format(start, 'd MMM', { locale: th })} – ${format(end, 'd MMM yyyy', { locale: th })}`,
    };
  };

  const Th = ({ label, help }: { label: string; help: string }) => (
    <div className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-gray-400 hover:text-gray-200">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[360px]">
          {help}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <div className="space-y-6 mt-1 rounded-2xl">
      
      {/* Bucket Distribution & Roll Rates - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Snapshot */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">แนวโน้มพอร์ต ({intervalLabel}ล่าสุด)</CardTitle>
            <CardDescription className="text-gray-400">
              สรุป NPL%, Roll Forward/Back และ Predicted NPL จาก Roll Rates (ใช้ข้อมูลจริงจาก payment_schedules)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-300">
                      <Th label="ช่วงเวลา" help={`ช่วงเวลา (สิ้น${intervalLabel}) ที่ใช้สรุป bucket ของแต่ละสัญญา`} />
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      <Th label="NPL%" help="สัดส่วนสัญญาที่อยู่ใน bucket NPL ณ ช่วงเวลานั้น (อิงจากงวดค้างที่เก่าที่สุดของแต่ละสัญญา)" />
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      <Th label="Pred NPL%" help="คาดการณ์ NPL จาก Roll Rates: เอาจำนวนสัญญาในแต่ละ bucket ตอนนี้ × อัตราไหลไป NPL ของช่วงก่อนหน้า" />
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      <Th label="Roll Fwd%" help="สัดส่วนสัญญาที่ไหลไป bucket แย่ลง (เช่น CURRENT→DPD_1_30, DPD_1_30→DPD_31_60) เมื่อเทียบช่วงก่อนหน้า" />
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      <Th label="Roll Back%" help="สัดส่วนสัญญาที่ดีขึ้น (ไหลกลับ bucket ดีขึ้น) เมื่อเทียบช่วงก่อนหน้า" />
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      <Th label="คงเดิม%" help="สัดส่วนสัญญาที่อยู่ bucket เดิม (ไม่ดีขึ้น/ไม่แย่ลง) เมื่อเทียบช่วงก่อนหน้า" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.trends || []).slice(-8).map((t) => (
                    (() => {
                      const label = formatPeriodLabel(t);
                      return (
                    <TableRow key={t.month} className="border-gray-800 hover:bg-gray-800/40">
                      <TableCell className="text-gray-200 font-medium">
                        <div className="leading-tight">
                          <div>{label.primary}</div>
                          <div className="text-xs text-gray-400">{label.secondary}</div>
                        </div>
                        {latestTrend?.month === t.month && (
                          <Badge variant="outline" className="ml-2 border-gray-700 text-gray-300">ล่าสุด</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {typeof t.metrics?.nplRate === 'number' ? `${t.metrics.nplRate.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {typeof t.metrics?.rollToNPLRate === 'number' ? `${t.metrics.rollToNPLRate.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {typeof t.metrics?.rollForwardRate === 'number' ? `${t.metrics.rollForwardRate.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {typeof t.metrics?.rollBackRate === 'number' ? `${t.metrics.rollBackRate.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {typeof t.metrics?.stayedRate === 'number' ? `${t.metrics.stayedRate.toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>
                      );
                    })()
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* LEFT: Bucket Distribution */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">การกระจายตัวของ Portfolio (Aging Buckets)</CardTitle>
            <CardDescription className="text-gray-400">แสดงจำนวนสินเชื่อในแต่ละช่วงอายุหนี้</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.distribution.map((bucket) => (
                <div key={bucket.bucket} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', bucketColors[bucket.bucket])} />
                      <span className="font-medium text-white">{bucketNames[bucket.bucket]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">{bucket.count} รายการ</span>
                      <span className="font-semibold text-white">{bucket.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all duration-500', bucketColors[bucket.bucket])}
                      style={{ width: `${bucket.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    {formatCurrency(bucket.totalAmount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Roll Rates */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Roll Rates - อัตราการไหลของหนี้</CardTitle>
            <CardDescription className="text-gray-400">
              แสดงเปอร์เซ็นต์การเคลื่อนย้ายจาก Bucket หนึ่งไปยังอีก Bucket ({intervalLabel}ก่อนหน้า → {intervalLabel}ล่าสุด)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRollRates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <TrendingUp className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">ยังไม่มีข้อมูล Roll Rates</h3>
                  <p className="text-sm text-gray-400 text-center max-w-sm">
                    ระบบต้องการข้อมูลอย่างน้อย 2 เดือนเพื่อคำนวณอัตราการเคลื่อนย้ายของหนี้ระหว่าง Bucket
                  </p>
                  <div className="mt-6 p-4 bg-blue-950/30 rounded-lg border border-blue-800/50">
                    <p className="text-xs text-blue-300">
                      💡 Roll Rates จะแสดงผลเมื่อมีข้อมูลการชำระเงินในเดือนก่อนหน้าและเดือนปัจจุบัน
                    </p>
                  </div>
                </div>
              ) : (
                topRollRates.map((roll) => (
                  <div
                    key={`${roll.fromBucket}-${roll.toBucket}`}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border border-gray-800',
                      roll.toBucket === 'NPL' && 'border-red-900/50 bg-red-950/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-gray-700 text-gray-300">
                          {bucketNames[roll.fromBucket]}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-gray-500" />
                        <Badge
                          variant={roll.toBucket === 'NPL' ? 'destructive' : 'outline'}
                          className={cn(
                            'text-xs',
                            roll.toBucket !== 'NPL' && 'border-gray-700 text-gray-300'
                          )}
                        >
                          {bucketNames[roll.toBucket]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-400">{roll.count} รายการ</div>
                        <div className="text-xs text-gray-500">
                          เฉลี่ย {formatCurrency(roll.avgAmount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {roll.rollRate > 20 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : roll.rollRate > 10 ? (
                          <TrendingUp className="h-4 w-4 text-orange-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span
                          className={cn(
                            'text-lg font-bold',
                            roll.rollRate > 20
                              ? 'text-red-500'
                              : roll.rollRate > 10
                              ? 'text-orange-500'
                              : 'text-green-500'
                          )}
                        >
                          {roll.rollRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

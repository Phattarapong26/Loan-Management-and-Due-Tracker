import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText,
    Receipt,
    ScrollText,
    RefreshCw,
    Play,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader,
} from 'lucide-react';
import { documentBackfillApi, type BackfillLastRunStatus } from '@/shared/lib/api-endpoints';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { useToast } from '@/shared/hooks/use-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const DocumentBackfill: React.FC = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [runningTask, setRunningTask] = useState<string | null>(null);

    const { data: statsRes, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['document-backfill-stats'],
        queryFn: () => documentBackfillApi.getStats(),
        refetchInterval: 15000,
    });

    const { data: statusRes, isLoading: statusLoading } = useQuery({
        queryKey: ['document-backfill-status'],
        queryFn: () => documentBackfillApi.getLastRunStatus(),
        refetchInterval: 15000,
    });

    const runAllMutation = useMutation({
        mutationFn: () => documentBackfillApi.runAll(),
        onMutate: () => setRunningTask('all'),
        onSuccess: () => {
            toast({ title: 'เริ่ม Backfill ทั้งหมดแล้ว', description: 'กำลังทำงานใน background' });
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['document-backfill-stats'] });
                queryClient.invalidateQueries({ queryKey: ['document-backfill-status'] });
                setRunningTask(null);
            }, 3000);
        },
        onError: () => {
            toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
            setRunningTask(null);
        },
    });

    const runTaskMutation = useMutation({
        mutationFn: (task: 'receipts' | 'contracts' | 'invoices') => documentBackfillApi.runTask(task),
        onMutate: (task) => setRunningTask(task),
        onSuccess: (_data, task) => {
            toast({ title: `เริ่ม Backfill ${taskLabel(task)} แล้ว`, description: 'กำลังทำงานใน background' });
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['document-backfill-stats'] });
                queryClient.invalidateQueries({ queryKey: ['document-backfill-status'] });
                setRunningTask(null);
            }, 3000);
        },
        onError: () => {
            toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
            setRunningTask(null);
        },
    });

    const stats = statsRes?.data;
    const lastRun = statusRes?.data as BackfillLastRunStatus | null | undefined;

    const taskLabel = (task: string) => {
        const labels: Record<string, string> = { receipts: 'ใบเสร็จรับเงิน', contracts: 'สัญญาสินเชื่อ', invoices: 'ใบแจ้งหนี้' };
        return labels[task] ?? task;
    };

    const docTypes = [
        {
            key: 'receipts' as const,
            label: 'ใบเสร็จรับเงิน',
            description: 'Payment receipts สำหรับทุกการชำระเงิน',
            icon: Receipt,
            color: 'text-green-500',
            bgColor: 'bg-green-50 dark:bg-green-950',
            stat: stats?.receipts,
            canRun: true,
        },
        {
            key: 'contracts' as const,
            label: 'สัญญาสินเชื่อ',
            description: 'Contract PDF สำหรับสินเชื่อที่อนุมัติแล้ว',
            icon: ScrollText,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-950',
            stat: stats?.contracts,
            canRun: true,
        },
        {
            key: 'invoices' as const,
            label: 'ใบแจ้งหนี้',
            description: 'Invoice สำหรับตารางการชำระเงิน',
            icon: FileText,
            color: 'text-orange-500',
            bgColor: 'bg-orange-50 dark:bg-orange-950',
            stat: stats?.invoices,
            canRun: true,
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Document Backfill Monitor</h1>
                        <p className="text-white text-sm mt-1">
                            ติดตามและจัดการการสร้างเอกสารย้อนหลัง
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchStats()}
                            disabled={statsLoading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                            รีเฟรช
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => runAllMutation.mutate()}
                            disabled={runningTask !== null}
                        >
                            {runningTask === 'all' ? (
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            Run All Backfill
                        </Button>
                    </div>
                </div>

                {/* Last Run Status */}
                {!statusLoading && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                การรันล่าสุด
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {lastRun ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">เวลาที่รัน</p>
                                        <p className="font-medium">
                                            {lastRun.ranAt && !isNaN(new Date(lastRun.ranAt).getTime())
                                                ? format(new Date(lastRun.ranAt), 'dd MMM yyyy HH:mm', { locale: th })
                                                : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">ใบเสร็จ</p>
                                        <p className="font-medium">
                                            <span className="text-green-600">+{lastRun.receiptsCreated ?? 0}</span>
                                            {(lastRun.receiptsFailed ?? 0) > 0 && (
                                                <span className="text-red-500 ml-1">/ {lastRun.receiptsFailed} fail</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">สัญญา</p>
                                        <p className="font-medium">
                                            <span className="text-green-600">+{lastRun.contractsCreated ?? 0}</span>
                                            {(lastRun.contractsFailed ?? 0) > 0 && (
                                                <span className="text-red-500 ml-1">/ {lastRun.contractsFailed} fail</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Invoice</p>
                                        <p className="font-medium">
                                            <span className="text-green-600">+{lastRun.invoicesCreated ?? 0}</span>
                                            {(lastRun.invoicesFailed ?? 0) > 0 && (
                                                <span className="text-red-500 ml-1">/ {lastRun.invoicesFailed} fail</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">ใช้เวลา</p>
                                        <p className="font-medium">
                                            {lastRun.durationMs != null && !isNaN(lastRun.durationMs)
                                                ? `${(lastRun.durationMs / 1000).toFixed(1)}s`
                                                : '-'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">ยังไม่เคยรัน backfill</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Document Type Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {docTypes.map(({ key, label, description, icon: Icon, color, bgColor, stat, canRun }) => {
                        const pct = stat && stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                        const isComplete = stat?.missing === 0;

                        return (
                            <Card key={key}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className={`p-2 rounded-lg ${bgColor}`}>
                                            <Icon className={`h-5 w-5 ${color}`} />
                                        </div>
                                        {statsLoading ? (
                                            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : isComplete ? (
                                            <Badge variant="outline" className="text-green-600 border-green-300">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                ครบแล้ว
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                ขาด {stat?.missing ?? '...'}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-base mt-2">{label}</CardTitle>
                                    <CardDescription className="text-xs">{description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{stat?.completed ?? 0} / {stat?.total ?? 0}</span>
                                            <span>{pct}%</span>
                                        </div>
                                        <Progress value={pct} className="h-2" />
                                    </div>
                                    {canRun && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            disabled={runningTask !== null || isComplete}
                                            onClick={() => runTaskMutation.mutate(key as 'receipts' | 'contracts' | 'invoices')}
                                        >
                                            {runningTask === key ? (
                                                <Loader className="h-3 w-3 mr-2 animate-spin" />
                                            ) : (
                                                <Play className="h-3 w-3 mr-2" />
                                            )}
                                            {isComplete ? 'ครบแล้ว' : `Backfill ${label}`}
                                        </Button>
                                    )}
                                    {!canRun && (
                                        <p className="text-xs text-muted-foreground text-center py-1">
                                            สร้างอัตโนมัติเมื่อมีการเข้าถึง
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Info */}
                <Card className="border-dashed">
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">
                            Backfill จะรันอัตโนมัติทุกคืนเวลา 02:30 น. (Bangkok time) •
                            การรัน manual จะทำงานใน background โดยไม่ส่ง LINE ให้ลูกค้า •
                            รีเฟรชหน้านี้เพื่อดูสถานะล่าสุด
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default DocumentBackfill;

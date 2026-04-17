import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    History,
    Search,
    Filter,
    Download,
    RefreshCcw,
    ChevronLeft,
    ChevronRight,
    User,
    Shield,
    Clock,
    ExternalLink,
    ChevronDown,
    ArrowUpDown,
    Laptop,
    Terminal,
    Activity,
    Globe,
    Trash2,
    X,
    AlertTriangle
} from 'lucide-react';
import { monitoringApi, AuditLog as GlobalAuditLog } from '@/shared/lib/api-endpoints';
import { downloadCsv, toCsv } from '@/shared/utils/csv';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/shared/components/ui/table';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

// Add typed interfaces to avoid `any`
type LogMetadata = { severity?: string } & Record<string, unknown>;
type UserInfo = { firstName?: string; lastName?: string; email?: string };

type FrontendAuditLog = {
    id: string;
    createdAt: string;
    user?: UserInfo;
    action: string;
    metadata?: LogMetadata;
    ipAddress?: string;
    entity?: string;
    entityId?: string;
    // For backwards compatibility or mapping
    userName?: string;
};

const AuditLogs: React.FC = () => {
    const [params, setParams] = useState({
        page: 1,
        limit: 20,
        search: '',
        severity: '',
        action: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedLog, setSelectedLog] = useState<GlobalAuditLog | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: logsResponse, isLoading, refetch } = useQuery({
        queryKey: ['audit-logs', params],
        queryFn: () => monitoringApi.getAuditLogs(params),
    });

    const data = logsResponse?.data;

    const getSeverityValue = (log: GlobalAuditLog): string => {
        const raw = (log as any).severity || (log.metadata as any)?.severity || '';
        return String(raw || '').toLowerCase();
    };

    const handleExportCsv = async () => {
        try {
            setIsExporting(true);

            const limit = 1000;
            let pageToFetch = 1;
            const allLogs: GlobalAuditLog[] = [];

            for (let guard = 0; guard < 200; guard++) {
                const res = await monitoringApi.getAuditLogs({
                    ...params,
                    page: pageToFetch,
                    limit,
                });
                if (res.error) throw new Error(res.error.message || 'ไม่สามารถดึงข้อมูล Audit Logs ได้');

                const chunk = (res.data?.logs || []) as GlobalAuditLog[];
                allLogs.push(...chunk);

                const total = res.data?.total ?? allLogs.length;
                if (allLogs.length >= total || chunk.length < limit) break;
                pageToFetch += 1;
            }

            if (allLogs.length === 0) {
                toast({ title: 'ไม่มีข้อมูลสำหรับส่งออก', variant: 'destructive' });
                return;
            }

            const headers = [
                'เวลา',
                'Severity',
                'Action',
                'Resource',
                'User',
                'User ID',
                'IP',
                'User Agent',
                'Entity',
                'Entity ID',
            ];

            const rows = allLogs.map((l) => [
                l.createdAt,
                getSeverityValue(l),
                l.action,
                l.resource,
                l.userName || '',
                l.userId || '',
                l.ipAddress || '',
                l.userAgent || '',
                (l as any).entity || '',
                (l as any).entityId || '',
            ]);

            const csv = toCsv(headers, rows);
            const dateStr = new Date().toISOString().slice(0, 10);
            downloadCsv(`audit_logs_${dateStr}.csv`, csv);
            toast({ title: `ส่งออก CSV สำเร็จ (${allLogs.length} รายการ)` });
        } catch (error: any) {
            toast({
                title: 'ส่งออกไม่สำเร็จ',
                description: error?.message || 'เกิดข้อผิดพลาด',
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    // Mutation for clearing logs
    const clearLogsMutation = useMutation({
        mutationFn: () => monitoringApi.clearAuditLogs(),
        onSuccess: (response) => {
            toast({
                title: 'Logs cleared successfully',
                description: `${response.data?.deletedCount || 0} audit logs have been permanently deleted`,
            });
            setShowDeleteConfirm(false);
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
            refetch();
        },
        onError: (error: unknown) => {
            const message = (error as Error)?.message ?? (typeof error === 'string' ? error : 'An error occurred while clearing logs');
            toast({
                title: 'Failed to clear logs',
                description: message,
                variant: 'destructive'
            });
        }
    });

    // Check if any filters are active
    const hasActiveFilters = params.search || params.severity || params.action;

    // Clear all filters
    const clearFilters = () => {
        setParams({
            page: 1,
            limit: 20,
            search: '',
            severity: '',
            action: ''
        });
        toast({
            title: 'Filters cleared',
            description: 'All filters have been reset',
        });
    };

    const getActionBadge = (action: string) => {
        if (action.includes('DETECTED') || action.includes('FAILED')) {
            return <Badge className="bg-red-50 text-red-600 border-red-100 hover:bg-red-50">{action}</Badge>;
        }
        if (action.includes('CREATE') || action.includes('UPDATE')) {
            return <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50">{action}</Badge>;
        }
        return <Badge className="bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-50">{action}</Badge>;
    };

    const getSeverityBadge = (metadata: LogMetadata | undefined) => {
        const severity = metadata?.severity?.toLowerCase();
        switch (severity) {
            case 'high':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">HIGH</Badge>;
            case 'medium':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">MEDIUM</Badge>;
            case 'low':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">LOW</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-400">INFO</Badge>;
        }
    };

    return (
        <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'Audit Logs' }]}>
            <div className="space-y-6 bg-white border  rounded-lg p-6 md:p-14">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <History className="w-7 h-7 text-indigo-600" />
                            Audit Log Explorer
                        </h1>
                        <p className="text-slate-500 text-sm">Review full system history and user interactions</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
                            <RefreshCcw className="w-4 h-4" />
                            Refresh
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear Logs
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleExportCsv}
                            disabled={isExporting}
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? 'Exporting...' : 'Export CSV'}
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-full md:min-w-[300px] relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search action, user, or IP..."
                                    className="pl-10 h-10"
                                    value={params.search}
                                    onChange={(e) => setParams(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                                />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Filter className="w-4 h-4" />
                                        <span className="hidden sm:inline">Severity: {params.severity || 'All'}</span>
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, severity: '', page: 1 }))}>All</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, severity: 'high', page: 1 }))}>High</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, severity: 'medium', page: 1 }))}>Medium</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, severity: 'low', page: 1 }))}>Low</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Activity className="w-4 h-4" />
                                        <span className="hidden sm:inline">Action: {params.action || 'All'}</span>
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, action: '', page: 1 }))}>All Actions</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, action: 'SUSPICIOUS_INPUT_DETECTED', page: 1 }))}>Suspicious Hit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, action: 'SQL_INJECTION_DETECTED', page: 1 }))}>SQL Injection</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, action: 'XSS_DETECTED', page: 1 }))}>XSS Attack</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, action: 'BRUTE_FORCE_DETECTED', page: 1 }))}>Brute Force</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, action: 'LOGIN_SUCCESS', page: 1 }))}>Login Success</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setParams(prev => ({ ...prev, action: 'LOGIN_FAILED', page: 1 }))}>Login Failed</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {hasActiveFilters && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="gap-2 text-slate-600 hover:text-slate-900"
                                    onClick={clearFilters}
                                >
                                    <X className="w-4 h-4" />
                                    <span className="hidden sm:inline">Clear Filters</span>
                                </Button>
                            )}
                        </div>
                        
                        {hasActiveFilters && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {params.search && (
                                    <Badge variant="secondary" className="gap-1">
                                        Search: {params.search}
                                        <X 
                                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                                            onClick={() => setParams(prev => ({ ...prev, search: '', page: 1 }))}
                                        />
                                    </Badge>
                                )}
                                {params.severity && (
                                    <Badge variant="secondary" className="gap-1">
                                        Severity: {params.severity}
                                        <X 
                                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                                            onClick={() => setParams(prev => ({ ...prev, severity: '', page: 1 }))}
                                        />
                                    </Badge>
                                )}
                                {params.action && (
                                    <Badge variant="secondary" className="gap-1">
                                        Action: {params.action}
                                        <X 
                                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                                            onClick={() => setParams(prev => ({ ...prev, action: '', page: 1 }))}
                                        />
                                    </Badge>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <div className="md:hidden">
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="border-b last:border-b-0 p-3">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <Skeleton className="h-4 w-40" />
                                        </div>
                                        <Skeleton className="h-6 w-20" />
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1">
                                            <Skeleton className="h-4 w-full mb-2" />
                                            <Skeleton className="h-3 w-3/4" />
                                        </div>
                                        <div>
                                            <Skeleton className="h-8 w-8 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : data?.logs?.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No logs found matching your filters</div>
                        ) : (
                            data?.logs?.map((log: GlobalAuditLog) => (
                                <div key={log.id} className="border-b last:border-b-0 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            {log.userName || (log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System')}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">{log.user?.email || (log.userName ? '' : 'System Activity')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">{format(new Date(log.createdAt), 'MMM d, HH:mm')}</div>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    {getActionBadge(log.action)}
                                                    <div className="hidden sm:block">{getSeverityBadge(log.metadata)}</div>
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">{log.ipAddress}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <Button variant="ghost" size="icon" title="View Payload" onClick={() => setSelectedLog(log)}>
                                            <ExternalLink className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop table (hidden on small screens) */}
                    <div className="hidden md:block overflow-x-auto">
                     <Table>
                         <TableHeader className="bg-slate-50">
                             <TableRow>
                                 <TableHead className="w-[180px]">Timestamp</TableHead>
                                 <TableHead>User</TableHead>
                                 <TableHead>Action</TableHead>
                                 <TableHead className="hidden md:table-cell">Entity</TableHead>
                                 <TableHead className="hidden sm:table-cell">Severity</TableHead>
                                 <TableHead className="hidden md:table-cell">IP Address</TableHead>
                                 <TableHead className="text-right">Details</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {isLoading ? (
                                 Array(10).fill(0).map((_, i) => (
                                     <TableRow key={i}>
                                         {Array(7).fill(0).map((_, j) => (
                                             <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                         ))}
                                     </TableRow>
                                 ))
                             ) : data?.logs?.length === 0 ? (
                                 <TableRow>
                                     <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                         No logs found matching your filters
                                     </TableCell>
                                 </TableRow>
                             ) : (
                                 data?.logs?.map((log: GlobalAuditLog) => (
                                     <TableRow key={log.id} className="hover:bg-slate-50/50">
                                         <TableCell className="text-xs text-slate-500">
                                             <div className="flex items-center gap-2">
                                                 <Clock className="w-3 h-3" />
                                                 {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                                             </div>
                                         </TableCell>
                                         <TableCell>
                                             <div className="flex items-center gap-2">
                                                 <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                                                     <User className="w-4 h-4 text-indigo-600" />
                                                 </div>
                                                 <div className="flex flex-col">
                                                     <span className="text-sm font-medium">{log.userName || (log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System')}</span>
                                                     <span className="text-[10px] text-slate-400">{log.user?.email || (log.userName ? '' : 'System Activity')}</span>
                                                 </div>
                                             </div>
                                         </TableCell>
                                         <TableCell>{getActionBadge(log.action)}</TableCell>
                                         <TableCell className="hidden md:table-cell">
                                             <div className="flex flex-col">
                                                 <span className="text-sm font-semibold text-slate-700">{log.entity}</span>
                                                 <span className="text-[10px] font-mono text-slate-400">{log.entityId || 'N/A'}</span>
                                             </div>
                                         </TableCell>
                                         <TableCell className="hidden sm:table-cell">{getSeverityBadge(log.metadata)}</TableCell>
                                         <TableCell className="hidden md:table-cell">
                                             <div className="flex items-center gap-2 text-xs text-slate-600">
                                                 <Globe className="w-3 h-3" />
                                                 <span className="font-mono">{log.ipAddress}</span>
                                             </div>
                                         </TableCell>
                                         <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" title="View Payload" onClick={() => setSelectedLog(log)}>
                                                <ExternalLink className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                            </Button>
                                        </TableCell>
                                     </TableRow>
                                 ))
                             )}
                         </TableBody>
                     </Table>
                     </div>
                 </Card>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total} logs
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setParams(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={data.page === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </Button>
                            <div className="text-sm text-slate-600">
                                Page {data.page} of {data.totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setParams(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={data.page >= data.totalPages}
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
             </div>

            {/* Payload View Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Terminal className="w-5 h-5" />
                            Audit Log Payload
                        </DialogTitle>
                        <DialogDescription>
                            รายละเอียดข้อมูล payload ของ audit log
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Timestamp</label>
                                    <p className="text-sm font-mono">{format(new Date(selectedLog.createdAt), 'MMM d, yyyy HH:mm:ss')}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Action</label>
                                    <p className="text-sm">{getActionBadge(selectedLog.action)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">User</label>
                                    <p className="text-sm">{selectedLog.userName || (selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : 'System')}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
                                    <p className="text-sm font-mono">{selectedLog.user?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">IP Address</label>
                                    <p className="text-sm font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Severity</label>
                                    <p className="text-sm">{getSeverityBadge(selectedLog.metadata)}</p>
                                </div>
                                {selectedLog.entity && (
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Entity</label>
                                        <p className="text-sm font-medium">{selectedLog.entity}</p>
                                    </div>
                                )}
                                {selectedLog.entityId && (
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Entity ID</label>
                                        <p className="text-sm font-mono">{selectedLog.entityId}</p>
                                    </div>
                                )}
                            </div>
                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">Full Metadata</label>
                                    <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto">
                                        <pre className="text-xs text-green-400 font-mono">
                                            {JSON.stringify(selectedLog.metadata, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 md:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Clear All Audit Logs?</h3>
                                <p className="text-sm text-slate-500">This action cannot be undone</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-amber-800">
                                <strong>Warning:</strong> You are about to permanently delete all audit logs from the system. 
                                This will remove all historical records of user actions and system events.
                            </p>
                        </div>

                        <div className="flex gap-3 flex-col sm:flex-row">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={clearLogsMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => clearLogsMutation.mutate()}
                                disabled={clearLogsMutation.isPending}
                            >
                                {clearLogsMutation.isPending ? (
                                    <>
                                        <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                                        Clearing...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Clear All Logs
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AuditLogs;

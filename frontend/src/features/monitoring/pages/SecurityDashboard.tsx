import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Shield,
    AlertTriangle,
    History,
    Lock,
    UserX,
    Activity,
    Zap,
    Globe,
    Terminal,
    Search,
    Filter,
    ArrowRight,
    Bug,
    Database,
    Code,
    Wifi,
    Eye,
    Ban,
    Plus
} from 'lucide-react';
import { 
  LazyLineChart as LineChart,
  LazyLine as Line,
  LazyXAxis as XAxis,
  LazyYAxis as YAxis,
  LazyCartesianGrid as CartesianGrid,
  LazyTooltip as Tooltip,
  LazyResponsiveContainer as ResponsiveContainer,
  LazyAreaChart as AreaChart,
  LazyArea as Area,
  ChartWrapper
} from '@/shared/components/charts/LazyCharts';
import { monitoringApi, AuditLog } from '@/shared/lib/api-endpoints';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/hooks/use-toast';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

// Add typed interfaces
type ActivityItem = {
    createdAt: string;
    _count: number;
};

type SecurityMetadata = {
    path?: string;
} & Record<string, unknown>;

const SecurityDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [selectedThreatType, setSelectedThreatType] = useState<string>('all');
    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const [blockIpAddress, setBlockIpAddress] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [blockDuration, setBlockDuration] = useState('60');
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: summaryResponse, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['security-summary'],
        queryFn: () => monitoringApi.getSecuritySummary(),
        refetchInterval: 30000, // Refresh every 30s
    });

    const { data: securityEventsResponse, isLoading: isEventsLoading } = useQuery({
        queryKey: ['security-events', selectedThreatType],
        queryFn: () => monitoringApi.getSecurityEvents({
            limit: 10,
            threatType: selectedThreatType === 'all' ? undefined : selectedThreatType
        }),
        refetchInterval: 10000, // Refresh every 10s
    });

    const { data: blockedIpsResponse, isLoading: isBlockedIpsLoading } = useQuery({
        queryKey: ['blocked-ips'],
        queryFn: () => monitoringApi.getBlockedIps(),
        refetchInterval: 30000,
    });

    const summary = summaryResponse?.data;
    const securityEvents = securityEventsResponse?.data?.events || [];
    const blockedIps = blockedIpsResponse?.data?.blockedIps || [];

    // Mutation for unblocking IP
    const unblockMutation = useMutation({
        mutationFn: (ipAddress: string) => monitoringApi.unblockIp(ipAddress),
        onSuccess: () => {
            toast({
                title: 'IP Unblocked',
                description: 'The IP address has been unblocked successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to unblock IP',
                description: error.message || 'An error occurred',
                variant: 'destructive'
            });
        }
    });

    // Mutation for blocking IP
    const blockMutation = useMutation({
        mutationFn: (data: { ipAddress: string; reason: string; duration?: number }) => 
            monitoringApi.blockIp(data),
        onSuccess: () => {
            toast({
                title: 'IP Blocked',
                description: 'The IP address has been blocked successfully',
            });
            setShowBlockDialog(false);
            setBlockIpAddress('');
            setBlockReason('');
            setBlockDuration('60');
            queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to block IP',
                description: error.message || 'An error occurred',
                variant: 'destructive'
            });
        }
    });

    const handleUnblock = (ipAddress: string) => {
        if (confirm(`Are you sure you want to unblock ${ipAddress}?`)) {
            unblockMutation.mutate(ipAddress);
        }
    };

    const handleBlock = () => {
        if (!blockIpAddress || !blockReason) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive'
            });
            return;
        }
        
        blockMutation.mutate({
            ipAddress: blockIpAddress,
            reason: blockReason,
            duration: parseInt(blockDuration)
        });
    };

    const chartData = useMemo(() => {
        if (!summary?.activityOverTime) return [];
        // Format daily aggregated data for chart — show day/month label
        return summary.activityOverTime.map((item: ActivityItem) => ({
            time: format(new Date(item.createdAt), 'dd/MM'),
            count: item._count,
        }));
    }, [summary]);

    const stats = [
        {
            title: 'Suspicious Activity',
            value: summary?.summary?.suspiciousActivities || 0,
            icon: AlertTriangle,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50',
            description: 'Detected in last 24h',
        },
        {
            title: 'High Severity Alerts',
            value: summary?.summary?.highSeverityAlerts || 0,
            icon: Shield,
            color: 'text-red-500',
            bgColor: 'bg-red-50',
            description: 'Immediate action required',
        },
        {
            title: 'Failed Login Attempts',
            value: summary?.summary?.failedLogins || 0,
            icon: UserX,
            color: 'text-orange-500',
            bgColor: 'bg-orange-50',
            description: 'Potential brute force',
        },
        {
            title: 'System Operations',
            value: summary?.summary?.totalActions24h || 0,
            icon: Activity,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50',
            description: 'Total logged actions',
        },
    ];

    return (
        <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'Security & Monitoring' }]}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <Lock className="w-8 h-8 text-white" />
                            Security & Monitor Audit
                        </h1>
                        <p className="text-white">Real-time system monitoring and threat detection</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => navigate('/monitoring/audit-logs')}
                        >
                            <History className="w-4 h-4" />
                            Full Audit Logs
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            <Zap className="w-4 h-4" />
                            Live Monitor
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => {
                        const waveDirection = index % 2 === 0 ? 'left' : 'right';
                        const waveClasses = waveDirection === 'right'
                            ? "absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6"
                            : "absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6";
                        const wavePosition = waveDirection === 'right' ? 'right-0' : 'left-0';

                        return (
                            <div key={index} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                                {/* Wave Background */}
                                <div className={`absolute bottom-0 ${wavePosition} w-full h-full pointer-events-none overflow-hidden select-none`}>
                                    <svg viewBox="0 0 400 200" className={waveClasses} preserveAspectRatio="none">
                                        <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className={`${stat.color} opacity-10`} />
                                        <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className={`${stat.color} opacity-20`} />
                                        <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className={`${stat.color} opacity-40`} />
                                    </svg>
                                </div>

                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`${stat.bgColor} p-3 rounded-xl shadow-lg shadow-primary/20`}>
                                            <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={2} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500 tracking-wide">
                                            {stat.title}
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                                                {isSummaryLoading ? (
                                                    <span className="inline-block w-20 h-8 bg-slate-200 rounded animate-pulse" />
                                                ) : (
                                                    stat.value
                                                )}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
                                    </div>
                                </div>

                                {/* Hover Effect */}
                                <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Chart */}
                    <Card className="lg:col-span-2 border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-500" />
                                Activity Over Time
                            </CardTitle>
                            <CardDescription>System actions logged in the last 7 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[220px] sm:h-[300px] w-full">
                                {isSummaryLoading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : (
                                    <ChartWrapper>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                <XAxis
                                                    dataKey="time"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                dataKey="count"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorCount)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                    </ChartWrapper>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Critical Alerts */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Critical Alerts
                                </CardTitle>
                                <CardDescription>Real-time threat detection</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100">
                                Live
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {isSummaryLoading ? (
                                    Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                                ) : summary?.recentAlerts?.length === 0 ? (
                                     <div className="text-center py-12 text-slate-400">
                                         <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                         <p>No critical threats detected</p>
                                     </div>
                                  ) : (
                                    summary.recentAlerts.map((alert: AuditLog) => (
                                        <div key={alert.id} className="p-2 sm:p-3 bg-red-50/50 rounded-lg border border-red-100 flex gap-3 group">
                                            <div className="bg-red-100 p-2 rounded-md shrink-0">
                                                <Terminal className="w-4 h-4 text-red-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider truncate">{alert.action}</span>
                                                    <span className="text-[10px] text-slate-400">{format(new Date(alert.createdAt), 'HH:mm:ss')}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 truncate mb-1">
                                                    IP: <span className="font-mono">{alert.ipAddress}</span>
                                                </p>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                                                    <Globe className="w-3 h-3" />
                                                    <span className="truncate">{(alert.metadata as SecurityMetadata)?.path || alert.resource || '/api'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                 )}
                            </div>
                            {summary?.recentAlerts?.length > 0 && (
                                <Button
                                    variant="ghost"
                                    className="w-full mt-4 text-xs text-slate-500 hover:text-indigo-600"
                                    onClick={() => navigate('/monitoring/audit-logs')}
                                >
                                    View all alerts <ArrowRight className="w-3 h-3 ml-2" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Security Events & Blocked IPs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Security Events */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Bug className="w-5 h-5 text-purple-500" />
                                        Security Events
                                    </CardTitle>
                                    <CardDescription>Real-time threat detection</CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-100">
                                    {securityEvents.length} events
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Threat Type Filter */}
                            <div className="flex gap-2 mb-4 flex-wrap">
                                {['all', 'SQL_INJECTION', 'XSS', 'BRUTE_FORCE', 'DOS', 'SUSPICIOUS_PATTERN'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedThreatType(type)}
                                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                            selectedThreatType === type
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {type === 'all' ? 'All' : type.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {isEventsLoading ? (
                                    Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                                ) : securityEvents.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No security events detected</p>
                                    </div>
                                ) : (
                                    securityEvents.map((event) => {
                                        const threatIcons: Record<string, any> = {
                                            SQL_INJECTION: Database,
                                            XSS: Code,
                                            BRUTE_FORCE: Lock,
                                            DOS: Wifi,
                                            SUSPICIOUS_PATTERN: Eye,
                                        };
                                        const ThreatIcon = threatIcons[event.threatType] || Bug;
                                        
                                        const severityColors: Record<string, string> = {
                                            CRITICAL: 'bg-red-50 border-red-200 text-red-700',
                                            HIGH: 'bg-orange-50 border-orange-200 text-orange-700',
                                            MEDIUM: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                                            LOW: 'bg-blue-50 border-blue-200 text-blue-700',
                                        };

                                        return (
                                            <div
                                                key={event.id}
                                                className={`p-3 rounded-lg border ${severityColors[event.severity] || 'bg-slate-50 border-slate-200'}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`p-2 rounded-md shrink-0 ${event.blocked ? 'bg-red-100' : 'bg-slate-100'}`}>
                                                        {event.blocked ? (
                                                            <Ban className="w-4 h-4 text-red-600" />
                                                        ) : (
                                                            <ThreatIcon className="w-4 h-4 text-slate-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                                {event.threatType.replace('_', ' ')}
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                {event.severity}
                                                            </Badge>
                                                            {event.blocked && (
                                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                                    BLOCKED
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-600 mb-1 truncate">
                                                            {event.description}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                            <span className="font-mono">{event.ipAddress}</span>
                                                            <span>{event.method} {event.endpoint}</span>
                                                            <span>{format(new Date(event.createdAt), 'HH:mm:ss')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Blocked IPs */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Ban className="w-5 h-5 text-red-500" />
                                        Blocked IPs
                                    </CardTitle>
                                    <CardDescription>Auto-blocked malicious IPs</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100">
                                        {blockedIps.length} blocked
                                    </Badge>
                                    <Button
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => setShowBlockDialog(true)}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Block IP
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {isBlockedIpsLoading ? (
                                    Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                                ) : blockedIps.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No blocked IPs</p>
                                    </div>
                                ) : (
                                    blockedIps.map((ip) => (
                                        <div
                                            key={ip.id}
                                            className="p-3 bg-red-50/50 rounded-lg border border-red-100"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-mono font-bold text-red-700">
                                                            {ip.ipAddress}
                                                        </span>
                                                        {ip.expiresAt && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                Expires: {format(new Date(ip.expiresAt), 'HH:mm')}
                                                            </Badge>
                                                        )}
                                                        {ip.reason.includes('[AUTO-BLOCKED]') && (
                                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                                AUTO
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 mb-1">
                                                        {ip.reason}
                                                    </p>
                                                    <div className="text-[10px] text-slate-400">
                                                        Blocked: {format(new Date(ip.createdAt), 'MMM dd, HH:mm:ss')}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                                                    onClick={() => handleUnblock(ip.ipAddress)}
                                                    disabled={unblockMutation.isPending}
                                                >
                                                    Unblock
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Block IP Dialog */}
            <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ban className="w-5 h-5 text-red-600" />
                            Block IP Address
                        </DialogTitle>
                        <DialogDescription>
                            Manually block an IP address from accessing the system
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="ipAddress">IP Address *</Label>
                            <Input
                                id="ipAddress"
                                placeholder="e.g., 192.168.1.100"
                                value={blockIpAddress}
                                onChange={(e) => setBlockIpAddress(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason *</Label>
                            <Input
                                id="reason"
                                placeholder="e.g., Suspicious activity detected"
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="duration">Block Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                placeholder="60"
                                value={blockDuration}
                                onChange={(e) => setBlockDuration(e.target.value)}
                            />
                            <p className="text-xs text-slate-500">
                                Leave empty for permanent block
                            </p>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowBlockDialog(false)}
                            disabled={blockMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleBlock}
                            disabled={blockMutation.isPending}
                        >
                            {blockMutation.isPending ? 'Blocking...' : 'Block IP'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default SecurityDashboard;

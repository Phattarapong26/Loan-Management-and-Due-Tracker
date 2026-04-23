import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Users,
  Check,
  Trash2,
  Loader,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { notificationsApi } from '@/shared/lib/api-endpoints';
import { NotificationStatsCards } from '../components/NotificationStatsCards';

type NotificationType = 'payment' | 'approval' | 'npl' | 'document' | 'system' | 'task' | 'reminder';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  link?: string;
}

// Map backend notification type to frontend type
const mapNotificationType = (type: string): NotificationType => {
  const typeMap: Record<string, NotificationType> = {
    'PAYMENT_DUE': 'payment',
    'PAYMENT_OVERDUE': 'payment',
    'PAYMENT': 'payment',
    'LOAN_APPROVED': 'approval',
    'LOAN_REJECTED': 'approval',
    'APPROVAL': 'approval',
    'LOAN_APPROVAL': 'approval',
    'EXPENSE_APPROVED': 'approval',
    'EXPENSE_REJECTED': 'approval',
    'NPL': 'npl',
    'NPL_WARNING': 'npl',
    'DOCUMENT': 'document',
    'DOCUMENT_UPLOAD': 'document',
    'TASK_ASSIGNED': 'task',
    'CALENDAR_EVENT': 'task',
    'REMINDER': 'reminder',
    'SYSTEM_ALERT': 'system',
    'SYSTEM': 'system',
    'SYSTEM_UPDATE': 'system',
    'OTHER': 'system',
  };
  return typeMap[type] || 'system';
};

const notificationTypeConfig: Record<NotificationType, { label: string; color: string; icon: React.ElementType }> = {
  payment: { label: 'การชำระ', color: 'bg-success/10 text-success', icon: DollarSign },
  approval: { label: 'อนุมัติ', color: 'bg-info/10 text-info', icon: CheckCircle },
  npl: { label: 'NPL', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
  document: { label: 'เอกสาร', color: 'bg-warning/10 text-warning', icon: FileText },
  task: { label: 'งานที่มอบหมาย', color: 'bg-purple-100 text-purple-600', icon: CalendarClock },
  reminder: { label: 'แจ้งเตือน', color: 'bg-orange-100 text-orange-600', icon: Clock },
  system: { label: 'ระบบ', color: 'bg-muted text-muted-foreground', icon: Bell },
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', { filter }],
    queryFn: async () => {
      const result = await notificationsApi.list({
        page: 1,
        limit: 100,
        read: filter === 'unread' ? false : undefined,
        type: filter !== 'all' && filter !== 'unread' ? filter.toUpperCase() : undefined,
      });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds - notifications should be relatively fresh
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await notificationsApi.markAsRead(id);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('อ่านแล้ว');
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const result = await notificationsApi.markAllAsRead();
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('ทำเครื่องหมายว่าอ่านแล้วทั้งหมด');
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await notificationsApi.delete(id);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('ลบการแจ้งเตือนแล้ว');
    },
  });

  // Map backend notifications to frontend format
  const notifications: Notification[] = notificationsData?.notifications?.map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: mapNotificationType(n.type),
    isRead: n.read || false,
    createdAt: new Date(n.createdAt),
    link: n.link,
  })) || [];

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleClearAll = () => {
    // Delete all notifications one by one
    notifications.forEach(n => deleteMutation.mutate(n.id));
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'การแจ้งเตือน' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">การแจ้งเตือน</h1>
          <p className="text-white">
            คุณมี {unreadCount} การแจ้งเตือนที่ยังไม่ได้อ่าน
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            อ่านทั้งหมด
          </Button>
          <Button variant="outline" onClick={handleClearAll} disabled={notifications.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            ลบทั้งหมด
          </Button>
        </div>
      </div>

      {/* Stats */}
      <NotificationStatsCards
        totalCount={notifications.length}
        paymentCount={notifications.filter(n => n.type === 'payment').length}
        approvalCount={notifications.filter(n => n.type === 'approval').length}
        nplCount={notifications.filter(n => n.type === 'npl').length}
        unreadCount={unreadCount}
        onFilterChange={setFilter}
        isLoading={isLoading}
      />

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการแจ้งเตือน</CardTitle>
          <CardDescription>
            แสดง {filteredNotifications.length} รายการ
            {filter !== 'all' && ` (กรอง: ${filter === 'unread' ? 'ยังไม่อ่าน' : notificationTypeConfig[filter as NotificationType]?.label})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="h-12 w-12 mx-auto text-muted-foreground/50 animate-spin" />
              <p className="text-muted-foreground mt-4">กำลังโหลด...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              {filteredNotifications.map((notification) => {
                const config = notificationTypeConfig[notification.type];
                const Icon = config.icon;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 border-b last:border-b-0 transition-colors",
                      notification.isRead ? "" : "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={config.color}>{config.label}</Badge>
                          {!notification.isRead && (
                            <Badge className="bg-primary text-primary-foreground">ใหม่</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: th })}
                          </span>
                        </div>
                        <p className="font-medium mt-1">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}

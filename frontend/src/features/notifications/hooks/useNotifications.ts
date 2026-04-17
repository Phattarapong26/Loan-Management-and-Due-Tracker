import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/shared/lib/api-endpoints';
import { ListNotificationsParams } from '../api/notifications.api';
import { toast } from 'sonner';

export function useNotifications(params?: ListNotificationsParams) {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['notifications', params],
        queryFn: async () => {
            const result = await notificationsApi.list(params);
            if (result.error) throw result.error;
            return result.data;
        },
        // Refresh every minute
        refetchInterval: 60000,
    });

    const { data: unreadCountData } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const result = await notificationsApi.getUnreadCount();
            if (result.error) throw result.error;
            return result.data;
        },
        // Refresh every minute
        refetchInterval: 60000,
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await notificationsApi.markAsRead(id);
            if (result.error) throw result.error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const result = await notificationsApi.markAllAsRead();
            if (result.error) throw result.error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
            toast.success('ทำเครื่องหมายว่าอ่านแล้วทั้งหมด');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await notificationsApi.delete(id);
            if (result.error) throw result.error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
            toast.success('ลบการแจ้งเตือนแล้ว');
        },
    });

    return {
        notifications: data?.notifications || [],
        total: data?.total || 0,
        unreadCount: unreadCountData?.count || 0,
        isLoading,
        error,
        markAsRead: markAsReadMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
        deleteNotification: deleteMutation.mutate,
    };
}

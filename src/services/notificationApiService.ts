import { api } from './api';

export interface SystemNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

export const notificationApiService = {
  async getNotifications(): Promise<{ notifications: SystemNotificationItem[]; unreadCount: number }> {
    const res = await api.get<{ notifications: SystemNotificationItem[]; unreadCount: number }>('/notifications');
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to fetch notifications');
    return res.data;
  },

  async markAsRead(id: string): Promise<void> {
    const res = await api.patch(`/notifications/${id}/read`, {});
    if (!res.success) throw new Error(res.message || 'Failed to mark notification as read');
  },

  async markAllAsRead(): Promise<void> {
    const res = await api.patch('/notifications/read-all', {});
    if (!res.success) throw new Error(res.message || 'Failed to mark notifications as read');
  },
};

export default notificationApiService;

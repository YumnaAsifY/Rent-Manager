import { apiRequest } from '@/services/api';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedRequestId: string | null;
  relatedAssetId: string | null;
  relatedRentalId?: string | null;
  relatedPaymentId?: string | null;
  audience?: 'tenant' | 'owner' | null;
  isRead: boolean;
  read: boolean;
  createdAt?: string;
  time: string;
};

export async function fetchMyNotifications(
  token: string
): Promise<AppNotification[]> {
  const data = await apiRequest<{ notifications: AppNotification[] }>(
    '/api/notifications',
    { method: 'GET' },
    token
  );

  return data.notifications;
}

export async function fetchUnreadNotificationsCount(
  token: string
): Promise<number> {
  const data = await apiRequest<{ count: number }>(
    '/api/notifications/unread-count',
    { method: 'GET' },
    token
  );

  return data.count;
}

export async function markNotificationAsRead(
  token: string,
  notificationId: string
): Promise<AppNotification> {
  const data = await apiRequest<{ notification: AppNotification }>(
    `/api/notifications/${notificationId}/read`,
    { method: 'PATCH' },
    token
  );

  return data.notification;
}

export async function markAllNotificationsAsRead(
  token: string
): Promise<void> {
  await apiRequest('/api/notifications/read-all', { method: 'PATCH' }, token);
}

export async function deleteNotification(
  token: string,
  notificationId: string
): Promise<void> {
  await apiRequest(
    `/api/notifications/${notificationId}`,
    { method: 'DELETE' },
    token
  );
}

export async function deleteNotifications(
  token: string,
  ids: string[]
): Promise<void> {
  await apiRequest(
    '/api/notifications/bulk',
    {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    },
    token
  );
}

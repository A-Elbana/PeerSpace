import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useSocket } from '../hooks/useSocket';
import { isAuthenticated } from '../utils/auth';
import { notificationsApi } from '../services/api';

export interface ClientNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationContextValue {
  notifications: ClientNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const socket = useSocket();

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getNotifications({ page: 1, pageSize: 50 });
      if (res && res.data) {
        const mapped = res.data.map((r: any) => ({
          id: String(r.id),
          title: r.message?.split('\n')[0] || String(r.type || 'Notification'),
          message: r.message || '',
          time: r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
          read: !!r.isRead,
        }));
        setNotifications(mapped);
        const count = (res.unreadCount ?? mapped.filter((m: any) => !m.read).length) as number;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  useEffect(() => {
    // only fetch notifications if user is authenticated
    if (!isAuthenticated()) return;
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (!socket) return;

    const handler = (payload: any) => {
      // When notified, refetch list and update unread badge immediately
      fetchNotifications();
      // optional toast
      try {
        toast('New Notification');
      } catch (e) {
        // ignore
      }
    };

    // Listen for both legacy and new invalidation event names
    socket.on('notifications:signal', handler);
    socket.on('INVALIDATE_NOTIFICATIONS', handler);

    return () => {
      socket.off('notifications:signal', handler);
      socket.off('INVALIDATE_NOTIFICATIONS', handler);
    };
  }, [socket]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, fetchNotifications, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;

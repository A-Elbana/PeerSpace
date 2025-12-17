import  { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { io, type Socket } from 'socket.io-client';
import { isAuthenticated } from '../utils/auth';
import { notificationsApi } from '../services/api';

export interface ClientNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: string | null;
  resourceId?: number | string | null;
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
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getNotifications({ page: 1, pageSize: 50 });
      const rows = res?.data ?? res?.data?.data;
      if (res && rows) {
        const mapped = rows.map((r: any) => ({
          id: String(r.id),
          title: r.message?.split('\n')[0] || String(r.type || 'Notification'),
          message: r.message || '',
          time: r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
          read: !!r.isRead,
          type: r.type ?? null,
          resourceId: r.resourceId ?? null,
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
    if (socketRef.current) return; // Singleton guard

    // Build WS base URL: VITE_WS_URL -> derive from VITE_API_URL -> fallback localhost:3000
    const wsFromEnv = (import.meta.env.VITE_WS_URL as string) || undefined;
    const apiFromEnv = (import.meta.env.VITE_API_URL as string) || undefined;
    const wsBase = (() => {
      if (wsFromEnv) return wsFromEnv;
      if (apiFromEnv) {
        try {
          const u = new URL(apiFromEnv);
          return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
        } catch {}
      }
      return `${window.location.protocol}//localhost:3000`;
    })();

    const s = io(wsBase, { transports: ['websocket'] });
    socketRef.current = s;

    const handler = () => {
      fetchNotifications();
      try { toast('New Notification'); } catch {}
    };

    s.on('connect', () => {
      // console.log('socket connected:', s.id);
    });
    s.on('disconnect', () => {
      // console.log('socket disconnected:', s.id);
    });

    // Listen for both legacy and new invalidation event names
    s.on('notifications:signal', handler);
    s.on('INVALIDATE_NOTIFICATIONS', handler);

    return () => {
      s.off('notifications:signal', handler);
      s.off('INVALIDATE_NOTIFICATIONS', handler);
      try { s.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, []);

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

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronLeft, Trash2 } from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { Button } from '../../components/ui/button';
import { removeTokens } from '../../utils/auth';
import { useNotifications } from '../../contexts/NotificationContext';
import { notificationsApi } from '../../services/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'assignment' | 'grade' | 'course' | 'announcement' | 'general';
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  useEffect(() => {
    // ensure fresh data when page mounts
    fetchNotifications();
  }, []);

  const handleMarkAsRead = (id: string) => {
    // mark via API then refresh
    notificationsApi.markAsRead(Number(id)).then(() => fetchNotifications()).catch((e) => console.error(e));
  };

  const handleMarkAllAsRead = () => {
    markAllRead();
  };

  const handleDelete = (id: string) => {
    // No delete endpoint; mark as read then refresh as a fallback
    notificationsApi.markAsRead(Number(id)).then(() => fetchNotifications()).catch((e) => console.error(e));
  };

  const handleClearAll = () => {
    markAllRead();
  };

  // socket handling and refetch on signal is managed by NotificationContext
  useEffect(() => {
    // keep notifications fresh when this page mounts
    fetchNotifications();
  }, []);

  const filteredNotifications = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const getNotificationType = (notification: typeof notifications[0]): Notification['type'] => {
    return (notification as any).type || 'general';
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'assignment':
        return 'bg-tech-blue-500';
      case 'grade':
        return 'bg-turf-green-500';
      case 'course':
        return 'bg-frosted-blue-500';
      case 'announcement':
        return 'bg-royal-gold-500';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />

      <main 
        className="flex-1 p-8 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={24} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-frosted-blue-100">
              <Bell className="h-6 w-6 text-frosted-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up!'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-frosted-blue-500 hover:bg-frosted-blue-600' : ''}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'bg-frosted-blue-500 hover:bg-frosted-blue-600' : ''}
            >
              Unread ({unreadCount})
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2"
              >
                <Check size={16} />
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:border-red-300"
              >
                <Trash2 size={16} />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`p-4 hover:bg-accent/50 transition-colors ${!notification.read ? 'bg-accent/30' : ''
                    }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Type Indicator */}
                    <div className="shrink-0 mt-1">
                      <div
                        className={`h-3 w-3 rounded-full ${getTypeColor(getNotificationType(notification))}`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className={`text-sm ${!notification.read
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground'
                              }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-2">
                            {notification.time}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Mark as read"
                            >
                              <Check size={16} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(notification.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;


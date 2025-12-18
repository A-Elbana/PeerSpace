import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  ChevronLeft, 
  Trash2, 
  CheckCheck, 
  Archive, 
  BookOpen,
  GraduationCap,
  Award,
  Megaphone,
  Calendar,
  User,
  Inbox
} from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { Button } from '../../components/ui/button';
import { removeTokens } from '../../utils/auth';
import { useNotifications } from '../../contexts/NotificationContext';
import api, { notificationsApi } from '../../services/api';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'assignment' | 'grade' | 'course' | 'announcement' | 'general' | 'TASK_INVITE' | string | null;
  resourceId?: number | string | null;
}

// Skeleton loader component with shimmer effect
const NotificationSkeleton = () => (
  <div className="relative overflow-hidden bg-card border border-border rounded-xl p-6">
    <div className="animate-pulse flex gap-4">
      <div className="h-12 w-12 bg-muted rounded-full shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actioning, setActioning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [localNotifications, setLocalNotifications] = useState<typeof notifications>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  const handleMarkAsRead = async (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );

    try {
      await notificationsApi.markAsRead(Number(id));
      await fetchNotifications();
      toast.success('Marked as read');
    } catch (e) {
      console.error(e);
      toast.error('Failed to mark as read');
      setLocalNotifications(notifications);
    }
  };

  const handleMarkAllAsRead = async () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      await markAllRead();
      toast.success('All notifications marked as read');
    } catch (e) {
      console.error(e);
      toast.error('Failed to mark all as read');
      setLocalNotifications(notifications);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    
    // Wait for exit animation before removing from list
    setTimeout(() => {
      setLocalNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);

    try {
      await notificationsApi.deleteNotification(Number(id));
      await fetchNotifications();
      toast.success('Notification deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete notification');
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setLocalNotifications(notifications);
    }
  };

  const handleClearAll = async () => {
    const confirmDelete = window.confirm(
      `Delete all ${localNotifications.length} notifications? This cannot be undone.`
    );
    
    if (!confirmDelete) return;

    const previousNotifications = [...localNotifications];
    setLocalNotifications([]);

    try {
      await notificationsApi.deleteAll();
      await fetchNotifications();
      toast.success('All notifications cleared');
    } catch (e) {
      console.error(e);
      toast.error('Failed to clear notifications');
      setLocalNotifications(previousNotifications);
    }
  };

  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      await fetchNotifications();
      setIsLoading(false);
    };
    loadNotifications();
  }, []);

  const handleTaskInviteAction = async (
    notification: Notification,
    action: 'accept' | 'decline'
  ) => {
    const taskId = Number(notification.resourceId);
    if (!taskId || Number.isNaN(taskId)) {
      toast.error('Missing task info for this invite');
      return;
    }

    const key = `${notification.id}-${action}`;
    setActioning(key);
    try {
      if (action === 'accept') {
        await api.patch('/task-assignees/accept', { taskId });
        toast.success('Invitation accepted');
      } else {
        await api.patch('/task-assignees/decline', { taskId });
        toast.success('Invitation declined');
      }
      await notificationsApi.markAsRead(Number(notification.id)).catch(() => {});
      await fetchNotifications();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to process invite';
      toast.error(msg);
    } finally {
      setActioning(null);
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? localNotifications.filter((n) => !n.read) 
    : localNotifications;

  const getNotificationType = (notification: typeof notifications[0]): Notification['type'] => {
    return (notification as any).type || 'general';
  };

  const getTypeConfig = (type: Notification['type']) => {
    switch (type) {
      case 'assignment':
        return {
          icon: BookOpen,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-800',
          accent: 'bg-blue-500',
          label: 'Assignment'
        };
      case 'grade':
        return {
          icon: Award,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-200 dark:border-emerald-800',
          accent: 'bg-emerald-500',
          label: 'Grade'
        };
      case 'course':
        return {
          icon: GraduationCap,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/30',
          border: 'border-purple-200 dark:border-purple-800',
          accent: 'bg-purple-500',
          label: 'Course'
        };
      case 'announcement':
        return {
          icon: Megaphone,
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-800',
          accent: 'bg-amber-500',
          label: 'Announcement'
        };
      case 'TASK_INVITE':
        return {
          icon: Calendar,
          color: 'text-rose-600 dark:text-rose-400',
          bg: 'bg-rose-50 dark:bg-rose-950/30',
          border: 'border-rose-200 dark:border-rose-800',
          accent: 'bg-rose-500',
          label: 'Task Invite'
        };
      default:
        return {
          icon: Bell,
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-950/30',
          border: 'border-gray-200 dark:border-gray-800',
          accent: 'bg-gray-500',
          label: 'General'
        };
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />

      <main 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/explore')}
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ChevronLeft size={20} />
              </Button>
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1 w-1 bg-current rounded-full animate-pulse" />
                        Loading...
                      </span>
                    ) : unreadCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      "You're all caught up!"
                    )}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Sticky Actions Bar */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className={`transition-all ${
                      filter === 'all' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/25' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    All
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-md bg-background/20">
                      {localNotifications.length}
                    </span>
                  </Button>
                  <Button
                    variant={filter === 'unread' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('unread')}
                    className={`transition-all ${
                      filter === 'unread' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/25' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    Unread
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-md bg-background/20">
                      {localNotifications.filter(n => !n.read).length}
                    </span>
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-950/30"
                    >
                      <CheckCheck size={16} />
                      Mark all read
                    </Button>
                  )}
                  {localNotifications.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/30 dark:text-red-400"
                    >
                      <Archive size={16} />
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Notifications List */}
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {[...Array(5)].map((_, i) => (
                    <NotificationSkeleton key={i} />
                  ))}
                </motion.div>
              ) : filteredNotifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-2xl p-16 text-center"
                >
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="relative inline-flex">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-2xl" />
                      <div className="relative p-6 rounded-2xl bg-muted/50">
                        <Inbox className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {filter === 'unread'
                          ? "You've read all your notifications. Great job staying on top of things!"
                          : "When you receive notifications, they'll appear here. Check back later!"}
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate('/explore')}
                      className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/25"
                    >
                      Back to Explore
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification, index) => {
                    const isDeleting = deletingIds.has(notification.id);
                    const notifType = getNotificationType(notification);
                    const config = getTypeConfig(notifType);
                    const Icon = config.icon;
                    const isHovered = hoveredId === notification.id;
                    
                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: isDeleting ? 0 : 1, 
                          y: 0,
                          scale: isDeleting ? 0.95 : 1
                        }}
                        exit={{ opacity: 0, scale: 0.95, x: -100 }}
                        transition={{ 
                          duration: 0.3,
                          delay: index * 0.05 
                        }}
                        onHoverStart={() => setHoveredId(notification.id)}
                        onHoverEnd={() => setHoveredId(null)}
                        className={`group relative bg-card border rounded-xl overflow-hidden transition-all ${
                          !notification.read 
                            ? `${config.border} ${config.bg}` 
                            : 'border-border hover:border-border/80'
                        } ${isDeleting ? 'pointer-events-none' : ''}`}
                      >
                        {/* Left accent bar for unread */}
                        {!notification.read && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />
                        )}
                        
                        <div className="p-6 pl-7">
                          <div className="flex gap-4">
                            {/* Icon */}
                            <div className={`shrink-0 h-12 w-12 rounded-full ${config.bg} flex items-center justify-center ring-2 ring-background shadow-sm`}>
                              <Icon className={`h-5 w-5 ${config.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Type badge */}
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
                                  {config.label}
                                </span>
                                {!notification.read && (
                                  <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.accent} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${config.accent}`}></span>
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <h3 className={`text-base font-semibold text-foreground leading-snug ${
                                !notification.read ? 'font-bold' : ''
                              }`}>
                                {notification.title}
                              </h3>

                              {/* Message */}
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {notification.message}
                              </p>

                              {/* Task invite actions */}
                              {notifType?.toString().toUpperCase() === 'TASK_INVITE' && !notification.read && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleTaskInviteAction(notification, 'accept')}
                                    disabled={actioning === `${notification.id}-accept`}
                                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-500/25"
                                  >
                                    {actioning === `${notification.id}-accept` ? 'Accepting...' : 'Accept'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleTaskInviteAction(notification, 'decline')}
                                    disabled={actioning === `${notification.id}-decline`}
                                    className="hover:bg-accent"
                                  >
                                    {actioning === `${notification.id}-decline` ? 'Declining...' : 'Decline'}
                                  </Button>
                                </div>
                              )}

                              {/* Timestamp */}
                              <p className="text-xs text-muted-foreground/70 pt-1">
                                {notification.time}
                              </p>
                            </div>

                            {/* Actions - Visible on hover */}
                            <div className={`shrink-0 flex items-start gap-1 transition-opacity duration-200 ${
                              isHovered ? 'opacity-100' : 'opacity-0'
                            }`}>
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="h-9 w-9 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                                  title="Mark as read"
                                >
                                  <Check size={16} />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(notification.id)}
                                className="h-9 w-9 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30"
                                title="Delete"
                                disabled={isDeleting}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            {/* Stats Footer */}
            {!isLoading && localNotifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-6 text-sm text-muted-foreground py-4"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{localNotifications.filter(n => n.read).length} Read</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </div>
                  <span>{localNotifications.filter(n => !n.read).length} Unread</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-muted-foreground" />
                  <span>{localNotifications.length} Total</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;


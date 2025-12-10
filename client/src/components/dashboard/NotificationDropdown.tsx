import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationDropdownProps {
  notifications?: Notification[];
  notificationCount?: number;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
}

// Mock notifications for UI demonstration
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Assignment',
    message: 'Database Project has been posted',
    time: '5 min ago',
    read: false,
  },
  {
    id: '2',
    title: 'Grade Posted',
    message: 'Your Quiz 3 has been graded',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    title: 'Course Update',
    message: 'New material added to Web Development',
    time: '2 hours ago',
    read: true,
  },
];

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications = mockNotifications,
  notificationCount,
  onNotificationClick,
  onMarkAllRead,
}) => {
  const navigate = useNavigate();
  const unreadCount = notificationCount ?? notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-frosted-blue-500 hover:text-frosted-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => onNotificationClick?.(notification)}
                className={`px-4 py-3 cursor-pointer hover:bg-accent transition-colors ${
                  !notification.read ? 'bg-accent/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                      !notification.read ? 'bg-frosted-blue-500' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="px-4 py-2">
          <button
            onClick={() => navigate('/notifications')}
            className="w-full text-center text-sm text-frosted-blue-500 hover:text-frosted-blue-600 hover:underline"
          >
            View all notifications
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;

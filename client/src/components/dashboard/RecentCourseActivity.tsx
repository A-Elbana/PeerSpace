import React from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export interface ActivityItem {
  id: string;
  title: string;
  type: 'course' | 'community' | 'assignment';
  timestamp?: string;
  instructor?: {
    name: string;
    avatar?: string;
  };
  status?: 'active' | 'completed' | 'review';
  badge?: string;
}

interface RecentCourseActivityProps {
  activities: ActivityItem[];
  onAddActivity?: () => void;
  onViewActivity?: (activityId: string) => void;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const RecentCourseActivity: React.FC<RecentCourseActivityProps> = ({
  activities,
  onAddActivity,
  onViewActivity,
  title = 'Recent Course Activity',
  showViewAll = false,
  onViewAll
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-turf-green-100 text-turf-green-700';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'review':
        return 'bg-frosted-blue-100 text-frosted-blue-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          {showViewAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="text-xs text-muted-foreground"
            >
              View all
            </Button>
          )}
          {onAddActivity && (
            <button
              onClick={onAddActivity}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <Plus size={18} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {activity.instructor && (
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={activity.instructor.avatar} alt={activity.instructor.name} />
                  <AvatarFallback className="bg-gradient-to-br from-tech-blue-500 to-frosted-blue-500 text-white text-xs">
                    {getInitials(activity.instructor.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {activity.title}
                </p>
                {activity.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2 shrink-0">
              {activity.badge && (
                <span className={`text-xs px-2 py-1 rounded-md ${getStatusBadge(activity.status)}`}>
                  {activity.badge}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewActivity?.(activity.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Review test
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentCourseActivity;

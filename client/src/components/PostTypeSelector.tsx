import React from 'react';
import { FileText, MessageSquare, Megaphone } from 'lucide-react';
import { cn } from '../lib/utils';

export type PostType = 'material' | 'discussion' | 'announcement';

interface PostTypeOption {
  value: PostType;
  label: string;
  icon: React.ElementType;
  description: string;
  roleRequired: 'student' | 'instructor';
}

const POST_TYPE_OPTIONS: PostTypeOption[] = [
  {
    value: 'material',
    label: 'Material',
    icon: FileText,
    description: 'Share resources, notes, or study materials',
    roleRequired: 'student',
  },
  {
    value: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    description: 'Start a conversation or ask questions',
    roleRequired: 'student',
  },
  {
    value: 'announcement',
    label: 'Announcement',
    icon: Megaphone,
    description: 'Make an important announcement (Instructor only)',
    roleRequired: 'instructor',
  },
];

interface PostTypeSelectorProps {
  value: PostType;
  onChange: (type: PostType) => void;
  userRole: 'student' | 'instructor' | 'admin';
  className?: string;
}

export const PostTypeSelector: React.FC<PostTypeSelectorProps> = ({
  value,
  onChange,
  userRole,
  className,
}) => {
  // Filter available types based on user role
  const availableTypes = POST_TYPE_OPTIONS.filter((option) => {
    if (option.roleRequired === 'instructor') {
      return userRole === 'instructor' || userRole === 'admin';
    }
    return true; // Student types are available to everyone
  });

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground">Post Type</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {availableTypes.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'relative flex flex-col items-start gap-2 p-3 rounded-lg border-2 transition-all duration-200',
                'hover:border-accent-teal hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2',
                isSelected
                  ? 'border-accent-teal bg-accent-teal/10 shadow-md'
                  : 'border-border bg-background hover:bg-muted/50'
              )}
              aria-pressed={isSelected}
              aria-label={`Select ${option.label} post type`}
            >
              {/* Icon and Label */}
              <div className="flex items-center gap-2 w-full">
                <div
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    isSelected
                      ? 'bg-muted-foreground text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    'font-semibold text-sm transition-colors',
                    isSelected ? 'text-accent-teal' : 'text-foreground'
                  )}
                >
                  {option.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground text-left leading-tight">
                {option.description}
              </p>

              {/* Active Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PostTypeSelector;

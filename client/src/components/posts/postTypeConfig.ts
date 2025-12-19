import { Megaphone, BookOpen, MessageSquare } from 'lucide-react';
import { type PostTypeConfig, type PostType } from './PostTypeSidebar';

export const POST_TYPE_CONFIGS: Record<PostType, PostTypeConfig> = {
  ANNOUNCEMENT: {
    icon: Megaphone,
    iconColor: 'text-white',
    iconBgColor: 'bg-gradient-to-br from-chart-3 to-orange-500',
    cardBorder: 'border-chart-3/50 ring-1 ring-chart-3/20',
    cardBg: 'bg-gradient-to-b from-chart-3/10 to-orange-500/10',
    titleColor: 'text-chart-3',
    sidebarBg: 'bg-gradient-to-b from-chart-3/20 to-orange-500/20 border-r border-chart-3/30',
    showVoting: false,
    showResolved: false,
  },
  MATERIAL: {
    icon: BookOpen,
    iconColor: 'text-white',
    iconBgColor: 'bg-gradient-to-br from-primary to-indigo-600',
    cardBorder: 'border-primary/50 ring-1 ring-primary/20',
    cardBg: 'bg-gradient-to-b from-primary/10 to-indigo-500/10',
    titleColor: 'text-primary',
    sidebarBg: 'bg-gradient-to-b from-primary/20 to-indigo-500/20 border-r border-primary/30',
    showVoting: false,
    showResolved: false,
  },
  DISCUSSION: {
    icon: MessageSquare,
    iconColor: 'text-primary',
    iconBgColor: 'bg-primary/10 dark:bg-primary/20',
    cardBorder: 'border-border',
    cardBg: 'bg-card',
    titleColor: 'text-foreground',
    sidebarBg: 'bg-muted/30',
    showVoting: true,
    showResolved: true,
  }
};

export const getPostTypeConfig = (type: string): PostTypeConfig => {
  const normalizedType = type.toUpperCase() as PostType;

  return POST_TYPE_CONFIGS[normalizedType] || POST_TYPE_CONFIGS.DISCUSSION;
};

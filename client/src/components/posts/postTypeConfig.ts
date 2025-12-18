import { Megaphone, BookOpen, MessageSquare } from 'lucide-react';
import { type PostTypeConfig, type PostType } from './PostTypeSidebar';

export const POST_TYPE_CONFIGS: Record<PostType, PostTypeConfig> = {
  ANNOUNCEMENT: {
    icon: Megaphone,
    iconColor: 'text-white',
    iconBgColor: 'bg-gradient-to-br from-yellow-400 to-orange-500',
    cardBorder: 'border-yellow-500/50 ring-1 ring-yellow-500/20',
    cardBg: 'bg-gradient-to-b from-yellow-500/20 to-orange-500/20',
    titleColor: 'text-yellow-600 dark:text-yellow-400',
    sidebarBg: 'bg-gradient-to-b from-yellow-500/20 to-orange-500/20 border-r border-yellow-500/30',
    showVoting: false,
    showResolved: false,
  },
  MATERIAL: {
    icon: BookOpen,
    iconColor: 'text-white',
    iconBgColor: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    cardBorder: 'border-blue-500/50 ring-1 ring-blue-500/20',
    cardBg: 'bg-gradient-to-b from-blue-500/10 to-indigo-500/10',
    titleColor: 'text-blue-600 dark:text-blue-400',
    sidebarBg: 'bg-gradient-to-b from-blue-500/20 to-indigo-500/20 border-r border-blue-500/30',
    showVoting: false,
    showResolved: false,
  },
  DISCUSSION: {
    icon: MessageSquare,
    iconColor: 'text-frosted-blue-600',
    iconBgColor: 'bg-frosted-blue-100 dark:bg-frosted-blue-900',
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

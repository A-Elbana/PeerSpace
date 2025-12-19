import { type ReactNode } from 'react';

export type PostType = 'ANNOUNCEMENT' | 'MATERIAL' | 'DISCUSSION';

export interface PostTypeConfig {
  icon: any;
  iconColor: string;
  iconBgColor: string;
  cardBorder: string;
  cardBg: string;
  titleColor: string;
  sidebarBg: string;
  showVoting: boolean;
  showResolved: boolean;
}

interface PostTypeSidebarProps {
  config: PostTypeConfig;
  children?: ReactNode;
}

const PostTypeSidebar = ({ config, children }: PostTypeSidebarProps) => {
  const Icon = config.icon;

  return (
    <div
      className={`w-12 ${config.sidebarBg} flex flex-col items-center justify-center py-3 ${config.cardBorder.replace('border-', 'border-r-')}`}
    >
      {children || (
        <div className={`w-8 h-8 rounded-full ${config.iconBgColor} flex items-center justify-center shadow-lg ${config.iconColor.includes('yellow') || config.iconColor.includes('chart-3') ? 'shadow-chart-3/30' : config.iconColor.includes('blue') || config.iconColor.includes('primary') ? 'shadow-primary/30' : 'shadow-chart-2/30'}`}>
          <Icon size={16} className={config.iconColor} />
        </div>
      )}
    </div>
  );
};

export default PostTypeSidebar;

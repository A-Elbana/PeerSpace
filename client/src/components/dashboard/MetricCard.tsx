import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: any;
  iconBgColor?: string;
  title: string;
  subtitle: string;
  badge?: {
    text: string;
    color: string;
  };
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  iconBgColor = 'bg-frosted-blue-100',
  title,
  subtitle,
  badge,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-card rounded-xl p-5 border border-border shadow-sm
        hover:shadow-md hover:border-frosted-blue-300 transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon size={24} className="text-frosted-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground truncate">
              {title}
            </h3>
            {badge && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;

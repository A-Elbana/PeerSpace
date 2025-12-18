import React from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Star,
  Flame,
  Sparkles,
  Lock,
  ChevronRight,
  Users,
  Target,
} from 'lucide-react';
import { Button } from './ui/button';

type RarityTier = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

interface BadgeCardProps {
  badge: {
    id: number;
    name: string;
    description?: string | null;
    rarity?: RarityTier;
    globalCompletion?: number;
    earnedDate?: string;
    category?: string;
  };
  isEarned: boolean;
  onClick: () => void;
  animationVariants?: any;
}

// Rarity-specific icon components using CSS/SVG for 3D-style badges
const BadgeIcon: React.FC<{ rarity: RarityTier; isEarned: boolean }> = ({ rarity, isEarned }) => {
  const getIconComponent = () => {
    switch (rarity) {
      case 'LEGENDARY':
        return Crown;
      case 'EPIC':
        return Flame;
      case 'RARE':
        return Sparkles;
      default:
        return Star;
    }
  };

  const Icon = getIconComponent();
  const config = getRarityConfig(rarity);

  return (
    <div className="relative h-32 w-32 mx-auto flex items-center justify-center">
      {/* Glow effect */}
      {isEarned && (
        <div 
          className={`absolute inset-0 bg-linear-to-r ${config.gradient} blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-300`} 
        />
      )}
      
      {/* Badge container with 3D effect */}
      <div 
        className={`
          relative w-28 h-28 rounded-full 
          ${isEarned 
            ? `bg-linear-to-br ${config.gradient} shadow-2xl` 
            : 'bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-lg'
          }
          flex items-center justify-center
          transform transition-all duration-300
          group-hover:scale-110 group-hover:rotate-12
        `}
        style={{
          filter: isEarned ? 'none' : 'grayscale(100%) brightness(0.7)',
        }}
      >
        {/* Inner circle for depth */}
        <div 
          className={`
            w-24 h-24 rounded-full 
            ${isEarned 
              ? 'bg-white/20 backdrop-blur-sm' 
              : 'bg-white/10 backdrop-blur-sm'
            }
            flex items-center justify-center
            border-2 
            ${isEarned ? 'border-white/30' : 'border-white/10'}
          `}
        >
          <Icon 
            className={`
              ${isEarned ? 'h-12 w-12 text-white drop-shadow-lg' : 'h-12 w-12 text-gray-400 dark:text-gray-600'}
            `}
            strokeWidth={2.5}
          />
        </div>
        
        {/* Sparkle accents for earned badges */}
        {isEarned && (
          <>
            <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-pulse" />
            <div className="absolute bottom-4 left-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75" />
          </>
        )}
      </div>

      {/* Lock overlay for locked badges */}
      {!isEarned && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-3 rounded-full bg-muted/90 backdrop-blur-sm border border-border shadow-lg">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
};

const getRarityConfig = (rarity?: RarityTier) => {
  switch (rarity) {
    case 'LEGENDARY':
      return {
        label: 'Legendary',
        gradient: 'from-amber-400 via-yellow-500 to-amber-600',
        glow: 'shadow-2xl shadow-amber-500/50 hover:shadow-amber-500/70',
        border: 'border-amber-400/50',
        bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30',
        text: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
        icon: Crown,
      };
    case 'EPIC':
      return {
        label: 'Epic',
        gradient: 'from-purple-400 via-purple-500 to-purple-600',
        glow: 'shadow-xl shadow-purple-500/40 hover:shadow-purple-500/60',
        border: 'border-purple-400/50',
        bg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-gradient-to-r from-purple-500 to-purple-600',
        icon: Flame,
      };
    case 'RARE':
      return {
        label: 'Rare',
        gradient: 'from-blue-400 via-blue-500 to-blue-600',
        glow: 'shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50',
        border: 'border-blue-400/50',
        bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
        icon: Sparkles,
      };
    default:
      return {
        label: 'Common',
        gradient: 'from-gray-400 via-gray-500 to-gray-600',
        glow: 'shadow-md shadow-gray-500/20 hover:shadow-gray-500/40',
        border: 'border-gray-400/50',
        bg: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30',
        text: 'text-gray-600 dark:text-gray-400',
        badgeBg: 'bg-gradient-to-r from-gray-500 to-gray-600',
        icon: Star,
      };
  }
};

export const BadgeCard = React.memo<BadgeCardProps>(({ 
  badge, 
  isEarned, 
  onClick,
  animationVariants 
}) => {
  const config = getRarityConfig(badge.rarity);
  const RarityIcon = config.icon;

  if (isEarned) {
    return (
      <motion.div
        variants={animationVariants}
        whileHover={{ scale: 1.05, y: -8 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`
          group relative cursor-pointer rounded-xl 
          border-2 ${config.border} ${config.bg} 
          p-6 transition-all duration-300 ${config.glow}
          hover:border-opacity-100
          overflow-hidden
        `}
      >
        {/* Subtle animated gradient overlay */}
        <div className={`absolute inset-0 bg-linear-to-br ${config.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

        {/* Rarity badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full ${config.badgeBg} text-white text-xs font-bold flex items-center gap-1 shadow-lg`}>
          <RarityIcon className="h-3 w-3" />
          {config.label}
        </div>

        {/* Badge Icon */}
        <BadgeIcon rarity={badge.rarity || 'COMMON'} isEarned={true} />

        {/* Badge Info */}
        <div className="relative z-10 text-center space-y-2 mt-4">
          <h3 className="font-bold text-foreground text-base leading-tight">
            {badge.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
            {badge.description || 'Achievement unlocked'}
          </p>
          
          {badge.earnedDate && (
            <p className="text-xs text-muted-foreground/70 pt-1">
              Earned {new Date(badge.earnedDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end justify-center p-4">
          <span className="text-white text-sm font-semibold flex items-center gap-1.5 z-10">
            View Details <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </motion.div>
    );
  }

  // Locked badge rendering
  return (
    <motion.div
      variants={animationVariants}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        group relative cursor-pointer rounded-xl 
        border-2 border-dashed border-border/60 bg-card/50 backdrop-blur-sm
        p-6 transition-all duration-300 
        hover:border-blue-400/50 hover:shadow-lg hover:bg-card
      `}
    >
      {/* Rarity badge - dimmed */}
      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full ${config.badgeBg} text-white text-xs font-bold flex items-center gap-1 opacity-40 group-hover:opacity-60 transition-opacity`}>
        <RarityIcon className="h-3 w-3" />
        {config.label}
      </div>

      {/* Locked Badge Icon */}
      <BadgeIcon rarity={badge.rarity || 'COMMON'} isEarned={false} />

      {/* Badge Info */}
      <div className="text-center space-y-2 mt-4">
        <h3 className="font-bold text-foreground/70 group-hover:text-foreground text-base leading-tight transition-colors">
          {badge.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
          {badge.description || 'Complete the challenge to unlock'}
        </p>

        

        {/* How to Earn Button */}
        <div className="pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Target className="h-3 w-3 mr-1.5" />
            How to Earn
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

BadgeCard.displayName = 'BadgeCard';

export { getRarityConfig };
export type { RarityTier };

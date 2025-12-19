import React from 'react';
import { Lock, Loader2 } from 'lucide-react';

interface CommunityItemProps {
  communityId: string;
  name: string;
  description: string | null;
  color: string;
  isJoining: boolean;
  onJoin: () => void;
  isStudent: boolean;
  isPrivate?: boolean;
  isEnrolled?: boolean;
  onNavigate: (communityId: string) => void;
}

const CommunityItem: React.FC<CommunityItemProps> = ({ communityId, name, description, color, isJoining, onJoin, isStudent, isPrivate, isEnrolled, onNavigate }) => (
  <div className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-accent/50 transition-colors">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm relative`}>
        {name.substring(0, 1).toUpperCase()}
        {isPrivate && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-background rounded-full flex items-center justify-center border border-border">
            <Lock size={10} className="text-primary" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex flex-col">
        <button
          onClick={() => onNavigate(communityId)}
          className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-1 hover:underline cursor-pointer text-left max-w-[180px]"
          title={name}
        >
          <span className="truncate max-w-[110px]">{name}</span>
          {isPrivate && <Lock size={12} className="text-primary flex-shrink-0" />}
        </button>
        <div className="text-xs text-muted-foreground truncate max-w-[110px]" title={description || undefined}>{description}</div>
      </div>
    </div>
    {isStudent && !isPrivate && (
      isEnrolled ? (
        <span className="px-3 py-1 bg-chart-2/10 text-chart-2 text-[11px] font-bold rounded-full flex-shrink-0 ml-2 tracking-wide uppercase">
          Enrolled
        </span>
      ) : (
        <button
          onClick={onJoin}
          disabled={isJoining}
          className="px-3 py-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 flex-shrink-0 ml-2 shadow-sm uppercase tracking-wide"
        >
          {isJoining ? <Loader2 size={12} className="animate-spin" /> : 'Enroll'}
        </button>
      )
    )}
  </div>
);

export default CommunityItem;

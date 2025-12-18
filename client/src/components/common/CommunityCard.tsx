import React from 'react';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import type { CommunityResponse } from '../../services/api';
import { Users, FileText, Lock, Globe } from 'lucide-react';

interface CommunityCardProps {
  community: CommunityResponse;
  onClick: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onClick }) => {
  const bannerUrl = useResolvedFileUrl(community.banner_file_id);
  const isPublic = community.type === 'PUBLIC';

  return (
    <div
      onClick={onClick}
      className="group relative bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
    >
      {/* Banner with gradient overlay */}
      {bannerUrl ? (
        <div className="relative h-24 bg-muted overflow-hidden">
          <img
            src={bannerUrl}
            alt={`${community.name} banner`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
        </div>
      ) : (
        <div className="h-24 bg-linear-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20" />
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Type Badge */}
        <div className="flex items-start gap-2">
          <h3 className="font-semibold text-base text-foreground line-clamp-1 flex-1 group-hover:text-primary transition-colors">
            {community.name}
          </h3>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${
            isPublic
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-warning/10 text-warning border border-warning/20'
          }`}>
            {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            <span>{community.type}</span>
          </div>
        </div>

        {/* Description */}
        {community.description && (
          <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
            {community.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">{community._count?.Enrollment || 0}</span>
            <span className="hidden sm:inline">members</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-medium">{community._count?.Post || 0}</span>
            <span className="hidden sm:inline">posts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;

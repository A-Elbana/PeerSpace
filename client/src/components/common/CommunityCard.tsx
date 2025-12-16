import React from 'react';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import type { CommunityResponse } from '../../services/api';

interface CommunityCardProps {
  community: CommunityResponse;
  onClick: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onClick }) => {
  const bannerUrl = useResolvedFileUrl(community.banner_file_id);

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {bannerUrl && (
        <div className="h-32 bg-muted relative">
          <img
            src={bannerUrl}
            alt={`${community.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1 flex-1">
            {community.name}
          </h3>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${community.type === 'PUBLIC'
            ? 'bg-turf-green-500/10 text-turf-green-600'
            : 'bg-royal-gold-500/10 text-royal-gold-600'
            }`}>
            {community.type}
          </span>
        </div>
        {community.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
            {community.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{community._count?.Enrollment || 0} members</span>
          <span>{community._count?.Post || 0} posts</span>
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;

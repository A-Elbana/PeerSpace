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
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${community.type === 'PUBLIC'
              ? 'bg-green-500/90 text-white'
              : 'bg-orange-500/90 text-white'
              }`}>
              {community.type}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-1">
          {community.name}
        </h3>
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

import React from 'react';

interface FeedSkeletonProps {
  postCount?: number;
}

const FeedSkeleton: React.FC<FeedSkeletonProps> = ({ postCount = 5 }) => {
  return (
    <div className="flex-1 space-y-4">
      {/* Editor Section Skeleton */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-4 border-b border-border pb-0">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 w-16 bg-muted rounded-t-lg animate-pulse" />
        ))}
      </div>

      {/* Posts Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: postCount }).map((_, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Post Header */}
            <div className="flex items-start gap-3 p-4 pb-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="w-6 h-6 bg-muted rounded animate-pulse flex-shrink-0" />
            </div>

            {/* Post Title */}
            <div className="px-4 pb-2">
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
            </div>

            {/* Post Image Skeleton */}
            <div className="mx-4 mb-3 h-48 bg-muted rounded-lg animate-pulse" />

            {/* Post Footer */}
            <div className="px-4 py-3 border-t border-muted flex items-center gap-4">
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-4 w-12 bg-muted rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded animate-pulse ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Load More Skeleton */}
      <div className="text-center py-4">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mx-auto" />
      </div>
    </div>
  );
};

export default FeedSkeleton;

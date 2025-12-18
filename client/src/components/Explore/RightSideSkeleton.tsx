import React from 'react';

const RightSideSkeleton: React.FC = () => {
  return (
    <div className="w-full lg:w-80 space-y-6">
      {/* Deadlines/Submissions Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pb-3 border-b border-muted last:border-b-0 last:pb-0">
              <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Public Communities Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="h-6 w-40 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 border border-muted rounded-lg">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="h-8 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Private Communities Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="h-6 w-40 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 border border-muted rounded-lg">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSideSkeleton;

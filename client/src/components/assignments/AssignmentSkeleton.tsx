import React from 'react';
import { FileText } from 'lucide-react';

export const AssignmentSkeletonItem: React.FC = () => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-surface/60 rounded w-3/4 mb-3 animate-pulse" />
        <div className="h-3 bg-surface/60 rounded w-1/2 mb-2 animate-pulse" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div className="h-3 bg-surface/60 rounded w-20 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const AssignmentSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-surface/60 rounded w-48 animate-pulse" />
        <div className="h-8 w-32 bg-surface/60 rounded animate-pulse" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
          <AssignmentSkeletonItem key={i} />
        ))}
      </div>
    </div>
  );
};

// Default export for compatibility
export default AssignmentSkeleton;

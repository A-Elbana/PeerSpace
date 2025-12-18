import React from 'react';

export const AssignmentSkeletonItem: React.FC = () => (
  <div className="bg-card border border-border rounded-xl p-5 w-full flex items-center animate-pulse">
    <div className="flex-1 min-w-0 mr-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded-full w-20" />
      </div>
      <div className="h-4 bg-muted rounded w-2/3 mb-4" />
      <div className="flex gap-6">
        <div className="h-3 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
    </div>
    <div className="w-10 h-10 rounded-full bg-muted" />
  </div>
);

export const AssignmentSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <AssignmentSkeletonItem key={i} />
      ))}
    </div>
  );
};

export default AssignmentSkeleton;

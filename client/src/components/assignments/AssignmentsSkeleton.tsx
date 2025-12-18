import React from 'react';
import AssignmentCardSkeleton from './AssignmentCardSkeleton';

interface AssignmentsSkeletonProps {
  count?: number;
}

const AssignmentsSkeleton: React.FC<AssignmentsSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="w-full">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2 animate-pulse">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>

      {/* Header skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded mb-2" />
        <div className="h-4 w-96 bg-muted rounded" />
      </div>

      {/* Assignments list */}
      <div className="grid gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <AssignmentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export default AssignmentsSkeleton;

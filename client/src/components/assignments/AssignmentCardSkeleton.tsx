import React from 'react';

const AssignmentCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <div className="h-6 w-3/4 bg-muted rounded mb-4" />

          {/* Metadata grid */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Community name */}
            <div className="h-4 w-32 bg-muted rounded" />

            {/* Due date */}
            <div className="h-4 w-40 bg-muted rounded" />

            {/* Points */}
            <div className="h-4 w-24 bg-muted rounded" />

            {/* Late submissions or ungraded */}
            <div className="h-4 w-28 bg-muted rounded" />
          </div>
        </div>

        {/* Chevron icon placeholder */}
        <div className="w-5 h-5 bg-muted rounded ml-4 flex-shrink-0" />
      </div>
    </div>
  );
};

export default AssignmentCardSkeleton;

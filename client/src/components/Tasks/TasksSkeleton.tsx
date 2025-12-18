import React from 'react';

interface TasksSkeletonProps {
  count?: number;
}

const TasksSkeleton: React.FC<TasksSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="h-9 w-48 bg-muted rounded-lg mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="h-10 w-32 bg-primary/20 rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 bg-muted/30 border-b border-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4">
              {/* Name Column */}
              <div className="flex flex-col gap-2 min-w-0">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>

              {/* Assignees Column */}
              <div className="w-48 flex items-center justify-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-muted animate-pulse border-2 border-background"
                    />
                  ))}
                </div>
              </div>

              {/* Due Date Column */}
              <div className="w-32 flex items-center justify-center">
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </div>

              {/* Priority Column */}
              <div className="w-24 flex items-center justify-center">
                <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              </div>

              {/* Done Column */}
              <div className="w-12 flex items-center justify-center">
                <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
              </div>

              {/* Actions Column */}
              <div className="w-12 flex items-center justify-center">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-end">
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksSkeleton;

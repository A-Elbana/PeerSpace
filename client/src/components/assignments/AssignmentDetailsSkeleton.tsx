import React from 'react';
import { Loader2 } from 'lucide-react';

const Line: React.FC<{ w?: string; h?: string; className?: string }> = ({ w = 'w-full', h = 'h-4', className = '' }) => (
  <div className={`bg-muted/40 rounded ${w} ${h} ${className}`} />
);

const AssignmentDetailsSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-16 h-3 bg-muted/40 rounded" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="w-64 h-8 bg-muted/40 rounded" />
          <div className="flex items-center gap-4">
            <div className="w-24 h-3 bg-muted/40 rounded" />
            <div className="w-32 h-3 bg-muted/40 rounded" />
          </div>
        </div>
        <div className="w-24 h-10 bg-muted/40 rounded" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="space-y-3">
              <div className="w-48 h-5 bg-muted/40 rounded" />
              <Line w="w-full" h="h-3" />
              <Line w="w-full" h="h-3" />
              <Line w="w-3/4" h="h-3" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="space-y-3">
              <div className="w-40 h-5 bg-muted/40 rounded" />
              <div className="space-y-2">
                <div className="w-full h-12 bg-muted/30 rounded" />
                <div className="w-full h-12 bg-muted/30 rounded" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
            <div className="space-y-3">
              <div className="w-32 h-5 bg-muted/40 rounded" />
              <div className="w-full h-24 bg-muted/30 rounded flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
              <div className="w-full h-4 bg-muted/40 rounded" />
              <div className="w-3/4 h-4 bg-muted/40 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetailsSkeleton;

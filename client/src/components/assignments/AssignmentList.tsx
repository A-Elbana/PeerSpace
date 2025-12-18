import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { instructorApi, assignmentApi } from '../../services/api';
import AssignmentSkeleton from './AssignmentSkeleton';
import AssignmentCard, { type Assignment } from './AssignmentCard';
import Combobox from '../ui/Combobox';
import { toast } from 'sonner';

interface AssignmentListProps {
  communityId?: string;
  communityName?: string;
  showCreateButton?: boolean;
  variant?: 'compact' | 'full';
  limit?: number;
  showMoreButton?: boolean;
  onCreateClick?: () => void;
  onAssignmentClick?: (assignment: Assignment) => void;
  role?: 'student' | 'instructor';
  userId?: number;
  showCommunityFilter?: boolean;
  communities?: Array<{ id: string; name: string; type?: string }>;
}

const AssignmentList: React.FC<AssignmentListProps> = ({
  communityId,
  communityName,
  showCreateButton = true,
  variant = 'full',
  limit,
  showMoreButton = false,
  onCreateClick,
  onAssignmentClick,
  role = 'student',
  showCommunityFilter = false,
  communities: externalCommunities = []
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(communityId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [page, setPage] = useState(1);
  const [limitPerPage] = useState<number>(limit || 8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAssignments([]);
    setPage(1);
    setHasMore(true);
    setTotalAssignments(0);
    const aborter = { aborted: false } as { aborted: boolean };

    const fetchPage = async (p: number) => {
      try {
        if (p === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        let response: any;
        if (role === 'instructor') {
          const params: any = { page: p, limit: limitPerPage };
          if (selectedCommunityId) params.cid = selectedCommunityId;
          response = await instructorApi.getInstructorAssignments(params);
        } else {
          // Student logic
          const targetCid = communityId || selectedCommunityId;
          response = await assignmentApi.getByCommunity(targetCid || '', { page: p, limit: limitPerPage });
        }

        if (aborter.aborted) return;

        const mapped = response.data.map((a: any) => ({
          ...a,
          communityName: communityName || a.Community?.name
        })) as Assignment[];

        setAssignments((prev) => (p === 1 ? mapped : [...prev, ...mapped]));
        setTotalAssignments(response.meta?.total ?? 0);
        setHasMore(response.meta ? p < response.meta.totalPages : response.data.length === limitPerPage);
        setPage(p);
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
        toast.error('Failed to load assignments');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    void fetchPage(1);

    return () => {
      aborter.aborted = true;
    };
  }, [communityId, selectedCommunityId, limitPerPage, communityName, role]);

  useEffect(() => {
    if (showMoreButton) return;
    if (!sentinelRef.current) return;
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          const next = page + 1;
          void (async () => {
            try {
              setIsLoadingMore(true);
              let response: any;
              if (role === 'instructor') {
                const params: any = { page: next, limit: limitPerPage };
                if (selectedCommunityId) params.cid = selectedCommunityId;
                response = await instructorApi.getInstructorAssignments(params);
              } else {
                const targetCid = communityId || selectedCommunityId;
                response = await assignmentApi.getByCommunity(targetCid || '', { page: next, limit: limitPerPage });
              }

              const mapped = response.data.map((a: any) => ({
                ...a,
                communityName: communityName || a.Community?.name
              })) as Assignment[];

              setAssignments((prev) => [...prev, ...mapped]);
              setHasMore(response.meta ? next < response.meta.totalPages : response.data.length === limitPerPage);
              setPage(next);
            } catch (error) {
              console.error('Failed to load more assignments:', error);
              toast.error('Failed to load more assignments');
            } finally {
              setIsLoadingMore(false);
            }
          })();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef.current, isLoadingMore, hasMore, page, communityId, selectedCommunityId, communityName, limitPerPage, showMoreButton, role]);

  const handleFilterChange = (val: string | null) => {
    setSelectedCommunityId(val);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col gap-4">
        {(showCreateButton || assignments.length > 0 || showCommunityFilter) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Assignments</h3>
              {totalAssignments > 0 && (
                <p className="text-xs text-muted-foreground">{totalAssignments} items found</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {showCommunityFilter && externalCommunities.length > 0 && (
                <div className="w-full sm:w-64">
                  <Combobox
                    value={selectedCommunityId}
                    options={externalCommunities.map(c => ({
                      value: c.id,
                      label: c.name,
                      subtitle: c.type
                    }))}
                    onChange={(opt: any) => handleFilterChange(opt?.value || null)}
                    onSearchChange={() => { }}
                    placeholder="Filter by Community"
                    className="bg-card shadow-sm h-9 text-sm"
                  />
                </div>
              )}

              {showCreateButton && onCreateClick && (
                <Button
                  onClick={onCreateClick}
                  size="sm"
                  className="bg-tech-blue-500 hover:bg-tech-blue-600 rounded-full px-4 h-9 shadow-sm"
                >
                  <Plus size={16} className="mr-2" />
                  Create
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <AssignmentSkeleton items={limitPerPage} />
      ) : assignments.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="text-base font-semibold text-foreground mb-2">Workspace Clear</h4>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
            {showCreateButton ? 'Start your journey by creating an assignment for this community.' : 'No assignments are currently pending in this community.'}
          </p>
          {showCreateButton && onCreateClick && (
            <Button
              onClick={onCreateClick}
              variant="outline"
              className="rounded-full px-6"
            >
              <Plus size={16} className="mr-2" />
              Create Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onClick={onAssignmentClick}
                variant={variant}
              />
            ))}
          </div>

          {!showMoreButton && (
            <div className="flex flex-col items-center justify-center pt-4 min-h-[60px]">
              {isLoadingMore ? (
                <div className="flex flex-col gap-4 w-full">
                  <AssignmentSkeleton items={2} />
                  <Loader2 className="w-6 h-6 animate-spin text-tech-blue-500 mx-auto mt-2" />
                </div>
              ) : hasMore ? (
                <div ref={sentinelRef} style={{ height: 10, width: '100%' }} />
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">You've reached the end of the list</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
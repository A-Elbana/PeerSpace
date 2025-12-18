import React, { useState, useEffect, useRef } from 'react';
import { Calendar, FileText, Loader2, Plus, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { instructorApi } from '../../services/api';
import AssignmentSkeleton from './AssignmentSkeleton.tsx';
import { toast } from 'sonner';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  due_date: string | null;
  canBeLate: boolean;
  cid: string;
  Instructor: {
    User: {
      fname: string;
      lname: string;
    };
  };
  AssignmentFileAttachment?: Array<{
    File: {
      id: string;
      secure_url: string;
      format: string;
      original_filename: string;
    };
  }>;
  _count?: {
    Submission: number;
  };
}

interface AssignmentListProps {
  communityId?: string;
  communityName?: string;
  showCreateButton?: boolean;
  variant?: 'compact' | 'full';
  limit?: number;
  showAllLink?: boolean;
  showMoreButton?: boolean;
  onCreateClick?: () => void;
  onAssignmentClick?: (assignment: Assignment) => void;
}

const AssignmentList: React.FC<AssignmentListProps> = ({
  communityId,

  showCreateButton = true,
  variant = 'full',
  limit,

  showMoreButton = false,
  onCreateClick,
  onAssignmentClick
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [page, setPage] = useState(1);
  const [limitPerPage] = useState<number>(limit || 5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset when community changes
    setAssignments([]);
    setPage(1);
    setHasMore(true);
    setTotalAssignments(0);
    const aborter = { aborted: false } as { aborted: boolean };

    const fetchPage = async (p: number) => {
      try {
        if (p === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        // If showMoreButton is active, emulate the previous small preview behaviour
        if (showMoreButton && !showAllAssignments && p > 1) {
          // no-op: do not auto-load more when using showMoreButton
          return;
        }

        const params: any = { page: p, limit: limitPerPage };
        if (communityId) params.cid = communityId;
        const response = await instructorApi.getInstructorAssignments(params);

        if (aborter.aborted) return;

        // Map server items into the local Assignment shape (ensure Instructor exists)
        const mapped = response.data.map((a: any) => ({
          id: a.id,
          cid: a.cid,
          title: a.title,
          description: a.description,
          due_date: a.due_date,
          canBeLate: a.canBeLate,
          AssignmentFileAttachment: a.AssignmentFileAttachment,
          _count: a._count,
          Instructor: a.Instructor ?? { User: { fname: '', lname: '' } },
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
  }, [communityId, limitPerPage, showMoreButton, showAllAssignments]);

  // Intersection observer to lazy-load next page when sentinel visible
  useEffect(() => {
    if (showMoreButton) return; // skip infinite load if using showMoreButton mode
    if (!sentinelRef.current) return;
    if (!hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          const next = page + 1;
          // fetch next page
          void (async () => {
            try {
              setIsLoadingMore(true);
              const params: any = { page: next, limit: limitPerPage };
              if (communityId) params.cid = communityId;
              const response = await instructorApi.getInstructorAssignments(params);
              const mapped = response.data.map((a: any) => ({
                id: a.id,
                cid: a.cid,
                title: a.title,
                description: a.description,
                due_date: a.due_date,
                canBeLate: a.canBeLate,
                AssignmentFileAttachment: a.AssignmentFileAttachment,
                _count: a._count,
                Instructor: a.Instructor ?? { User: { fname: '', lname: '' } },
              })) as Assignment[];

              setAssignments((prev) => [...prev, ...mapped]);
              setTotalAssignments(response.meta?.total ?? totalAssignments);
              setHasMore(response.meta ? next < response.meta.totalPages : response.data.length === limitPerPage);
              setPage(next);
            } catch (error) {
              console.error('Failed to load more assignments:', error);
            } finally {
              setIsLoadingMore(false);
            }
          })();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef.current, isLoadingMore, hasMore, page, communityId, limitPerPage, showMoreButton, totalAssignments]);

  // Reset showAllAssignments when showMoreButton changes
  useEffect(() => {
    if (!showMoreButton) {
      setShowAllAssignments(false);
      setTotalAssignments(0);
    }
  }, [showMoreButton]);

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const isPast = date < now;

    return {
      formatted: date.toLocaleDateString(),
      isPast,
      timeUntil: isPast ? 'Past due' : `Due ${date.toLocaleDateString()}`
    };
  };

  // Do not block rendering of the parent/page — render skeleton only in the list area

  return (
    <div className="space-y-4">
      {/* Header */}
      {(showCreateButton || assignments.length > 0) && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Assignments</h3>
          {showCreateButton && onCreateClick && (
            <Button
              onClick={onCreateClick}
              size="sm"
              className="bg-tech-blue-500 hover:bg-tech-blue-600"
            >
              <Plus size={16} className="mr-2" />
              Create Assignment
            </Button>
          )}
        </div>
      )}

      {/* Assignments List */}
      {isLoading ? (
        <AssignmentSkeleton />
      ) : assignments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">No assignments yet</h4>
          <p className="text-xs text-muted-foreground">
            {showCreateButton ? 'Create the first assignment for this community.' : 'Assignments will appear here when created.'}
          </p>
          {showCreateButton && onCreateClick && (
            <Button
              onClick={onCreateClick}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <Plus size={14} className="mr-2" />
              Create Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const dueDateInfo = formatDueDate(assignment.due_date);
            return (
              <div
                key={assignment.id}
                onClick={() => onAssignmentClick?.(assignment)}
                className={`bg-card border border-border rounded-xl p-4 hover:border-tech-blue-500/50 hover:shadow-sm transition-all cursor-pointer group ${variant === 'compact' ? 'p-3' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-foreground mb-1 group-hover:text-tech-blue-600 transition-colors ${variant === 'compact' ? 'text-sm' : ''}`}>
                      {assignment.title}
                    </h4>

                    {assignment.description && variant === 'full' && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {assignment.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">


                      {dueDateInfo && (
                        <div className={`flex items-center gap-1 ${dueDateInfo.isPast ? 'text-red-600' : ''}`}>
                          <Calendar size={12} />
                          <span>{dueDateInfo.timeUntil}</span>
                        </div>
                      )}

                      {assignment.canBeLate ? (
                        <span className="text-green-600">Late submissions allowed</span>
                      ) : (
                        <span className="text-red-600 font-medium">No late submissions</span>
                      )}

                      {assignment.AssignmentFileAttachment && assignment.AssignmentFileAttachment.length > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText size={12} />
                          <span>{assignment.AssignmentFileAttachment.length} attachment{assignment.AssignmentFileAttachment.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {assignment._count?.Submission !== undefined && (
                        <span>{assignment._count.Submission} submission{assignment._count.Submission !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  <ExternalLink size={16} className="text-muted-foreground group-hover:text-tech-blue-600 transition-colors ml-2 flex-shrink-0" />
                </div>
              </div>
            );
          })}

          {/* Show More Button or Show All Link */}
          {assignments.length > 0 && (
            <div className="text-center pt-2">
              {showMoreButton && totalAssignments > assignments.length && !showAllAssignments ? (
                <Button variant="ghost" size="sm" onClick={() => setShowAllAssignments(true)}>
                  Show More Assignments ↓
                </Button>
              ) : null}
            </div>
          )}

          {/* sentinel for infinite scroll */}
          {!showMoreButton && (
            <div className="flex items-center justify-center mt-3">
              {isLoadingMore ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : hasMore ? (
                <div ref={sentinelRef} style={{ height: 1, width: '100%' }} />
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
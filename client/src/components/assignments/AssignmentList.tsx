import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Loader2, Plus, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { assignmentApi } from '../../services/api';
import { toast } from 'sonner';

interface Assignment {
    id: number;
    title: string;
  description?: string;
    due_date: string | null;
  canBeLate: boolean;
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
    communityId: string;
  communityName: string;
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
    communityName,
  showCreateButton = true,
  variant = 'full',
  limit,
  showAllLink = true,
  showMoreButton = false,
    onCreateClick,
    onAssignmentClick
}) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [totalAssignments, setTotalAssignments] = useState(0);

  useEffect(() => {
    const fetchAssignments = async () => {
        try {
            setIsLoading(true);
        // If showMoreButton is true, start with 2 assignments, otherwise use the provided limit
        const fetchLimit = showMoreButton
          ? (showAllAssignments ? 1000 : 2) // Show all when expanded, or just 2 initially
          : (limit || 10);
        const response = await assignmentApi.getByCommunity(communityId, {
          limit: fetchLimit
            });

        // Sort assignments: upcoming due dates first, past due dates last
        const sortedAssignments = response.data.sort((a, b) => {
            const now = new Date();
          const aDue = a.due_date ? new Date(a.due_date) : null;
          const bDue = b.due_date ? new Date(b.due_date) : null;

          // If both have due dates
          if (aDue && bDue) {
            const aIsPast = aDue < now;
            const bIsPast = bDue < now;

            // Past due assignments go to the end
            if (aIsPast && !bIsPast) return 1;
            if (!aIsPast && bIsPast) return -1;

            // If both are upcoming or both are past, sort by due date
            return aDue.getTime() - bDue.getTime();
          }

          // If one has no due date, put it at the end
          if (!aDue && bDue) return 1;
          if (aDue && !bDue) return -1;

          // If neither has due date, maintain original order
          return 0;
        });

        setAssignments(sortedAssignments);
        setTotalAssignments(response.meta.total);
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
        toast.error('Failed to load assignments');
        } finally {
            setIsLoading(false);
        }
    };

    fetchAssignments();
  }, [communityId, limit, showMoreButton, showAllAssignments]);

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

    if (isLoading) {
        return (
                <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

        return (
    <div className="space-y-4">
      {/* Header */}
      {(showCreateButton || assignments.length > 0) && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Assignments {assignments.length > 0 && `(${assignments.length})`}
          </h3>
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
      {assignments.length === 0 ? (
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
                className={`bg-card border border-border rounded-xl p-4 hover:border-tech-blue-500/50 hover:shadow-sm transition-all cursor-pointer group ${variant === 'compact' ? 'p-3' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-foreground mb-1 group-hover:text-tech-blue-600 transition-colors ${variant === 'compact' ? 'text-sm' : ''
                      }`}>
                      {assignment.title}
                    </h4>

                    {assignment.description && variant === 'full' && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {assignment.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>By {assignment.Instructor.User.fname} {assignment.Instructor.User.lname}</span>
                      </div>

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
                    <Button
                        variant="ghost"
                        size="sm"
                  onClick={() => setShowAllAssignments(true)}
                >
                  Show More Assignments ↓
                </Button>
              ) : showAllLink ? (
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/community/${communityId}/assignments`}>
                    View all assignments →
                  </a>
                    </Button>
              ) : null}
            </div>
          )}
                </div>
            )}
        </div>
    );
};

export default AssignmentList;
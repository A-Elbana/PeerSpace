import React from 'react';
import { FileText, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export interface Submission {
  id: string;
  studentName: string;
  studentAvatar?: string;
  assignmentTitle: string;
  courseName: string;
  submittedAt: string;
  status: 'pending' | 'graded' | 'late';
}

interface PendingSubmissionsProps {
  submissions: Submission[];
  onGradeSubmission?: (submissionId: string) => void;
  onViewSubmission?: (submissionId: string) => void;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const PendingSubmissions: React.FC<PendingSubmissionsProps> = ({
  submissions,
  onGradeSubmission,
  title = 'Pending Submissions',
  showViewAll = false,
  onViewAll
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-royal-gold-100 text-royal-gold-700';
      case 'late':
        return 'bg-red-100 text-red-700';
      case 'graded':
        return 'bg-turf-green-100 text-turf-green-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-royal-gold-500" />
          <h3 className="font-semibold text-foreground">{title}</h3>
          {submissions.length > 0 && (
            <span className="bg-royal-gold-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {submissions.length}
            </span>
          )}
        </div>
        {showViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs text-muted-foreground"
          >
            View all
          </Button>
        )}
      </div>

      {/* Submissions List */}
      <div className="divide-y divide-border">
        {submissions.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending submissions</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={submission.studentAvatar} alt={submission.studentName} />
                  <AvatarFallback className="bg-gradient-to-br from-royal-gold-400 to-royal-gold-600 text-white text-xs">
                    {getInitials(submission.studentName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {submission.studentName}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(submission.status)}`}>
                      {submission.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {submission.assignmentTitle} • {submission.courseName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-2 shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>{formatTime(submission.submittedAt)}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onGradeSubmission?.(submission.id)}
                  className="text-xs bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
                >
                  Grade
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingSubmissions;

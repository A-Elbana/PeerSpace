import React from 'react';
import { Calendar, FileText, ChevronRight, Clock, AlertCircle, ExternalLink } from 'lucide-react';

export interface Assignment {
    id: number;
    title: string;
    description?: string;
    due_date: string | null;
    canBeLate?: boolean;
    cid: string;
    communityName?: string;
    max_points?: number | null;
    ungradedCount?: number;
    Instructor?: {
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

interface AssignmentCardProps {
    assignment: Assignment;
    onClick?: (assignment: Assignment) => void;
    variant?: 'compact' | 'full';
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onClick, variant = 'full' }) => {
    const formatDueDate = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        const now = new Date();
        const isPast = date < now;

        return {
            formatted: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            isPast,
            daysRemaining: Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        };
    };

    const dueDateInfo = formatDueDate(assignment.due_date);

    return (
        <div
            onClick={() => onClick?.(assignment)}
            className={`group relative flex items-center bg-card border border-border rounded-xl p-4 hover:border-tech-blue-500/50 hover:shadow-md transition-all duration-300 cursor-pointer w-full ${variant === 'compact' ? 'py-3' : 'py-5'}`}
        >
            <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-3 mb-1.5">
                    <h3 className={`font-semibold text-foreground group-hover:text-tech-blue-600 transition-colors truncate ${variant === 'compact' ? 'text-base' : 'text-lg'}`}>
                        {assignment.title}
                    </h3>
                    {assignment.communityName && (
                        <span className="text-[10px] font-bold text-tech-blue-600 bg-tech-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                            {assignment.communityName}
                        </span>
                    )}
                </div>

                {variant === 'full' && assignment.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                        {assignment.description}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    <div className={`flex items-center gap-1.5 ${dueDateInfo?.isPast ? 'text-destructive' : ''}`}>
                        <Calendar size={14} className="opacity-70" />
                        <span>{dueDateInfo ? dueDateInfo.formatted : 'No deadline'}</span>
                    </div>

                    {assignment.max_points && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span>{assignment.max_points} Points</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-border" />
                        {dueDateInfo?.isPast ? (
                            <span className="text-destructive font-medium uppercase tracking-tight">Closed</span>
                        ) : (
                            <span className="text-tech-blue-600 font-medium uppercase tracking-tight">
                                {dueDateInfo ? `${dueDateInfo.daysRemaining}d left` : 'Open'}
                            </span>
                        )}
                    </div>

                    {assignment._count?.Submission !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span>{assignment._count.Submission} Submissions</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-muted group-hover:bg-tech-blue-50 group-hover:text-tech-blue-600 transition-all duration-300">
                <ExternalLink size={18} className="translate-x-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </div>
    );
};

export default AssignmentCard;

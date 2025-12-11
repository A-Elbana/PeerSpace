import React from 'react';
import { MessageCircle, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export interface StudentQuestion {
  id: string;
  studentName: string;
  studentAvatar?: string;
  question: string;
  courseName: string;
  askedAt: string;
  priority: 'low' | 'medium' | 'high';
  isAnswered: boolean;
}

interface StudentQuestionsProps {
  questions: StudentQuestion[];
  onAnswerQuestion?: (questionId: string) => void;
  onViewQuestion?: (questionId: string) => void;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const StudentQuestions: React.FC<StudentQuestionsProps> = ({
  questions,
  onAnswerQuestion,
  title = 'Student Questions',
  showViewAll = false,
  onViewAll
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPriorityBadge = (priority: StudentQuestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-royal-gold-100 text-royal-gold-700';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
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

  const unansweredCount = questions.filter(q => !q.isAnswered).length;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-frosted-blue-500" />
          <h3 className="font-semibold text-foreground">{title}</h3>
          {unansweredCount > 0 && (
            <span className="bg-frosted-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unansweredCount}
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

      {/* Questions List */}
      <div className="divide-y divide-border">
        {questions.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending questions</p>
          </div>
        ) : (
          questions.map((question) => (
            <div
              key={question.id}
              className={`flex items-start justify-between px-5 py-3 hover:bg-muted/50 transition-colors ${question.isAnswered ? 'opacity-60' : ''
                }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Avatar className="w-9 h-9 shrink-0 mt-0.5">
                  <AvatarImage src={question.studentAvatar} alt={question.studentName} />
                  <AvatarFallback className="bg-gradient-to-br from-frosted-blue-400 to-frosted-blue-600 text-white text-xs">
                    {getInitials(question.studentName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {question.studentName}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(question.priority)}`}>
                      {question.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {question.question}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {question.courseName}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>{formatTime(question.askedAt)}</span>
                </div>
                {!question.isAnswered && (
                  <Button
                    size="sm"
                    onClick={() => onAnswerQuestion?.(question.id)}
                    className="text-xs bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
                  >
                    Answer
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentQuestions;

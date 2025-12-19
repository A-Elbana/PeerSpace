import React from 'react';

interface DeadlineItemProps {
  course?: string;
  task: string;
  due: string;
  isInstructor?: boolean;
  onClick?: () => void;
}

const DeadlineItem: React.FC<DeadlineItemProps> = ({ course, task, due, isInstructor, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
  >
    <div className={`w-1.5 h-12 ${isInstructor ? 'bg-chart-3' : 'bg-destructive'} rounded-full flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm`} />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{task}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {course ? (
          <>
            <span className="truncate">{course}</span>
            <span>•</span>
          </>
        ) : null}
        <span className={`${isInstructor ? 'text-chart-3' : 'text-destructive'} font-semibold`}>
          {isInstructor ? 'Pending: ' : 'Due '}{due}
        </span>
      </div>
    </div>
  </div>
);

export default DeadlineItem;

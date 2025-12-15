import React from 'react';

interface DeadlineItemProps {
  course: string;
  task: string;
  due: string;
  isInstructor?: boolean;
  onClick?: () => void;
}

const DeadlineItem: React.FC<DeadlineItemProps> = ({ course, task, due, isInstructor, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer group"
  >
    <div className={`w-1.5 h-12 ${isInstructor ? 'bg-royal-gold-500' : 'bg-red-500'} rounded-full flex-shrink-0 group-hover:scale-110 transition-transform`} />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-bold text-foreground truncate group-hover:text-tech-blue-600 transition-colors">{task}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <span className="truncate">{course}</span>
        <span>•</span>
        <span className={`${isInstructor ? 'text-royal-gold-600' : 'text-red-500'} font-medium`}>
          {isInstructor ? 'Pending: ' : 'Due '}{due}
        </span>
      </div>
    </div>
  </div>
);

export default DeadlineItem;

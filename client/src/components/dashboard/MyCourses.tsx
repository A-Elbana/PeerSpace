import React from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export interface Course {
  id: string;
  name: string;
  instructor: string;
  instructorAvatar?: string;
  status: 'enrolled' | 'completed' | 'in-progress';
  progress?: number;
}

interface MyCoursesProps {
  courses: Course[];
  onAddCourse?: () => void;
  onViewCourse?: (courseId: string) => void;
  title?: string;
  showDiscord?: boolean;
}

const MyCourses: React.FC<MyCoursesProps> = ({
  courses,
  onAddCourse,
  onViewCourse,
  title = 'My Courses',
  showDiscord = false
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          {showDiscord && (
            <span className="text-xs text-muted-foreground">Discord</span>
          )}
          {onAddCourse && (
            <button
              onClick={onAddCourse}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <Plus size={18} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Course List */}
      <div className="divide-y divide-border">
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={course.instructorAvatar} alt={course.instructor} />
                <AvatarFallback className="bg-gradient-to-br from-tech-blue-500 to-frosted-blue-500 text-white text-xs">
                  {getInitials(course.instructor)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {course.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {course.instructor}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewCourse?.(course.id)}
              className="text-xs text-muted-foreground hover:text-foreground ml-2 shrink-0"
            >
              Review test
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCourses;

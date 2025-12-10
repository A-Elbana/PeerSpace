import React from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';

export interface ManagedCourse {
  id: string;
  name: string;
  studentCount: number;
  pendingSubmissions: number;
  pendingQuestions: number;
  status: 'active' | 'archived' | 'draft';
}

interface ManageCoursesProps {
  courses: ManagedCourse[];
  onAddCourse?: () => void;
  onViewCourse?: (courseId: string) => void;
  onManageCourse?: (courseId: string) => void;
  title?: string;
}

const ManageCourses: React.FC<ManageCoursesProps> = ({
  courses,
  onAddCourse,
  onViewCourse,
  onManageCourse,
  title = 'My Courses'
}) => {
  const getStatusColor = (status: ManagedCourse['status']) => {
    switch (status) {
      case 'active':
        return 'bg-turf-green-100 text-turf-green-700';
      case 'archived':
        return 'bg-gray-100 text-gray-600';
      case 'draft':
        return 'bg-royal-gold-100 text-royal-gold-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {onAddCourse && (
          <Button
            onClick={onAddCourse}
            size="sm"
            className="flex items-center gap-1 bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
          >
            <Plus size={16} />
            <span>New Course</span>
          </Button>
        )}
      </div>

      {/* Course List */}
      <div className="divide-y divide-border">
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-tech-blue-500 to-frosted-blue-500 text-white text-sm font-semibold">
                  {course.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {course.name}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(course.status)}`}>
                    {course.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {course.studentCount} students
                  </span>
                  {course.pendingSubmissions > 0 && (
                    <span className="text-xs text-royal-gold-600">
                      {course.pendingSubmissions} pending
                    </span>
                  )}
                  {course.pendingQuestions > 0 && (
                    <span className="text-xs text-frosted-blue-600">
                      {course.pendingQuestions} questions
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewCourse?.(course.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageCourse?.(course.id)}
                className="text-xs"
              >
                Manage
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageCourses;

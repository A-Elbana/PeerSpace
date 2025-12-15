import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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
  onViewCourse?: (courseId: string) => void;
  title?: string;
}

const MyCourses: React.FC<MyCoursesProps> = ({
  courses,
  onViewCourse,
  title = 'My Courses',
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      {/* Course List */}
      <div className="divide-y divide-border">
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onViewCourse?.(course.id)}
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCourses;

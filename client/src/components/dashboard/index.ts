// Dashboard Components Barrel Export
export { default as Sidebar } from './Sidebar';
export { default as Header } from './Header';
export { default as MetricCard } from './MetricCard';
export { default as MyCourses } from './MyCourses';
export { default as TodoList } from './TodoList';
export { default as RecentCourseActivity } from './RecentCourseActivity';

// Instructor-specific components
export { default as ManageCourses } from './ManageCourses';
export { default as PendingSubmissions } from './PendingSubmissions';
export { default as StudentQuestions } from './StudentQuestions';

// Type exports
export type { Course } from './MyCourses';
export type { TodoItem } from './TodoList';
export type { ActivityItem } from './RecentCourseActivity';
export type { ManagedCourse } from './ManageCourses';
export type { Submission } from './PendingSubmissions';
export type { StudentQuestion } from './StudentQuestions';

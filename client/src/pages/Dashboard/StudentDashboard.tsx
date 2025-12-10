import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Bell, TrendingUp } from 'lucide-react';

// Dashboard Components
import {
  Sidebar,
  Header,
  MetricCard,
  MyCourses,
  TodoList,
  RecentCourseActivity,
} from '../../components/dashboard';

// Types
import type { Course } from '../../components/dashboard/MyCourses';
import type { TodoItem } from '../../components/dashboard/TodoList';
import type { ActivityItem } from '../../components/dashboard/RecentCourseActivity';

interface StudentDashboardProps {
  user: {
    id: string;
    email: string;
    fname: string;
    lname: string;
    role: 'student' | 'instructor' | 'admin';
    avatar_url?: string;
  };
  onLogout: () => void;
}

/**
 * Student Dashboard
 * Dashboard view for students showing enrolled courses, assignments, and progress
 */
const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Mock data - Replace with actual API calls
      setCourses([
        {
          id: '1',
          name: 'Computer Science',
          instructor: 'Dr. Smith',
          status: 'enrolled'
        },
        {
          id: '2',
          name: 'Discrete Mathematics',
          instructor: 'Prof. Johnson',
          status: 'in-progress'
        },
        {
          id: '3',
          name: 'Robotics Club',
          instructor: 'Dr. Williams',
          status: 'enrolled'
        }
      ]);

      setTodoItems([
        {
          id: '1',
          title: 'Database Phase 3 Report',
          assignee: { name: 'You' },
          dueDate: '2025-12-11',
          completed: false
        },
        {
          id: '2',
          title: 'Discrete Mathematics HW',
          assignee: { name: 'You' },
          dueDate: '2025-12-15',
          completed: false
        },
        {
          id: '3',
          title: 'React Component Assignment',
          assignee: { name: 'You' },
          dueDate: '2025-12-10',
          completed: true
        }
      ]);

      setActivities([
        {
          id: '1',
          title: 'Intro to Databases',
          type: 'course',
          instructor: { name: 'Dr. Smith' },
          timestamp: 'Block 01/04',
          status: 'active'
        },
        {
          id: '2',
          title: "Data Structures",
          type: 'course',
          instructor: { name: 'Prof. Evans' },
          timestamp: 'Block 04/04',
          status: 'review'
        },
        {
          id: '3',
          title: 'Web Development',
          type: 'course',
          instructor: { name: 'Dr. Williams' },
          timestamp: 'Block 01/02',
          status: 'completed'
        }
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewTask = () => {
    console.log('New task clicked');
  };

  const handleToggleTodo = (itemId: string) => {
    setTodoItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  const completedTodos = todoItems.filter(t => t.completed).length;
  const totalTodos = todoItems.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-frosted-blue-200 border-t-frosted-blue-600 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      <Sidebar onLogout={onLogout} />

      <main className="flex-1 ml-64 p-8">
        <Header
          title="Student Dashboard"
          subtitle={`Welcome back, ${user.fname}!`}
          onNewTask={handleNewTask}
        />

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            icon={Clock}
            iconBgColor="bg-frosted-blue-100"
            title="Next Assignment Due"
            subtitle="Database Phase 3 Report - Due Tomorrow at 11:59 PM"
          />
          <MetricCard
            icon={Bell}
            iconBgColor="bg-frosted-blue-100"
            title="Unread Notifications"
            subtitle="New posts and feedback available for you."
            badge={{ text: '5 new', color: 'bg-turf-green-500 text-white' }}
          />
          <MetricCard
            icon={TrendingUp}
            iconBgColor="bg-frosted-blue-100"
            title={`${completedTodos}/${totalTodos} Todo Progress`}
            subtitle="Track your tasks completion. Stay on top of your assignments."
          />
        </div>

        {/* Recent Course Activity */}
        <div className="mb-8">
          <RecentCourseActivity
            title="Recent Course Activity"
            activities={activities}
            onAddActivity={() => console.log('Add activity')}
            showViewAll
            onViewAll={() => navigate('/courses')}
          />
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MyCourses
            title="My Enrolled Courses"
            courses={courses}
            onAddCourse={() => navigate('/explore')}
            onViewCourse={(id) => navigate(`/course/${id}`)}
            showDiscord
          />
          <TodoList
            title="My Assignments"
            subtitle="Upcoming deadlines"
            items={todoItems}
            onAddItem={() => console.log('Add todo')}
            onToggleItem={handleToggleTodo}
            onViewItem={(id) => console.log('View todo', id)}
          />
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;

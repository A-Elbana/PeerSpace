import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Dashboard Components
import {
  Sidebar,
  Header,
  MetricCard,
  MyCourses,
  TodoList,
  RecentCourseActivity,
} from '../../components/dashboard';

import { communityApi, type CommunityResponse } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

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
    avatar_file_id?: string;
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

  // Private community enrollment state
  const [communityCode, setCommunityCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch communities the student is enrolled in
      const communitiesResponse = await communityApi.getAll({ limit: 50 });

      // Map communities to Course format
      const enrolledCourses: Course[] = communitiesResponse.data.map((community: CommunityResponse) => ({
        id: community.id,
        name: community.name,
        instructor: '', // Will be populated when we have instructor info
        status: 'enrolled' as const,
      }));

      setCourses(enrolledCourses);

      // For now, todos and activities remain empty until those APIs are implemented
      setTodoItems([]);
      setActivities([]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewTask = () => {
    console.log('New task clicked');
  };

  const handleEnrollInPrivateCommunity = async () => {
    if (!communityCode.trim()) {
      toast.error('Please enter a community ID');
      return;
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityCode.trim())) {
      toast.error('Invalid community ID format');
      return;
    }

    setIsEnrolling(true);
    try {
      await communityApi.enroll(communityCode.trim());
      toast.success('Successfully enrolled in community!');
      setCommunityCode('');
      // Refresh the courses list
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Failed to enroll:', error);
      const message = error.response?.data?.message || 'Failed to enroll in community';
      toast.error(message);
    } finally {
      setIsEnrolling(false);
    }
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
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={onLogout} />

      <main className="flex-1 ml-20 p-8 transition-all duration-300">
        <Header
          title="Student Dashboard"
          subtitle={`Welcome back, ${user.fname}!`}
          onNewTask={handleNewTask}
        />

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            icon={Clock}
            iconBgColor="bg-frosted-blue-100"
            title="Next Assignment Due"
            subtitle="Database Phase 3 Report - Due Tomorrow at 11:59 PM"
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
            title="My Enrolled Communities"
            courses={courses}
            onViewCourse={(id) => navigate(`/community/${id}`)}
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

        {/* Join Private Community Section */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Lock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Join Private Community</h3>
              <p className="text-sm text-muted-foreground">Enter the community ID shared by your instructor</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Enter community ID (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
              value={communityCode}
              onChange={(e) => setCommunityCode(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEnrollInPrivateCommunity();
                }
              }}
            />
            <Button
              onClick={handleEnrollInPrivateCommunity}
              disabled={isEnrolling || !communityCode.trim()}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Community'
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;

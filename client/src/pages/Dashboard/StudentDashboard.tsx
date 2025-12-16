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
  RecentCourseActivity,
} from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';

import { communityApi, type CommunityResponse, assignmentApi, submissionApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

// Types
import type { Course } from '../../components/dashboard/MyCourses';
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
  const { sidebarWidth } = useSidebar();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
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
      const communitiesResponse = await communityApi.getMyCommunities({ limit: 50 });

      // Map communities to Course format
      const enrolledCourses: Course[] = communitiesResponse.data.map((community: CommunityResponse) => ({
        id: community.id,
        name: community.name,
        instructor: '', // Will be populated when we have instructor info
        status: 'enrolled' as const,
      }));

      setCourses(enrolledCourses);

      // Fetch assignments for all courses to populate deadlines
      const assignmentPromises = enrolledCourses.map(course =>
        assignmentApi.getByCommunity(course.id, { limit: 50 })
          .then(res => res.data.map((a: any) => ({
            ...a,
            communityName: course.name,
            type: 'assignment'
          })))
          .catch(() => [])
      );

      const allAssignments = (await Promise.all(assignmentPromises)).flat();

      // Fetch student's submissions to determine submission status
      let submittedAssignmentIds = new Set<number>();
      try {
        const mySubmissions = await submissionApi.getMySubmissions({ limit: 100 });
        submittedAssignmentIds = new Set(mySubmissions.data.map(sub => sub.aid));
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      }

      // Add submission status to each assignment
      const assignmentsWithStatus = allAssignments.map((assignment: any) => ({
        ...assignment,
        submitted: submittedAssignmentIds.has(assignment.id)
      }));

      // Load Local Tasks
      const storedTasks = localStorage.getItem('peerspace_personal_tasks')
        ? JSON.parse(localStorage.getItem('peerspace_personal_tasks')!)
        : [];

      // Merge and Sort by Date
      const mergedItems = [...assignmentsWithStatus, ...storedTasks].sort((a: any, b: any) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : (a.dueDate ? new Date(a.dueDate).getTime() : Infinity);
        const dateB = b.due_date ? new Date(b.due_date).getTime() : (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
        return dateA - dateB;
      });

      setUpcomingDeadlines(mergedItems.slice(0, 10)); // Top 10
      setActivities([]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
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
    } catch (error: unknown) {
      console.error('Failed to enroll:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || 'Failed to enroll in community';
      toast.error(message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const nextDue = upcomingDeadlines.find(i => i.type === 'assignment' && (!i.submitted) && (new Date(i.due_date) > new Date()));

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

      <main 
        className="flex-1 p-8 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header
          title="Student Dashboard"
          subtitle={`Welcome back, ${user.fname}!`}
          showNewTaskButton={false}
        />

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            icon={Clock}
            iconBgColor="bg-frosted-blue-100"
            title="Next Assignment Due"
            subtitle={nextDue ? `${nextDue.title} - ${new Date(nextDue.due_date).toLocaleDateString()}` : "No upcoming deadlines"}
            onClick={() => nextDue && navigate(`/community/${nextDue.cid}/assignment/${nextDue.id}`)}
          />
          <MetricCard
            icon={TrendingUp}
            iconBgColor="bg-frosted-blue-100"
            title="My Schedule"
            subtitle="View your full task list and progress"
            onClick={() => navigate('/schedule')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Column: Upcoming Deadlines */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')}>View All</Button>
              </div>
              <div className="divide-y divide-border">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.type === 'assignment') {
                          navigate(`/community/${item.cid}/assignment/${item.id}`);
                        }
                      }}
                    >
                      <div>
                        <h3 className={`font-medium ${item.completed || item.submitted ? 'text-muted-foreground line-through' : 'text-foreground dark:text-gray-100'}`}>
                          {item.title}
                        </h3>
                        <div className="text-xs text-muted-foreground dark:text-gray-400 flex gap-2 mt-1">
                          <span className="text-primary/80 dark:text-primary/100">{item.communityName || 'Personal'}</span>
                          {item.due_date && <span>• Due {new Date(item.due_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      {item.type === 'assignment' && (() => {
                        const now = new Date();
                        const dueDate = item.due_date ? new Date(item.due_date) : null;
                        const isOverdue = dueDate && dueDate < now && !item.submitted;
                        const isSubmitted = item.submitted;

                        let statusClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
                        let statusText = 'Pending';

                        if (isSubmitted) {
                          statusClass = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
                          statusText = 'Submitted';
                        } else if (isOverdue) {
                          statusClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
                          statusText = 'Overdue';
                        }

                        return (
                          <div className={`text-xs px-2 py-1 rounded ${statusClass}`}>
                            {statusText}
                          </div>
                        );
                      })()}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No upcoming tasks!</div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <RecentCourseActivity
              title="Recent Course Activity"
              activities={activities}
              onAddActivity={() => console.log('Add activity')}
              showViewAll
              onViewAll={() => navigate('/courses')}
            />
          </div>

          {/* Side Column: Courses & Join */}
          <div className="space-y-6">
            <MyCourses
              title="My Communities"
              courses={courses}
              onViewCourse={(id) => navigate(`/community/${id}`)}
            />

            {/* Join Private Community Section */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-frosted-blue-500/10 dark:bg-frosted-blue-500/20">
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
                  className="bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;

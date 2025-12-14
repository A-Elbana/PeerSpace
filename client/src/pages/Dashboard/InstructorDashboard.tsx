import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, MessageCircle, Plus } from 'lucide-react';

// Dashboard Components
import {
  Sidebar,
  MetricCard,
  ManageCourses,
  PendingSubmissions,
  StudentQuestions,
  CreateCommunityModal,
} from '../../components/dashboard';
import { Button } from '../../components/ui/button';
import { communityApi, type CommunityResponse } from '../../services/api';

// Types
import type { ManagedCourse } from '../../components/dashboard/ManageCourses';
import type { Submission } from '../../components/dashboard/PendingSubmissions';
import type { StudentQuestion } from '../../components/dashboard/StudentQuestions';
import type { CreateCommunityData } from '../../components/dashboard/CreateCommunityModal';

interface InstructorDashboardProps {
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
 * Instructor Dashboard
 * Dashboard view for instructors showing managed courses, submissions to grade, and student questions
 */
const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);

  // Create Community Modal State
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch communities managed by the instructor
      const communitiesResponse = await communityApi.getAll({ limit: 50 });

      // Map communities to ManagedCourse format
      const managedCourses: ManagedCourse[] = communitiesResponse.data.map((community: CommunityResponse) => ({
        id: community.id,
        name: community.name,
        studentCount: community._count?.Enrollment || 0,
        pendingSubmissions: 0,
        pendingQuestions: 0,
        status: 'active' as const,
      }));

      setCourses(managedCourses);

      // For now, submissions and questions remain empty until those APIs are implemented
      setSubmissions([]);
      setQuestions([]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = () => {
    navigate('/courses/new');
  };

  const handleCreateCommunity = async (data: CreateCommunityData) => {
    setIsCreatingCommunity(true);
    try {
      await communityApi.create(data);
      // Optionally refresh the dashboard data or show success message
      await fetchDashboardData();
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleGradeSubmission = (submissionId: string) => {
    navigate(`/submissions/${submissionId}/grade`);
  };

  const handleAnswerQuestion = (questionId: string) => {
    navigate(`/questions/${questionId}`);
  };

  // Calculate metrics
  const totalStudents = courses.reduce((sum, c) => sum + c.studentCount, 0);
  const totalPendingSubmissions = submissions.filter(s => s.status === 'pending' || s.status === 'late').length;
  const totalUnansweredQuestions = questions.filter(q => !q.isAnswered).length;

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
        {/* Header with Create Community Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Instructor Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, {user.fname}!</p>
          </div>
          <Button
            onClick={() => setIsCreateCommunityOpen(true)}
            className="flex items-center gap-2 bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
          >
            <Plus size={18} />
            <span>Create Community</span>
          </Button>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            icon={Users}
            iconBgColor="bg-tech-blue-100"
            title={`${totalStudents} Total Students`}
            subtitle={`Across ${courses.length} active courses you're teaching.`}
          />
          <MetricCard
            icon={FileText}
            iconBgColor="bg-royal-gold-100"
            title="Pending Submissions"
            subtitle={`${totalPendingSubmissions} submissions waiting to be graded.`}
            badge={totalPendingSubmissions > 0 ? { text: `${totalPendingSubmissions} pending`, color: 'bg-royal-gold-500 text-white' } : undefined}
          />
          <MetricCard
            icon={MessageCircle}
            iconBgColor="bg-frosted-blue-100"
            title="Student Questions"
            subtitle={`${totalUnansweredQuestions} questions need your response.`}
            badge={totalUnansweredQuestions > 0 ? { text: `${totalUnansweredQuestions} new`, color: 'bg-frosted-blue-500 text-white' } : undefined}
          />
        </div>

        {/* Courses Management */}
        <div className="mb-8">
          <ManageCourses
            title="My Communities"
            courses={courses}
            onAddCourse={handleCreateCourse}
            onViewCourse={(id) => navigate(`/community/${id}`)}
            onManageCourse={(id) => navigate(`/community/${id}/manage`)}
          />
        </div>

        {/* Two Columns: Submissions & Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PendingSubmissions
            title="Pending Submissions"
            submissions={submissions}
            onGradeSubmission={handleGradeSubmission}
            showViewAll
            onViewAll={() => navigate('/submissions')}
          />
          <StudentQuestions
            title="Student Questions"
            questions={questions}
            onAnswerQuestion={handleAnswerQuestion}
            showViewAll
            onViewAll={() => navigate('/questions')}
          />
        </div>
      </main>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={isCreateCommunityOpen}
        onClose={() => setIsCreateCommunityOpen(false)}
        onSubmit={handleCreateCommunity}
        isLoading={isCreatingCommunity}
      />
    </div>
  );
};

export default InstructorDashboard;

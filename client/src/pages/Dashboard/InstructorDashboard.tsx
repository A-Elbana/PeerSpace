import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, MessageCircle } from 'lucide-react';

// Dashboard Components
import {
  Sidebar,
  Header,
  MetricCard,
  ManageCourses,
  PendingSubmissions,
  StudentQuestions,
} from '../../components/dashboard';

// Types
import type { ManagedCourse } from '../../components/dashboard/ManageCourses';
import type { Submission } from '../../components/dashboard/PendingSubmissions';
import type { StudentQuestion } from '../../components/dashboard/StudentQuestions';

interface InstructorDashboardProps {
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
          name: 'Introduction to Databases',
          studentCount: 45,
          pendingSubmissions: 12,
          pendingQuestions: 3,
          status: 'active'
        },
        {
          id: '2',
          name: 'Data Structures & Algorithms',
          studentCount: 38,
          pendingSubmissions: 8,
          pendingQuestions: 5,
          status: 'active'
        },
        {
          id: '3',
          name: 'Web Development',
          studentCount: 52,
          pendingSubmissions: 0,
          pendingQuestions: 2,
          status: 'active'
        }
      ]);

      setSubmissions([
        {
          id: '1',
          studentName: 'Ahmed Elbana',
          assignmentTitle: 'Database Phase 3 Report',
          courseName: 'Introduction to Databases',
          submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        },
        {
          id: '2',
          studentName: 'Sarah Chen',
          assignmentTitle: 'Binary Tree Implementation',
          courseName: 'Data Structures & Algorithms',
          submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        },
        {
          id: '3',
          studentName: 'Mike Johnson',
          assignmentTitle: 'SQL Query Optimization',
          courseName: 'Introduction to Databases',
          submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'late'
        },
        {
          id: '4',
          studentName: 'Emily Davis',
          assignmentTitle: 'React Component Design',
          courseName: 'Web Development',
          submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }
      ]);

      setQuestions([
        {
          id: '1',
          studentName: 'John Smith',
          question: 'Can you explain the difference between INNER JOIN and LEFT JOIN with a practical example?',
          courseName: 'Introduction to Databases',
          askedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          isAnswered: false
        },
        {
          id: '2',
          studentName: 'Lisa Wang',
          question: 'How do I implement a balanced BST? The lecture notes are not clear on the rotation part.',
          courseName: 'Data Structures & Algorithms',
          askedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          isAnswered: false
        },
        {
          id: '3',
          studentName: 'Alex Brown',
          question: 'Is it okay to use Redux for state management in our final project?',
          courseName: 'Web Development',
          askedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          priority: 'low',
          isAnswered: false
        }
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = () => {
    navigate('/courses/new');
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
    <div className="flex min-h-screen bg-[#f0f2f5]">
      <Sidebar onLogout={onLogout} />

      <main className="flex-1 ml-64 p-8">
        <Header
          title="Instructor Dashboard"
          subtitle={`Welcome back, ${user.fname}!`}
          showNewTaskButton={false}
        />

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
            title="My Courses"
            courses={courses}
            onAddCourse={handleCreateCourse}
            onViewCourse={(id) => navigate(`/course/${id}`)}
            onManageCourse={(id) => navigate(`/course/${id}/manage`)}
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
    </div>
  );
};

export default InstructorDashboard;

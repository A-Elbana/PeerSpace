import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, MessageCircle, Plus } from 'lucide-react';

// Dashboard Components
import {
  Sidebar,
  MetricCard,
  ManageCourses,
  PendingSubmissions,
  CreateCommunityModal,
} from '../../components/dashboard';
import { Button } from '../../components/ui/button';
import api, { communityApi, assignmentApi, submissionApi, type CommunityResponse } from '../../services/api';

// Types
import type { ManagedCourse } from '../../components/dashboard/ManageCourses';
import type { Submission } from '../../components/dashboard/PendingSubmissions';

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
      const communitiesResponse = await communityApi.getMyCommunities({ limit: 50 });

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

      // Fetch assignments for all communities
      const assignmentPromises = communitiesResponse.data.map(async (community: CommunityResponse) => {
        try {
          const assignmentsResponse = await assignmentApi.getByCommunity(community.id, { limit: 50 });
          return assignmentsResponse.data;
        } catch {
          return [];
        }
      });

      const allAssignments = (await Promise.all(assignmentPromises)).flat();

      // Fetch submissions for each assignment to find ungraded ones
      const submissionPromises = allAssignments.map(async (assignment) => {
        try {
          const submissionsResponse = await submissionApi.getByAssignment(assignment.id, { limit: 100 });
          return submissionsResponse.data
            .filter(sub => sub.grade === null) // Only ungraded submissions
            .map(sub => ({
              id: sub.id.toString(),
              studentName: `${sub.Student.User.fname} ${sub.Student.User.lname}`,
              assignmentTitle: assignment.title,
              courseName: communitiesResponse.data.find(c => c.id === assignment.cid)?.name || 'Unknown',
              submittedAt: sub.subm_date,
              status: 'pending' as const,
            }));
        } catch {
          return [];
        }
      });

      const allPendingSubmissions = (await Promise.all(submissionPromises)).flat();
      setSubmissions(allPendingSubmissions);



    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleCreateCommunity = async (data: CreateCommunityData) => {
    setIsCreatingCommunity(true);
    try {
      // Create community first without banner
      const response = await communityApi.create({
        name: data.name,
        description: data.description,
        type: data.type,
      });

      const communityId = response.data.id;

      // If there's a banner file, upload it with the correct community ID
      if (data.bannerFile) {
        try {
          // Step 1: Get upload signature
          const signResponse = await api.post('/uploads/sign', {
            context: 'COMMUNITY_BANNER',
            context_id: communityId,
            is_private: false,
            resource_type: 'auto',
          });

          const { timestamp, signature, folder, cloudName, apiKey } = signResponse.data;

          // Step 2: Upload to Cloudinary
          const formData = new FormData();
          formData.append('file', data.bannerFile);
          formData.append('timestamp', timestamp.toString());
          formData.append('signature', signature);
          formData.append('api_key', apiKey);
          formData.append('folder', folder);

          const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const cloudinaryData = await uploadResponse.json();

            // Step 3: Save file record in backend
            const fileResponse = await api.post('/files', {
              public_id: cloudinaryData.public_id,
              secure_url: cloudinaryData.secure_url,
              resource_type: cloudinaryData.resource_type,
              format: cloudinaryData.format,
              context: 'COMMUNITY_BANNER',
              context_id: communityId,
              is_private: false,
            });

            const fileRecord = fileResponse.data.data;

            // Step 4: Update community with banner_file_id (store File.id, not URL)
            await communityApi.update(communityId, {
              banner_file_id: fileRecord.id,
            });
          }
        } catch (uploadError) {
          console.error('Failed to upload banner:', uploadError);
          // Community is created, but banner upload failed - non-critical
        }
      }

      // Optionally refresh the dashboard data or show success message
      await fetchDashboardData();
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleGradeSubmission = (submissionId: string) => {
    navigate(`/submission/${submissionId}`);
  };

  const handleAnswerQuestion = (questionId: string) => {
    navigate(`/questions/${questionId}`);
  };

  // Calculate metrics
  const totalStudents = courses.reduce((sum, c) => sum + c.studentCount, 0);
  const totalPendingSubmissions = submissions.filter(s => s.status === 'pending' || s.status === 'late').length;

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
        </div>

        {/* Courses Management */}
        <div className="mb-8">
          <ManageCourses
            title="My Communities"
            courses={courses}
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

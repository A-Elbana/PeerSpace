import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Plus, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Dashboard Components
import {
  Sidebar,
  MetricCard,
  ManageCourses,
  PendingSubmissions,
  CreateCommunityModal,
} from '../../components/dashboard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useSidebar } from '../../contexts/SidebarContext';
import api, { communityApi } from '../../services/api';

// Types
import type { ManagedCourse } from '../../components/dashboard/ManageCourses';
import type { CreateCommunityData } from '../../components/dashboard/CreateCommunityModal';
import { useInstructorDashboard } from '../../hooks/useInstructorDashboard';

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

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  // Use our new parallel data fetching hook
  const {
    stats,
    courses: rawCourses,
    pendingGrading,
    isLoading,
    refresh: refreshDashboard,
    error: dashboardError
  } = useInstructorDashboard();

  // Map communities to ManagedCourse format for UI
  const courses: ManagedCourse[] = rawCourses.map((community: any) => ({
    id: community.id,
    name: community.name,
    studentCount: community._count?.Enrollment || 0,
    pendingSubmissions: 0, // Could be enriched if needed, but keeping basic for now
    pendingQuestions: 0,
    status: 'active' as const,
  }));

  // Map pending grading for UI
  const submissions = pendingGrading.map((sub: any) => ({
    id: sub.id.toString(),
    studentName: `${sub.Student?.User?.fname || 'Student'} ${sub.Student?.User?.lname || ''}`,
    assignmentTitle: sub.Assignment?.title || 'Unknown Assignment',
    courseName: sub.Assignment?.Community?.name || 'Unknown Community',
    submittedAt: sub.subm_date,
    status: 'pending' as const,
  }));

  // Private community enrollment state
  const [communityCode, setCommunityCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Create Community Modal State
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);

  const handleCreateCommunity = async (data: CreateCommunityData) => {
    setIsCreatingCommunity(true);
    try {
      const response = await communityApi.create({
        name: data.name,
        description: data.description,
        type: data.type,
      });

      const communityId = response.data.id;

      if (data.bannerFile) {
        try {
          const signResponse = await api.post('/uploads/sign', {
            context: 'COMMUNITY_BANNER',
            context_id: communityId,
            is_private: false,
            resource_type: 'auto',
          });

          const { timestamp, signature, folder, cloudName, apiKey } = signResponse.data;

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
            await communityApi.update(communityId, {
              banner_file_id: fileRecord.id,
            });
          }
        } catch (uploadError) {
          console.error('Failed to upload banner:', uploadError);
        }
      }

      toast.success('Community created successfully!');
      setIsCreateCommunityOpen(false);
      refreshDashboard();
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleEnrollInPrivateCommunity = async () => {
    if (!communityCode.trim()) {
      toast.error('Please enter a community ID');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; // Corrected slightly
    // Let's use the one from StudentDashboard for consistency
    const strictUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!strictUuidRegex.test(communityCode.trim())) {
      toast.error('Invalid community ID format');
      return;
    }

    setIsEnrolling(true);
    try {
      await communityApi.enroll(communityCode.trim());
      toast.success('Successfully joined community!');
      setCommunityCode('');
      refreshDashboard();
    } catch (error: any) {
      console.error('Failed to join:', error);
      const message = error.response?.data?.message || 'Failed to join community';
      toast.error(message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const totalStudents = stats?.totalStudents || courses.reduce((sum, c) => sum + c.studentCount, 0);
  const totalPendingSubmissions = submissions.length;

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

      <main className="flex-1 p-8 transition-all duration-300" style={{ marginLeft: `${sidebarWidth}px` }}>
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

        {dashboardError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg mb-6">
            {dashboardError}
          </div>
        )}

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

          <Card className="rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-500/5 before:to-transparent before:pointer-events-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 ring-1 ring-purple-500/20">
                  <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Join Community</CardTitle>
                  <CardDescription className="text-xs">Enter private ID</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 relative z-10">
                <Input
                  type="text"
                  placeholder="Enter community ID"
                  value={communityCode}
                  onChange={(e) => setCommunityCode(e.target.value)}
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEnrollInPrivateCommunity();
                    }
                  }}
                />
                <Button
                  onClick={handleEnrollInPrivateCommunity}
                  disabled={isEnrolling || !communityCode.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <ManageCourses
            title="My Communities"
            courses={courses}
            onViewCourse={(id) => navigate(`/community/${id}`)}
            onManageCourse={(id) => navigate(`/community/${id}/manage`)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PendingSubmissions
            title="Pending Submissions"
            submissions={submissions}
            onGradeSubmission={(id) => navigate(`/submission/${id}`)}
            showViewAll
            onViewAll={() => navigate('/submissions')}
          />
        </div>
      </main>

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

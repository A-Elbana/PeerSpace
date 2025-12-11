import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../../components/dashboard';
import { CommunityHeader, PostsList, MembersPanel, CreatePost } from './components';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../../services/api';
import { removeTokens } from '../../utils/auth';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: UserRole;
  avatar_url?: string;
}

interface Member {
  id: number;
  fname: string;
  lname: string;
  avatar_url: string | null;
  role: string;
}

interface CommunityData extends CommunityResponse {
  _count: {
    Enrollment: number;
    Post: number;
  };
}

const Community: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();

  // State
  const [user, setUser] = useState<UserData | null>(null);
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [instructors, setInstructors] = useState<Member[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        const normalizedUser: UserData = {
          ...data,
          role: data.role?.toLowerCase() as UserRole
        };
        setUser(normalizedUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        removeTokens();
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  // Fetch community data
  useEffect(() => {
    const fetchCommunityData = async () => {
      if (!communityId) {
        navigate('/explore');
        return;
      }

      try {
        setIsLoading(true);

        // Fetch community details
        const communityResponse = await communityApi.getById(communityId);
        setCommunity(communityResponse.data);

      } catch (error: any) {
        console.error('Failed to fetch community:', error);
        toast.error(error.response?.data?.message || 'Failed to load community');
        navigate('/explore');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunityData();
  }, [communityId, navigate]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!communityId) return;

      try {
        setIsLoadingPosts(true);
        const postsResponse = await postApi.getByCommunity(communityId, { limit: 50 });

        // Sort by date (newest first)
        const sortedPosts = postsResponse.data.sort(
          (a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime()
        );
        setPosts(sortedPosts);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [communityId]);

  // Fetch members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!communityId) return;

      try {
        setIsLoadingMembers(true);
        const membersResponse = await communityApi.getMembers(communityId, { limit: 100 });

        setInstructors(membersResponse.data.instructors || []);
        setStudents(membersResponse.data.students || []);
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [communityId]);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  const handlePostCreated = (newPost: PostResponse) => {
    setPosts(prev => [newPost, ...prev]);
  };

  // Check if current user is an instructor of this community
  const isInstructorOfCommunity = user?.role === 'instructor' && instructors.some(i => i.id === user?.id);

  // Check if current user is enrolled in this community (student in the students list or is an instructor)
  const isEnrolledInCommunity = students.some(s => s.id === user?.id) || isInstructorOfCommunity;

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Community not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 p-6 ml-20">
        {/* Back Button */}
        <button
          onClick={() => navigate('/explore')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Explore</span>
        </button>

        <div className="max-w-6xl mx-auto">
          {/* Community Header */}
          <CommunityHeader
            name={community.name}
            id={community.id}
            description={community.description}
            type={community.type}
            memberCount={community._count?.Enrollment || 0}
            postCount={community._count?.Post || 0}
            isInstructor={isInstructorOfCommunity}
          />

          {/* Two Column Layout */}
          <div className="flex gap-6">
            {/* Left Column - Create Post & Posts */}
            <div className="flex-1 min-w-0">
              {/* Create Post - Only show if enrolled */}
              {isEnrolledInCommunity && (
                <CreatePost
                  communityId={community.id}
                  userFirstName={user.fname}
                  userId={user.id}
                  userLastName={user.lname}
                  userAvatarUrl={user.avatar_url}
                  onPostCreated={handlePostCreated}
                />
              )}

              {/* Posts List */}
              <PostsList posts={posts} isLoading={isLoadingPosts} />
            </div>

            {/* Right Column - Members Panel */}
            <div className="w-80 flex-shrink-0">
              <MembersPanel
                instructors={instructors}
                students={students}
                currentUserId={user.id}
                isLoading={isLoadingMembers}
                isCurrentUserInstructor={user.role === 'instructor'}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Community;

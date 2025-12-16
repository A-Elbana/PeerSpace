import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Plus, PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Sidebar } from '../../components/dashboard';
import { CommunityHeader, PostsList, MembersPanel } from './components';
import CreatePostWidget from '../../components/posts/CreatePostWidget';
import { AssignmentList, AssignmentModal } from '../../components/assignments';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../../services/api';
import { removeTokens } from '../../utils/auth';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: UserRole;
  avatar_file_id?: string;
}

interface Member {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
  role: string;
}

interface CommunityData extends CommunityResponse {
  _count: {
    Enrollment: number;
    Post: number;
  };
}

import { ChevronRight, Home } from 'lucide-react';
import { PostModal } from '../../components/posts';
import { Link } from 'react-router-dom';

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
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);

  // Post Edit State is handled inside PostCard modal
  // Post view modal (open post in modal like Explore)
  const [viewingPost, setViewingPost] = useState<PostResponse | undefined>(undefined);
  const [showViewModal, setShowViewModal] = useState(false);

  // Delete Confirmation State
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = community ? `PeerSpace - ${community.name}` : 'PeerSpace - Community';
  }, [community]);

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

      } catch (error: unknown) {
        console.error('Failed to fetch community:', error);
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || 'Failed to load community');
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
    // Ensure created post contains a `User` object (some APIs return a minimal post without nested User)
    const normalized = {
      ...newPost,
      User: newPost.User ?? {
        id: user!.id,
        fname: user!.fname,
        lname: user!.lname,
        avatar_file_id: user!.avatar_file_id ?? null,
      },
      _count: newPost._count ?? { Comment: 0 },
    } as PostResponse;
    setPosts(prev => [normalized, ...prev]);
  };

  const handleDeletePost = (postId: number) => {
    setDeletePostId(postId);
    setShowDeleteModal(true);
  };

  const confirmDeletePost = async () => {
    if (!deletePostId) return;

    setIsDeleting(true);
    try {
      await postApi.delete(deletePostId);
      setPosts(prev => prev.filter(p => p.id !== deletePostId));
      toast.success("Post deleted");
      setShowDeleteModal(false);
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
      setDeletePostId(null);
    }
  };

  // PostCard handles edit modal itself; if needed we can listen to callbacks from PostCard in future


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

  const handleEnroll = async () => {
    if (!communityId) return;
    try {
      await communityApi.enroll(communityId);
      toast.success('Successfully joined community!');
      // Reload to refresh state (simple approach) or update local state
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join community');
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 p-6 ml-20 transition-all duration-300 flex justify-center">
        {/* Layout matched to Explore */}
        <div className="max-w-5xl w-full">
          {/* Breadcrumb Navigation */}
          <div className="mb-6 flex items-center text-sm text-muted-foreground">
            <Link to="/dashboard" className="flex items-center hover:text-foreground transition-colors">
              <Home className="w-4 h-4 mr-1" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link to="/explore" className="hover:text-foreground transition-colors">
              Explore
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {community.name}
            </span>
          </div>
          {/* Community Header */}
          <CommunityHeader
            name={community.name}
            id={community.id}
            description={community.description}
            type={community.type}
            memberCount={community._count?.Enrollment || 0}
            postCount={community._count?.Post || 0}
            bannerUrl={community.banner_url ?? community.banner_file_id}
            isInstructor={isInstructorOfCommunity}
            isEnrolled={isEnrolledInCommunity}
            onEnroll={handleEnroll}
          />

          {/* Two Column Layout */}
          <div className="flex gap-6">
            {/* Left Column - Create Post & Posts */}
            <div className="flex-1 min-w-0">
              {/* Assignments Section (Top of Feed) */}
              {/* Create Post - Only show if enrolled */}
              {isEnrolledInCommunity && (
                <CreatePostWidget
                  currentUser={user as any}
                  defaultCommunityId={community.id}
                  onCreated={handlePostCreated}
                />
              )}

              {/* Posts List */}
              <PostsList
                posts={posts}
                isLoading={isLoadingPosts}
                currentUser={user}
                isInstructorOfCommunity={isInstructorOfCommunity}
                onDeletePost={handleDeletePost}
                onViewPost={(p) => {
                  const normalized = {
                    ...p,
                    owner_uid: (p as any).owner_uid ?? (p as any).owner_uid ?? (p as any).User?.id ?? 0,
                  } as PostResponse;
                  setViewingPost(normalized);
                  setShowViewModal(true);
                }}
              />
            </div>

            {/* Right Column - Members Panel */}
            <div className="w-80 flex-shrink-0">
              {/* Instructor Actions Sidebar Widget */}
              {isInstructorOfCommunity && (
                <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-foreground">
                    <PenSquare className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">Instructor Actions</h3>
                  </div>
                  <Button
                    onClick={() => setShowCreateAssignmentModal(true)}
                    className="w-full bg-tech-blue-500 hover:bg-tech-blue-600 gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create Assignment
                  </Button>
                </div>
              )}

              {/* Assignments Widget */}
              <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M12 13v6" /><path d="M9 16l3 3 3-3" /></svg>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">Assignments</h3>
                  </div>
                </div>

                <AssignmentList
                  communityId={community.id}
                  communityName={community.name}
                  showCreateButton={false}
                  variant="compact"
                  showMoreButton={true}
                  showAllLink={false}
                  onAssignmentClick={(assignment) => navigate(`/community/${community.id}/assignment/${assignment.id}`)}
                />
              </div>

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

      {/* Create Assignment Modal */}
      <AssignmentModal
        isOpen={showCreateAssignmentModal}
        onClose={() => setShowCreateAssignmentModal(false)}
        communityId={community.id}
        onSuccess={() => {
          // Could trigger a refresh of assignments here
          toast.success('Assignment created successfully!');
          // For now we might need to rely on the user refreshing or the component re-fetching on mount/update
          // In a real app we'd trigger a refetch in AssignmentList via a context or lifted state
          // But AssignmentList fetches on mount/prop change, so maybe we can force it?
          // Since AssignmentList uses local state, it won't auto-update unless we unmount/remount it or pass a refresh trigger.
          // For this step, we'll just close the modal.
          window.location.reload(); // Refresh to show new assignment
        }}
      />

      {/* Post view modal (open when clicking a post in community list) */}
      <PostModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewingPost(undefined); }}
        post={viewingPost}
        onSuccess={(updated: PostResponse) => {
          setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
          setShowViewModal(false);
          setViewingPost(undefined);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Community;

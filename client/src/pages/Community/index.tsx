import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Plus, PenSquare, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Sidebar } from '../../components/dashboard';
import { CommunityHeader, MembersPanel } from './components';
import CreatePostWidget from '../../components/posts/CreatePostWidget';
import PostCard from '../../components/posts/PostCard';
import { AssignmentList, AssignmentModal } from '../../components/assignments';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../../services/api';
import { removeTokens } from '../../utils/auth';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { ChevronRight, Home } from 'lucide-react';
import { PostModal } from '../../components/posts';
import { Link } from 'react-router-dom';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: UserRole;
  avatar_file_id?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isEnrolledInCommunity, setIsEnrolledInCommunity] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);

  // Post Edit State is handled inside PostCard modal
  // Post view modal (open post in modal like Explore)
  const [viewingPost, setViewingPost] = useState<PostResponse | undefined>(undefined);
  const [showViewModal, setShowViewModal] = useState(false);

  // Delete Confirmation State
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs for scroll handling
  const postsScrollListenerAttached = useRef(false);
  const postsDebounceRef = useRef<number | null>(null);
  const postsScrollListenerRef = useRef<(() => void) | null>(null);
  const postsScrollThreshold = 300; // px from bottom

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

        // Some APIs return membership status; default to true if unknown so existing behavior is preserved
        const membershipFlag = (communityResponse.data as any).isEnrolled ?? (communityResponse.data as any).is_member ?? true;
        setIsEnrolledInCommunity(Boolean(membershipFlag));

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

  // Fetch initial posts (page 1)
  useEffect(() => {
    const fetchPosts = async () => {
      if (!communityId) return;

      try {
        setIsLoadingPosts(true);
        setPosts([]);
        setPostsPage(1);
        setHasMorePosts(true);
        
        const postsResponse = await postApi.getByCommunity(communityId, { page: 1, limit: 5 });
        
        const fetchedPosts = postsResponse.data || [];
        setPosts(fetchedPosts);
        setHasMorePosts(postsResponse.meta ? postsResponse.meta.page < postsResponse.meta.totalPages : fetchedPosts.length === 5);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [communityId]);

  // Load more posts (pagination)
  const loadMorePosts = useCallback(async () => {
    if (!communityId || loadingMorePosts || !hasMorePosts) return;

    try {
      setLoadingMorePosts(true);
      const nextPage = postsPage + 1;
      const postsResponse = await postApi.getByCommunity(communityId, { page: nextPage, limit: 5 });
      
      const fetchedPosts = postsResponse.data || [];
      if (fetchedPosts.length > 0) {
        setPosts(prev => {
          const existing = new Set(prev.map(p => p.id));
          const filtered = fetchedPosts.filter(p => !existing.has(p.id));
          return [...prev, ...filtered];
        });
        setPostsPage(nextPage);
        setHasMorePosts(postsResponse.meta ? postsResponse.meta.page < postsResponse.meta.totalPages : fetchedPosts.length === 5);
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [communityId, postsPage, hasMorePosts, loadingMorePosts]);

  // Window scroll handler for infinite scroll
  const handleWindowPostsScroll = useCallback(() => {
    if (loadingMorePosts || !hasMorePosts) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - postsScrollThreshold) {
      loadMorePosts();
    }
  }, [loadMorePosts, hasMorePosts, loadingMorePosts]);

  const debouncedHandleWindowPostsScroll = useCallback(() => {
    if (postsDebounceRef.current) window.clearTimeout(postsDebounceRef.current);
    postsDebounceRef.current = window.setTimeout(() => {
      handleWindowPostsScroll();
    }, 200);
  }, [handleWindowPostsScroll]);

  // Attach/detach scroll listener
  useEffect(() => {
    if (!postsScrollListenerAttached.current) {
      postsScrollListenerRef.current = debouncedHandleWindowPostsScroll;
      window.addEventListener('scroll', debouncedHandleWindowPostsScroll);
      postsScrollListenerAttached.current = true;
    }

    return () => {
      if (postsScrollListenerAttached.current) {
        const fn = postsScrollListenerRef.current;
        if (fn) window.removeEventListener('scroll', fn as EventListener);
        postsScrollListenerAttached.current = false;
      }
      if (postsDebounceRef.current) {
        window.clearTimeout(postsDebounceRef.current);
        postsDebounceRef.current = null;
      }
    };
  }, [debouncedHandleWindowPostsScroll]);

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

  // Check if current user is an instructor (simplified - actual check happens on server)
  const isInstructorOfCommunity = user?.role === 'instructor';

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
      setIsEnrolledInCommunity(true);
      setCommunity(prev =>
        prev
          ? {
              ...prev,
              _count: {
                ...prev._count,
                Enrollment: (prev._count?.Enrollment ?? 0) + 1,
                Post: prev._count?.Post ?? 0,
              },
            }
          : prev
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join community');
    }
  };

  const handleLeave = async () => {
    if (!communityId) return;
    try {
      await communityApi.leave(communityId);
      toast.success('You left this community');
      setIsEnrolledInCommunity(false);
      setCommunity(prev =>
        prev
          ? {
              ...prev,
              _count: {
                ...prev._count,
                Enrollment: Math.max(0, (prev._count?.Enrollment ?? 0) - 1),
                Post: prev._count?.Post ?? 0,
              },
            }
          : prev
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to leave community');
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
            <span className="text-foreground font-medium truncate max-w-50">
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
            onLeave={handleLeave}
            userRole={user?.role}
          />

          {/* Two Column Layout */}
          <div className="flex gap-6">
            {/* Left Column - Create Post & Posts */}
            <div className="flex-1 min-w-0">
              {/* Create Post - Only show if enrolled */}
              {isEnrolledInCommunity && (
                <CreatePostWidget
                  currentUser={user as any}
                  defaultCommunityId={community.id}
                  onCreated={handlePostCreated}
                />
              )}

              {/* Posts List with Lazy Loading */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">Posts</h2>
                
                {isLoadingPosts ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-background border border-border rounded-lg p-4 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-muted" />
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-3 w-16 bg-muted rounded" />
                          </div>
                        </div>
                        <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                        <div className="h-4 w-full bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="bg-background border border-border rounded-lg p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No posts yet in this community</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-4">
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post as any}
                          currentUser={user ? { id: user.id, role: user.role } : null}
                          communityName={community.name}
                          onDelete={handleDeletePost}
                        />
                      ))}
                    </div>

                    {/* Loading more indicator */}
                    <div className="flex items-center justify-center py-6">
                      {loadingMorePosts ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading more posts...</span>
                        </div>
                      ) : !hasMorePosts ? (
                        <div className="text-xs text-muted-foreground">No more posts</div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Members Panel */}
            <div className="w-80 shrink-0">
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
                communityId={community.id}
                currentUserId={user.id}
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
          toast.success('Assignment created successfully!');
          window.location.reload();
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

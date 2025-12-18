import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import api, { communityApi, postApi, type PostResponse } from '../../services/api';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { Loader2, Activity } from 'lucide-react';
import PostCard from '../../components/posts/PostCard';
import CommunityList from '../../components/profile/CommunityList';
import UserProfileHeader from '../../components/profile/UserProfileHeader';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  avatar_file_id?: string;
  activated: boolean;
}

interface MyProfileProps {
  onLogout?: () => void;
}

const MyProfile: React.FC<MyProfileProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [viewedUser, setViewedUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<PostResponse[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const viewedAvatarUrl = useResolvedFileUrl(viewedUser?.avatar_file_id);
  const userId = new URLSearchParams(window.location.search).get('userId');

  const internalLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  const handleLogout = onLogout ?? internalLogout;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
        if (userId) {
          const userResponse = await api.get(`/users/${userId}`);
          setViewedUser(userResponse.data);
        } else {
          setViewedUser(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch user profile', err);
        setError('Failed to fetch user profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  // Load posts when the authenticated user is known
  useEffect(() => {
    const fetchPosts = async () => {
      if (!user) return;
      try {
        setPostsLoading(true);
        setPostsPage(1);
        const resp = await postApi.getMyPosts({ page: 1, limit: 4 });
        const posts = resp?.data ?? [];
        setMyPosts(posts as PostResponse[]);
        setHasMorePosts((resp?.meta?.page ?? 1) < (resp?.meta?.totalPages ?? 1));
      } catch (err) {
        console.error('Failed to fetch my posts:', err);
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [user]);


  const loadMorePosts = useCallback(async (): Promise<void> => {
    if (!hasMorePosts || loadingMorePosts) return;
    try {
      setLoadingMorePosts(true);
      const nextPage = postsPage + 1;
      const resp = await postApi.getMyPosts({ page: nextPage, limit: 4 });
      const posts = resp?.data ?? [];
      if (posts.length > 0) {
        setMyPosts(prev => [...prev, ...posts]);
        setPostsPage(nextPage);
        setHasMorePosts((resp?.meta?.page ?? 1) < (resp?.meta?.totalPages ?? 1));
      } else {
        setHasMorePosts(false);
      }
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [hasMorePosts, loadingMorePosts, postsPage]);


  // Window scroll lazy-load for posts (debounced) — copied from ProfileView
  const postsScrollListenerAttached = useRef(false);
  const postsDebounceRef = useRef<number | null>(null);
  const postsScrollThreshold = 300;

  const handleWindowPostsScroll = useCallback(() => {
    if (loadingMorePosts || !hasMorePosts) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - postsScrollThreshold) {
      void loadMorePosts();
    }
  }, [loadingMorePosts, hasMorePosts, loadMorePosts, postsPage]);

  const debouncedHandleWindowPostsScroll = useCallback(() => {
    if (postsDebounceRef.current) window.clearTimeout(postsDebounceRef.current);
    postsDebounceRef.current = window.setTimeout(() => {
      handleWindowPostsScroll();
    }, 500);
  }, [handleWindowPostsScroll]);

  useEffect(() => {
    if (!user) return;
    if (!postsScrollListenerAttached.current) {
      window.addEventListener('scroll', debouncedHandleWindowPostsScroll);
      postsScrollListenerAttached.current = true;
    }
    return () => {
      if (postsScrollListenerAttached.current) {
        window.removeEventListener('scroll', debouncedHandleWindowPostsScroll);
        postsScrollListenerAttached.current = false;
      }
      if (postsDebounceRef.current) {
        window.clearTimeout(postsDebounceRef.current);
        postsDebounceRef.current = null;
      }
    };
  }, [user, debouncedHandleWindowPostsScroll]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground font-sans">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 ml-20 p-6 transition-all duration-300 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading profile...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen bg-background text-foreground font-sans">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 ml-20 p-6 transition-all duration-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">{error || 'User not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 ml-20 transition-all duration-300">
        {/* Container with max-width for better readability */}
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          {/* Profile Header */}
          <UserProfileHeader viewedUser={viewedUser} viewedAvatarUrl={viewedAvatarUrl} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Activity Feed (Takes 2/3 on large screens) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-2 pb-2">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
              </div>

              {/* Posts Content */}
              <div className="space-y-4">
                {postsLoading && myPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card rounded-xl border border-border">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading posts...</span>
                  </div>
                ) : myPosts.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border p-8">
                    <div className="flex flex-col items-center justify-center text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Activity className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">No activity yet</h3>
                        <p className="text-sm text-muted-foreground">Your recent posts will appear here</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {myPosts.map(p => (
                        <PostCard
                          key={p.id}
                          post={p as any}
                          currentUser={user ? { id: user.id, role: user.role } : null}
                        />
                      ))}
                    </div>

                    {/* Load More Indicator */}
                    <div className="flex items-center justify-center py-4">
                      {loadingMorePosts ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading more posts...</span>
                        </div>
                      ) : !hasMorePosts ? (
                        <div className="text-xs text-muted-foreground">• You're all caught up •</div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Communities Sidebar (Takes 1/3 on large screens) */}
            <div className="lg:col-span-1">
              <CommunityList
                title="My Communities"
                pageSize={7}
                containerHeight={600}
                fetcher={(p, limit) => communityApi.getMyCommunities({ page: p, limit })}
                onCommunityClick={(id) => navigate(`/community/${id}`)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyProfile;

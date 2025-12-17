import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../../services/api';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { Loader2 } from 'lucide-react';
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
      <main className="flex-1 ml-20 p-6 transition-all duration-300">
        <div className="w-full max-w-none">
          <UserProfileHeader viewedUser={viewedUser} viewedAvatarUrl={viewedAvatarUrl} />

          <div className="flex gap-6 mt-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3">Recent activity</h3>
              <div className="space-y-4">
                {postsLoading && myPosts.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading posts...</span>
                  </div>
                ) : myPosts.length === 0 ? (
                  <div className="bg-muted/50 rounded-xl border border-border p-6 flex items-center gap-4">
                    <span className="text-xl text-muted-foreground">No posts to show.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myPosts.map(p => (
                      <PostCard
                        key={p.id}
                        post={p as any}
                        currentUser={user ? { id: user.id, role: user.role } : null}
                      />
                    ))}

                    <div className="flex items-center justify-center">
                      {loadingMorePosts ? (
                        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                      ) : !hasMorePosts ? (
                        <div className="text-xs text-muted-foreground">No more posts</div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-80">
              <CommunityList
                title="My Communities"
                pageSize={7}
                containerHeight={360}
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

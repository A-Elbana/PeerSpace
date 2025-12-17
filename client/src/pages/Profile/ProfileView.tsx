import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import api, { communityApi, postApi, type PostResponse } from '../../services/api';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { Loader2, ArrowRight } from 'lucide-react';
import PostCard from '../../components/posts/PostCard';
import UserProfileHeader from '../../components/profile/UserProfileHeader';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  avatar_file_id?: string;
  activated: boolean;
  // instructor specific
  google_scholar?: string;
  expertise?: string;
  title?: string;
}

interface ProfileProps {
  onLogout: () => void;
}
import CommunityList from '../../components/profile/CommunityList';

const ProfileView: React.FC<ProfileProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const [user, setUser] = useState<UserData | null>(null); // viewer (logged in)
  const [viewedUser, setViewedUser] = useState<UserData | null>(null); // profile being viewed
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [mutualPosts, setMutualPosts] = useState<PostResponse[]>([]);
  const [mutualPostsPage, setMutualPostsPage] = useState(1);
  const [hasMoreMutualPosts, setHasMoreMutualPosts] = useState(true);
  const [loadingMoreMutualPosts, setLoadingMoreMutualPosts] = useState(false);
  const [mutualCommunityIds, setMutualCommunityIds] = useState<string[]>([]);

  const viewedAvatarUrl = useResolvedFileUrl(viewedUser?.avatar_file_id);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get('/auth/me');
        setUser(response.data);
        // if a userId param is provided, try to fetch that user's public profile
        if (userId) {
          try {
            const vres = await api.get(`/users/${userId}`);
            setViewedUser(vres.data);
          } catch (err) {
            // fallback: if fetching other user fails, show friendly message but continue
            console.warn('Failed to fetch viewed user:', err);
            setViewedUser(null);
          }
        } else {
          // viewing self
          setViewedUser(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // If the viewed profile is the current user, redirect to canonical /profile route
  useEffect(() => {
    if (viewedUser && user && viewedUser.id === user.id) {
      navigate('/profile');
    }
  }, [viewedUser, user, navigate]);



  // Fetch and cache all mutual community IDs once, then fetch posts by those IDs.
  const fetchAllMutualCommunityIds = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];
    try {
      const uid = Number(userId);
      // large limit to try to fetch all mutual communities at once
      const resp = await communityApi.getCommonCommunities(uid, { page: 1, limit: 1000 });
      const items = resp?.data ?? [];
      const ids = items.map(c => c.id);
      setMutualCommunityIds(ids);
      return ids;
    } catch (err) {
      console.error('Failed to fetch mutual community ids:', err);
      setMutualCommunityIds([]);
      return [];
    }
  }, [userId]);

  const fetchMutualPosts = useCallback(async (page = 1, limit = 4) => {
    if (!userId) return;
    try {
      setLoadingMoreMutualPosts(true);
      // ensure we have community ids cached
      let cids: string[] = mutualCommunityIds.length > 0 ? mutualCommunityIds : [];
      if (!cids || cids.length === 0) {
        const fetched = await fetchAllMutualCommunityIds();
        cids = fetched;
      }
      if (cids.length === 0) {
        if (page === 1) setMutualPosts([]);
        setHasMoreMutualPosts(false);
        return;
      }
      // fetch recent posts across these community ids
      const postsResp = await postApi.getByCommunities(cids, { page, limit });
      const posts = postsResp?.data ?? [];
      if (page === 1) setMutualPosts(posts);
      else setMutualPosts(prev => {
        const existing = new Set(prev.map(p => p.id));
        const filtered = posts.filter(p => !existing.has(p.id));
        return [...prev, ...filtered];
      });
      setHasMoreMutualPosts(postsResp?.meta ? postsResp.meta.page < postsResp.meta.totalPages : posts.length === limit);
      setMutualPostsPage(page);
    } catch (err) {
      console.error('Failed to fetch mutual posts:', err);
    } finally {
      setLoadingMoreMutualPosts(false);
    }
  }, [userId, mutualCommunityIds, fetchAllMutualCommunityIds]);

  // Refs for scroll handling
  const mutualPostsScrollListenerAttached = useRef(false);
  const mutualCommunitiesDebounceRef = useRef<number | null>(null);
  const mutualPostsDebounceRef = useRef<number | null>(null);
  const mutualPostsScrollListenerRef = useRef<() => void | null>(null);
  const mutualPostsScrollThreshold = 300; // px from bottom

  const handleWindowPostsScroll = useCallback(() => {
    if (loadingMoreMutualPosts || !hasMoreMutualPosts) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - mutualPostsScrollThreshold) {
      fetchMutualPosts(mutualPostsPage + 1);
    }
  }, [fetchMutualPosts, mutualPostsPage, hasMoreMutualPosts, loadingMoreMutualPosts]);

  const debouncedHandleWindowPostsScroll = useCallback(() => {
    if (mutualPostsDebounceRef.current) window.clearTimeout(mutualPostsDebounceRef.current);
    mutualPostsDebounceRef.current = window.setTimeout(() => {
      handleWindowPostsScroll();
    }, 500);
  }, [handleWindowPostsScroll]);

  useEffect(() => {
    if (!userId) return;
    // attach window scroll listener for mutual posts once
    if (!mutualPostsScrollListenerAttached.current) {
      mutualPostsScrollListenerRef.current = debouncedHandleWindowPostsScroll;
      window.addEventListener('scroll', debouncedHandleWindowPostsScroll);
      mutualPostsScrollListenerAttached.current = true;
    }
    return () => {
      if (mutualPostsScrollListenerAttached.current) {
        const fn = mutualPostsScrollListenerRef.current;
        if (fn) window.removeEventListener('scroll', fn as EventListener);
        mutualPostsScrollListenerAttached.current = false;
      }
      // clear any pending timers
      if (mutualCommunitiesDebounceRef.current) {
        window.clearTimeout(mutualCommunitiesDebounceRef.current);
        mutualCommunitiesDebounceRef.current = null;
      }
      if (mutualPostsDebounceRef.current) {
        window.clearTimeout(mutualPostsDebounceRef.current);
        mutualPostsDebounceRef.current = null;
      }
    };
  }, [userId, handleWindowPostsScroll]);

  // When viewing another user, immediately load the first page of mutual communities and posts.
  useEffect(() => {
    if (!userId) return;

    setMutualPosts([]);
    setMutualPostsPage(1);
    setHasMoreMutualPosts(true);
    // fetch initial pages
    fetchMutualPosts(1, 4);
  }, [userId, fetchMutualPosts]);



  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground font-sans">
        <Sidebar onLogout={onLogout} />
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
        <Sidebar onLogout={onLogout} />
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
      <Sidebar onLogout={onLogout} />

      {/* Main Content Area */}
      <main className="flex-1 ml-20 p-6 transition-all duration-300">
        <div className="w-full max-w-none">
          {/* Header / Profile Card */}
          <div className="flex items-start gap-6 mb-6">
            <div className="flex-1">
              <UserProfileHeader viewedUser={viewedUser} viewedAvatarUrl={viewedAvatarUrl} />

              {/* Viewing another user: show mutual recent activity and mutual communities (lazy placeholders) */}
              {viewedUser && user && viewedUser.id !== user.id && (
                <div className="flex gap-6">
                  <div className="flex-1 mb-6">
                    <h3 className="text-lg font-semibold mb-3">Recent activity in mutual communities</h3>
                    <div className="space-y-3">
                      {mutualPosts.length === 0 && !loadingMoreMutualPosts ? (
                        <div className="text-sm text-muted-foreground">No mutual activity yet.</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {mutualPosts.map(p => (
                            <PostCard
                              key={p.id}
                              post={p as any}
                              currentUser={user ? { id: user.id, role: user.role } : null}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-center py-3">
                        {loadingMoreMutualPosts ? (
                          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                        ) : !hasMoreMutualPosts ? (
                          <div className="text-xs text-muted-foreground">No more activity</div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="w-80 mb-6">
                    <CommunityList
                      title="Mutual communities"
                      pageSize={7}
                      containerHeight={360}
                      fetcher={(p, limit) => communityApi.getCommonCommunities(Number(userId), { page: p, limit })}
                      onCommunityClick={(id) => navigate(`/community/${id}`)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileView;

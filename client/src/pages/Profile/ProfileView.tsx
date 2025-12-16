import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../../services/api';
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

interface CommunityCardProps {
  community: CommunityResponse;
  onClick: () => void;
}
import CommunityCard from '../../components/common/CommunityCard';

const ProfileView: React.FC<ProfileProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const [user, setUser] = useState<UserData | null>(null); // viewer (logged in)
  const [viewedUser, setViewedUser] = useState<UserData | null>(null); // profile being viewed
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [communities, setCommunities] = useState<CommunityResponse[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesPage, setCommunitiesPage] = useState(1);
  const [hasMoreCommunities, setHasMoreCommunities] = useState(true);
  const [loadingMoreCommunities, setLoadingMoreCommunities] = useState(false);
  // Posts (my posts)
  const [myPosts, setMyPosts] = useState<PostResponse[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  // mutual (when viewing another user)
  const [mutualCommunities, setMutualCommunities] = useState<CommunityResponse[]>([]);
  const [mutualCommunitiesPage, setMutualCommunitiesPage] = useState(1);
  const [hasMoreMutualCommunities, setHasMoreMutualCommunities] = useState(true);
  const [loadingMoreMutualCommunities, setLoadingMoreMutualCommunities] = useState(false);

  const [mutualPosts, setMutualPosts] = useState<PostResponse[]>([]);
  const [mutualPostsPage, setMutualPostsPage] = useState(1);
  const [hasMoreMutualPosts, setHasMoreMutualPosts] = useState(true);
  const [loadingMoreMutualPosts, setLoadingMoreMutualPosts] = useState(false);
  const [mutualCommunityIds, setMutualCommunityIds] = useState<string[]>([]);

  const avatarUrl = useResolvedFileUrl(user?.avatar_file_id);
  const viewedAvatarUrl = useResolvedFileUrl(viewedUser?.avatar_file_id);

  const tabs = [
    'Overview',
    'Posts',
    'Community',
  ];

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

  useEffect(() => {
    const fetchCommunities = async () => {
      // If viewing self, fetch My Communities & Posts like before
      if (!viewedUser) return;

      if (!userId && activeTab === 'Community' && user) {
        try {
          setCommunitiesLoading(true);
          setCommunitiesPage(1);
          setCommunities([]);
          setHasMoreCommunities(true);
          const response = await communityApi.getMyCommunities({ page: 1, limit: 9 });
          setCommunities(response.data);
          setHasMoreCommunities(response.data.length === 9);
        } catch (err) {
          console.error('Failed to fetch communities:', err);
        } finally {
          setCommunitiesLoading(false);
        }
      } else if (activeTab !== 'Community') {
        // Reset communities state when leaving the tab
        setCommunities([]);
        setCommunitiesPage(1);
        setHasMoreCommunities(true);
        setLoadingMoreCommunities(false);
      }

      // Fetch user's posts when Posts tab active (only for self for now)
      if (!userId && activeTab === 'Posts' && user) {
        try {
          setPostsLoading(true);
          setPostsPage(1);
          setMyPosts([]);
          setHasMorePosts(true);
          const resp = await postApi.getMyPosts({ page: 1, limit: 9 });
          const posts = resp?.data ?? [];
          setMyPosts(posts as PostResponse[]);
          setHasMorePosts((resp?.meta?.page ?? 1) < (resp?.meta?.totalPages ?? 1));
        } catch (err) {
          console.error('Failed to fetch my posts:', err);
        } finally {
          setPostsLoading(false);
        }
      } else if (activeTab !== 'Posts') {
        // Reset posts when leaving tab
        setMyPosts([]);
        setPostsPage(1);
        setHasMorePosts(true);
        setLoadingMorePosts(false);
      }
    };

    fetchCommunities();
  }, [activeTab, user, viewedUser, userId]);

  // Fetch mutual communities (paginated) when viewing another user
  const fetchMutualCommunities = useCallback(async (page = 1, limit = 4) => {
    if (!userId) return;
    try {
      setLoadingMoreMutualCommunities(true);
      const uid = Number(userId);
      const resp = await communityApi.getCommonCommunities(uid, { page, limit });
      const items = resp?.data ?? [];
      if (page === 1) setMutualCommunities(items);
      else setMutualCommunities(prev => [...prev, ...items]);
      setHasMoreMutualCommunities(resp?.meta ? resp.meta.page < resp.meta.totalPages : items.length === limit);
      setMutualCommunitiesPage(page);
    } catch (err) {
      console.error('Failed to fetch mutual communities:', err);
    } finally {
      setLoadingMoreMutualCommunities(false);
    }
  }, [userId]);

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
  const mutualCommunitiesScrollRef = useRef<HTMLDivElement | null>(null);
  const mutualPostsScrollListenerAttached = useRef(false);
  const mutualCommunitiesDebounceRef = useRef<number | null>(null);
  const mutualPostsDebounceRef = useRef<number | null>(null);
  const mutualPostsScrollListenerRef = useRef<() => void | null>(null);
  const mutualPostsScrollThreshold = 300; // px from bottom

  // Use scroll handlers instead of IntersectionObserver to simplify lazy-loading
  const handleCommunitiesScroll = useCallback(() => {
    const el = mutualCommunitiesScrollRef.current;
    if (!el || loadingMoreMutualCommunities || !hasMoreMutualCommunities) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      fetchMutualCommunities(mutualCommunitiesPage + 1);
    }
  }, [fetchMutualCommunities, mutualCommunitiesPage, hasMoreMutualCommunities, loadingMoreMutualCommunities]);

  const debouncedHandleCommunitiesScroll = useCallback(() => {
    if (mutualCommunitiesDebounceRef.current) window.clearTimeout(mutualCommunitiesDebounceRef.current);
    mutualCommunitiesDebounceRef.current = window.setTimeout(() => {
      handleCommunitiesScroll();
    }, 500);
  }, [handleCommunitiesScroll]);

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
    // reset mutual state and load page 1
    setMutualCommunities([]);
    setMutualCommunitiesPage(1);
    setHasMoreMutualCommunities(true);
    setMutualPosts([]);
    setMutualPostsPage(1);
    setHasMoreMutualPosts(true);
    // fetch initial pages
    fetchMutualCommunities(1);
    fetchMutualPosts(1, 4);
  }, [userId, fetchMutualCommunities, fetchMutualPosts]);

  const loadMoreCommunities = useCallback(async () => {
    if (!hasMoreCommunities || loadingMoreCommunities) return;

    try {
      setLoadingMoreCommunities(true);
      const nextPage = communitiesPage + 1;
      const response = await communityApi.getMyCommunities({ page: nextPage, limit: 9 });

      if (response.data.length > 0) {
        setCommunities(prev => [...prev, ...response.data]);
        setCommunitiesPage(nextPage);
        setHasMoreCommunities(response.data.length === 9);
      } else {
        setHasMoreCommunities(false);
      }
    } catch (err) {
      console.error('Failed to load more communities:', err);
    } finally {
      setLoadingMoreCommunities(false);
    }
  }, [hasMoreCommunities, loadingMoreCommunities, communitiesPage]);

  // Intersection Observer for lazy loading
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreCommunities && !loadingMoreCommunities) {
          loadMoreCommunities();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMoreCommunities, loadingMoreCommunities, loadMoreCommunities]);

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

              {/* If viewing self show full tabs, otherwise show mutual previews */}
              {viewedUser && user && viewedUser.id === user.id ? (
                <>
                  <div className="flex gap-6 border-b border-border mb-6">
                    {tabs.map(tab => (
                      <button
                        key={tab}
                        className={`px-4 py-2 text-base font-medium rounded-t-lg focus:outline-none transition-colors duration-150 ${activeTab === tab
                          ? 'bg-muted text-foreground border border-border border-b-0 -mb-px'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'Overview' && (
                    <div className="bg-muted/50 rounded-xl border border-border p-6 flex items-center gap-4 mb-6">
                      <span className="text-xl text-muted-foreground flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" />
                        </svg>
                        Showing all content
                      </span>
                    </div>
                  )}

                  {activeTab === 'Posts' && (
                    <div className="space-y-4 mb-6">
                      {postsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Loading posts...</span>
                        </div>
                      ) : myPosts.length === 0 ? (
                        <div className="bg-muted/50 rounded-xl border border-border p-6 flex items-center gap-4">
                          <span className="text-xl text-muted-foreground flex items-center gap-2">
                            No posts to show.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {myPosts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => navigate(`/community/${p.cid}/post/${p.id}`)}
                              className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 w-full"
                            >
                              <h3 className="font-semibold text-lg text-foreground mb-2">{p.title}</h3>
                              <p className="text-muted-foreground text-sm mb-3">{p.body ?? ''}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{p._count?.Comment || 0} comments</span>
                                <span>{p.post_date ? new Date(p.post_date).toLocaleDateString() : ''}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'Community' && (
                    <div className="space-y-4">
                      {communitiesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Loading communities...</span>
                        </div>
                      ) : communities.length === 0 ? (
                        <div className="bg-muted/50 rounded-xl border border-border p-6 flex items-center gap-4 mb-6">
                          <span className="text-xl text-muted-foreground flex items-center gap-2">
                            No communities to show.
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {communities.map((community) => (
                            <CommunityCard
                              key={community.id}
                              community={community}
                              onClick={() => navigate(`/community/${community.id}`)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                // Viewing another user: show mutual recent activity and mutual communities (lazy placeholders)
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
                              isInstructorOfCommunity={false}
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
                    <div ref={mutualCommunitiesScrollRef} onScroll={debouncedHandleCommunitiesScroll} className="h-96 overflow-auto rounded border border-border bg-card p-3">
                      <h3 className="text-lg font-semibold mb-3">Mutual communities</h3>
                      <div className="space-y-3">
                        {mutualCommunities.length === 0 && !loadingMoreMutualCommunities ? (
                          <div className="text-sm text-muted-foreground">No mutual communities yet.</div>
                        ) : (
                          <div className="space-y-2">
                            {mutualCommunities.map(c => (
                              <CommunityCard
                                key={c.id}
                                community={c}
                                onClick={() => navigate(`/community/${c.id}`)}
                              />
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-center py-3">
                          {loadingMoreMutualCommunities ? (
                            <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                          ) : !hasMoreMutualCommunities ? (
                            <div className="text-xs text-muted-foreground">No more communities</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
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

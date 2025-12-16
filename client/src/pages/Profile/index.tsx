import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../../services/api';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { Loader2 } from 'lucide-react';

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

const Profile: React.FC<ProfileProps> = ({ onLogout }) => {
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

  const avatarUrl = useResolvedFileUrl(user?.avatar_file_id);

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
            <div className="w-24 h-24 rounded-full bg-green-200 flex items-center justify-center overflow-hidden border-4 border-white shadow">
              {viewedUser?.avatar_file_id ? (
                <img src={useResolvedFileUrl(viewedUser.avatar_file_id) || ''} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">{(viewedUser?.fname?.charAt(0) ?? '') + (viewedUser?.lname?.charAt(0) ?? '')}</span>
              )}
            </div>

            <div className="flex-1">
              <div className="bg-card rounded-xl border border-border p-6 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{viewedUser ? `${viewedUser.fname} ${viewedUser.lname}` : 'User'}</h2>
                    <p className="text-sm text-muted-foreground">{viewedUser?.email}</p>
                    <p className="text-xs mt-2 font-medium text-primary">{viewedUser?.role?.toUpperCase()}</p>
                    {viewedUser?.role === 'instructor' && (
                      <div className="mt-3 text-sm">
                        {viewedUser.google_scholar && (
                          <div className="mb-1"><a href={viewedUser.google_scholar} target="_blank" rel="noreferrer" className="text-primary underline">Google Scholar</a></div>
                        )}
                        {viewedUser.title && <div className="text-muted-foreground">{viewedUser.title}</div>}
                        {viewedUser.expertise && <div className="text-muted-foreground">Expertise: {viewedUser.expertise}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {myPosts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => navigate(`/community/${p.cid}/post/${p.id}`)}
                              className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4"
                            >
                              <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">{p.title}</h3>
                              <p className="text-muted-foreground text-sm line-clamp-3 mb-3">{p.body ?? ''}</p>
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
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Recent activity in mutual communities</h3>
                    {/* Placeholder lazy list - backend will be wired later */}
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">No mutual activity available yet. Endpoint pending.</div>
                      <div className="flex gap-2 mt-2">
                        <button className="px-3 py-1 bg-card border border-border rounded" disabled>Load more</button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Mutual communities</h3>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">No mutual communities available yet. Endpoint pending.</div>
                      <div className="flex gap-2 mt-2">
                        <button className="px-3 py-1 bg-card border border-border rounded" disabled>Load more</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

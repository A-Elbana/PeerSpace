import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/dashboard';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../services/api';
import { useResolvedFileUrl } from '../hooks/useResolvedFileUrl';
import { Loader2 } from 'lucide-react';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  avatar_file_id?: string;
  activated: boolean;
}

interface ProfileProps {
  onLogout: () => void;
}

interface CommunityCardProps {
  community: CommunityResponse;
  onClick: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onClick }) => {
  const bannerUrl = useResolvedFileUrl(community.banner_file_id);

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Banner */}
      <div className="h-32 bg-muted relative">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={`${community.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {community.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Community Type Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${community.type === 'PUBLIC'
            ? 'bg-green-500/90 text-white'
            : 'bg-orange-500/90 text-white'
            }`}>
            {community.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-1">
          {community.name}
        </h3>
        {community.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
            {community.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{community._count?.Enrollment || 0} members</span>
          <span>{community._count?.Post || 0} posts</span>
        </div>
      </div>
    </div>
  );
};

const Profile: React.FC<ProfileProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
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
      if (activeTab === 'Community' && user) {
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

      // Fetch user's posts when Posts tab active
      if (activeTab === 'Posts' && user) {
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
  }, [activeTab, user]);

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
          {/* Header */}
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-green-200 flex items-center justify-center overflow-hidden border-4 border-white shadow">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">🦖</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{user.fname} {user.lname}</span>
              <span className="text-muted-foreground text-lg">u/{user.fname}{user.lname}</span>
            </div>
          </div>

          {/* Tabs */}
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

          {/* Overview Section */}
          {activeTab === 'Overview' && (
            <div className="bg-muted/50 rounded-xl border border-border p-6 flex items-center gap-4 mb-6">
              <span className="text-xl text-muted-foreground flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" />
                </svg>
                Showing all content
              </span>
              <span className="ml-auto text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          )}

          {/* Posts Section */}
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7v4H5V7m14 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m0 0v10a2 2 0 002 2h10a2 2 0 002-2V7z" />
                    </svg>
                    No posts to show.
                  </span>
                </div>
              ) : (
                <>
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

                  {/* Loading trigger for lazy loading posts (if implemented later) */}
                  {hasMorePosts && (
                    <div className="flex items-center justify-center py-4">
                      {loadingMorePosts ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading more posts...</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Community Section */}
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4V7a4 4 0 00-8 0v2m8 0a4 4 0 01-8 0m8 0v2a4 4 0 01-8 0V9" />
                    </svg>
                    No communities to show.
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {communities.map((community) => (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        onClick={() => navigate(`/community/${community.id}`)}
                      />
                    ))}
                  </div>

                  {/* Loading trigger for lazy loading */}
                  {hasMoreCommunities && (
                    <div ref={observerRef} className="flex items-center justify-center py-8">
                      {loadingMoreCommunities ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading more communities...</span>
                        </div>
                      ) : (
                        <div className="h-4" /> // Invisible trigger element
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;

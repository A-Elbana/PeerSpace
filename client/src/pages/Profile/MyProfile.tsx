import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../../services/api';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { Loader2 } from 'lucide-react';
import PostCard from '../../components/posts/PostCard';
import CommunityCard from '../../components/common/CommunityCard';
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

const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [viewedUser, setViewedUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [myPosts, setMyPosts] = useState<PostResponse[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [communities, setCommunities] = useState<CommunityResponse[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesPage, setCommunitiesPage] = useState(1);
  const [hasMoreCommunities, setHasMoreCommunities] = useState(true);
  const [loadingMoreCommunities, setLoadingMoreCommunities] = useState(false);
  const avatarUrl = useResolvedFileUrl(user?.avatar_file_id);
  const viewedAvatarUrl = useResolvedFileUrl(viewedUser?.avatar_file_id);
  const userId = new URLSearchParams(window.location.search).get('userId');
  const tabs = ['Overview', 'Posts', 'Community'];

  const onLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

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
        const resp = await postApi.getMyPosts({ page: 1, limit: 12 });
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

  // Load communities when the authenticated user is known
  useEffect(() => {
    const fetchCommunities = async () => {
      if (!user) return;
      try {
        setCommunitiesLoading(true);
        setCommunitiesPage(1);
        const resp = await communityApi.getMyCommunities({ page: 1, limit: 9 });
        setCommunities(resp.data as CommunityResponse[]);
        setHasMoreCommunities(resp.data.length === 9);
      } catch (err) {
        console.error('Failed to fetch my communities:', err);
      } finally {
        setCommunitiesLoading(false);
      }
    };
    fetchCommunities();
  }, [user]);

  const loadMorePosts = useCallback(async (): Promise<void> => {
    if (!hasMorePosts || loadingMorePosts) return;
    try {
      setLoadingMorePosts(true);
      const nextPage = postsPage + 1;
      const resp = await postApi.getMyPosts({ page: nextPage, limit: 12 });
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

  const loadMoreCommunities = useCallback(async (): Promise<void> => {
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
                      <PostCard key={p.id} post={p as any} />
                    ))}

                    {hasMorePosts && (
                      <div className="flex items-center justify-center">
                        <button onClick={() => void loadMorePosts()} className="px-4 py-2 bg-primary text-primary-foreground rounded">Load more posts</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-80">
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-lg font-semibold mb-3">My Communities</h3>
                {communitiesLoading && communities.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading communities...</span>
                  </div>
                ) : communities.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No communities yet.</div>
                ) : (
                  <div className="space-y-2">
                    {communities.map(c => (
                      <CommunityCard key={c.id} community={c} onClick={() => navigate(`/community/${c.id}`)} />
                    ))}

                    <div className="flex items-center justify-center pt-3">
                      {hasMoreCommunities ? (
                        <button onClick={() => void loadMoreCommunities()} className="px-3 py-1 bg-primary text-primary-foreground rounded">Load more</button>
                      ) : (
                        <div className="text-xs text-muted-foreground">No more communities</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyProfile;

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { useExploreData } from '../../hooks/useExploreData';
import Feed from '../../components/Explore/Feed';
import { removeTokens } from '../../utils/auth';
import { studentApi, instructorApi } from '../../services/api';

const AnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { user, communities } = useExploreData();

  // Data fetching state
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const fetchingRef = useRef(false);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  const fetchAnnouncements = useCallback(async (pageNum: number) => {
    if (!user || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);

    try {
      let res: any;
      const params = { page: pageNum, limit: 10, type: 'ANNOUNCEMENT' };

      if (user.role === 'student') {
        res = await studentApi.getFeed(params);
      } else if (user.role === 'instructor') {
        res = await instructorApi.getFeed(params);
      } else {
        // Fallback for admin or other roles
        res = await studentApi.getFeed(params);
      }

      const newPosts = res.data || [];
      const meta = res.meta || { totalPages: 1 };

      setPosts(prev => pageNum === 1 ? newPosts : [...prev, ...newPosts]);
      setHasMore(pageNum < (meta.totalPages || 1));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      void fetchAnnouncements(1);
    }
  }, [user, fetchAnnouncements]);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar onLogout={handleLogout} />
      <main
        className="flex-1 p-4 sm:p-6 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <Feed
              user={user}
              communities={communities}
              postType="ANNOUNCEMENT"
              hideCreateWidget={user?.role === 'student'}
              externalFetch={true}
              posts={posts}
              isLoading={isLoading}
              hasMore={hasMore}
              onFetchPage={async (p) => { await fetchAnnouncements(p); }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnnouncementsPage;

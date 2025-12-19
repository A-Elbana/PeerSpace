import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { useExploreData } from '../../hooks/useExploreData';
import Feed from '../../components/Explore/Feed';
import { removeTokens } from '../../utils/auth';

const AnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { user, communities, isLoading } = useExploreData();

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

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
              postType="announcement"
              hideCreateWidget={user?.role === 'student'}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnnouncementsPage;

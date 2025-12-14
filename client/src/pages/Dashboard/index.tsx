import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';
import { removeTokens } from '../../utils/auth';

// Role-specific Dashboards
import StudentDashboard from './StudentDashboard';
import InstructorDashboard from './InstructorDashboard';
import AdminDashboard from './AdminDashboard';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
  id: string;
  email: string;
  fname: string;
  lname: string;
  role: UserRole;
  avatar_file_id?: string;
}

/**
 * Dashboard Router
 * Routes users to the appropriate dashboard based on their role
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set page title
  useEffect(() => {
    document.title = 'PeerSpace - Dashboard';
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data } = await api.get('/auth/me');
        // Handle both lowercase and uppercase role formats
        const normalizedUser: UserData = {
          ...data,
          role: data.role?.toLowerCase() as UserRole
        };
        setUser(normalizedUser);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        removeTokens();
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  // Loading state with spinner
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-frosted-blue-600 animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Role-based dashboard routing
  switch (user.role) {
    case 'instructor':
      return <InstructorDashboard user={user} onLogout={handleLogout} />;
    case 'admin':
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    case 'student':
    default:
      return <StudentDashboard user={user} onLogout={handleLogout} />;
  }
};

export default Dashboard;

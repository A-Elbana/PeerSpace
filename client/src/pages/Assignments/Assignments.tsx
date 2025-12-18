import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home, ChevronRight, Loader2 } from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { removeTokens } from '../../utils/auth';
import api from '../../services/api';
import AssignmentList from '../../components/assignments/AssignmentList';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
    id: number;
    email: string;
    fname: string;
    lname: string;
    role: UserRole;
}

const AssignmentsPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [communities, setCommunities] = useState<any[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const { sidebarWidth } = useSidebar();

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsInitialLoading(true);
                const userRes = await api.get('/auth/me');
                const normalizedUser: UserData = {
                    ...userRes.data,
                    role: userRes.data.role?.toLowerCase() as UserRole
                };
                setUser(normalizedUser);

                // Fetch communities for the filter dropdown
                const dashboardRes = await api.get(normalizedUser.role === 'student' ? '/student/dashboard' : '/instructor/communities');
                const communityList = normalizedUser.role === 'student'
                    ? (dashboardRes.data.enrolledCommunities || [])
                    : (dashboardRes.data.data || []);
                setCommunities(communityList);
            } catch (error) {
                console.error('Failed to load initial data:', error);
                removeTokens();
                navigate('/login');
            } finally {
                setIsInitialLoading(false);
            }
        };
        fetchInitialData();
    }, [navigate]);

    const handleLogout = () => {
        removeTokens();
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar onLogout={handleLogout} />

            <main
                className="flex-1 p-8 transition-all duration-300"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <div className="max-w-5xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-6 flex items-center text-sm text-muted-foreground">
                        <Link to="/dashboard" className="flex items-center hover:text-foreground transition-all duration-200">
                            <Home className="w-4 h-4 mr-1.5" />
                            Home
                        </Link>
                        <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/50" />
                        <span className="text-foreground font-semibold">Assignments</span>
                    </div>

                    {isInitialLoading ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-tech-blue-500" />
                            <p className="text-muted-foreground animate-pulse">Initializing workspace...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                                    {user?.role === 'student' ? 'My Assignments' : 'Managed Feed'}
                                </h1>
                                <p className="text-lg text-muted-foreground max-w-2xl">
                                    {user?.role === 'student'
                                        ? 'Keep track of your current workload and upcoming deadlines.'
                                        : 'Review and manage assignments across all your communities.'}
                                </p>
                            </div>

                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                                <AssignmentList
                                    role={user?.role === 'instructor' ? 'instructor' : 'student'}
                                    showCommunityFilter={true}
                                    communities={communities}
                                    limit={10}
                                    onAssignmentClick={(a) => navigate(`/community/${a.cid}/assignment/${a.id}`)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AssignmentsPage;

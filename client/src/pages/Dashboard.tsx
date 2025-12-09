import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Users,
    Calendar,
    Bell,
    Settings,
    LogOut,
    Plus,
    Search,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { removeTokens } from '../utils/auth';
import api from '../services/api';
import '../styles/Dashboard.css';

interface UserData {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'student' | 'instructor' | 'admin';
}

interface Community {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    unreadPosts: number;
}

interface Assignment {
    id: string;
    title: string;
    communityName: string;
    dueDate: string;
    status: 'pending' | 'completed' | 'overdue';
}

/**
 * Dashboard Component
 * Main dashboard for authenticated users showing communities, assignments, and stats
 */
const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUserData();
        fetchDashboardData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            // If fetching user fails, token might be invalid
            removeTokens();
            navigate('/login');
        }
    };

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            // TODO: Replace with actual API calls when backend endpoints are ready
            // const communitiesData = await api.get('/communities');
            // const assignmentsData = await api.get('/assignments');

            // Mock data for now
            setCommunities([
                {
                    id: '1',
                    name: 'Database Management Systems',
                    description: 'Learn about relational databases, SQL, and more',
                    memberCount: 45,
                    unreadPosts: 3
                },
                {
                    id: '2',
                    name: 'Web Development',
                    description: 'Modern web development with React and Node.js',
                    memberCount: 38,
                    unreadPosts: 7
                },
                {
                    id: '3',
                    name: 'Data Structures',
                    description: 'Algorithms and data structures fundamentals',
                    memberCount: 52,
                    unreadPosts: 0
                }
            ]);

            setAssignments([
                {
                    id: '1',
                    title: 'Database Design Project',
                    communityName: 'Database Management Systems',
                    dueDate: '2025-12-15',
                    status: 'pending'
                },
                {
                    id: '2',
                    title: 'React Component Assignment',
                    communityName: 'Web Development',
                    dueDate: '2025-12-12',
                    status: 'pending'
                },
                {
                    id: '3',
                    title: 'Binary Tree Implementation',
                    communityName: 'Data Structures',
                    dueDate: '2025-12-10',
                    status: 'overdue'
                }
            ]);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        removeTokens();
        navigate('/login');
    };

    const getInitials = (firstName?: string, lastName?: string) => {
        if (!firstName && !lastName) return 'U';
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    const getStatusIcon = (status: Assignment['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="status-icon status-completed" size={16} />;
            case 'overdue':
                return <AlertCircle className="status-icon status-overdue" size={16} />;
            default:
                return <Clock className="status-icon status-pending" size={16} />;
        }
    };

    const formatDueDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        return `Due in ${diffDays} days`;
    };

    if (isLoading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <h1 className="dashboard-title">PeerSpace</h1>
                        <div className="search-container">
                            <Search className="search-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Search communities, assignments..."
                                className="search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="header-right">
                        <Button variant="ghost" size="icon" className="header-icon-btn">
                            <Bell size={20} />
                            <span className="notification-badge">3</span>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="user-menu-trigger">
                                    <Avatar className="user-avatar">
                                        <AvatarImage src="" alt={user?.firstName} />
                                        <AvatarFallback>
                                            {getInitials(user?.firstName, user?.lastName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="user-info">
                                        <span className="user-name">
                                            {user?.firstName} {user?.lastName}
                                        </span>
                                        <span className="user-role">{user?.role}</span>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="user-menu-content">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/profile')}>
                                    <Settings className="menu-icon" size={16} />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="menu-icon" size={16} />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="dashboard-main">
                <div className="dashboard-grid">
                    {/* Welcome Section */}
                    <section className="welcome-section">
                        <Card className="welcome-card">
                            <CardHeader>
                                <CardTitle className="welcome-title">
                                    Welcome back, {user?.firstName}! 👋
                                </CardTitle>
                                <CardDescription>
                                    Here's what's happening in your communities today
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </section>

                    {/* Stats Cards */}
                    <section className="stats-section">
                        <Card className="stat-card">
                            <CardContent className="stat-content">
                                <div className="stat-icon-wrapper stat-communities">
                                    <BookOpen size={24} />
                                </div>
                                <div className="stat-details">
                                    <p className="stat-label">Communities</p>
                                    <p className="stat-value">{communities.length}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="stat-card">
                            <CardContent className="stat-content">
                                <div className="stat-icon-wrapper stat-assignments">
                                    <Calendar size={24} />
                                </div>
                                <div className="stat-details">
                                    <p className="stat-label">Assignments</p>
                                    <p className="stat-value">{assignments.length}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="stat-card">
                            <CardContent className="stat-content">
                                <div className="stat-icon-wrapper stat-progress">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="stat-details">
                                    <p className="stat-label">Progress</p>
                                    <p className="stat-value">78%</p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Communities Section */}
                    <section className="communities-section">
                        <div className="section-header">
                            <h2 className="section-title">My Communities</h2>
                            <Button className="add-btn">
                                <Plus size={18} />
                                Join Community
                            </Button>
                        </div>

                        <div className="communities-grid">
                            {communities.map((community) => (
                                <Card key={community.id} className="community-card">
                                    <CardHeader>
                                        <div className="community-header">
                                            <div className="community-icon">
                                                <BookOpen size={24} />
                                            </div>
                                            {community.unreadPosts > 0 && (
                                                <span className="unread-badge">{community.unreadPosts}</span>
                                            )}
                                        </div>
                                        <CardTitle className="community-title">{community.name}</CardTitle>
                                        <CardDescription className="community-description">
                                            {community.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="community-footer">
                                            <div className="community-members">
                                                <Users size={16} />
                                                <span>{community.memberCount} members</span>
                                            </div>
                                            <Button variant="ghost" size="sm">
                                                View →
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Assignments Section */}
                    <section className="assignments-section">
                        <div className="section-header">
                            <h2 className="section-title">Upcoming Assignments</h2>
                            <Button variant="outline" size="sm">
                                View All
                            </Button>
                        </div>

                        <Card className="assignments-card">
                            <CardContent className="assignments-list">
                                {assignments.map((assignment, index) => (
                                    <React.Fragment key={assignment.id}>
                                        <div className="assignment-item">
                                            <div className="assignment-info">
                                                {getStatusIcon(assignment.status)}
                                                <div className="assignment-details">
                                                    <h3 className="assignment-title">{assignment.title}</h3>
                                                    <p className="assignment-community">{assignment.communityName}</p>
                                                </div>
                                            </div>
                                            <div className="assignment-due">
                                                <span className={`due-date ${assignment.status}`}>
                                                    {formatDueDate(assignment.dueDate)}
                                                </span>
                                            </div>
                                        </div>
                                        {index < assignments.length - 1 && <Separator />}
                                    </React.Fragment>
                                ))}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

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
                return <CheckCircle2 className="shrink-0 text-turf-green-600" size={16} />;
            case 'overdue':
                return <AlertCircle className="shrink-0 text-royal-gold-600" size={16} />;
            default:
                return <Clock className="shrink-0 text-royal-gold-500" size={16} />;
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

    const getDueDateStyles = (status: Assignment['status']) => {
        switch (status) {
            case 'completed':
                return 'bg-turf-green-100 text-turf-green-700';
            case 'overdue':
                return 'bg-royal-gold-100 text-royal-gold-700';
            default:
                return 'bg-royal-gold-50 text-royal-gold-600';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-black-600">
                <div className="w-10 h-10 border-3 border-black-200 border-t-tech-blue-600 rounded-full animate-spin"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black-50 to-black-100">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-black-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8">
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 flex-1 w-full lg:w-auto">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-tech-blue-600 to-frosted-blue-500 bg-clip-text text-transparent whitespace-nowrap">
                                PeerSpace
                            </h1>
                            <div className="relative flex-1 w-full max-w-lg">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black-400 pointer-events-none" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search communities, assignments..."
                                    className="w-full pl-11 pr-4 py-2.5 text-sm border border-black-300 rounded-lg bg-black-50 focus:outline-none focus:ring-2 focus:ring-tech-blue-600 focus:border-transparent focus:bg-white transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell size={20} />
                                <span className="absolute top-0 right-0 bg-royal-gold-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    3
                                </span>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="gap-3 px-3 py-2 h-auto">
                                        <Avatar className="w-9 h-9 border-2 border-tech-blue-400">
                                            <AvatarImage src="" alt={user?.firstName} />
                                            <AvatarFallback className="bg-gradient-to-br from-tech-blue-600 to-frosted-blue-500 text-white">
                                                {getInitials(user?.firstName, user?.lastName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="hidden md:flex flex-col items-start gap-0.5">
                                            <span className="text-sm font-semibold text-black-800">
                                                {user?.firstName} {user?.lastName}
                                            </span>
                                            <span className="text-xs text-black-500 capitalize">{user?.role}</span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[200px]">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                                        <Settings className="mr-2" size={16} />
                                        Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                                        <LogOut className="mr-2" size={16} />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col gap-8">
                    {/* Welcome Section */}
                    <section className="w-full">
                        <Card className="bg-gradient-to-r from-tech-blue-600 to-frosted-blue-500 border-none text-white">
                            <CardHeader>
                                <CardTitle className="text-white text-2xl sm:text-3xl">
                                    Welcome back, {user?.firstName}! 👋
                                </CardTitle>
                                <CardDescription className="text-white/90 text-base">
                                    Here's what's happening in your communities today
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </section>

                    {/* Stats Cards */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="border border-black-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-tech-blue-400 cursor-pointer">
                            <CardContent className="flex items-center gap-5 p-6">
                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-tech-blue-600 to-tech-blue-400 flex items-center justify-center text-white shrink-0">
                                    <BookOpen size={24} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-black-600 m-0">Communities</p>
                                    <p className="text-3xl font-bold text-black-900 m-0 leading-none">{communities.length}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-black-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-tech-blue-400 cursor-pointer">
                            <CardContent className="flex items-center gap-5 p-6">
                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-frosted-blue-600 to-frosted-blue-400 flex items-center justify-center text-white shrink-0">
                                    <Calendar size={24} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-black-600 m-0">Assignments</p>
                                    <p className="text-3xl font-bold text-black-900 m-0 leading-none">{assignments.length}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-black-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-tech-blue-400 cursor-pointer sm:col-span-2 lg:col-span-1">
                            <CardContent className="flex items-center gap-5 p-6">
                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-turf-green-600 to-turf-green-400 flex items-center justify-center text-white shrink-0">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-black-600 m-0">Progress</p>
                                    <p className="text-3xl font-bold text-black-900 m-0 leading-none">78%</p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Communities Section */}
                    <section className="w-full">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                            <h2 className="text-2xl font-bold text-black-900 m-0">My Communities</h2>
                            <Button className="gap-2 bg-gradient-to-r from-tech-blue-600 to-frosted-blue-500 border-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-90 w-full sm:w-auto">
                                <Plus size={18} />
                                Join Community
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {communities.map((community) => (
                                <Card
                                    key={community.id}
                                    className="border border-black-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-tech-blue-400 cursor-pointer relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tech-blue-600 to-frosted-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                                    <CardHeader>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-tech-blue-600 to-frosted-blue-500 flex items-center justify-center text-white">
                                                <BookOpen size={24} />
                                            </div>
                                            {community.unreadPosts > 0 && (
                                                <span className="bg-royal-gold-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                                                    {community.unreadPosts}
                                                </span>
                                            )}
                                        </div>
                                        <CardTitle className="text-lg font-semibold text-black-900 my-2">
                                            {community.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm text-black-600 leading-relaxed line-clamp-2">
                                            {community.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between pt-3 border-t border-black-200">
                                            <div className="flex items-center gap-2 text-sm text-black-600">
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
                    <section className="w-full">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                            <h2 className="text-2xl font-bold text-black-900 m-0">Upcoming Assignments</h2>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                View All
                            </Button>
                        </div>

                        <Card className="border border-black-200">
                            <CardContent className="p-0">
                                {assignments.map((assignment, index) => (
                                    <React.Fragment key={assignment.id}>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 px-6 py-5 transition-colors hover:bg-black-50">
                                            <div className="flex items-center gap-4 flex-1 w-full">
                                                {getStatusIcon(assignment.status)}
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <h3 className="text-[15px] font-semibold text-black-900 m-0">
                                                        {assignment.title}
                                                    </h3>
                                                    <p className="text-[13px] text-black-600 m-0">
                                                        {assignment.communityName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 w-full sm:w-auto">
                                                <span className={`inline-block text-[13px] font-medium px-3 py-1.5 rounded-md whitespace-nowrap w-full sm:w-auto text-center ${getDueDateStyles(assignment.status)}`}>
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


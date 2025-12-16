import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    Building2, 
    FileText, 
    Search, 
    TrendingUp,
    ChevronRight,
    Loader2,
    Tag,
    Lock,
    Globe,
    UserPlus,
    CheckCircle
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

// Components
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '../../components/ui/chart';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import UserManagementModal from '../../components/dashboard/UserManagementModal';
import CommunityManagementModal from '../../components/dashboard/CommunityManagementModal';
import PostManagementModal from '../../components/dashboard/PostManagementModal';
import CreateCommunityModal, { type CreateCommunityData } from '../../components/dashboard/CreateCommunityModal';
import CreateUserModal, { type CreateUserData } from '../../components/dashboard/CreateUserModal';

// API
import api, { adminApi, userApi, communityApi, postApi } from '../../services/api';

interface AdminDashboardProps {
    user: {
        id: string;
        email: string;
        fname: string;
        lname: string;
        role: 'student' | 'instructor' | 'admin';
        avatar_file_id?: string;
    };
    onLogout: () => void;
}

// Types for data
interface UserItem {
    id: number;
    fname: string;
    lname: string;
    email: string;
    role: string;
}

interface CommunityItem {
    id: string;
    name: string;
    type: string;
    _count?: {
        Enrollment: number;
        Post: number;
    };
}

interface PostItem {
    id: number;
    title: string;
    cid: string;
    Community?: {
        id: string;
        name: string;
    };
    User?: {
        fname: string;
        lname: string;
    };
    tags?: string[];
    post_date: string;
}

interface ChartDataPoint {
    date: string;
    count: number;
}

const chartConfig: ChartConfig = {
    count: {
        label: 'Count',
        theme: {
            light: 'var(--color-tech-blue-500)',
            dark: 'hsl(var(--primary))',
        },
    },
};

const postsChartConfig: ChartConfig = {
    count: {
        label: 'Posts',
        theme: {
            light: 'var(--color-turf-green-500)',
            dark: '#10b981',
        },
    },
};

/**
 * Admin Dashboard
 * Dashboard view for administrators showing platform statistics and management tools
 */
const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const { sidebarWidth } = useSidebar();

    // Data states
    const [users, setUsers] = useState<UserItem[]>([]);
    const [communities, setCommunities] = useState<CommunityItem[]>([]);
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [communitiesChartData, setCommunitiesChartData] = useState<ChartDataPoint[]>([]);
    const [postsChartData, setPostsChartData] = useState<ChartDataPoint[]>([]);
    const [communitiesMonths, setCommunitiesMonths] = useState<number>(6);
    const [postsMonths, setPostsMonths] = useState<number>(6);

    // User filter states
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

    // Community filter states
    const [communitySearch, setCommunitySearch] = useState('');
    const [communityVisibilityFilter, setCommunityVisibilityFilter] = useState<string>('all');

    // Post filter states
    const [postSearch, setPostSearch] = useState('');
    const [postTagSearch, setPostTagSearch] = useState('');

    // Posts chart filters
    const [chartCommunityIdFilter, setChartCommunityIdFilter] = useState('');
    const [chartTagFilter, setChartTagFilter] = useState('');
    const [chartResolvedOnly, setChartResolvedOnly] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalCommunities: 0,
        totalPosts: 0,
    });

    // Modal states
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [communityModalOpen, setCommunityModalOpen] = useState(false);
    const [postModalOpen, setPostModalOpen] = useState(false);
    const [createCommunityOpen, setCreateCommunityOpen] = useState(false);
    const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
    const [createUserOpen, setCreateUserOpen] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    // Reusable fetch functions
    const fetchStats = async () => {
        try {
            const statsData = await adminApi.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchCommunitiesTimeSeries = async () => {
        try {
            const communitiesData = await adminApi.getCommunitiesTimeSeries(communitiesMonths);
            setCommunitiesChartData(communitiesData.data);
        } catch (error) {
            console.error('Failed to fetch communities time series:', error);
        }
    };

    const fetchPostsTimeSeries = async () => {
        try {
            const postsData = await adminApi.getPostsTimeSeries({
                months: postsMonths,
                communityId: chartCommunityIdFilter || undefined,
                tag: chartTagFilter || undefined,
                resolvedOnly: chartResolvedOnly,
            });
            setPostsChartData(postsData.data);
        } catch (error) {
            console.error('Failed to fetch posts time series:', error);
        }
    };

    const fetchUsers = async () => {
        if (!userSearch.trim()) {
            setUsers([]);
            return;
        }

        try {
            const response = await userApi.getAll({
                search: userSearch,
                role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
                limit: 50,
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUsers([]);
        }
    };

    const fetchCommunities = async () => {
        if (!communitySearch.trim()) {
            setCommunities([]);
            return;
        }

        try {
            const response = await communityApi.getAll({
                search: communitySearch,
                type: communityVisibilityFilter !== 'all' ? communityVisibilityFilter.toUpperCase() as 'PUBLIC' | 'PRIVATE' : undefined,
                limit: 50,
            });
            setCommunities(response.data);
        } catch (error) {
            console.error('Failed to fetch communities:', error);
            setCommunities([]);
        }
    };

    const fetchPosts = async () => {
        if (!postSearch.trim() && !postTagSearch.trim()) {
            setPosts([]);
            return;
        }

        try {
            const response = await postApi.getAll({
                search: postSearch,
                tags: postTagSearch,
                limit: 50,
            });
            setPosts(response.data);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            setPosts([]);
        }
    };

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                await fetchStats();
                await fetchCommunitiesTimeSeries();
                await fetchPostsTimeSeries();
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Refetch communities chart when months selection changes
    useEffect(() => {
        const debounce = setTimeout(fetchCommunitiesTimeSeries, 300);
        return () => clearTimeout(debounce);
    }, [communitiesMonths]);

    // Refetch posts chart when filters or months change
    useEffect(() => {
        const debounce = setTimeout(fetchPostsTimeSeries, 300);
        return () => clearTimeout(debounce);
    }, [chartCommunityIdFilter, chartTagFilter, chartResolvedOnly, postsMonths]);

    // Fetch users when search changes
    useEffect(() => {
        const debounce = setTimeout(fetchUsers, 300);
        return () => clearTimeout(debounce);
    }, [userSearch, userRoleFilter]);

    // Fetch communities when search changes
    useEffect(() => {
        const debounce = setTimeout(fetchCommunities, 300);
        return () => clearTimeout(debounce);
    }, [communitySearch, communityVisibilityFilter]);

    // Fetch posts when search changes
    useEffect(() => {
        const debounce = setTimeout(fetchPosts, 300);
        return () => clearTimeout(debounce);
    }, [postSearch, postTagSearch]);

    

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar onLogout={onLogout} />

            <main 
              className="flex-1 p-8 transition-all duration-300"
              style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
                        <p className="text-muted-foreground">
                            Welcome back, {user.fname}! Here's your platform overview.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-tech-blue-100 dark:bg-tech-blue-900/30">
                                    <Users className="w-6 h-6 text-tech-blue-600 dark:text-tech-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Users</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-turf-green-100 dark:bg-turf-green-900/30">
                                    <Building2 className="w-6 h-6 text-turf-green-600 dark:text-turf-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Communities</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.totalCommunities}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-royal-gold-100 dark:bg-royal-gold-900/30">
                                    <FileText className="w-6 h-6 text-royal-gold-600 dark:text-royal-gold-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Posts</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.totalPosts}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="space-y-6 mb-8">
                        {/* Communities Over Time Chart - Full Width */}
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-tech-blue-500" />
                                <h2 className="text-lg font-semibold text-foreground">Communities Over Time</h2>
                                <div className="ml-auto">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="gap-2 min-w-[120px]">
                                                Last {communitiesMonths} months
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setCommunitiesMonths(1)}>Last 1 month</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setCommunitiesMonths(3)}>Last 3 months</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setCommunitiesMonths(6)}>Last 6 months</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setCommunitiesMonths(12)}>Last 12 months</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setCommunitiesMonths(24)}>Last 24 months</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                                <AreaChart data={communitiesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="communitiesGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                                    <YAxis className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--color-count)"
                                        fill="url(#communitiesGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </div>

                        {/* Posts Over Time Chart - Full Width with Filters */}
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex flex-col gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-turf-green-500" />
                                    <h2 className="text-lg font-semibold text-foreground">Posts Over Time</h2>
                                    <div className="ml-auto">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="gap-2 min-w-[120px]">
                                                    Last {postsMonths} months
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setPostsMonths(1)}>Last 1 month</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPostsMonths(3)}>Last 3 months</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPostsMonths(6)}>Last 6 months</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPostsMonths(12)}>Last 12 months</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPostsMonths(24)}>Last 24 months</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <Input
                                        placeholder="Filter by Community ID (optional)..."
                                        value={chartCommunityIdFilter}
                                        onChange={(e) => setChartCommunityIdFilter(e.target.value)}
                                        className="w-full sm:w-64"
                                    />
                                    <div className="relative w-full sm:w-48">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Filter by tag..."
                                            value={chartTagFilter}
                                            onChange={(e) => setChartTagFilter(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <div
                                            onClick={() => setChartResolvedOnly(!chartResolvedOnly)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                chartResolvedOnly
                                                    ? 'bg-turf-green-500 border-turf-green-500'
                                                    : 'border-input hover:border-turf-green-400'
                                            }`}
                                        >
                                            {chartResolvedOnly && <CheckCircle className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm text-muted-foreground">Resolved only</span>
                                    </label>
                                </div>
                            </div>
                            <ChartContainer config={postsChartConfig} className="h-[300px] w-full">
                                <AreaChart data={postsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                                    <YAxis className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--color-count)"
                                        fill="url(#postsGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </div>

                    {/* Filterable Lists - Full Width Stack */}
                    <div className="space-y-6">
                        {/* Users List - Full Width */}
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-semibold text-foreground">Users</h2>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by ID or name..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <div className="flex items-center ml-2">
                                        <Button
                                            className="gap-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white"
                                            onClick={() => setCreateUserOpen(true)}
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Create User
                                        </Button>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="gap-2 min-w-[140px]">
                                                <Users className="w-4 h-4" />
                                                {userRoleFilter === 'all' ? 'All Roles' : userRoleFilter.charAt(0).toUpperCase() + userRoleFilter.slice(1)}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setUserRoleFilter('all')}>All Roles</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setUserRoleFilter('student')}>Student</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setUserRoleFilter('instructor')}>Instructor</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setUserRoleFilter('admin')}>Admin</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {!userSearch.trim() ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>Enter an ID or name to search users</p>
                                    </div>
                                ) : users.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">No users found</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
                                        {users.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => {
                                                    setSelectedUserId(String(u.id));
                                                    setUserModalOpen(true);
                                                }}
                                                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b sm:border-r border-border"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-foreground truncate">
                                                        {u.fname} {u.lname}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        ID: {u.id} • {u.role}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Communities List - Full Width */}
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <h2 className="text-lg font-semibold text-foreground mb-3">Communities</h2>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by ID or name..."
                                            value={communitySearch}
                                            onChange={(e) => setCommunitySearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <div className="relative sm:max-w-[200px]">
                                        {/* placeholder column reserved for future filters */}
                                        <div />
                                    </div>
                                    <div className="flex items-center ml-2">
                                        <Button
                                            className="gap-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white"
                                            onClick={() => setCreateCommunityOpen(true)}
                                        >
                                            <Building2 className="w-4 h-4" />
                                            Create Community
                                        </Button>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="gap-2 min-w-[140px]">
                                                {communityVisibilityFilter === 'all' ? (
                                                    <><Globe className="w-4 h-4" /> All</>
                                                ) : communityVisibilityFilter === 'public' ? (
                                                    <><Globe className="w-4 h-4" /> Public</>
                                                ) : (
                                                    <><Lock className="w-4 h-4" /> Private</>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setCommunityVisibilityFilter('all')}>
                                                <Globe className="w-4 h-4 mr-2" /> All
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setCommunityVisibilityFilter('public')}>
                                                <Globe className="w-4 h-4 mr-2" /> Public
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setCommunityVisibilityFilter('private')}>
                                                <Lock className="w-4 h-4 mr-2" /> Private
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {!communitySearch.trim() ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>Enter an ID or name to search communities</p>
                                    </div>
                                ) : communities.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">No communities found</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
                                        {communities.map(community => (
                                            <div
                                                key={community.id}
                                                onClick={() => {
                                                    setSelectedCommunityId(community.id);
                                                    setCommunityModalOpen(true);
                                                }}
                                                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b sm:border-r border-border"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-foreground truncate">
                                                            {community.name}
                                                        </p>
                                                        {community.type === 'PRIVATE' ? (
                                                            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                                        ) : (
                                                            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        <span className="font-mono text-xs break-all">ID: {community.id}</span>
                                                        <span className="ml-2">• {community._count?.Enrollment || 0} members</span>
                                                    </p>
                                                    {/* tags removed */}
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Posts List - Full Width */}
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <h2 className="text-lg font-semibold text-foreground mb-3">Posts</h2>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by ID or title..."
                                            value={postSearch}
                                            onChange={(e) => setPostSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <div className="relative flex-1 sm:max-w-[200px]">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search tags..."
                                            value={postTagSearch}
                                            onChange={(e) => setPostTagSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {!postSearch.trim() && !postTagSearch.trim() ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>Enter an ID, title, or tag to search posts</p>
                                    </div>
                                ) : posts.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">No posts found</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
                                        {posts.map(post => (
                                            <div
                                                key={post.id}
                                                onClick={() => {
                                                    setSelectedPostId(post.id);
                                                    setPostModalOpen(true);
                                                }}
                                                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b sm:border-r border-border"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-foreground truncate">
                                                        {post.title}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        ID: {post.id} • {post.Community?.name || 'Unknown'}
                                                    </p>
                                                    {post.tags && post.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {post.tags.slice(0, 2).map(tag => (
                                                                <span key={tag} className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {post.tags.length > 2 && (
                                                                <span className="text-xs text-muted-foreground">+{post.tags.length - 2}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Management Modals */}
            <UserManagementModal
                open={userModalOpen}
                onOpenChange={setUserModalOpen}
                userId={selectedUserId}
                onUserUpdated={() => {
                    fetchUsers();
                    fetchStats();
                }}
                onUserDeleted={() => {
                    fetchUsers();
                    fetchStats();
                    setUserSearch('');
                }}
            />

            <CommunityManagementModal
                open={communityModalOpen}
                onOpenChange={setCommunityModalOpen}
                communityId={selectedCommunityId}
                onCommunityUpdated={() => {
                    fetchCommunities();
                    fetchStats();
                    fetchCommunitiesTimeSeries();
                }}
                onCommunityDeleted={() => {
                    fetchCommunities();
                    fetchStats();
                    fetchCommunitiesTimeSeries();
                    setCommunitySearch('');
                }}
            />

            <PostManagementModal
                open={postModalOpen}
                onOpenChange={setPostModalOpen}
                postId={selectedPostId}
                onPostUpdated={() => {
                    fetchPosts();
                    fetchStats();
                    fetchPostsTimeSeries();
                }}
                onPostDeleted={() => {
                    fetchPosts();
                    fetchStats();
                    fetchPostsTimeSeries();
                    setPostSearch('');
                    setPostTagSearch('');
                }}
            />

            <CreateUserModal
                isOpen={createUserOpen}
                onClose={() => setCreateUserOpen(false)}
                isLoading={isCreatingUser}
                onSubmit={async (data: CreateUserData) => {
                    setIsCreatingUser(true);
                    try {
                        if (data.role === 'ADMIN') {
                            await api.post('/users/admin', {
                                fname: data.fname,
                                lname: data.lname,
                                email: data.email,
                                password: data.password,
                            });
                        } else {
                            await api.post('/auth/register', {
                                fname: data.fname,
                                lname: data.lname,
                                email: data.email,
                                password: data.password,
                                role: data.role,
                            });
                        }

                        // Refresh lists
                        fetchUsers();
                        fetchStats();
                    } catch (err: any) {
                        console.error('Failed to create user:', err);
                        throw err;
                    } finally {
                        setIsCreatingUser(false);
                    }
                }}
            />

            <CreateCommunityModal
                isOpen={createCommunityOpen}
                onClose={() => setCreateCommunityOpen(false)}
                isLoading={isCreatingCommunity}
                onSubmit={async (data: CreateCommunityData) => {
                    setIsCreatingCommunity(true);
                    try {
                        let bannerFileId: string | undefined;

                        if (data.bannerFile) {
                            // Sign upload
                            const signRes = await api.post('/uploads/sign', {
                                context: 'COMMUNITY_BANNER',
                                context_id: 'admin-create',
                                is_private: false,
                                resource_type: 'auto'
                            });

                            const { timestamp, signature, folder, cloudName, apiKey } = signRes.data;

                            const formData = new FormData();
                            formData.append('file', data.bannerFile);
                            formData.append('timestamp', timestamp.toString());
                            formData.append('signature', signature);
                            formData.append('api_key', apiKey);
                            formData.append('folder', folder);

                            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
                            const uploadResp = await fetch(uploadUrl, { method: 'POST', body: formData });
                            if (!uploadResp.ok) throw new Error('Banner upload failed');
                            const cloudData = await uploadResp.json();

                            // Create file record
                            const fileResp = await api.post('/files', {
                                public_id: cloudData.public_id,
                                secure_url: cloudData.secure_url,
                                resource_type: cloudData.resource_type,
                                format: cloudData.format,
                                context: 'COMMUNITY_BANNER',
                                context_id: 'admin-create',
                                is_private: false,
                            });

                            bannerFileId = fileResp.data.data.id;
                        }

                        await communityApi.create({
                            name: data.name,
                            description: data.description,
                            type: data.type,
                            ...(bannerFileId ? { banner_file_id: bannerFileId } : {}),
                        });

                        // Refresh lists
                        fetchCommunities();
                        fetchStats();
                        fetchCommunitiesTimeSeries();
                    } catch (err: any) {
                        console.error('Failed to create community:', err);
                        throw err;
                    } finally {
                        setIsCreatingCommunity(false);
                    }
                }}
            />
        </div>
    );
};

export default AdminDashboard;

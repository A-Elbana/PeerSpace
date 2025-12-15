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

// API
import { adminApi, userApi, communityApi, postApi } from '../../services/api';

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
    tags?: string[];
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

    // Data states
    const [users, setUsers] = useState<UserItem[]>([]);
    const [communities, setCommunities] = useState<CommunityItem[]>([]);
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [communitiesChartData, setCommunitiesChartData] = useState<ChartDataPoint[]>([]);
    const [postsChartData, setPostsChartData] = useState<ChartDataPoint[]>([]);

    // User filter states
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

    // Community filter states
    const [communitySearch, setCommunitySearch] = useState('');
    const [communityVisibilityFilter, setCommunityVisibilityFilter] = useState<string>('all');
    const [communityTagSearch, setCommunityTagSearch] = useState('');

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
            const communitiesData = await adminApi.getCommunitiesTimeSeries(6);
            setCommunitiesChartData(communitiesData.data);
        } catch (error) {
            console.error('Failed to fetch communities time series:', error);
        }
    };

    const fetchPostsTimeSeries = async () => {
        try {
            const postsData = await adminApi.getPostsTimeSeries({
                months: 6,
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
        if (!communitySearch.trim() && !communityTagSearch.trim()) {
            setCommunities([]);
            return;
        }

        try {
            const response = await communityApi.getAll({
                search: communitySearch,
                tags: communityTagSearch,
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

    // Fetch users when search changes
    useEffect(() => {
        const debounce = setTimeout(fetchUsers, 300);
        return () => clearTimeout(debounce);
    }, [userSearch, userRoleFilter]);

    // Fetch communities when search changes
    useEffect(() => {
        const debounce = setTimeout(fetchCommunities, 300);
        return () => clearTimeout(debounce);
    }, [communitySearch, communityTagSearch, communityVisibilityFilter]);

    // Fetch posts when search changes
    useEffect(() => {
        const debounce = setTimeout(fetchPosts, 300);
        return () => clearTimeout(debounce);
    }, [postSearch, postTagSearch]);

    // Fetch posts chart data when filters change
    useEffect(() => {
        const debounce = setTimeout(fetchPostsTimeSeries, 300);
        return () => clearTimeout(debounce);
    }, [chartCommunityIdFilter, chartTagFilter, chartResolvedOnly]);

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

            <main className="flex-1 ml-20 p-8">
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
                                    <Button 
                                        onClick={() => navigate('/admin/add-admin')}
                                        className="gap-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Add Admin
                                    </Button>
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
                                    <div className="relative flex-1 sm:max-w-[200px]">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search tags..."
                                            value={communityTagSearch}
                                            onChange={(e) => setCommunityTagSearch(e.target.value)}
                                            className="pl-9"
                                        />
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
                                {!communitySearch.trim() && !communityTagSearch.trim() ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>Enter an ID, name, or tag to search communities</p>
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
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        ID: {community.id} • {community._count?.Enrollment || 0} members
                                                    </p>
                                                    {community.tags && community.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {community.tags.slice(0, 2).map(tag => (
                                                                <span key={tag} className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {community.tags.length > 2 && (
                                                                <span className="text-xs text-muted-foreground">+{community.tags.length - 2}</span>
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
                    setCommunityTagSearch('');
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
        </div>
    );
};

export default AdminDashboard;

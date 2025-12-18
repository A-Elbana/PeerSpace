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
    CheckCircle,
    Award
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

// Components
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import Combobox from '../../components/ui/Combobox';
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
} from '../../components/ui/pagination';
import UserManagementModal from '../../components/dashboard/UserManagementModal';
import CommunityManagementModal from '../../components/dashboard/CommunityManagementModal';
import PostManagementModal from '../../components/dashboard/PostManagementModal';
import CreateCommunityModal, { type CreateCommunityData } from '../../components/dashboard/CreateCommunityModal';
import { CreateBadgeModal } from '../../components/dashboard';
import { badgeApi } from '../../services/api';
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

interface ActivityLog {
    id: number;
    associated_uid?: number;
    associated_cid?: string;
    action_type: number;
    date: string;
    description?: string;
    User?: {
        id: number;
        fname: string;
        lname: string;
        email: string;
    };
    Community?: {
        id: string;
        name: string;
        type: string;
    };
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

// Action type mappings based on ActivityLogService enum
const ACTION_TYPE_GROUPS = [
    {
        category: 'Community',
        actions: [
            { value: '1', label: 'Community Created' },
            { value: '2', label: 'Community Updated' },
            { value: '3', label: 'Community Deleted' },
            { value: '4', label: 'User Joined Community' },
            { value: '5', label: 'User Left Community' },
        ],
    },
    {
        category: 'Posts',
        actions: [
            { value: '10', label: 'Post Created' },
            { value: '11', label: 'Post Updated' },
            { value: '12', label: 'Post Deleted' },
            { value: '13', label: 'Post Resolved' },
        ],
    },
    {
        category: 'Comments',
        actions: [
            { value: '20', label: 'Comment Created' },
            { value: '21', label: 'Comment Updated' },
            { value: '22', label: 'Comment Deleted' },
            { value: '23', label: 'Comment Approved' },
            { value: '24', label: 'Comment Rejected' },
        ],
    },
    {
        category: 'Assignments',
        actions: [
            { value: '30', label: 'Assignment Created' },
            { value: '31', label: 'Assignment Updated' },
            { value: '32', label: 'Assignment Deleted' },
        ],
    },
    {
        category: 'Submissions',
        actions: [
            { value: '40', label: 'Submission Created' },
            { value: '41', label: 'Submission Graded' },
            { value: '42', label: 'Submission Feedback Given' },
        ],
    },
    {
        category: 'Tasks',
        actions: [
            { value: '50', label: 'Task Created' },
            { value: '51', label: 'Task Updated' },
            { value: '52', label: 'Task Deleted' },
            { value: '53', label: 'Task Assignee Invited' },
            { value: '54', label: 'Task Assignee Accepted' },
            { value: '55', label: 'Task Assignee Declined' },
            { value: '56', label: 'Task Assignee Removed' },
        ],
    },
    {
        category: 'Users',
        actions: [
            { value: '60', label: 'User Role Changed' },
            { value: '61', label: 'User Activated' },
            { value: '62', label: 'User Deactivated' },
            { value: '63', label: 'User Registered' },
            { value: '64', label: 'User Logged In' },
            { value: '65', label: 'User Logged Out' },
        ],
    },
    {
        category: 'Notes',
        actions: [
            { value: '70', label: 'Note Created' },
            { value: '71', label: 'Note Updated' },
            { value: '72', label: 'Note Deleted' },
        ],
    },
];

// Flatten action types for combobox options
const ACTION_TYPE_OPTIONS = ACTION_TYPE_GROUPS.flatMap(group =>
    group.actions.map(action => ({
        value: action.value,
        label: action.label,
        subtitle: group.category,
    }))
);

// Helper to get action type label
const getActionTypeLabel = (actionTypeId: string | number): string => {
    const option = ACTION_TYPE_OPTIONS.find(opt => opt.value === String(actionTypeId));
    return option ? `${option.label} (${option.subtitle})` : `Unknown Action (${actionTypeId})`;
};

// Helper to format description for better readability
const formatActivityDescription = (description: string | undefined, actionType: number): string => {
    if (!description) return '';
    
    // Remove redundant action phrases that are already shown in the badge
    const redundantPhrases = [
        'Created community',
        'Updated community',
        'Deleted community',
        'Created post',
        'Updated post',
        'Deleted post',
        'Resolved post',
        'Commented on post',
        'Deleted comment on post',
        'Created assignment',
        'Created task',
        'Graded a submission:',
        'Created note',
        'Deleted note',
        'Changed',
    ];
    
    let cleanDescription = description;
    
    // Try to remove redundant prefix
    for (const phrase of redundantPhrases) {
        if (cleanDescription.startsWith(phrase)) {
            cleanDescription = cleanDescription.substring(phrase.length).trim();
            // Remove leading quotes or special chars
            cleanDescription = cleanDescription.replace(/^["':]\s*/, '');
            break;
        }
    }
    
    // If description is just a quoted name, clean it up
    if (cleanDescription.match(/^"[^"]+"$/)) {
        cleanDescription = cleanDescription.replace(/^"|"$/g, '');
    }
    
    return cleanDescription || description;
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

    // Activity logs states
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [logsPage, setLogsPage] = useState(1);
    const [logsTotalPages, setLogsTotalPages] = useState(1);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    
    // Activity logs filter states
    const [logsUserIdFilter, setLogsUserIdFilter] = useState('');
    const [logsCommunityIdFilter, setLogsCommunityIdFilter] = useState('');
    const [logsActionTypeFilter, setLogsActionTypeFilter] = useState('');
    const [logsStartDateFilter, setLogsStartDateFilter] = useState('');
    const [logsEndDateFilter, setLogsEndDateFilter] = useState('');
    const [logsSortOrder, setLogsSortOrder] = useState<'asc' | 'desc'>('desc');

    // Activity logs combobox states
    const [logsUserOptions, setLogsUserOptions] = useState<Array<{ value: string; label: string; subtitle?: string }>>([]);
    const [logsCommunityOptions, setLogsCommunityOptions] = useState<Array<{ value: string; label: string; subtitle?: string }>>([]);
    const [isLoadingUserOptions, setIsLoadingUserOptions] = useState(false);
    const [isLoadingCommunityOptions, setIsLoadingCommunityOptions] = useState(false);
    const [logsUserSearchQuery, setLogsUserSearchQuery] = useState('');
    const [logsCommunitySearchQuery, setLogsCommunitySearchQuery] = useState('');

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
    const [createBadgeOpen, setCreateBadgeOpen] = useState(false);
    const [isCreatingBadge, setIsCreatingBadge] = useState(false);

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

    const fetchActivityLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const response = await adminApi.getActivityLogs({
                page: logsPage,
                limit: 20,
                userId: logsUserIdFilter ? parseInt(logsUserIdFilter) : undefined,
                communityId: logsCommunityIdFilter || undefined,
                actionType: logsActionTypeFilter ? parseInt(logsActionTypeFilter) : undefined,
                startDate: logsStartDateFilter || undefined,
                endDate: logsEndDateFilter || undefined,
                sortOrder: logsSortOrder,
            });
            setActivityLogs(response.data);
            setLogsTotalPages(response.meta.totalPages);
        } catch (error) {
            console.error('Failed to fetch activity logs:', error);
            setActivityLogs([]);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const fetchLogsUserOptions = async (query: string) => {
        if (!query.trim()) {
            setLogsUserOptions([]);
            return;
        }
        
        setIsLoadingUserOptions(true);
        try {
            const response = await userApi.getAll({
                search: query,
                limit: 20,
            });
            const options = response.data.map((u: UserItem) => ({
                value: u.id.toString(),
                label: `${u.fname} ${u.lname}`,
                subtitle: u.email,
            }));
            setLogsUserOptions(options);
        } catch (error) {
            console.error('Failed to fetch user options:', error);
            setLogsUserOptions([]);
        } finally {
            setIsLoadingUserOptions(false);
        }
    };

    const fetchLogsCommunityOptions = async (query: string) => {
        if (!query.trim()) {
            setLogsCommunityOptions([]);
            return;
        }
        
        setIsLoadingCommunityOptions(true);
        try {
            const response = await communityApi.getAll({
                search: query,
                limit: 20,
            });
            const options = response.data.map((c: CommunityItem) => ({
                value: c.id,
                label: c.name,
                subtitle: c.type,
            }));
            setLogsCommunityOptions(options);
        } catch (error) {
            console.error('Failed to fetch community options:', error);
            setLogsCommunityOptions([]);
        } finally {
            setIsLoadingCommunityOptions(false);
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

    // Fetch activity logs when filters or pagination changes
    useEffect(() => {
        const debounce = setTimeout(fetchActivityLogs, 300);
        return () => clearTimeout(debounce);
    }, [logsPage, logsUserIdFilter, logsCommunityIdFilter, logsActionTypeFilter, logsStartDateFilter, logsEndDateFilter, logsSortOrder]);

    // Fetch user options when search query changes
    useEffect(() => {
        const debounce = setTimeout(() => fetchLogsUserOptions(logsUserSearchQuery), 300);
        return () => clearTimeout(debounce);
    }, [logsUserSearchQuery]);

    // Fetch community options when search query changes
    useEffect(() => {
        const debounce = setTimeout(() => fetchLogsCommunityOptions(logsCommunitySearchQuery), 300);
        return () => clearTimeout(debounce);
    }, [logsCommunitySearchQuery]);
    

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
                                        <Button
                                            className="gap-2 ml-2 bg-turf-green-500 hover:bg-turf-green-600 text-white"
                                            onClick={() => setCreateBadgeOpen(true)}
                                        >
                                            <Award className="w-4 h-4" />
                                            Create Badge
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

                    {/* Activity Logs - Full Width */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mt-6">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-lg font-semibold text-foreground mb-4">Activity Logs</h2>
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    <div>
                                        <Combobox
                                            value={logsUserIdFilter}
                                            options={logsUserOptions}
                                            onChange={(option) => {
                                                setLogsUserIdFilter(option?.value || '');
                                                setLogsPage(1);
                                            }}
                                            onSearchChange={setLogsUserSearchQuery}
                                            placeholder="Select a user..."
                                            searchPlaceholder="Search by name or email..."
                                            isLoading={isLoadingUserOptions}
                                        />
                                    </div>
                                    <div>
                                        <Combobox
                                            value={logsCommunityIdFilter}
                                            options={logsCommunityOptions}
                                            onChange={(option) => {
                                                setLogsCommunityIdFilter(option?.value || '');
                                                setLogsPage(1);
                                            }}
                                            onSearchChange={setLogsCommunitySearchQuery}
                                            placeholder="Select a community..."
                                            searchPlaceholder="Search by community name..."
                                            isLoading={isLoadingCommunityOptions}
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={logsActionTypeFilter}
                                            onChange={(e) => {
                                                setLogsActionTypeFilter(e.target.value);
                                                setLogsPage(1);
                                            }}
                                            className="w-full px-3 py-2 bg-card border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:border-border transition-colors"
                                        >
                                            <option value="">All Action Types</option>
                                            {ACTION_TYPE_GROUPS.map(group => (
                                                <optgroup key={group.category} label={group.category}>
                                                    {group.actions.map(action => (
                                                        <option key={action.value} value={action.value}>
                                                            {action.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={logsSortOrder}
                                            onChange={(e) => {
                                                setLogsSortOrder(e.target.value as 'asc' | 'desc');
                                                setLogsPage(1);
                                            }}
                                            className="w-full px-3 py-2 bg-card border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:border-border transition-colors"
                                        >
                                            <option value="desc">Newest First</option>
                                            <option value="asc">Oldest First</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
                                        <Input
                                            type="datetime-local"
                                            value={logsStartDateFilter}
                                            onChange={(e) => {
                                                setLogsStartDateFilter(e.target.value);
                                                setLogsPage(1);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground block mb-1">End Date</label>
                                        <Input
                                            type="datetime-local"
                                            value={logsEndDateFilter}
                                            onChange={(e) => {
                                                setLogsEndDateFilter(e.target.value);
                                                setLogsPage(1);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">
                            {isLoadingLogs ? (
                                <div className="p-8 text-center">
                                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Loading activity logs...</p>
                                </div>
                            ) : activityLogs.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No activity logs found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {activityLogs.map(log => {
                                        const actionTypeInfo = ACTION_TYPE_OPTIONS.find(opt => opt.value === String(log.action_type));
                                        const timeAgo = (() => {
                                            const now = new Date();
                                            const logDate = new Date(log.date);
                                            const diffMs = now.getTime() - logDate.getTime();
                                            const diffMins = Math.floor(diffMs / 60000);
                                            const diffHours = Math.floor(diffMs / 3600000);
                                            const diffDays = Math.floor(diffMs / 86400000);
                                            
                                            if (diffMins < 1) return 'Just now';
                                            if (diffMins < 60) return `${diffMins}m ago`;
                                            if (diffHours < 24) return `${diffHours}h ago`;
                                            if (diffDays < 7) return `${diffDays}d ago`;
                                            return logDate.toLocaleDateString();
                                        })();
                                        
                                        return (
                                            <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <span className="text-sm font-semibold text-primary">
                                                                {log.User ? `${log.User.fname[0]}${log.User.lname[0]}` : '?'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {log.User ? `${log.User.fname} ${log.User.lname}` : 'Unknown User'}
                                                                </p>
                                                                {log.description && (
                                                                    <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                                                                        {formatActivityDescription(log.description, log.action_type)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {timeAgo}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            <span className="inline-flex items-center text-xs px-2 py-1 bg-primary/10 rounded-md text-primary font-medium">
                                                                {actionTypeInfo?.label || `Action ${log.action_type}`}
                                                            </span>
                                                            {log.Community && (
                                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                                                                    <Building2 className="w-3 h-3" />
                                                                    {log.Community.name}
                                                                </span>
                                                            )}
                                                            {actionTypeInfo?.subtitle && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    • {actionTypeInfo.subtitle}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {!isLoadingLogs && activityLogs.length > 0 && logsTotalPages > 1 && (
                            <div className="border-t border-border p-4 flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Page {logsPage} of {logsTotalPages}
                                </div>
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                                                aria-disabled={logsPage === 1}
                                                className={logsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: Math.min(5, logsTotalPages) }).map((_, i) => {
                                            const pageNum = Math.max(1, Math.min(logsPage - 2 + i, logsTotalPages - 4)) + i;
                                            return pageNum <= logsTotalPages ? (
                                                <PaginationItem key={pageNum}>
                                                    <PaginationLink
                                                        onClick={() => setLogsPage(pageNum)}
                                                        isActive={pageNum === logsPage}
                                                        className="cursor-pointer"
                                                    >
                                                        {pageNum}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ) : null;
                                        })}
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => setLogsPage(Math.min(logsTotalPages, logsPage + 1))}
                                                aria-disabled={logsPage === logsTotalPages}
                                                className={logsPage === logsTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
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

                        {/* Create Badge Modal */}
                        <CreateBadgeModal
                            isOpen={createBadgeOpen}
                            onClose={() => setCreateBadgeOpen(false)}
                            isLoading={isCreatingBadge}
                            onSubmit={async (data) => {
                                try {
                                    setIsCreatingBadge(true);
                                    await badgeApi.create({
                                        name: data.name,
                                        description: data.description,
                                        rarity: data.rarity,
                                    });
                                    toast.success('Badge created successfully');
                                    setCreateBadgeOpen(false);
                                } catch (err) {
                                    console.error('Failed to create badge:', err);
                                    toast.error('Failed to create badge');
                                    throw err;
                                } finally {
                                    setIsCreatingBadge(false);
                                }
                            }}
                        />
        </div>
    );
};

export default AdminDashboard;

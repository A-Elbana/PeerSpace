import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from '../components/dashboard';
import { Flame, Clock, Filter, MessageSquare, ArrowBigUp, ArrowBigDown, Share2, MoreHorizontal, Loader2, Sparkles, Users, BookOpen, Rocket, Send, Megaphone, Lock, Search, X, Tag } from 'lucide-react';
import api, { communityApi, postApi, type CommunityResponse, type PostResponse } from '../services/api';
import { removeTokens } from '../utils/auth';

// Available post tags
const POST_TAGS = [
    { id: 'math', label: 'Math', color: 'bg-blue-500', textColor: 'text-blue-500', bgLight: 'bg-blue-500/10' },
    { id: 'scientific', label: 'Scientific', color: 'bg-green-500', textColor: 'text-green-500', bgLight: 'bg-green-500/10' },
    { id: 'puzzles', label: 'Puzzles', color: 'bg-purple-500', textColor: 'text-purple-500', bgLight: 'bg-purple-500/10' },
] as const;

interface ExploreProps {
    onLogout: () => void;
}

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
    id: number;
    email: string;
    fname: string;
    lname: string;
    role: UserRole;
    avatar_url?: string;
}

interface CommunityWithMeta extends CommunityResponse {
    memberCount?: number;
    postCount?: number;
}

const Explore: React.FC<ExploreProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('popular');
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [communities, setCommunities] = useState<CommunityWithMeta[]>([]);
    const [privateCommunities, setPrivateCommunities] = useState<CommunityWithMeta[]>([]);
    const [posts, setPosts] = useState<PostResponse[]>([]);
    const [selectedCommunity, setSelectedCommunity] = useState<string>('');
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostBody, setNewPostBody] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
    const [enrolledCommunityIds, setEnrolledCommunityIds] = useState<Set<string>>(new Set());

    // Set page title
    useEffect(() => {
        document.title = 'PeerSpace - Explore';
    }, []);

    // Lazy loading states
    const [displayedPosts, setDisplayedPosts] = useState<PostResponse[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const POSTS_PER_PAGE = 5;
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Filter states
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const [postTitleSearch, setPostTitleSearch] = useState('');
    const [communityFilterSearch, setCommunityFilterSearch] = useState('');
    const [isCommunityFilterOpen, setIsCommunityFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const communityFilterRef = useRef<HTMLDivElement>(null);

    // Load more posts
    const loadMorePosts = useCallback(() => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);

        // Simulate a small delay for smooth UX
        setTimeout(() => {
            const currentLength = displayedPosts.length;
            const nextPosts = posts.slice(currentLength, currentLength + POSTS_PER_PAGE);

            if (nextPosts.length > 0) {
                setDisplayedPosts(prev => [...prev, ...nextPosts]);
            }

            if (currentLength + nextPosts.length >= posts.length) {
                setHasMore(false);
            }

            setIsLoadingMore(false);
        }, 300);
    }, [displayedPosts.length, posts, isLoadingMore, hasMore]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMorePosts();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [loadMorePosts, hasMore, isLoadingMore]);

    // Close filter dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
            if (communityFilterRef.current && !communityFilterRef.current.contains(event.target as Node)) {
                setIsCommunityFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialize displayed posts when posts change
    useEffect(() => {
        if (posts.length > 0) {
            setDisplayedPosts(posts.slice(0, POSTS_PER_PAGE));
            setHasMore(posts.length > POSTS_PER_PAGE);
        } else {
            setDisplayedPosts([]);
            setHasMore(false);
        }
    }, [posts]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);

                // Fetch user data
                const { data } = await api.get('/auth/me');
                const normalizedUser: UserData = {
                    ...data,
                    role: data.role?.toLowerCase() as UserRole
                };
                setUser(normalizedUser);

                // Fetch public communities
                const communitiesResponse = await communityApi.getAll({ type: 'PUBLIC', limit: 50 });
                setCommunities(communitiesResponse.data);

                // Fetch private communities (user's enrolled/managed private communities)
                const privateCommunitiesResponse = await communityApi.getAll({ type: 'PRIVATE', limit: 50 });
                setPrivateCommunities(privateCommunitiesResponse.data);

                // Check enrollment status for all communities
                const allCommunities = [...communitiesResponse.data, ...privateCommunitiesResponse.data];
                const enrolledIds = new Set<string>();

                // Fetch members for each community and check if current user is enrolled
                await Promise.all(
                    allCommunities.map(async (community) => {
                        try {
                            const membersResponse = await communityApi.getMembers(community.id, { limit: 100 });
                            const isEnrolled = membersResponse.data.students.some(
                                (student: { id: number }) => student.id === normalizedUser.id
                            );
                            if (isEnrolled) {
                                enrolledIds.add(community.id);
                            }
                        } catch (err) {
                            // User might not have access to some communities
                            console.log(`Could not fetch members for community ${community.id}`);
                        }
                    })
                );

                setEnrolledCommunityIds(enrolledIds);

                // Fetch posts from all public communities
                await fetchPostsFromCommunities(communitiesResponse.data);

            } catch (error) {
                console.error('Failed to fetch data:', error);
                removeTokens();
                navigate('/login');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [navigate]);

    const fetchPostsFromCommunities = async (communityList: CommunityResponse[]) => {
        try {
            const allPosts: PostResponse[] = [];

            for (const community of communityList.slice(0, 10)) { // Limit to first 10 communities
                try {
                    const postsResponse = await postApi.getByCommunity(community.id, { limit: 10 });
                    allPosts.push(...postsResponse.data);
                } catch (err) {
                    console.error(`Failed to fetch posts for community ${community.id}:`, err);
                }
            }

            // Sort by date (newest first)
            allPosts.sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime());
            setPosts(allPosts);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        }
    };

    const handleCreatePost = async () => {
        if (!selectedCommunity || !newPostTitle.trim() || !newPostBody.trim()) return;

        setIsCreatingPost(true);
        try {
            const newPost = await postApi.create({
                title: newPostTitle.trim(),
                body: newPostBody.trim(),
                type: selectedTags.length > 0 ? selectedTags.join(',') : 'discussion',
                cid: selectedCommunity,
            });

            // Add the new post to the top of the list
            setPosts(prev => [{
                ...newPost,
                User: {
                    id: user!.id,
                    fname: user!.fname,
                    lname: user!.lname,
                    avatar_url: user!.avatar_url || null,
                },
                _count: { Comment: 0 },
            }, ...prev]);

            // Reset form
            setNewPostTitle('');
            setNewPostBody('');
            setSelectedCommunity('');
            setSelectedTags([]);
            toast.success('Post created successfully!');
        } catch (err: any) {
            console.error('Failed to create post:', err);
            toast.error(err.response?.data?.message || 'Failed to create post');
        } finally {
            setIsCreatingPost(false);
        }
    };

    const handleJoinCommunity = async (communityId: string) => {
        if (user?.role !== 'student') {
            toast.warning('Only students can enroll in communities');
            return;
        }

        // Check if already enrolled
        if (enrolledCommunityIds.has(communityId)) {
            toast.info('You are already enrolled in this community');
            return;
        }

        setJoiningCommunityId(communityId);
        try {
            await communityApi.enroll(communityId);
            // Add to enrolled set
            setEnrolledCommunityIds(prev => new Set([...prev, communityId]));
            toast.success('Successfully enrolled in community!');
        } catch (err: any) {
            console.error('Failed to join community:', err);
            // If already enrolled error from backend, add to enrolled set
            if (err.response?.status === 409) {
                setEnrolledCommunityIds(prev => new Set([...prev, communityId]));
            }
            toast.error(err.response?.data?.message || 'Failed to join community');
        } finally {
            setJoiningCommunityId(null);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getCommunityName = (cid: string) => {
        const community = communities.find(c => c.id === cid);
        return community?.name || 'Unknown';
    };

    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar onLogout={onLogout} />

            {/* Main Content Area */}
            <main className="flex-1 ml-20 p-6 transition-all duration-300 flex justify-center">
                <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Feed Column (Center) */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Welcome Header with decorative elements */}
                        <div className="mb-4 relative">
                            <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                        Welcome back, {user.fname}!
                                    </h1>
                                    <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                                </div>
                                <p className="text-muted-foreground text-sm">Explore public communities and join the conversation.</p>
                            </div>
                        </div>

                        {/* Create Post Input */}
                        <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-3 relative overflow-hidden group">
                            {/* Animated border gradient on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500 rounded-xl" />

                            <div className="flex items-start gap-3 relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-blue-500/20">
                                    {user.fname[0]}
                                </div>
                                <div className="flex-1 bg-muted/50 border border-input rounded-md flex flex-col overflow-hidden focus-within:border-ring transition-colors">
                                    <div className="flex border-b border-input">
                                        <select
                                            value={selectedCommunity}
                                            onChange={(e) => setSelectedCommunity(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors cursor-pointer focus:outline-none"
                                        >
                                            <option value="">Select Community</option>
                                            {communities.map((community) => (
                                                <option key={community.id} value={community.id}>
                                                    {community.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Tags Selection */}
                                    <div className="px-3 py-2 border-b border-input bg-muted/30 flex items-center gap-2 flex-wrap">
                                        <Tag size={12} className="text-muted-foreground flex-shrink-0" />
                                        {POST_TAGS.map((tag) => {
                                            const isSelected = selectedTags.includes(tag.id);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedTags(prev => prev.filter(t => t !== tag.id));
                                                        } else {
                                                            setSelectedTags(prev => [...prev, tag.id]);
                                                        }
                                                    }}
                                                    className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all ${isSelected
                                                        ? `${tag.bgLight} ${tag.textColor} ring-1 ring-current`
                                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        }`}
                                                >
                                                    {tag.label}
                                                </button>
                                            );
                                        })}
                                        {selectedTags.length > 0 && (
                                            <button
                                                onClick={() => setSelectedTags([])}
                                                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Post title..."
                                        value={newPostTitle}
                                        onChange={(e) => setNewPostTitle(e.target.value)}
                                        className="bg-transparent px-4 py-2 text-sm font-medium focus:outline-none text-foreground placeholder-muted-foreground border-b border-input"
                                    />
                                    <textarea
                                        placeholder="What's on your mind? (Shift+Enter for new line)"
                                        value={newPostBody}
                                        onChange={(e) => setNewPostBody(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && selectedCommunity && newPostTitle.trim() && newPostBody.trim()) {
                                                e.preventDefault();
                                                handleCreatePost();
                                            }
                                        }}
                                        rows={2}
                                        className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-foreground placeholder-muted-foreground resize-none min-h-[60px]"
                                    />
                                </div>
                                <button
                                    onClick={handleCreatePost}
                                    disabled={!selectedCommunity || !newPostTitle.trim() || !newPostBody.trim() || isCreatingPost}
                                    className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/30 group/btn mt-1"
                                >
                                    {isCreatingPost ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} className="transform -rotate-45 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mb-2">
                            <button
                                onClick={() => setActiveTab('popular')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors ${activeTab === 'popular' ? 'text-primary bg-muted' : ''}`}
                            >
                                <Flame size={18} /> Popular
                            </button>
                            <button
                                onClick={() => setActiveTab('new')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors ${activeTab === 'new' ? 'text-primary bg-muted' : ''}`}
                            >
                                <Clock size={18} /> New
                            </button>
                            <button
                                onClick={() => setActiveTab('top')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors ${activeTab === 'top' ? 'text-primary bg-muted' : ''}`}
                            >
                                <ArrowBigUp size={18} /> Top
                            </button>

                            {/* Filter by Post Title */}
                            <div className="relative ml-auto" ref={filterRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors ${postTitleSearch ? 'text-primary bg-muted' : ''}`}
                                >
                                    <Filter size={18} />
                                    {postTitleSearch && (
                                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">1</span>
                                    )}
                                </button>

                                {/* Filter Dropdown */}
                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-3">
                                            <label className="text-xs font-medium text-muted-foreground mb-2 block">Search by post title</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    placeholder="Search posts..."
                                                    value={filterSearch}
                                                    onChange={(e) => {
                                                        setFilterSearch(e.target.value);
                                                        setPostTitleSearch(e.target.value);
                                                    }}
                                                    className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground"
                                                    autoFocus
                                                />
                                            </div>
                                            {postTitleSearch && (
                                                <button
                                                    onClick={() => {
                                                        setPostTitleSearch('');
                                                        setFilterSearch('');
                                                    }}
                                                    className="mt-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 text-destructive rounded-lg"
                                                >
                                                    <X size={16} />
                                                    Clear search
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active Search Badge */}
                        {postTitleSearch && (
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm text-muted-foreground">Searching:</span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                                    "{postTitleSearch}"
                                    <button
                                        onClick={() => {
                                            setPostTitleSearch('');
                                            setFilterSearch('');
                                        }}
                                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            </div>
                        )}

                        {/* Posts List */}
                        {(postTitleSearch ? posts.filter(p => p.title.toLowerCase().includes(postTitleSearch.toLowerCase())).length === 0 : posts.length === 0) ? (
                            <div className="bg-card rounded-xl border border-border p-12 text-center relative overflow-hidden">
                                {/* Decorative background elements */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
                                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-green-500/10 to-blue-500/10 rounded-full blur-3xl" />
                                </div>

                                {/* Illustration */}
                                <div className="relative mb-6">
                                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                                        <Rocket className="w-12 h-12 text-blue-500" />
                                    </div>
                                    <div className="absolute top-0 right-1/3 animate-pulse">
                                        <Sparkles className="w-6 h-6 text-yellow-500" />
                                    </div>
                                    <div className="absolute bottom-0 left-1/3 animate-pulse delay-300">
                                        <Sparkles className="w-4 h-4 text-purple-500" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {postTitleSearch ? 'No posts found' : 'No posts yet'}
                                </h3>
                                <p className="text-muted-foreground text-sm mb-4">
                                    {postTitleSearch
                                        ? 'Try a different search term'
                                        : 'Be the first to share something with the community!'
                                    }
                                </p>
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{postTitleSearch ? 'Clear the search to see all posts' : 'Select a community above and start a conversation'}</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {displayedPosts
                                    .filter(post => !postTitleSearch || post.title.toLowerCase().includes(postTitleSearch.toLowerCase()))
                                    .map((post) => (
                                        <PostCard
                                            key={post.id}
                                            communityId={post.cid}
                                            subreddit={getCommunityName(post.cid)}
                                            author={`${post.User.fname}_${post.User.lname.charAt(0).toLowerCase()}`}
                                            time={formatTimeAgo(post.post_date)}
                                            title={post.title}
                                            content={post.body || ''}
                                            upvotes={0}
                                            comments={post._count?.Comment || 0}
                                            postType={post.type}
                                            onNavigate={(id: string) => navigate(`/community/${id}`)}
                                        />
                                    ))}

                                {/* Load More Trigger */}
                                <div ref={loadMoreRef} className="py-4">
                                    {isLoadingMore && (
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                            <span className="text-sm text-muted-foreground">Loading more posts...</span>
                                        </div>
                                    )}
                                    {!hasMore && displayedPosts.length > 0 && (
                                        <div className="text-center py-4">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
                                                <Sparkles className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm text-muted-foreground">You've seen all posts!</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="hidden lg:block space-y-6 sticky top-6 self-start h-fit">

                        {/* Public Communities */}
                        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
                            {/* Decorative corner accent */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    Public Communities
                                </h3>

                                {/* Community Filter */}
                                <div className="relative" ref={communityFilterRef}>
                                    <button
                                        onClick={() => setIsCommunityFilterOpen(!isCommunityFilterOpen)}
                                        className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${communityFilterSearch ? 'text-primary bg-muted' : 'text-muted-foreground'}`}
                                    >
                                        <Filter size={14} />
                                    </button>

                                    {/* Community Filter Dropdown */}
                                    {isCommunityFilterOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-3">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search communities..."
                                                        value={communityFilterSearch}
                                                        onChange={(e) => setCommunityFilterSearch(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground"
                                                        autoFocus
                                                    />
                                                </div>
                                                {communityFilterSearch && (
                                                    <button
                                                        onClick={() => setCommunityFilterSearch('')}
                                                        className="mt-2 w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors flex items-center gap-2 text-destructive rounded-lg"
                                                    >
                                                        <X size={14} />
                                                        Clear search
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Active Community Search Badge */}
                            {communityFilterSearch && (
                                <div className="flex items-center gap-1.5 mb-3 text-xs">
                                    <span className="text-muted-foreground">Filtering:</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 font-medium rounded-full">
                                        "{communityFilterSearch}"
                                        <button
                                            onClick={() => setCommunityFilterSearch('')}
                                            className="hover:bg-blue-500/20 rounded-full transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                </div>
                            )}

                            <div className="space-y-4">
                                {communities.filter(c => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase())).length === 0 ? (
                                    <div className="text-center py-6">
                                        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                                            <Users className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {communityFilterSearch ? 'No communities match your search.' : 'No public communities found.'}
                                        </p>
                                    </div>
                                ) : (
                                    communities
                                        .filter(c => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase()))
                                        .slice(0, 5)
                                        .map((community, index) => (
                                            <CommunityItem
                                                key={community.id}
                                                communityId={community.id}
                                                name={community.name}
                                                description={community.description || 'No description'}
                                                color={['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500'][index % 5]}
                                                isJoining={joiningCommunityId === community.id}
                                                onJoin={() => handleJoinCommunity(community.id)}
                                                isStudent={user.role === 'student'}
                                                isEnrolled={enrolledCommunityIds.has(community.id)}
                                                onNavigate={(id: string) => navigate(`/community/${id}`)}
                                            />
                                        ))
                                )}
                            </div>
                            {communities.filter(c => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase())).length > 5 && (
                                <button className="w-full mt-4 py-2 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground">
                                    View All ({communities.filter(c => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase())).length})
                                </button>
                            )}
                        </div>

                        {/* Private Communities */}
                        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
                            {/* Decorative corner accent */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full" />

                            <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-4 h-4 text-purple-500" />
                                Private Communities
                            </h3>
                            <div className="space-y-4">
                                {privateCommunities.length === 0 ? (
                                    <div className="text-center py-6">
                                        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
                                            <Lock className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">No private communities yet.</p>
                                        <p className="text-xs text-muted-foreground mt-1">Join or create one to see it here.</p>
                                    </div>
                                ) : (
                                    privateCommunities.slice(0, 5).map((community, index) => (
                                        <CommunityItem
                                            key={community.id}
                                            communityId={community.id}
                                            name={community.name}
                                            description={community.description || 'No description'}
                                            color={['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500'][index % 5]}
                                            isJoining={joiningCommunityId === community.id}
                                            onJoin={() => handleJoinCommunity(community.id)}
                                            isStudent={user.role === 'student'}
                                            isPrivate
                                            isEnrolled={enrolledCommunityIds.has(community.id)}
                                            onNavigate={(id: string) => navigate(`/community/${id}`)}
                                        />
                                    ))
                                )}
                            </div>
                            {privateCommunities.length > 5 && (
                                <button className="w-full mt-4 py-2 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground">
                                    View All ({privateCommunities.length})
                                </button>
                            )}
                        </div>

                        {/* Dynamic Widget based on Role */}
                        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
                            {/* Decorative gradient */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />

                            <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-500" />
                                {user.role === 'instructor' ? 'Pending Actions' : 'Upcoming Deadlines'}
                            </h3>
                            <div className="space-y-3">
                                {user.role === 'instructor' ? (
                                    <>
                                        <DeadlineItem course="Database" task="Grade Phase 3 Reports" due="12 pending" isInstructor />
                                        <DeadlineItem course="Algorithms" task="Review Midterm Questions" due="Today" isInstructor />
                                    </>
                                ) : (
                                    <>
                                        <DeadlineItem course="Database" task="Phase 3 Report" due="Tomorrow" />
                                        <DeadlineItem course="Web Dev" task="React Project" due="In 3 days" />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Helper Components

const PostCard = ({ communityId, subreddit, author, time, title, content, image, upvotes, comments, postType, onNavigate }: any) => {
    const tags = postType?.split(',').map((t: string) => t.trim().toLowerCase()) || [];
    const isAnnouncement = tags.includes('announcement');

    const getTagStyle = (tag: string) => {
        const styles: Record<string, { bg: string; text: string }> = {
            announcement: { bg: 'bg-gradient-to-r from-yellow-500 to-orange-500', text: 'text-white' },
            math: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
            scientific: { bg: 'bg-green-500/10', text: 'text-green-500' },
            puzzles: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
            discussion: { bg: 'bg-gray-500/10', text: 'text-gray-500' },
        };
        return styles[tag] || styles.discussion;
    };

    return (
        <div className={`bg-card rounded-xl border ${isAnnouncement ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-border'} hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden group`}>
            <div className="flex">
                {/* Announcement Indicator or Vote Bar */}
                {isAnnouncement ? (
                    <div className="w-12 bg-gradient-to-b from-yellow-500/20 to-orange-500/20 flex flex-col items-center justify-center py-3 border-r border-yellow-500/30">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30 animate-pulse">
                            <Megaphone size={16} className="text-white" />
                        </div>
                    </div>
                ) : (
                    <div className="w-10 bg-gradient-to-b from-muted/50 to-muted/30 flex flex-col items-center py-3 gap-1">
                        <button className="text-muted-foreground hover:text-orange-500 transition-colors"><ArrowBigUp size={24} /></button>
                        <span className="text-sm font-bold text-foreground">{upvotes}</span>
                        <button className="text-muted-foreground hover:text-blue-500 transition-colors"><ArrowBigDown size={24} /></button>
                    </div>
                )}

                {/* Content */}
                <div className="p-3 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">{subreddit.substring(0, 1)}</div>
                        <button
                            onClick={() => onNavigate && onNavigate(communityId)}
                            className="font-bold text-foreground hover:underline hover:text-blue-500 transition-colors cursor-pointer"
                        >
                            {subreddit}
                        </button>
                        {/* Display all tags */}
                        {tags.length > 0 && tags.map((tag: string, index: number) => {
                            const style = getTagStyle(tag);
                            return (
                                <span
                                    key={index}
                                    className={`px-2 py-0.5 ${style.bg} ${style.text} text-[10px] font-bold rounded-full capitalize`}
                                >
                                    {tag}
                                </span>
                            );
                        })}
                        <span>•</span>
                        <span>Posted by u/{author}</span>
                        <span>•</span>
                        <span>{time}</span>
                    </div>

                    <h3 className={`text-lg font-semibold mb-2 leading-snug ${isAnnouncement ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>{title}</h3>
                    {content && <p className="text-muted-foreground text-sm mb-3 line-clamp-3">{content}</p>}

                    {image && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-border">
                            <img src={image} alt="Post content" className="w-full h-auto object-cover" />
                        </div>
                    )}

                    <div className="flex items-center gap-1 text-muted-foreground text-xs font-bold">
                        <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md transition-colors">
                            <MessageSquare size={16} /> {comments} Comments
                        </button>
                        <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md transition-colors">
                            <Share2 size={16} /> Share
                        </button>
                        <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md transition-colors">
                            <MoreHorizontal size={16} /> More
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CommunityItem = ({ communityId, name, description, color, isJoining, onJoin, isStudent, isPrivate, isEnrolled, onNavigate }: any) => (
    <div className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md relative`}>
                {name.substring(0, 1).toUpperCase()}
                {isPrivate && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-background rounded-full flex items-center justify-center border border-border">
                        <Lock size={10} className="text-purple-500" />
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <button
                    onClick={() => onNavigate(communityId)}
                    className="text-sm font-medium text-foreground group-hover:text-blue-500 transition-colors truncate flex items-center gap-1 hover:underline cursor-pointer text-left"
                >
                    {name}
                    {isPrivate && <Lock size={12} className="text-purple-500 flex-shrink-0" />}
                </button>
                <div className="text-xs text-muted-foreground truncate">{description}</div>
            </div>
        </div>
        {isStudent && !isPrivate && (
            isEnrolled ? (
                <span className="px-3 py-1 bg-green-500/10 text-green-600 text-xs font-bold rounded-full flex-shrink-0 ml-2">
                    Enrolled
                </span>
            ) : (
                <button
                    onClick={onJoin}
                    disabled={isJoining}
                    className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 flex-shrink-0 ml-2 shadow-sm hover:shadow-md"
                >
                    {isJoining ? <Loader2 size={12} className="animate-spin" /> : 'Enroll'}
                </button>
            )
        )}
    </div>
);

const DeadlineItem = ({ course, task, due, isInstructor }: any) => (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer group">
        <div className={`w-1.5 h-12 ${isInstructor ? 'bg-gradient-to-b from-yellow-400 to-orange-500' : 'bg-gradient-to-b from-red-400 to-pink-500'} rounded-full flex-shrink-0 group-hover:scale-110 transition-transform`} />
        <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground truncate group-hover:text-blue-500 transition-colors">{task}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="truncate">{course}</span>
                <span>•</span>
                <span className={`${isInstructor ? 'text-yellow-600' : 'text-red-500'} font-medium`}>
                    {isInstructor ? 'Pending: ' : 'Due '}{due}
                </span>
            </div>
        </div>
    </div>
);

export default Explore;

// --- Search Results Types ---
interface SearchedCommunity {
    id: string;
    name: string;
    description?: string;
    type?: string;
}
interface SearchedPost {
    id: number;
    title: string;
    cid: string;
    User?: { fname: string; lname: string };
    post_date: string;
    body?: string;
}
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from '../components/dashboard';
import Header from '../components/Header';
import { useSidebar } from '../contexts/SidebarContext';
import { Flame, Clock, Filter, Loader2, Sparkles, Users, BookOpen, Rocket, Send, Lock, Search, X, ArrowBigUp } from 'lucide-react';
import CreatePostWidget from '../components/posts/CreatePostWidget';
import api, { communityApi, postApi, assignmentApi, submissionApi, type CommunityResponse, type PostResponse } from '../services/api';
import PostCard from '../components/posts/PostCard';
import { removeTokens } from '../utils/auth';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { PostModal } from '../components/posts';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

// Available post tags
const POST_TAGS = [
    { id: 'math', label: 'Math', color: 'bg-tech-blue-500', textColor: 'text-tech-blue-600', bgLight: 'bg-tech-blue-500/10' },
    { id: 'scientific', label: 'Scientific', color: 'bg-turf-green-500', textColor: 'text-turf-green-600', bgLight: 'bg-turf-green-500/10' },
    { id: 'puzzles', label: 'Puzzles', color: 'bg-royal-gold-500', textColor: 'text-royal-gold-600', bgLight: 'bg-royal-gold-500/10' },
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
    avatar_file_id?: string;
}

interface CommunityWithMeta extends CommunityResponse {
    memberCount?: number;
    postCount?: number;
}
// Using shared components
import CommunityItem from '../components/common/CommunityItem';
import DeadlineItem from '../components/common/DeadlineItem';

const Explore: React.FC<ExploreProps> = ({ onLogout }) => {
    const { sidebarWidth } = useSidebar();
    // Search state
    const [exploreSearch, setExploreSearch] = useState('');
    const [searchedPosts, setSearchedPosts] = useState<SearchedPost[]>([]);
    const [searchedCommunities, setSearchedCommunities] = useState<SearchedCommunity[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Debounced search effect
    useEffect(() => {
        if (!exploreSearch.trim()) {
            setSearchedPosts([]);
            setSearchedCommunities([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const timeout = setTimeout(async () => {
            try {
                const [postsRes, commRes] = await Promise.all([
                    postApi.getAll({ search: exploreSearch, limit: 5 }),
                    communityApi.getAll({ search: exploreSearch, limit: 5 })
                ]);
                setSearchedPosts(
                    (postsRes.data || []).map((post: any) => ({
                        ...post,
                        body: post.body ?? undefined,
                    }))
                );
                setSearchedCommunities(
                    (commRes.data || []).map((comm: any) => ({
                        ...comm,
                        description: comm.description ?? undefined,
                    }))
                );
            } catch (err) {
                setSearchedPosts([]);
                setSearchedCommunities([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [exploreSearch]);
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

    // Community Pagination
    const COMMUNITIES_PER_PAGE = 4;
    const [publicPage, setPublicPage] = useState(1);
    const [privatePage, setPrivatePage] = useState(1);
    const [hasMorePublic, setHasMorePublic] = useState(true);
    const [hasMorePrivate, setHasMorePrivate] = useState(true);
    const [isLoadingPublic, setIsLoadingPublic] = useState(false);
    const [isLoadingPrivate, setIsLoadingPrivate] = useState(false);

    // Edit/Delete State
    const [editingPost, setEditingPost] = useState<PostResponse | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [deletePostId, setDeletePostId] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initial load state
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
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Deadline/Submission state
    const [deadlines, setDeadlines] = useState<any[]>([]);
    const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);

    const handleLoadMorePublic = async () => {
        if (isLoadingPublic || !hasMorePublic) return;
        setIsLoadingPublic(true);
        try {
            const nextPage = publicPage + 1;
            const response = await communityApi.getAll({ type: 'PUBLIC', limit: COMMUNITIES_PER_PAGE, page: nextPage });

            if (response.data.length > 0) {
                setCommunities(prev => [...prev, ...response.data]);
                setPublicPage(nextPage);
                setHasMorePublic(response.data.length === COMMUNITIES_PER_PAGE);

                // Check enrollment for new communities
                // Note: ideally we should refactor checkEnrollment to be reusable, but for now we trust the flow or ignore immediate check for new badges until refresh
                // or we can just run the check for these new ones:
                await checkEnrollmentStatus(response.data, user);
            } else {
                setHasMorePublic(false);
            }
        } catch (error) {
            console.error('Failed to load more public communities', error);
        } finally {
            setIsLoadingPublic(false);
        }
    };

    const handleLoadMorePrivate = async () => {
        if (isLoadingPrivate || !hasMorePrivate) return;
        setIsLoadingPrivate(true);
        try {
            const nextPage = privatePage + 1;
            const response = await communityApi.getAll({ type: 'PRIVATE', limit: COMMUNITIES_PER_PAGE, page: nextPage });

            if (response.data.length > 0) {
                setPrivateCommunities(prev => [...prev, ...response.data]);
                setPrivatePage(nextPage);
                setHasMorePrivate(response.data.length === COMMUNITIES_PER_PAGE);
                await checkEnrollmentStatus(response.data, user);
            } else {
                setHasMorePrivate(false);
            }
        } catch (error) {
            console.error('Failed to load more private communities', error);
        } finally {
            setIsLoadingPrivate(false);
        }
    };

    const checkEnrollmentStatus = async (communitiesToCheck: CommunityWithMeta[], currentUser: UserData | null) => {
        if (!currentUser) return;
        await Promise.all(
            communitiesToCheck.map(async (community) => {
                try {
                    const membersResponse = await communityApi.getMembers(community.id, { limit: 100 });
                    const isEnrolled = membersResponse.data.students.some(
                        (student: { id: number }) => student.id === currentUser.id
                    );
                    if (isEnrolled) {
                        setEnrolledCommunityIds(prev => new Set(prev).add(community.id));
                    }
                } catch {
                    // ignore
                }
            })
        );
    };

    // Load more posts
    const loadMorePosts = useCallback(() => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);

        const currentLength = displayedPosts.length;
        const nextPosts = posts.slice(currentLength, currentLength + POSTS_PER_PAGE);

        if (nextPosts.length > 0) {
            setDisplayedPosts(prev => [...prev, ...nextPosts]);
        }

        if (currentLength + nextPosts.length >= posts.length) {
            setHasMore(false);
        }

        setIsLoadingMore(false);
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
                const communitiesResponse = await communityApi.getAll({ type: 'PUBLIC', limit: COMMUNITIES_PER_PAGE, page: 1 });
                setCommunities(communitiesResponse.data);
                setHasMorePublic(communitiesResponse.data.length === COMMUNITIES_PER_PAGE);

                // Fetch private communities (user's enrolled/managed private communities)
                const privateCommunitiesResponse = await communityApi.getAll({ type: 'PRIVATE', limit: COMMUNITIES_PER_PAGE, page: 1 });
                setPrivateCommunities(privateCommunitiesResponse.data);
                setHasMorePrivate(privateCommunitiesResponse.data.length === COMMUNITIES_PER_PAGE);

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
                        } catch {
                            // User might not have access to some communities
                            console.log(`Could not fetch members for community ${community.id}`);
                        }
                    })
                );

                setEnrolledCommunityIds(enrolledIds);

                // Fetch posts from all public communities
                await fetchPostsFromCommunities(communitiesResponse.data);

                // Fetch deadlines/submissions based on role
                if (normalizedUser.role === 'student') {
                    // Fetch assignments for enrolled communities
                    const enrolledCommunities = allCommunities.filter(c => enrolledIds.has(c.id));
                    const assignmentPromises = enrolledCommunities.map(async (community) => {
                        try {
                            const assignmentsResponse = await assignmentApi.getByCommunity(community.id, { limit: 50 });
                            return assignmentsResponse.data.map((a: any) => ({
                                ...a,
                                communityName: community.name,
                            }));
                        } catch {
                            return [];
                        }
                    });
                    const allAssignments = (await Promise.all(assignmentPromises)).flat();

                    // Fetch student's submissions to filter out already submitted assignments
                    let submittedAssignmentIds = new Set<number>();
                    try {
                        const mySubmissions = await submissionApi.getMySubmissions({ limit: 100 });
                        submittedAssignmentIds = new Set(mySubmissions.data.map(sub => sub.aid));
                    } catch (error) {
                        console.error('Failed to fetch submissions:', error);
                    }

                    // Filter out submitted assignments and sort by due date
                    const sortedAssignments = allAssignments
                        .filter(a => a.due_date && !submittedAssignmentIds.has(a.id))
                        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                        .slice(0, 3);
                    setDeadlines(sortedAssignments);
                } else if (normalizedUser.role === 'instructor') {
                    // Fetch assignments with ungraded submissions (grouped by assignment)
                    const assignmentPromises = allCommunities.map(async (community) => {
                        try {
                            const assignmentsResponse = await assignmentApi.getByCommunity(community.id, { limit: 50 });
                            return assignmentsResponse.data.map((a: any) => ({ ...a, communityName: community.name }));
                        } catch {
                            return [];
                        }
                    });
                    const allAssignments = (await Promise.all(assignmentPromises)).flat();

                    // For each assignment, count ungraded submissions
                    const assignmentsWithPendingCount = await Promise.all(
                        allAssignments.map(async (assignment) => {
                            try {
                                const submissionsResponse = await submissionApi.getByAssignment(assignment.id, { limit: 100 });
                                const ungradedCount = submissionsResponse.data.filter(sub => sub.grade === null).length;
                                return {
                                    ...assignment,
                                    ungradedCount
                                };
                            } catch {
                                return { ...assignment, ungradedCount: 0 };
                            }
                        })
                    );

                    // Filter to only assignments with ungraded submissions, sort by count, take top 3
                    const pendingAssignments = assignmentsWithPendingCount
                        .filter(a => a.ungradedCount > 0)
                        .sort((a, b) => b.ungradedCount - a.ungradedCount)
                        .slice(0, 3);

                    setPendingSubmissions(pendingAssignments);
                }

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
                    avatar_file_id: user!.avatar_file_id || null,
                },
                _count: { Comment: 0 },
            }, ...prev]);

            // Reset form
            setNewPostTitle('');
            setNewPostBody('');
            setSelectedCommunity('');
            setSelectedTags([]);
            toast.success('Post created successfully!');
        } catch (err: unknown) {
            console.error('Failed to create post:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to create post');
        } finally {
            setIsCreatingPost(false);
        }
    };

    const handleDeletePost = (postId: number) => {
        setDeletePostId(postId);
        setShowDeleteModal(true);
    };

    const confirmDeletePost = async () => {
        if (!deletePostId) return;

        setIsDeleting(true);
        try {
            await postApi.delete(deletePostId);
            setPosts(prev => prev.filter(p => p.id !== deletePostId));
            setDisplayedPosts(prev => prev.filter(p => p.id !== deletePostId));
            toast.success('Post deleted successfully');
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Failed to delete post:', error);
            toast.error('Failed to delete post');
        } finally {
            setIsDeleting(false);
            setDeletePostId(null);
        }
    };

    const handleEditPost = (post: PostResponse) => {
        setEditingPost(post);
        setShowEditModal(true);
    };

    const handleEditSuccess = (updatedPost: PostResponse) => {
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        setDisplayedPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        setShowEditModal(false);
        setEditingPost(null);
        toast.success('Post updated successfully');
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
        } catch (err: unknown) {
            console.error('Failed to join community:', err);
            const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
            // If already enrolled error from backend, add to enrolled set
            if (axiosError.response?.status === 409) {
                setEnrolledCommunityIds(prev => new Set([...prev, communityId]));
            }
            toast.error(axiosError.response?.data?.message || 'Failed to join community');
        } finally {
            setJoiningCommunityId(null);
        }
    };

    const getCommunityName = (cid: string) => {
        const community = communities.find(c => c.id === cid);
        return community?.name || 'Unknown';
    };

    // Render the page immediately and show skeletons for backend-driven parts while loading.

    // ...existing code...

    return (
        <>
            <Header
                user={user}
                onLogout={onLogout}
                searchValue={exploreSearch}
                onSearchChange={setExploreSearch}
                searchedPosts={searchedPosts}
                searchedCommunities={searchedCommunities}
                isSearching={isSearching}
            />
            <div className="flex min-h-screen bg-background text-foreground font-sans">
                <Sidebar onLogout={onLogout} />

                {/* Main Content Area */}
                <main
                    className="flex-1 p-4 sm:p-6 transition-all duration-300"
                    style={{ marginLeft: `${sidebarWidth}px` }}
                >
                    <div className="w-full max-w-7xl mx-auto">
                        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                            {/* Feed Column (Center) */}
                            <div className="flex-1 min-w-0 space-y-4 lg:max-w-2xl lg:mx-auto">
                                {/* Welcome Header with decorative elements */}
                                <div className="mb-4 relative">
                                    <div className="absolute -top-4 -left-4 w-24 h-24 bg-frosted-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-frosted-blue-500 to-turf-green-500">
                                                Welcome back, {user?.fname || 'User'}!
                                            </h1>
                                            <Sparkles className="w-5 h-5 text-royal-gold-500 animate-pulse" />
                                        </div>
                                        <p className="text-muted-foreground text-sm">Explore public communities and join the conversation.</p>
                                    </div>
                                </div>

                                {/* Create Post Widget */}
                                <CreatePostWidget
                                    currentUser={user || undefined}
                                    onCreated={() => fetchPostsFromCommunities(communities)}
                                />

                                {/* Editor Overlay */}
                                {isEditorOpen && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                        <div className="bg-card w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-frosted-blue-500 to-turf-green-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                                        {user?.fname?.[0] || 'U'}
                                                    </div>
                                                    Create Post
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleCreatePost}
                                                        disabled={!user || !selectedCommunity || !newPostTitle.trim() || !newPostBody.trim() || isCreatingPost}
                                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isCreatingPost ? (
                                                            <Loader2 size={16} className="animate-spin mr-2 inline" />
                                                        ) : (
                                                            <Send size={16} className="mr-2 inline" />
                                                        )}
                                                        Post
                                                    </button>
                                                    <button
                                                        onClick={() => setIsEditorOpen(false)}
                                                        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-background">
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <select
                                                            value={selectedCommunity}
                                                            onChange={(e) => setSelectedCommunity(e.target.value)}
                                                            className="w-full px-4 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                                        >
                                                            <option value="">Select Community</option>
                                                            {communities.map((community) => (
                                                                <option key={community.id} value={community.id}>
                                                                    {community.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Post title..."
                                                            value={newPostTitle}
                                                            onChange={(e) => setNewPostTitle(e.target.value)}
                                                            className="w-full px-4 py-2 bg-muted/50 border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
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
                                                                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${isSelected
                                                                    ? `${tag.bgLight} ${tag.textColor} ring-1 ring-current`
                                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                                    }`}
                                                            >
                                                                {tag.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className="border border-input rounded-lg overflow-hidden min-h-[300px]">
                                                    <MarkdownEditor
                                                        value={newPostBody}
                                                        onChange={setNewPostBody}
                                                        placeholder="Write something amazing..."
                                                        className="min-h-[300px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-linear-to-br from-frosted-blue-500/10 to-turf-green-500/10 rounded-full blur-3xl" />
                                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-linear-to-tr from-turf-green-500/10 to-frosted-blue-500/10 rounded-full blur-3xl" />
                                        </div>

                                        {/* Illustration */}
                                        <div className="relative mb-6">
                                            <div className="w-24 h-24 mx-auto bg-tech-blue-500/10 rounded-full flex items-center justify-center">
                                                <Rocket className="w-12 h-12 text-tech-blue-600" />
                                            </div>
                                            <div className="absolute top-0 right-1/3 animate-pulse">
                                                <Sparkles className="w-6 h-6 text-royal-gold-500" />
                                            </div>
                                            <div className="absolute bottom-0 left-1/3 animate-pulse delay-300">
                                                <Sparkles className="w-4 h-4 text-frosted-blue-500" />
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-semibold text-foreground mb-2">
                                            {postTitleSearch ? 'No posts found' : 'No posts yet'}
                                        </h3>
                                        <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
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
                                                    post={post}
                                                    communityName={getCommunityName(post.cid)}
                                                    onNavigate={(id: string) => navigate(`/community/${id}`)}
                                                    currentUser={user}
                                                    onEdit={() => handleEditPost(post)}
                                                    onDelete={() => handleDeletePost(post.id)}
                                                />
                                            ))}

                                        {/* Load More Trigger */}
                                        <div ref={loadMoreRef} className="py-4">
                                            {isLoadingMore && (
                                                <div className="flex items-center justify-center gap-3">
                                                    <Loader2 className="w-5 h-5 text-frosted-blue-500 animate-spin" />
                                                    <span className="text-sm text-muted-foreground">Loading more posts...</span>
                                                </div>
                                            )}
                                            {!hasMore && displayedPosts.length > 0 && (
                                                <div className="text-center py-4">
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
                                                        <Sparkles className="w-4 h-4 text-frosted-blue-500" />
                                                        <span className="text-sm text-muted-foreground">You've seen all posts!</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Right Sidebar */}
                            <div className="hidden lg:block lg:w-80 xl:w-96 space-y-6 overflow-y-auto scrollbar-hide max-h-[calc(100vh-3rem)] sticky top-6">

                                {/* Public Communities */}
                                <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
                                    {/* Decorative corner accent */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-bl from-frosted-blue-500/10 to-transparent rounded-bl-full" />

                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
                                            <Users className="w-4 h-4 text-frosted-blue-500" />
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
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-frosted-blue-500/10 text-frosted-blue-600 font-medium rounded-full">
                                                "{communityFilterSearch}"
                                                <button
                                                    onClick={() => setCommunityFilterSearch('')}
                                                    className="hover:bg-frosted-blue-500/20 rounded-full transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {communities.filter(c => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase())).length === 0 ? (
                                            <div className="text-center py-6">
                                                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-frosted-blue-500/20 to-turf-green-500/20 rounded-full flex items-center justify-center">
                                                    <Users className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {communityFilterSearch ? 'No communities match your search.' : 'No public communities found.'}
                                                </p>
                                            </div>
                                        ) : (
                                            communities
                                                .filter(c => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase()))
                                                .slice(0, hasMorePublic ? 3 : communities.length)
                                                .map((community, index) => (
                                                    <CommunityItem
                                                        key={community.id}
                                                        communityId={community.id}
                                                        name={community.name}
                                                        description={community.description || 'No description'}
                                                        color={['bg-tech-blue-500', 'bg-turf-green-500', 'bg-destructive', 'bg-royal-gold-500', 'bg-frosted-blue-500'][index % 5]}
                                                        isJoining={joiningCommunityId === community.id}
                                                        onJoin={() => handleJoinCommunity(community.id)}
                                                        isStudent={user?.role === 'student'}
                                                        isEnrolled={enrolledCommunityIds.has(community.id)}
                                                        onNavigate={(id: string) => navigate(`/community/${id}`)}
                                                    />
                                                ))
                                        )}
                                    </div>
                                    {hasMorePublic && communities.filter(c => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase())).length > 0 && (
                                        <button
                                            onClick={handleLoadMorePublic}
                                            disabled={isLoadingPublic}
                                            className="w-full mt-4 py-2 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground flex items-center justify-center"
                                        >
                                            {isLoadingPublic ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                            Show More
                                        </button>
                                    )}
                                </div>

                                {/* Private Communities */}
                                <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
                                    {/* Decorative corner accent */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-bl from-frosted-blue-500/10 to-transparent rounded-bl-full" />

                                    <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-frosted-blue-500" />
                                        Private Communities
                                    </h3>
                                    <div className="space-y-4">
                                        {privateCommunities.length === 0 ? (
                                            <div className="text-center py-6">
                                                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-frosted-blue-500/20 to-tech-blue-500/20 rounded-full flex items-center justify-center">
                                                    <Lock className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">No private communities yet.</p>
                                                <p className="text-xs text-muted-foreground mt-1">Join or create one to see it here.</p>
                                            </div>
                                        ) : (
                                            privateCommunities.map((community, index) => (
                                                <CommunityItem
                                                    key={community.id}
                                                    communityId={community.id}
                                                    name={community.name}
                                                    description={community.description || 'No description'}
                                                    color={['bg-frosted-blue-500', 'bg-royal-gold-500', 'bg-tech-blue-500', 'bg-turf-green-500', 'bg-destructive'][index % 5]}
                                                    isJoining={joiningCommunityId === community.id}
                                                    onJoin={() => handleJoinCommunity(community.id)}
                                                    isStudent={user?.role === 'student'}
                                                    isPrivate
                                                    isEnrolled={enrolledCommunityIds.has(community.id)}
                                                    onNavigate={(id: string) => navigate(`/community/${id}`)}
                                                />
                                            ))
                                        )}
                                    </div>
                                    {hasMorePrivate && (
                                        <button
                                            onClick={handleLoadMorePrivate}
                                            disabled={isLoadingPrivate}
                                            className="w-full mt-4 py-2 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground flex items-center justify-center"
                                        >
                                            {isLoadingPrivate ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                            Show More
                                        </button>
                                    )}
                                </div>

                                {/* Dynamic Widget based on Role */}
                                <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
                                    {/* Decorative gradient */}
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-frosted-blue-500 via-turf-green-500 to-royal-gold-500 opacity-50" />

                                    <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-frosted-blue-500" />
                                        {user?.role === 'instructor' ? 'Pending Actions' : 'Upcoming Deadlines'}
                                    </h3>
                                    <div className="space-y-3">
                                        {user?.role === 'instructor' ? (
                                            <>
                                                {pendingSubmissions.length > 0 ? (
                                                    pendingSubmissions.map((assignment, idx) => (
                                                        <DeadlineItem
                                                            key={idx}
                                                            course={assignment.communityName}
                                                            task={assignment.title}
                                                            due={`${assignment.ungradedCount} submission${assignment.ungradedCount !== 1 ? 's' : ''} to grade`}
                                                            isInstructor
                                                            onClick={() => navigate(`/community/${assignment.cid}/assignment/${assignment.id}`)}
                                                        />
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">No pending submissions</p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {deadlines.length > 0 ? (
                                                    deadlines.map((assignment, idx) => (
                                                        <DeadlineItem
                                                            key={idx}
                                                            course={assignment.communityName}
                                                            task={assignment.title}
                                                            due={assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                                                            onClick={() => navigate(`/community/${assignment.cid}/assignment/${assignment.id}`)}
                                                        />
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {
                editingPost && (
                    <PostModal
                        isOpen={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        onSuccess={handleEditSuccess}
                        post={editingPost as PostResponse}
                    />
                )
            }

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDeletePost}
                title="Delete Post"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmText="Delete"
                isDestructive
                isLoading={isDeleting}
            />
        </>
    );
};

export default Explore;

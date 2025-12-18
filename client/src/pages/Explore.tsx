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
import api, { communityApi, postApi, assignmentApi, submissionApi, instructorApi, type CommunityResponse, type PostResponse, type PaginationMeta } from '../services/api';
import { removeTokens } from '../utils/auth';




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
import RightSide from '../components/Explore/RightWidgets';
import Feed from '../components/Explore/Feed';
import FeedSkeleton from '../components/Explore/FeedSkeleton';
import RightSideSkeleton from '../components/Explore/RightSideSkeleton';

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
    const [activeTab, setActiveTab] = useState('new');
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [communities, setCommunities] = useState<CommunityWithMeta[]>([]);
    const [privateCommunities, setPrivateCommunities] = useState<CommunityWithMeta[]>([]);
    const [posts, setPosts] = useState<PostResponse[]>([]);

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


    // Initial load state
    const [displayedPosts, setDisplayedPosts] = useState<PostResponse[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [feedMeta, setFeedMeta] = useState<PaginationMeta | null>(null);
    const POSTS_PER_PAGE = 10; // backend page size for feed requests
    // Note: instructor page size is unified with POSTS_PER_PAGE
    const [feedPage, setFeedPage] = useState(1); // current page for instructor feed
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Filter states
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const [postTitleSearch, setPostTitleSearch] = useState('');
    const [communityFilterSearch, setCommunityFilterSearch] = useState('');
    const [isCommunityFilterOpen, setIsCommunityFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const communityFilterRef = useRef<HTMLDivElement>(null);

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

    // Load more posts (supports instructor server pagination)
    const loadMorePosts = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);

        try {
            const next = feedPage + 1;
            try {
                if (user?.role === 'instructor') {
                    const sort = activeTab === 'top' ? 'top' : 'new';
                    const res = await instructorApi.getFeed({ page: next, limit: POSTS_PER_PAGE, sort, cid: undefined });
                    const data = res?.data || [];
                    if (data.length > 0) {
                        const meta = res?.meta ?? null;
                        setPosts(prev => [...prev, ...data]);
                        setDisplayedPosts(prev => [...prev, ...data]);
                        setFeedMeta(meta);
                        setFeedPage(next);
                        setHasMore(meta ? next < meta.totalPages : data.length === POSTS_PER_PAGE);
                    } else {
                        setHasMore(false);
                    }
                } else {
                    const res = await postApi.getAll({ page: next, limit: POSTS_PER_PAGE });
                    const data = res?.data || [];
                    if (data.length > 0) {
                        const meta = res?.meta ?? null;
                        setPosts(prev => [...prev, ...data]);
                        setDisplayedPosts(prev => [...prev, ...data]);
                        setFeedMeta(meta);
                        setFeedPage(next);
                        setHasMore(meta ? next < meta.totalPages : data.length === POSTS_PER_PAGE);
                    } else {
                        setHasMore(false);
                    }
                }
            } catch (err) {
                const e = err as any;
                console.error('Failed to load feed page:', e.message ?? e);
                if (e.config) console.error('Request URL:', e.config.url, 'method:', e.config.method);
                if (e.response) console.error('Response status:', e.response.status, 'data:', e.response.data);
            }
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, displayedPosts.length, posts, user, feedPage]);

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

    // Initialize/extend displayed posts when `posts` changes.
    // When new pages are appended to `posts`, expand `displayedPosts` instead
    // of resetting to the first page so infinite scroll visibly extends.
    useEffect(() => {
        if (posts.length === 0) {
            setDisplayedPosts([]);
            setHasMore(false);
            return;
        }

        setDisplayedPosts((prev) => {
            // If we've already shown as many posts as exist, keep showing them.
            if (prev.length >= posts.length) return prev;
            // Otherwise, show all posts fetched so far (this will append newly loaded pages).
            return posts.slice(0, posts.length);
        });

        if (feedMeta) {
            setHasMore(feedPage < feedMeta.totalPages);
        } else {
            setHasMore(posts.length > POSTS_PER_PAGE);
        }
    }, [posts, feedMeta, feedPage]);

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

                // Fetch posts for feed. For instructors use server-side instructor feed endpoint (paginated),
                // for others fetch posts from communities as before.
                try {
                    if (normalizedUser.role === 'instructor') {
                        const sort = activeTab === 'top' ? 'top' : 'new';
                        const res = await instructorApi.getFeed({ page: 1, limit: POSTS_PER_PAGE, sort, cid: undefined });
                        const data = res?.data || [];
                        const meta = res?.meta ?? null;
                        setPosts(data as PostResponse[]);
                        setDisplayedPosts(data as PostResponse[]);
                        setFeedMeta(meta);
                        setHasMore(meta ? 1 < meta.totalPages : (data.length === POSTS_PER_PAGE));
                        setFeedPage(1);
                    } else {
                        const res = await postApi.getAll({ page: 1, limit: POSTS_PER_PAGE });
                        const data = res?.data || [];
                        const meta = res?.meta ?? null;
                        setPosts(data as PostResponse[]);
                        setDisplayedPosts(data as PostResponse[]);
                        setFeedMeta(meta);
                        setHasMore(meta ? 1 < meta.totalPages : (data.length === POSTS_PER_PAGE));
                        setFeedPage(1);
                    }
                } catch (err) {
                    const e = err as any;
                    console.error('Failed to fetch feed initial page, falling back to community aggregation:', e.message ?? e);
                    if (e.config) console.error('Request URL:', e.config.url, 'method:', e.config.method);
                    if (e.response) console.error('Response status:', e.response.status, 'data:', e.response.data);
                    await fetchPostsFromCommunities(communitiesResponse.data);
                }

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

    // When user selects the 'New' or 'Top' tab, refresh the feed from backend
    useEffect(() => {
        const fetchNewOrTopFeed = async () => {
            if (activeTab !== 'new' && activeTab !== 'top') return;
            setIsLoadingMore(true);
            try {
                if (user?.role === 'instructor') {
                    const sort = activeTab === 'top' ? 'top' : 'new';
                    const res = await instructorApi.getFeed({ page: 1, limit: POSTS_PER_PAGE, sort, cid: undefined });
                    const data = res?.data || [];
                    const meta = res?.meta ?? null;
                    setPosts(data as PostResponse[]);
                    setDisplayedPosts(data as PostResponse[]);
                    setFeedMeta(meta);
                    setHasMore(meta ? 1 < meta.totalPages : data.length === POSTS_PER_PAGE);
                    setFeedPage(1);
                } else {
                    // non-instructors still use the public posts endpoint; 'top' sorting handled client-side if needed
                    const res = await postApi.getAll({ page: 1, limit: POSTS_PER_PAGE });
                    const data = res?.data || [];
                    const meta = res?.meta ?? null;
                    setPosts(data as PostResponse[]);
                    setDisplayedPosts(data as PostResponse[]);
                    setFeedMeta(meta);
                    setHasMore(meta ? 1 < meta.totalPages : data.length === POSTS_PER_PAGE);
                    setFeedPage(1);
                }
            } catch (err) {
                const e = err as any;
                console.error(`Failed to fetch "${activeTab}" feed:`, e.message ?? e);
                if (e.config) console.error('Request URL:', e.config.url, 'method:', e.config.method);
                if (e.response) console.error('Response status:', e.response.status, 'data:', e.response.data);
            } finally {
                setIsLoadingMore(false);
            }
        };

        void fetchNewOrTopFeed();
    }, [activeTab, user?.role]);

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

    // Render initial loading screen while fetching user and initial data
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header
                    user={null as any}
                    onLogout={onLogout}
                    searchValue=""
                    onSearchChange={() => {}}
                    searchedPosts={[]}
                    searchedCommunities={[]}
                    isSearching={false}
                />
                <div className="flex min-h-[calc(100vh-80px)] bg-background text-foreground font-sans">
                    <Sidebar onLogout={onLogout} />

                    {/* Main Content Area */}
                    <main
                        className="flex-1 p-4 sm:p-6 transition-all duration-300"
                        style={{ marginLeft: `${sidebarWidth}px` }}
                    >
                        <div className="w-full max-w-7xl mx-auto">
                            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                                <div className="flex-1 min-w-0">
                                    <FeedSkeleton postCount={5} />
                                </div>
                                <div className="w-full lg:w-80 flex-shrink-0">
                                    <RightSideSkeleton />
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // Render the page
    return (
        <>
        <div className="bg-background">
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
                            <Feed
                                user={user}
                                fetchPostsFromCommunities={fetchPostsFromCommunities}
                                communities={communities}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                filterRef={filterRef}
                                isFilterOpen={isFilterOpen}
                                setIsFilterOpen={setIsFilterOpen}
                                filterSearch={filterSearch}
                                setFilterSearch={setFilterSearch}
                                postTitleSearch={postTitleSearch}
                                setPostTitleSearch={setPostTitleSearch}
                                displayedPosts={displayedPosts}
                                posts={posts}
                                loadMoreRef={loadMoreRef}
                                isLoadingMore={isLoadingMore}
                                hasMore={hasMore}
                                getCommunityName={getCommunityName}
                            />
                            <RightSide
                                user={user}
                                pendingSubmissions={pendingSubmissions}
                                deadlines={deadlines}
                                communities={communities}
                                privateCommunities={privateCommunities}
                                communityFilterSearch={communityFilterSearch}
                                isCommunityFilterOpen={isCommunityFilterOpen}
                                communityFilterRef={communityFilterRef}
                                setIsCommunityFilterOpen={setIsCommunityFilterOpen}
                                setCommunityFilterSearch={setCommunityFilterSearch}
                                joiningCommunityId={joiningCommunityId}
                                onJoinCommunity={handleJoinCommunity}
                                enrolledCommunityIds={enrolledCommunityIds}
                                onNavigate={(id: string) => navigate(`/community/${id}`)}
                                navigate={navigate}
                                handleLoadMorePublic={handleLoadMorePublic}
                                isLoadingPublic={isLoadingPublic}
                                hasMorePublic={hasMorePublic}
                                handleLoadMorePrivate={handleLoadMorePrivate}
                                isLoadingPrivate={isLoadingPrivate}
                                hasMorePrivate={hasMorePrivate}
                            />
                        </div>
                    </div>
                </main>
            </div>

        </div>
        </>
    );
};

export default Explore;
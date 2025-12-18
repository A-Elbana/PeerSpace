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
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from '../components/dashboard';
import Header from '../components/Header';
import { useSidebar } from '../contexts/SidebarContext';
import api, { communityApi, postApi, assignmentApi, submissionApi, type CommunityResponse } from '../services/api';
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

    const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
    const [enrolledCommunityIds, setEnrolledCommunityIds] = useState<Set<string>>(new Set());

    // Community Pagination
    const COMMUNITIES_PER_PAGE = 5;
    const [publicPage, setPublicPage] = useState(1);
    const [privatePage, setPrivatePage] = useState(1);
    const [publicMeta, setPublicMeta] = useState<any>(null);
    const [privateMeta, setPrivateMeta] = useState<any>(null);
    const [isLoadingPublic, setIsLoadingPublic] = useState(false);
    const [isLoadingPrivate, setIsLoadingPrivate] = useState(false);


    // Initial load state

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

    const handlePageChangePublic = async (page: number) => {
        if (isLoadingPublic) return;
        setIsLoadingPublic(true);
        try {
            const response = await communityApi.getAll({ type: 'PUBLIC', limit: COMMUNITIES_PER_PAGE, page });
            setCommunities(response.data);
            setPublicPage(page);
            setPublicMeta(response.meta || null);
            await checkEnrollmentStatus(response.data, user);
        } catch (error) {
            console.error('Failed to change public page', error);
        } finally {
            setIsLoadingPublic(false);
        }
    };

    const handlePageChangePrivate = async (page: number) => {
        if (isLoadingPrivate) return;
        setIsLoadingPrivate(true);
        try {
            const response = await communityApi.getAll({ type: 'PRIVATE', limit: COMMUNITIES_PER_PAGE, page });
            setPrivateCommunities(response.data);
            setPrivatePage(page);
            setPrivateMeta(response.meta || null);
            await checkEnrollmentStatus(response.data, user);
        } catch (error) {
            console.error('Failed to change private page', error);
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

    const loadMoreRef = useRef<HTMLDivElement>(null);
    // Intersection Observer for infinite scroll moved to Feed component

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

    // Unified post management handled inside the Feed component

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
                setPublicMeta(communitiesResponse.meta || null);

                // Fetch private communities
                const privateCommunitiesResponse = await communityApi.getAll({ type: 'PRIVATE', limit: COMMUNITIES_PER_PAGE, page: 1 });
                setPrivateCommunities(privateCommunitiesResponse.data);
                setPrivateMeta(privateCommunitiesResponse.meta || null);

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

    // The Feed component now manages its own tab changes and pagination logic




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
                    onSearchChange={() => { }}
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
                                    loadMoreRef={loadMoreRef}
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
                                    handlePageChangePublic={handlePageChangePublic}
                                    publicPage={publicPage}
                                    publicMeta={publicMeta}
                                    isLoadingPublic={isLoadingPublic}
                                    handlePageChangePrivate={handlePageChangePrivate}
                                    privatePage={privatePage}
                                    privateMeta={privateMeta}
                                    isLoadingPrivate={isLoadingPrivate}
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
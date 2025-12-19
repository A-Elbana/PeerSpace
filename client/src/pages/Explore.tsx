import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from '../components/dashboard';
import Header from '../components/Header';
import { useSidebar } from '../contexts/SidebarContext';
import { communityApi, postApi } from '../services/api';
import { removeTokens } from '../utils/auth';
import { useExploreData } from '../hooks/useExploreData';

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

interface ExploreProps {
    onLogout: () => void;
}

// Using shared components
import RightSide from '../components/Explore/RightWidgets';
import Feed from '../components/Explore/Feed';
import FeedSkeleton from '../components/Explore/FeedSkeleton';
import RightSideSkeleton from '../components/Explore/RightSideSkeleton';

const Explore: React.FC<ExploreProps> = ({ onLogout }) => {
    const { sidebarWidth } = useSidebar();
    const navigate = useNavigate();

    // Use our custom hook for all data fetching
    const {
        user,
        communities,
        privateCommunities,
        enrolledCommunityIds,
        setEnrolledCommunityIds,
        isLoading,
        deadlines,
        pendingSubmissions,
        publicPage,
        privatePage,
        publicMeta,
        privateMeta,
        isLoadingPublic,
        isLoadingPrivate,
        handlePageChangePublic,
        handlePageChangePrivate,
    } = useExploreData();

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
    const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);

    // Filter states
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const [postTitleSearch, setPostTitleSearch] = useState('');
    const [communityFilterSearch, setCommunityFilterSearch] = useState('');
    const [isCommunityFilterOpen, setIsCommunityFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const communityFilterRef = useRef<HTMLDivElement>(null);

    const loadMoreRef = useRef<HTMLDivElement>(null);

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

    const handleJoinCommunity = async (communityId: string) => {
        if (user?.role !== 'student') {
            toast.warning('Only students can enroll in communities');
            return;
        }

        if (enrolledCommunityIds.has(communityId)) {
            toast.info('You are already enrolled in this community');
            return;
        }

        setJoiningCommunityId(communityId);
        try {
            await communityApi.enroll(communityId);
            setEnrolledCommunityIds(prev => new Set([...prev, communityId]));
            toast.success('Successfully enrolled in community!');
        } catch (err: unknown) {
            console.error('Failed to join community:', err);
            const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
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

    return (
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
    );
};

export default Explore;
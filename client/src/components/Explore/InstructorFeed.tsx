import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, BookOpen, Rocket, X, Clock, Filter, ArrowBigUp, Search } from 'lucide-react';
import { instructorApi } from '../../services/api';
import CreatePostWidget from '../posts/CreatePostWidget';
import PostCard from '../posts/PostCard';

interface FeedProps {
  user?: any;
  fetchPostsFromCommunities: (c: any[]) => Promise<void>;
  communities: any[];
  activeTab: string;
  setActiveTab: (s: string) => void;
  filterRef: React.RefObject<HTMLDivElement | null>;
  isFilterOpen: boolean;
  setIsFilterOpen: (v: boolean) => void;
  filterSearch: string;
  setFilterSearch: (v: string) => void;
  postTitleSearch: string;
  setPostTitleSearch: (v: string) => void;
  displayedPosts: any[];
  posts: any[];
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  isLoadingMore: boolean;
  hasMore: boolean;
  getCommunityName: (cid: string) => string;
};

const InstructorFeed: React.FC<FeedProps> = (props) => {
  const {
    user,
    fetchPostsFromCommunities,
    communities,
    activeTab,
    setActiveTab,
    filterRef,
    isFilterOpen,
    setIsFilterOpen,
    filterSearch,
    setFilterSearch,
    postTitleSearch,
    setPostTitleSearch,

    posts,
    loadMoreRef,
    isLoadingMore,

    getCommunityName,
  } = props;

  // Internal paginated state (fetch 10 posts per page)
  const [postsList, setPostsList] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [hasMoreLocal, setHasMoreLocal] = useState<boolean>(true);
  const internalLoadRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<number>(1);
  const fetchingRef = useRef<boolean>(false);

  const sentinelRef = loadMoreRef ?? internalLoadRef;

  const fetchPage = useCallback(async (p: number) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoadingPage(true);
    try {
      let res: any;
      // Instructor-only feed: unresolved or normal feed
      if (activeTab === 'unresolved') {
        res = await instructorApi.getUnresolvedPosts({ page: p, limit: 10, cid: undefined });
      } else {
        res = await instructorApi.getFeed({ page: p, limit: 10, sort: activeTab as any });
      }

      const newPosts = res.data || [];
      const meta = res.meta || { totalPages: 1 } as any;
      if (p === 1) setPostsList(newPosts);
      else setPostsList(prev => [...prev, ...newPosts]);

      const totalPages = typeof meta?.totalPages === 'number' ? meta.totalPages : undefined;
      setHasMoreLocal(totalPages ? p < totalPages : newPosts.length === 10);

      // update refs/state for next page
      pageRef.current = p + 1;
      setPage(p + 1);
    } catch (err) {
      console.error('Failed to load posts page', err);
      // stop trying further pages on repeated errors (prevents infinite retry loop)
      setHasMoreLocal(false);
    } finally {
      fetchingRef.current = false;
      setIsLoadingPage(false);
    }
  }, [user?.role, activeTab]);

  // Load first page when activeTab or selectedCommunity changes
  useEffect(() => {
    pageRef.current = 1;
    setPage(1);
    setHasMoreLocal(true);
    void fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchPage]);

  // Intersection observer to load more pages
  useEffect(() => {
    const el = sentinelRef && (sentinelRef as React.MutableRefObject<HTMLDivElement | null>).current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoadingPage && hasMoreLocal) {
          void fetchPage(pageRef.current);
        }
      });
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
    // include relevant deps
  }, [sentinelRef, isLoadingPage, hasMoreLocal, fetchPage]);

  return (
    <div className="flex-1 min-w-0 space-y-4 lg:max-w-2xl lg:mx-auto">
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

      <CreatePostWidget
        currentUser={user || undefined}
        onCreated={() => fetchPostsFromCommunities(communities)}
      />

      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mb-2">
        {/* 'Popular' filter removed; kept tabs: New, Top */}
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors ${activeTab === 'new' ? 'text-primary bg-muted' : ''}`}
        >
          <Clock size={18} /> New
        </button>
        <button
          onClick={() => { setActiveTab('top'); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors ${activeTab === 'top' ? 'text-primary bg-muted' : ''}`}
        >
          <ArrowBigUp size={18} /> Top
        </button>

        {user?.role === 'instructor' && (
          <button
            onClick={() => {
              setActiveTab('unresolved');
              setPage(1);
              setHasMoreLocal(true);
              void fetchPage(1);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors ${activeTab === 'unresolved' ? 'text-primary bg-muted' : ''}`}
          >
            Unresolved
          </button>
        )}

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

      {(postTitleSearch ? posts.filter(p => p.title.toLowerCase().includes(postTitleSearch.toLowerCase())).length === 0 : posts.length === 0) ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-linear-to-br from-frosted-blue-500/10 to-turf-green-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-linear-to-tr from-turf-green-500/10 to-frosted-blue-500/10 rounded-full blur-3xl" />
          </div>

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
          {postsList
            .filter(post => !postTitleSearch || post.title.toLowerCase().includes(postTitleSearch.toLowerCase()))
            .map((post) => (
              <PostCard
                key={post.id}
                post={post}
                communityName={getCommunityName(post.cid)}
                onNavigate={(id?: string) => { if (id) window.location.pathname = `/community/${id}`; }}
                currentUser={user}
              />
            ))}

          <div ref={sentinelRef as any} className="py-4">
            {(isLoadingPage || isLoadingMore) && (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-frosted-blue-500 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading more posts...</span>
              </div>
            )}
            {!hasMoreLocal && postsList.length > 0 && (
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
  );
};

export default InstructorFeed;
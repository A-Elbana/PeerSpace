import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, BookOpen, Rocket, X, Clock, Filter, ArrowBigUp, Search } from 'lucide-react';
import { instructorApi, postApi, studentApi } from '../../services/api';
import CreatePostWidget from '../../components/posts/CreatePostWidget';
import PostCard from '../../components/posts/PostCard';

interface FeedProps {
  user?: any;
  communities?: any[];
  activeTab?: string;
  setActiveTab?: (s: string) => void;
  filterRef?: React.RefObject<HTMLDivElement | null>;
  isFilterOpen?: boolean;
  setIsFilterOpen?: (v: boolean) => void;
  filterSearch?: string;
  setFilterSearch?: (v: string) => void;
  postTitleSearch?: string;
  setPostTitleSearch?: (v: string) => void;
  loadMoreRef?: React.RefObject<HTMLDivElement | null>;
  getCommunityName?: (cid: string) => string;
  postType?: string;
  hideCreateWidget?: boolean;
  externalFetch?: boolean;
  posts?: any[];
  isLoading?: boolean;
  hasMore?: boolean;
  onFetchPage?: (page: number) => Promise<void>;
};

const Feed: React.FC<FeedProps> = (props) => {
  const {
    user,
    communities = [],
    activeTab: propActiveTab,
    setActiveTab: propSetActiveTab,
    filterRef: propFilterRef,
    isFilterOpen: propIsFilterOpen,
    setIsFilterOpen: propSetIsFilterOpen,
    filterSearch: propFilterSearch,
    setFilterSearch: propSetFilterSearch,
    postTitleSearch: propPostTitleSearch,
    setPostTitleSearch: propSetPostTitleSearch,
    loadMoreRef,
    getCommunityName: propGetCommunityName,
    postType,
    hideCreateWidget,
    externalFetch,
    posts: externalPosts,
    isLoading: externalIsLoading,
    hasMore: externalHasMore,
    onFetchPage,
  } = props;

  // Internal state for optional props
  const [internalActiveTab, setInternalActiveTab] = useState<'new' | 'top' | 'unresolved'>('new');
  const activeTab = (propActiveTab as any) || internalActiveTab;
  const setActiveTab = (propSetActiveTab as any) || setInternalActiveTab;

  const [internalIsFilterOpen, setInternalIsFilterOpen] = useState(false);
  const isFilterOpen = propIsFilterOpen ?? internalIsFilterOpen;
  const setIsFilterOpen = propSetIsFilterOpen || setInternalIsFilterOpen;

  const [internalFilterSearch, setInternalFilterSearch] = useState('');
  const filterSearch = propFilterSearch ?? internalFilterSearch;
  const setFilterSearch = propSetFilterSearch || setInternalFilterSearch;

  const [internalPostTitleSearch, setInternalPostTitleSearch] = useState('');
  const postTitleSearch = propPostTitleSearch ?? internalPostTitleSearch;
  const setPostTitleSearch = propSetPostTitleSearch || setInternalPostTitleSearch;

  const internalFilterRef = useRef<HTMLDivElement | null>(null);
  const filterRef = propFilterRef || internalFilterRef;

  const getCommunityName = useCallback((cid: string) => {
    if (propGetCommunityName) return propGetCommunityName(cid);
    const community = communities.find(c => c.id === cid);
    return community?.name || 'Unknown';
  }, [communities, propGetCommunityName]);

  // Internal paginated state (fetch 10 posts per page)
  const [internalPostsList, setInternalPostsList] = useState<any[]>([]);
  const [internalIsLoadingPage, setInternalIsLoadingPage] = useState<boolean>(false);
  const [internalHasMoreLocal, setInternalHasMoreLocal] = useState<boolean>(true);
  const internalLoadRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<number>(1);
  const fetchingRef = useRef<boolean>(false);

  // Determine which state/fetching to use
  const postsList = externalFetch ? (externalPosts || []) : internalPostsList;
  const isLoadingPage = externalFetch ? (externalIsLoading || false) : internalIsLoadingPage;
  const hasMoreLocal = externalFetch ? (externalHasMore ?? false) : internalHasMoreLocal;
  const sentinelRef = loadMoreRef ?? internalLoadRef;

  const fetchPage = async (p: number) => {
    if (externalFetch) {
      if (onFetchPage) await onFetchPage(p);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setInternalIsLoadingPage(true);
      let res: any;
      if (user?.role === 'instructor') {
        if (activeTab === 'unresolved') {
          res = await instructorApi.getUnresolvedPosts({ page: p, limit: 10, cid: undefined, type: postType });
        } else {
          res = await instructorApi.getFeed({ page: p, limit: 10, sort: activeTab as any, cid: undefined, type: postType });
        }
      } else if (user?.role === 'student' || user?.role === 'admin') {
        // Admin or Student use similar logic for feed
        res = await studentApi.getFeed({ page: p, limit: 10, sort: activeTab as any, type: postType });
      } else {
        res = await postApi.getAll({ page: p, limit: 10, type: postType });
      }

      const newPosts = res.data || [];
      const meta = res.meta || { totalPages: 1 } as any;
      if (p === 1) setInternalPostsList(newPosts);
      else setInternalPostsList(prev => [...prev, ...newPosts]);

      const totalPages = meta.totalPages || 1;
      setInternalHasMoreLocal(p < totalPages);
      pageRef.current = p + 1;
    } catch (err) {
      console.error('Failed to load posts page', err);
      setInternalHasMoreLocal(false);
    } finally {
      setInternalIsLoadingPage(false);
      fetchingRef.current = false;
    }
  };

  // Close filter dropdowns when clicking outside if using internal ref
  useEffect(() => {
    if (propFilterRef) return; // Parent handles this

    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterRef, setIsFilterOpen, propFilterRef]);

  // Load first page when activeTab, user, or postType changes
  useEffect(() => {
    if (externalFetch) return;    // Reset pagination and refresh if needed
    if (!externalFetch) {
      pageRef.current = 1;
      setInternalHasMoreLocal(true);
      void fetchPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, postType, externalFetch]);

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
  }, [sentinelRef, isLoadingPage, hasMoreLocal]);

  return (
    <div className="flex-1 min-w-0 space-y-4 lg:max-w-2xl lg:mx-auto">
      <div className="mb-4 relative">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-chart-2">
              {postType === 'announcement' ? 'Announcements' :
                postType === 'material' ? 'Learning Materials' :
                  `Welcome back, ${user?.fname || 'User'}!`}
            </h1>
            <Sparkles className="w-5 h-5 text-chart-3 animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">
            {postType === 'announcement' ? 'Stay updated with the latest news and important notices.' :
              postType === 'material' ? 'Access course materials, resources, and shared documents.' :
                'Explore public communities and join the conversation.'}
          </p>
        </div>
      </div>

      {!hideCreateWidget && (
        <CreatePostWidget
          currentUser={user || undefined}
          onCreated={() => void fetchPage(1)}
          defaultPostType={postType as any}
        />
      )}

      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mb-2">
        {user?.role !== 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-accent transition-colors ${activeTab === 'new' ? 'text-primary bg-accent' : ''}`}
            >
              <Clock size={18} /> New
            </button>
            <button
              onClick={() => { setActiveTab('top'); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-accent transition-colors ${activeTab === 'top' ? 'text-primary bg-accent' : ''}`}
            >
              <ArrowBigUp size={18} /> Top
            </button>
          </>
        )}

        {user?.role === 'instructor' && (
          <button
            onClick={() => {
              setActiveTab('unresolved');
              pageRef.current = 1;
              setInternalHasMoreLocal(true);
              void fetchPage(1);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-accent transition-colors ${activeTab === 'unresolved' ? 'text-primary bg-accent' : ''}`}
          >
            Unresolved
          </button>
        )}

        <div className="relative ml-auto" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-accent transition-colors ${postTitleSearch ? 'text-primary bg-accent' : ''}`}
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
                    className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder-muted-foreground"
                    autoFocus
                  />
                </div>
                {postTitleSearch && (
                  <button
                    onClick={() => {
                      setPostTitleSearch('');
                      setFilterSearch('');
                    }}
                    className="mt-2 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2 text-destructive rounded-lg font-medium"
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

      {(postTitleSearch ? postsList.filter((p: any) => p.title.toLowerCase().includes(postTitleSearch.toLowerCase())).length === 0 : postsList.length === 0) ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-chart-2/10 to-primary/10 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Rocket className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute top-0 right-1/3 animate-pulse">
              <Sparkles className="w-6 h-6 text-chart-3" />
            </div>
            <div className="absolute bottom-0 left-1/3 animate-pulse delay-300">
              <Sparkles className="w-4 h-4 text-primary" />
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
                currentUser={user}
              />
            ))}

          <div ref={(loadMoreRef ? null : internalLoadRef) as any} className="py-4">
            {(isLoadingPage) && (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Loading more posts...</span>
              </div>
            )}
            {!hasMoreLocal && postsList.length > 0 && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/50 rounded-full">
                  <Sparkles className="w-4 h-4 text-primary" />
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

export default Feed;

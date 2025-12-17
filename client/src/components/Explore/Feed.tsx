import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Loader2, BookOpen, Rocket, Send, X, Clock, Filter, ArrowBigUp, Search } from 'lucide-react';
import { instructorApi, postApi } from '../../services/api';
import CreatePostWidget from '../../components/posts/CreatePostWidget';
import PostCard from '../../components/posts/PostCard';
import { MarkdownEditor } from '../../components/MarkdownEditor';

interface FeedProps {
  user?: any;
  fetchPostsFromCommunities: (c: any[]) => Promise<void>;
  communities: any[];
  isEditorOpen: boolean;
  setIsEditorOpen: (v: boolean) => void;
  handleCreatePost: () => Promise<void>;
  isCreatingPost: boolean;
  selectedCommunity: string;
  setSelectedCommunity: (v: string) => void;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  POST_TAGS: ReadonlyArray<any>;
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
  handleEditPost: (p: any) => void;
  handleDeletePost: (id: number) => void;
};

const Feed: React.FC<FeedProps> = (props) => {
  const {
    user,
    fetchPostsFromCommunities,
    communities,
    isEditorOpen,
    setIsEditorOpen,
    handleCreatePost,
    isCreatingPost,
    selectedCommunity,
    setSelectedCommunity,
    newPostTitle,
    setNewPostTitle,
    newPostBody,
    setNewPostBody,
    selectedTags,
    setSelectedTags,
    POST_TAGS,
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
    handleEditPost,
    handleDeletePost,
  } = props;

  // Internal paginated state (fetch 10 posts per page)
  const [postsList, setPostsList] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [hasMoreLocal, setHasMoreLocal] = useState<boolean>(true);
  const internalLoadRef = useRef<HTMLDivElement | null>(null);

  const sentinelRef = loadMoreRef ?? internalLoadRef;

  const fetchPage = async (p: number) => {
    try {
      setIsLoadingPage(true);
      let res: any;
      if (user?.role === 'instructor') {
        if (activeTab === 'unresolved') {
          res = await instructorApi.getUnresolvedPosts({ page: p, limit: 10, cid: selectedCommunity || undefined });
        } else {
          res = await instructorApi.getFeed({ page: p, limit: 10, sort: activeTab as any, cid: selectedCommunity || undefined });
        }
      } else {
        res = await postApi.getAll({ page: p, limit: 10, communityId: selectedCommunity });
      }

      const newPosts = res.data || [];
      const meta = res.meta || { totalPages: 1 } as any;
      if (p === 1) setPostsList(newPosts);
      else setPostsList(prev => [...prev, ...newPosts]);
      setHasMoreLocal(p < (meta.totalPages || 1));
      setPage(p + 1);
    } catch (err) {
      console.error('Failed to load posts page', err);
    } finally {
      setIsLoadingPage(false);
    }
  };

  // Load first page when activeTab or selectedCommunity changes
  useEffect(() => {
    setPage(1);
    setHasMoreLocal(true);
    void fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCommunity]);

  // Intersection observer to load more pages
  useEffect(() => {
    const el = sentinelRef && (sentinelRef as React.MutableRefObject<HTMLDivElement | null>).current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoadingPage && hasMoreLocal) {
          void fetchPage(page);
        }
      });
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
    // include relevant deps
  }, [sentinelRef, page, isLoadingPage, hasMoreLocal]);

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
                    {communities.map((community: any) => (
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
                {POST_TAGS.map((tag: any) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(prev => prev.filter((t: string) => t !== tag.id));
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

      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mb-2">
        {/* 'Popular' filter removed; kept tabs: New, Top */}
        <button
          onClick={() => { setActiveTab('new'); }}
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
              if (activeTab === 'unresolved') setActiveTab('new');
              else setActiveTab('unresolved');
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
                onEdit={() => handleEditPost(post)}
                onDelete={() => handleDeletePost(post.id)}
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

export default Feed;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  MessageCircle,
  ChevronDown,
  Send,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { removeTokens } from '../../utils/auth';
import api, { communityApi, announcementApi, type CommunityResponse, type PostResponse } from '../../services/api';

// Types
type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: UserRole;
  avatar_file_id?: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  post_date: string;
  cid: string;
  communityName: string;
  owner_uid: number;
  ownerName: string;
  ownerAvatar?: string;
  commentCount: number;
}

export interface Comment {
  id: number;
  content: string;
  comment_date: string;
  commenter_uid: number;
  commenterName: string;
  commenterAvatar?: string;
}

export interface Community {
  id: string;
  name: string;
}

const AnnouncementsPage = () => {
  const navigate = useNavigate();

  // State
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New announcement form state
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    body: '',
    cid: '',
  });

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  // Fetch user data and communities on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user data
        const { data: userData } = await api.get('/auth/me');
        const normalizedUser: UserData = {
          ...userData,
          role: userData.role?.toLowerCase() as UserRole,
        };
        setUser(normalizedUser);

        // Fetch communities (the API returns communities the user has access to)
        const communitiesResponse = await communityApi.getAll({ limit: 50 });
        const communityList: Community[] = communitiesResponse.data.map((c: CommunityResponse) => ({
          id: c.id,
          name: c.name,
        }));
        setCommunities(communityList);

        // Fetch announcements from all accessible communities
        await fetchAnnouncementsForCommunities(communityList);
      } catch (err: any) {
        console.error('Failed to fetch initial data:', err);
        if (err.response?.status === 401) {
          removeTokens();
          navigate('/login');
        } else {
          setError('Failed to load data. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate]);

  // Fetch announcements for given communities
  const fetchAnnouncementsForCommunities = async (communityList: Community[]) => {
    try {
      const allAnnouncements: Announcement[] = [];

      // Fetch posts from each community
      for (const community of communityList) {
        try {
          const postsResponse = await announcementApi.getByCommunity(community.id, { limit: 50 });

          // Filter for announcement type posts and map to our Announcement type
          const communityAnnouncements = postsResponse.data
            .filter((post: PostResponse) => post.type === 'announcement')
            .map((post: PostResponse) => ({
              id: post.id,
              title: post.title,
              body: post.body || '',
              post_date: post.post_date,
              cid: post.cid,
              communityName: community.name,
              owner_uid: post.owner_uid,
              ownerName: `${post.User.fname} ${post.User.lname}`,
              ownerAvatar: post.User.avatar_file_id || undefined,
              commentCount: post._count?.Comment || 0,
            }));

          allAnnouncements.push(...communityAnnouncements);
        } catch (err) {
          console.error(`Failed to fetch posts for community ${community.id}:`, err);
          // Continue with other communities even if one fails
        }
      }

      // Sort by date (newest first)
      allAnnouncements.sort((a, b) =>
        new Date(b.post_date).getTime() - new Date(a.post_date).getTime()
      );

      setAnnouncements(allAnnouncements);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  // Refetch announcements when community selection changes to "all"
  useEffect(() => {
    if (selectedCommunity === 'all' && communities.length > 0 && !isLoading) {
      // Already have all announcements loaded
    }
  }, [selectedCommunity, communities, isLoading]);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesCommunity =
      selectedCommunity === 'all' || announcement.cid === selectedCommunity;
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCommunity && matchesSearch;
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Toggle announcement expansion and load comments
  const toggleAnnouncement = (id: number) => {
    if (expandedAnnouncement === id) {
      setExpandedAnnouncement(null);
    } else {
      setExpandedAnnouncement(id);
      // Initialize empty comments array if not loaded
      if (!comments[id]) {
        setComments((prev) => ({ ...prev, [id]: [] }));
      }
    }
  };

  // Add comment
  const handleAddComment = (announcementId: number) => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now(),
      content: newComment,
      comment_date: new Date().toISOString(),
      commenter_uid: user?.id || 0,
      commenterName: `${user?.fname} ${user?.lname}`,
    };

    setComments((prev) => ({
      ...prev,
      [announcementId]: [...(prev[announcementId] || []), comment],
    }));
    setNewComment('');

    // Update comment count
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === announcementId ? { ...a, commentCount: a.commentCount + 1 } : a
      )
    );
  };

  // Create announcement (instructor only)
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.body.trim() || !newAnnouncement.cid) {
      return;
    }

    setIsCreatingAnnouncement(true);
    try {
      const response = await announcementApi.create({
        title: newAnnouncement.title.trim(),
        body: newAnnouncement.body.trim(),
        cid: newAnnouncement.cid,
      });

      const community = communities.find((c) => c.id === newAnnouncement.cid);
      const announcement: Announcement = {
        id: response.id,
        title: response.title,
        body: response.body || '',
        post_date: response.post_date,
        cid: response.cid,
        communityName: community?.name || '',
        owner_uid: response.owner_uid,
        ownerName: `${user?.fname} ${user?.lname}`,
        ownerAvatar: user?.avatar_file_id,
        commentCount: 0,
      };

      setAnnouncements((prev) => [announcement, ...prev]);
      setNewAnnouncement({ title: '', body: '', cid: '' });
      setIsCreateModalOpen(false);
      toast.success('Announcement created successfully!');
    } catch (err: any) {
      console.error('Failed to create announcement:', err);
      toast.error(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setIsCreatingAnnouncement(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 ml-20 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-muted-foreground">Loading announcements...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 ml-20 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-foreground font-medium">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />

      <main className="flex-1 ml-20 p-8 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Megaphone className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
              <p className="text-sm text-muted-foreground">
                {isInstructor
                  ? 'Create and manage announcements for your communities'
                  : 'Stay updated with the latest announcements from your communities'}
              </p>
            </div>
          </div>
          {isInstructor && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus size={18} />
              <span>New Announcement</span>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Community Filter */}
          <select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
          >
            <option value="all">All Communities</option>
            {communities.map((community) => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </select>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No announcements found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCommunity !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Check back later for new announcements'}
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
              >
                {/* Announcement Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => toggleAnnouncement(announcement.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {announcement.communityName}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(announcement.post_date)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {announcement.title}
                      </h3>
                      <p
                        className={`text-sm text-muted-foreground ${expandedAnnouncement === announcement.id ? '' : 'line-clamp-2'
                          }`}
                      >
                        {announcement.body}
                      </p>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-muted-foreground flex-shrink-0 transition-transform ${expandedAnnouncement === announcement.id ? 'rotate-180' : ''
                        }`}
                    />
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User size={14} className="text-blue-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">{announcement.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageCircle size={14} />
                      <span>{announcement.commentCount} comments</span>
                    </div>
                  </div>
                </div>

                {/* Comments Section (expanded) */}
                {expandedAnnouncement === announcement.id && (
                  <div className="border-t border-border bg-accent/20 p-5">
                    <h4 className="text-sm font-semibold text-foreground mb-4">Comments</h4>

                    {/* Comments List */}
                    <div className="space-y-4 mb-4">
                      {(comments[announcement.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No comments yet. Be the first to comment!
                        </p>
                      ) : (
                        (comments[announcement.id] || []).map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-foreground">
                                  {comment.commenterName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(comment.comment_date)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-blue-500" />
                      </div>
                      <div className="flex-1 flex gap-2">
                        <Input
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(announcement.id);
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          onClick={() => handleAddComment(announcement.id)}
                          disabled={!newComment.trim()}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <Send size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Announcement Modal (Instructor Only) */}
      {isCreateModalOpen && isInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Megaphone className="h-5 w-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">New Announcement</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Community Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Community <span className="text-destructive">*</span>
                </label>
                <select
                  value={newAnnouncement.cid}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, cid: e.target.value }))}
                  className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a community</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Announcement title"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Content <span className="text-destructive">*</span>
                </label>
                <textarea
                  placeholder="Write your announcement..."
                  value={newAnnouncement.body}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, body: e.target.value }))}
                  className="w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isCreatingAnnouncement}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAnnouncement}
                disabled={!newAnnouncement.title.trim() || !newAnnouncement.body.trim() || !newAnnouncement.cid || isCreatingAnnouncement}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isCreatingAnnouncement ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Announcement'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;

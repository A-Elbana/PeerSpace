import { MarkdownPreview } from '../../../components/MarkdownEditor';
import { MessageSquare, Clock, User, ArrowBigUp, ArrowBigDown, Megaphone, MoreHorizontal, PenSquare, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useResolvedFileUrl } from '../../../hooks/useResolvedFileUrl';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

interface PostAuthor {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
}

interface Post {
  id: number;
  title: string;
  type: string;
  body: string | null;
  post_date: string;
  is_resolved: boolean | null;
  User: PostAuthor;
  _count?: {
    Comment: number;
  };
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  User: PostAuthor;
}

interface PostsListProps {
  posts: Post[];
  isLoading: boolean;
  currentUser?: { id: number; role: string } | null;
  isInstructorOfCommunity?: boolean;
  communityId?: string | number;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (postId: number) => void;
}

const PostCard: React.FC<{
  post: Post;
  currentUser?: { id: number; role: string } | null;
  isInstructorOfCommunity?: boolean;
  communityId?: string | number;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
}> = ({ post, currentUser, isInstructorOfCommunity, communityId, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Comment state
  const [comments, setComments] = useState<Comment[]>([
    // Mock comments for UI demonstration
    {
      id: 1,
      content: "This is a great post! Thanks for sharing.",
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      User: { id: 2, fname: "Jane", lname: "Doe", avatar_file_id: null }
    },
    {
      id: 2,
      content: "I have a question about this. Could you clarify the second point?",
      created_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      User: { id: 3, fname: "Bob", lname: "Smith", avatar_file_id: null }
    }
  ]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  const authorAvatarUrl = useResolvedFileUrl(post.User.avatar_file_id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      announcement: 'bg-red-500/10 text-red-500',
      math: 'bg-tech-blue-500/10 text-tech-blue-600',
      scientific: 'bg-turf-green-500/10 text-turf-green-600',
      puzzles: 'bg-royal-gold-500/10 text-royal-gold-600',
      discussion: 'bg-gray-500/10 text-gray-500',
    };
    return colors[type.toLowerCase()] || colors.discussion;
  };

  // Parse multiple tags (comma-separated)
  const tags = post.type?.split(',').map((t: string) => t.trim().toLowerCase()) || [];
  const isAnnouncement = tags.includes('announcement');

  // Check permissions: Owner OR Admin OR Instructor of this Community
  const canModify = currentUser && (
    currentUser.id === post.User.id ||
    currentUser.role === 'admin' ||
    (currentUser.role === 'instructor' && isInstructorOfCommunity)
  );

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now(), // Mock ID
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      User: currentUser ? {
        id: currentUser.id,
        fname: 'Current', // Mock name - in real app this would come from user context
        lname: 'User',
        avatar_file_id: null
      } : {
        id: 999,
        fname: 'Anonymous',
        lname: 'User',
        avatar_file_id: null
      }
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  const navigate = useNavigate();

  return (
    <div className={`bg-background border rounded-lg overflow-visible hover:border-primary/50 transition-colors ${isAnnouncement ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-border'
      }`}>
      <div className="flex">
        {/* Vote Bar or Announcement Indicator */}
        {isAnnouncement ? (
          <div className="w-12 bg-gradient-to-b from-yellow-500/20 to-orange-500/20 flex flex-col items-center justify-center py-3 border-r border-yellow-500/30">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Megaphone size={16} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="w-12 bg-muted/30 flex flex-col items-center py-3 gap-1">
            <button className="text-muted-foreground hover:text-orange-500 transition-colors">
              <ArrowBigUp size={24} />
            </button>
            <span className="text-sm font-bold text-foreground">0</span>
            <button className="text-muted-foreground hover:text-blue-500 transition-colors">
              <ArrowBigDown size={24} />
            </button>
          </div>
        )}

        {/* Post Content */}
        <div className="flex-1 p-4 relative overflow-hidden">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Author Avatar */}
              {authorAvatarUrl ? (
                <img
                  src={authorAvatarUrl}
                  alt={`${post.User.fname} ${post.User.lname}`}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {post.User.fname} {post.User.lname}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(post.post_date)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Post Type Badges - Multiple tags */}
              <div className="flex flex-wrap gap-1">
                {tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions Menu */}
              {canModify && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => { setShowMenu(false); onEdit?.(post); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground"
                      >
                        <PenSquare size={14} /> Edit
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); onDelete?.(post.id); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Post Content */}
          <h3
            onClick={() => communityId && navigate(`/community/${communityId}/post/${post.id}`)}
            className={`font-semibold mb-2 cursor-pointer ${isAnnouncement ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'
              }`}
          >
            {post.title}
          </h3>
          {post.body && (
            <MarkdownPreview content={post.body} className="text-sm mb-3" />
          )}

          {/* Post Footer */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              <span>{comments.length} comments</span>
              {showComments ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </button>
            {post.is_resolved !== null && (
              <span className={`px-2 py-0.5 rounded text-xs ${post.is_resolved
                ? 'bg-turf-green-500/10 text-turf-green-600'
                : 'bg-royal-gold-500/10 text-royal-gold-600'
                }`}>
                {post.is_resolved ? 'Resolved' : 'Open'}
              </span>
            )}
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="pt-4 border-t border-border mt-4">
              {/* Add Comment Form */}
              <div className="mb-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full px-3 py-2 bg-muted/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-muted/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {comment.User.fname} {comment.User.lname}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PostsList: React.FC<PostsListProps> = ({
  posts,
  isLoading,
  currentUser,
  isInstructorOfCommunity,
  communityId,
  onEditPost,
  onDeletePost
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-background border border-border rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
            <div className="h-5 w-3/4 bg-muted rounded mb-2" />
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-background border border-border rounded-lg p-8 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No posts yet in this community</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-4">Posts</h2>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          isInstructorOfCommunity={isInstructorOfCommunity}
          communityId={communityId}
          onEdit={onEditPost}
          onDelete={onDeletePost}
        />
      ))}
    </div>
  );
};

export default PostsList;

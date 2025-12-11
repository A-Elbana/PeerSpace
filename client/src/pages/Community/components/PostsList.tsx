import React from 'react';
import { MessageSquare, Clock, User, ArrowBigUp, ArrowBigDown, Megaphone } from 'lucide-react';

interface PostAuthor {
  id: number;
  fname: string;
  lname: string;
  avatar_url: string | null;
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

interface PostsListProps {
  posts: Post[];
  isLoading: boolean;
}

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
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
      math: 'bg-blue-500/10 text-blue-500',
      scientific: 'bg-green-500/10 text-green-500',
      puzzles: 'bg-purple-500/10 text-purple-500',
      discussion: 'bg-gray-500/10 text-gray-500',
    };
    return colors[type.toLowerCase()] || colors.discussion;
  };

  // Parse multiple tags (comma-separated)
  const tags = post.type?.split(',').map((t: string) => t.trim().toLowerCase()) || [];
  const isAnnouncement = tags.includes('announcement');

  return (
    <div className={`bg-background border rounded-lg overflow-hidden hover:border-primary/50 transition-colors ${isAnnouncement ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-border'
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
        <div className="flex-1 p-4">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Author Avatar */}
              {post.User.avatar_url ? (
                <img
                  src={post.User.avatar_url}
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
          </div>

          {/* Post Content */}
          <h3 className={`font-semibold mb-2 ${isAnnouncement ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'
            }`}>{post.title}</h3>
          {post.body && (
            <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
              {post.body}
            </p>
          )}

          {/* Post Footer */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{post._count?.Comment || 0} comments</span>
            </div>
            {post.is_resolved !== null && (
              <span className={`px-2 py-0.5 rounded text-xs ${post.is_resolved
                ? 'bg-green-500/10 text-green-500'
                : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                {post.is_resolved ? 'Resolved' : 'Open'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PostsList: React.FC<PostsListProps> = ({ posts, isLoading }) => {
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
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default PostsList;

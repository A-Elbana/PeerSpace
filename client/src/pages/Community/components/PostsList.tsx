import PostCard from '../../../components/posts/PostCard';
import type { PostShape } from '../../../components/posts/PostCard';
import { MessageSquare } from 'lucide-react';

interface PostsListProps {
  posts: PostShape[];
  isLoading: boolean;
  currentUser?: { id: number; role: string } | null;
  isInstructorOfCommunity?: boolean;
  onEditPost?: (post: PostShape) => void;
  onDeletePost?: (postId: number) => void;
  onViewPost?: (post: PostShape) => void;
}

const PostsList: React.FC<PostsListProps> = ({
  posts,
  isLoading,
  currentUser,
  isInstructorOfCommunity,
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
        <div key={post.id} onClick={() => onViewPost ? onViewPost(post) : undefined} className="cursor-pointer">
          <PostCard
            post={post}
            clickable={false}
            currentUser={currentUser}
            isInstructorOfCommunity={isInstructorOfCommunity}
            onEdit={onEditPost}
            onDelete={onDeletePost}
          />
        </div>
      ))}
    </div>
  );
};

export default PostsList;

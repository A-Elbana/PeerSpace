import { type FC } from 'react';
import { Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PostAuthor {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
}

interface PostCardHeaderProps {
  author: PostAuthor;
  postDate: string;
  authorAvatarUrl: string | null;
  communityName?: string;
  tags: { tag: string }[];
}

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

const PostCardHeader: FC<PostCardHeaderProps> = ({
  author,
  postDate,
  authorAvatarUrl,
  communityName
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      {authorAvatarUrl ? (
        <img
          src={authorAvatarUrl}
          alt={`${author.fname} ${author.lname}`}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
      <div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${author.id}`);
            }}
            className="text-sm font-medium text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
          >
            {author.fname} {author.lname}
          </button>
          {communityName && (
            <span className="text-sm text-muted-foreground">· {communityName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatDate(postDate)}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCardHeader;

import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Clock, User, ArrowBigUp, ArrowBigDown, Megaphone, MoreHorizontal, PenSquare, Trash2 } from 'lucide-react';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { MarkdownPreview } from '../MarkdownEditor';
import { voteApi } from '../../services/api';
import { toast } from 'sonner';

interface PostAuthor {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
}

export interface PostShape {
  id: number;
  title: string;
  type: string;
  body: string | null;
  post_date: string;
  is_resolved: boolean | null;
  User: PostAuthor;
  owner_uid?: number;
  cid?: string;
  _count?: { Comment: number };
}

interface PostCardProps {
  post: PostShape;
  communityName?: string;
  onNavigate?: (communityId: string) => void;
  currentUser?: { id: number; role: string } | null;
  isInstructorOfCommunity?: boolean;
  onEdit?: (post: PostShape) => void;
  onDelete?: (postId: number) => void;
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

export default function PostCard({ post, communityName, onNavigate, currentUser, isInstructorOfCommunity, onEdit, onDelete }: PostCardProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const authorAvatarUrl = useResolvedFileUrl(post.User.avatar_file_id);
  const tags = post.type?.split(',').map((t: string) => t.trim().toLowerCase()) || [];
  const isAnnouncement = tags.includes('announcement');

  const canModify = currentUser && (
    currentUser.id === post.User.id ||
    currentUser.role === 'admin' ||
    (currentUser.role === 'instructor' && isInstructorOfCommunity)
  );

  // Voting state
  const [upvotes, setUpvotes] = useState<number>(0);
  const [downvotes, setDownvotes] = useState<number>(0);
  const [userVote, setUserVote] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await voteApi.getVoteInfo(post.id);
        if (!mounted) return;
        setUpvotes(res.upvotes ?? 0);
        setDownvotes(res.downvotes ?? 0);
        setUserVote(res.userVote ?? null);
      } catch (err) {
        // ignore (public endpoint may fail for guests)
      }
    })();
    return () => { mounted = false; };
  }, [post.id]);

  const handleUp = async () => {
    try {
      if (userVote === true) {
        await voteApi.removeVote(post.id);
        setUserVote(null);
        setUpvotes(u => Math.max(0, u - 1));
        return;
      }
      await voteApi.votePost(post.id, true);
      if (userVote === false) setDownvotes(d => Math.max(0, d - 1));
      setUpvotes(u => u + 1);
      setUserVote(true);
    } catch (err: any) {
      if (err?.response?.status === 401) toast.error('Please login to vote');
      else toast.error('Failed to vote');
    }
  };

  const handleDown = async () => {
    try {
      if (userVote === false) {
        await voteApi.removeVote(post.id);
        setUserVote(null);
        setDownvotes(d => Math.max(0, d - 1));
        return;
      }
      await voteApi.votePost(post.id, false);
      if (userVote === true) setUpvotes(u => Math.max(0, u - 1));
      setDownvotes(d => d + 1);
      setUserVote(false);
    } catch (err: any) {
      if (err?.response?.status === 401) toast.error('Please login to vote');
      else toast.error('Failed to vote');
    }
  };

  return (
    <div className={`bg-background border rounded-lg overflow-visible hover:border-primary/50 transition-colors ${isAnnouncement ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-border'}`}>
      <div className="flex">
        {isAnnouncement ? (
          <div className="w-12 bg-gradient-to-b from-yellow-500/20 to-orange-500/20 flex flex-col items-center justify-center py-3 border-r border-yellow-500/30">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Megaphone size={16} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="w-12 bg-muted/30 flex flex-col items-center py-3 gap-1">
            <button onClick={handleUp} className={`transition-colors ${userVote === true ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`}>
              <ArrowBigUp size={24} />
            </button>
            <span className="text-sm font-bold text-foreground">{upvotes}</span>
            <button onClick={handleDown} className={`transition-colors ${userVote === false ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'}`}>
              <ArrowBigDown size={24} />
            </button>
          </div>
        )}

        <div className="flex-1 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {authorAvatarUrl ? (
                <img src={authorAvatarUrl} alt={`${post.User.fname} ${post.User.lname}`} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{post.User.fname} {post.User.lname}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(post.post_date)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {tags.map((tag: string, index: number) => (
                  <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(tag)}`}>{tag}</span>
                ))}
              </div>

              {canModify && (
                <div className="relative" ref={menuRef}>
                  <button className="p-1 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    <button onClick={() => onEdit?.(post)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground"><PenSquare size={14} /> Edit</button>
                    <button onClick={() => onDelete?.(post.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <h3 className={`font-semibold mb-2 ${isAnnouncement ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>{post.title}</h3>
          {post.body && <MarkdownPreview content={post.body} className="text-sm mb-3" />}

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{post._count?.Comment || 0} comments</span>
            </div>
            {post.is_resolved !== null && (
              <span className={`px-2 py-0.5 rounded text-xs ${post.is_resolved ? 'bg-turf-green-500/10 text-turf-green-600' : 'bg-royal-gold-500/10 text-royal-gold-600'}`}>{post.is_resolved ? 'Resolved' : 'Open'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

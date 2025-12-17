import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, User, ArrowBigUp, ArrowBigDown, Megaphone, MoreHorizontal, PenSquare, Trash2, Download, FileIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { MarkdownPreview, MarkdownEditor } from '../MarkdownEditor';
import { PostModal } from './EditPostModal';
import PostImageModal from './PostImageModal';
import api, { voteApi, postApi, communityApi } from '../../services/api';
import TagChip from '../common/TagChip';
import { toast } from 'sonner';

interface PostAuthor {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
}

interface PostFile {
  id: string;
  public_id?: string;
  secure_url?: string;
  resource_type?: string;
  format?: string;
  name?: string;
  size?: number;
}

interface PostFileAttachment {
  fid: string;
  File?: PostFile;
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
  PostFileAttachment?: PostFileAttachment[];
  PostTag: { tag: string }[];
}

interface PostCardProps {
  post: PostShape;
  communityName?: string;
  currentUser?: { id: number; role: string } | null;
  onDelete?: (postId: number) => void;
  clickable?: boolean;
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


export default function PostCard({ post, currentUser, onDelete, clickable = true }: PostCardProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const authorAvatarUrl = useResolvedFileUrl(post.User.avatar_file_id);
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [communityName, setCommunityName] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!post.cid || !currentUser) return;
        
        const commNameRes = await communityApi.getById(post.cid);
        if (!mounted) return;
        
        
        setCommunityName(commNameRes.data.name);
      } catch (err) {
        console.log(err)  
      }
    })();
    return () => { mounted = false; };
  }, [post.cid, currentUser]);
  const canModify = currentUser && (
    currentUser.id === post.User.id ||
    currentUser.role === 'admin' ||
    (currentUser.role === 'instructor')
  );

  // Get attachments - handle both old and new format
  const attachments = (post.PostFileAttachment || []).filter(a => a.File?.secure_url);
  const images = attachments.filter(a => {
    const fmt = a.File?.format?.toLowerCase();
    const url = a.File?.secure_url || '';
    const imageFormats = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
    // Prefer explicit format; fall back to URL extension
    return (fmt && imageFormats.has(fmt)) || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
  });
  const files = attachments.filter(a => !images.includes(a));

  // Carousel handlers
  const goToPrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };



  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileName = (file?: PostFile) => {
    if (!file) return 'File';
    if (file.name) return file.name;
    if (file.public_id) {
      const parts = file.public_id.split('/');
      const name = parts[parts.length - 1];
      return file.format ? `${name}.${file.format}` : name;
    }
    return `${file.format ? `file.${file.format}` : 'file'}`;
  };

  // Voting state: use single score from API (upvotes - downvotes)
  const [score, setScore] = useState<number>(0);
  const [userVote, setUserVote] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await voteApi.getVoteInfo(post.id);
        if (!mounted) return;
        // Prefer using the server-provided score (upvotes - downvotes)
        setScore(res.score ?? (res.upvotes ?? 0) - (res.downvotes ?? 0));
        // Normalize userVote which may be boolean or numeric (1 / -1)
        const raw = res.userVote;
        const normalize = (v: any): boolean | null => {
          if (v === null || v === undefined) return null;
          if (typeof v === 'boolean') return v;
          if (typeof v === 'number') {
            if (v === 1) return true;
            if (v === -1) return false;
            return null;
          }
          // fallback for string values like '1' / '-1' / 'true' / 'false'
          if (typeof v === 'string') {
            if (v === '1' || v.toLowerCase() === 'true') return true;
            if (v === '-1' || v.toLowerCase() === 'false') return false;
          }
          return null;
        };
        setUserVote(normalize(raw));
      } catch (err) {
        // ignore (public endpoint may fail for guests)
      }
    })();
    return () => { mounted = false; };
  }, [post.id]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUp = async () => {
    try {
      if (userVote === true) {
        await voteApi.removeVote(post.id);
        setUserVote(null);
        setScore(s => s - 1);
        return;
      }
      await voteApi.votePost(post.id, true);
      if (userVote === false) setScore(s => s + 2);
      else setScore(s => s + 1);
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
        setScore(s => s + 1);
        return;
      }
      await voteApi.votePost(post.id, false);
      if (userVote === true) setScore(s => s - 2);
      else setScore(s => s - 1);
      setUserVote(false);
    } catch (err: any) {
      if (err?.response?.status === 401) toast.error('Please login to vote');
      else toast.error('Failed to vote');
    }
  };

  const goToPreview = () => {
    const currentPath = window.location.pathname;
    const targetPath = `/community/${post.cid}/post/${post.id}`;
    if (currentPath !== targetPath) {
      navigate(targetPath);
    }
  };

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (!clickable) return;
        if (isEditOpen || showImageModal) return;
        goToPreview();
      }}
      className={`bg-card border rounded-xl overflow-visible ${clickable ? 'hover:border-frosted-blue-500/50 hover:shadow-md cursor-pointer' : ''} transition-all duration-200 ${post.type.toLowerCase() == "announcement"  ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-border'}`}
    >
      <div className="flex">
        {post.type.toLowerCase() == "announcement" ? (
          <div className="w-12 bg-linear-to-b from-yellow-500/20 to-orange-500/20 flex flex-col items-center justify-center py-3 border-r border-yellow-500/30">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Megaphone size={16} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="w-12 bg-muted/30 flex flex-col items-center py-3 gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); void handleUp(); }}
              className={`transition-colors flex items-center justify-center ${userVote === true ? 'bg-turf-green-600 text-white w-8 h-8 rounded-full' : 'text-turf-green-600 hover:text-turf-green-700'}`}
              aria-pressed={userVote === true}
            >
              <ArrowBigUp size={20} />
            </button>
            <span className="text-sm font-bold text-foreground">{score}</span>
            <button
              onClick={(e) => { e.stopPropagation(); void handleDown(); }}
              className={`transition-colors flex items-center justify-center ${userVote === false ? 'bg-red-600 text-white w-8 h-8 rounded-full' : 'text-red-600 hover:text-red-700'}`}
              aria-pressed={userVote === false}
            >
              <ArrowBigDown size={20} />
            </button>
          </div>
        )}

        <div className="flex-1 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {authorAvatarUrl ? (
                <img src={authorAvatarUrl} alt={`${post.User.fname} ${post.User.lname}`} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-frosted-blue-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-frosted-blue-600" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.User.id}`); }}
                    className="text-sm font-medium text-foreground hover:text-frosted-blue-600 hover:underline cursor-pointer transition-colors"
                  >
                    {post.User.fname} {post.User.lname}
                  </button>
                  {post.cid && (
                    <span className="text-sm text-muted-foreground">· {communityName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(post.post_date)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {post.PostTag?.map((tagObj) => (
                  <TagChip key={tagObj.tag} label={tagObj.tag} size="sm" />
                ))}
              </div>

              {canModify && (
                <div className="relative" ref={menuRef}>
                  <button
                    className="p-1 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
                    aria-expanded={isMenuOpen}
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-lg shadow-xl z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          setIsEditOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground transition-colors"
                      >
                        <PenSquare size={14} /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onDelete?.(post.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <h3 className={`font-semibold mb-2 text-base ${post.type.toLowerCase() == "announcement" ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>{post.title}</h3>
          {post.body && <MarkdownPreview content={post.body} className="text-sm mb-3" />}

          {/* Image Gallery */}
          {images.length > 0 && (
            <>
              {/* Smart responsive grid for multiple images */}
              {images.length === 1 ? (
                <div className="mb-3 rounded-lg overflow-hidden bg-muted/30 border border-border cursor-pointer group"
                  onClick={(e: any) => { e.stopPropagation(); setShowImageModal(true); }}>
                  <div className="relative bg-black/5 aspect-video flex items-center justify-center">
                    <img
                      src={images[0].File?.secure_url}
                      alt={getFileName(images[0].File)}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                  </div>
                </div>
              ) : (
                <div className="mb-3 rounded-lg overflow-hidden bg-muted/30 border border-border">
                  <div className="relative bg-black/5 aspect-video flex items-center justify-center cursor-pointer group overflow-hidden"
                    onClick={(e: any) => { e.stopPropagation(); setShowImageModal(true); }}>
                    <img
                      src={images[currentImageIndex].File?.secure_url}
                      alt={getFileName(images[currentImageIndex].File)}
                      className="w-full h-full object-contain transition-opacity group-hover:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e: any) => { e.stopPropagation(); goToPrevImage(); }} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70"><ChevronLeft size={20} /></button>
                      <button onClick={(e: any) => { e.stopPropagation(); goToNextImage(); }} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70"><ChevronRight size={20} /></button>
                    </div>
                  </div>
                  {/* Counter */}
                  <div className="flex items-center justify-between px-3 py-2 bg-background border-t border-border text-xs font-medium text-muted-foreground">
                    <span>{currentImageIndex + 1} / {images.length}</span>
                    <div className="flex gap-1">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e: any) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-frosted-blue-500 w-4' : 'bg-border hover:bg-muted-foreground'
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Image Modal */}
              <PostImageModal
                images={images}
                initialIndex={currentImageIndex}
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
              />
            </>
          )}

          {/* Other Files */}
          {files.length > 0 && (
            <div className="mb-3 space-y-2">
              {files.map((attachment) => (
                <a
                  key={attachment.fid}
                  href={attachment.File?.secure_url}
                  download={getFileName(attachment.File)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e: any) => e.stopPropagation()}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors group"
                >
                  <div className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-background">
                    <FileIcon size={16} className="text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-frosted-blue-600">
                      {getFileName(attachment.File)}
                    </div>
                    {attachment.File?.size && (
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.File.size)}
                      </div>
                    )}
                  </div>
                  <Download size={16} className="shrink-0 text-muted-foreground group-hover:text-frosted-blue-600" />
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{post._count?.Comment || 0} comments</span>
            </div>
            {post.is_resolved !== null && (
              <span className={`px-2 py-0.5 rounded text-xs ${post.is_resolved ? 'bg-turf-green-500/10 text-turf-green-600' : 'bg-royal-gold-500/10 text-royal-gold-600'}`}>{post.is_resolved ? 'Resolved' : 'Open'}</span>
            )}
          </div>

          <PostModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            post={post as any}
            onSuccess={async (updated: PostShape)  =>  {
              setIsEditOpen(false);
              post.title = (updated.title as any) ?? post.title;
              post.body = updated.body;
            }}
          />
        </div>
      </div>
    </div>
  );
}

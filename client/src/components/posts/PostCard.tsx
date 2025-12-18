import { useEffect, useState, useRef, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowBigUp, ArrowBigDown, MoreHorizontal, PenSquare, Trash2, Download, FileIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { MarkdownPreview } from '../MarkdownEditor';
import TickButton from './TickButton';
import { PostModal } from './EditPostModal';
import PostImageModal from './PostImageModal';
import { voteApi, communityApi } from '../../services/api';
import TagChip from '../common/TagChip';
import { toast } from 'sonner';
import PostCardHeader from './PostCardHeader';
import PostTypeSidebar from './PostTypeSidebar';
import { getPostTypeConfig } from './postTypeConfig';

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
  onEdit?: (post?: PostShape) => void;
}

export default function PostCard({ post, currentUser, onDelete, clickable = true, onEdit }: PostCardProps) {
  // Get post type configuration
  const typeConfig = getPostTypeConfig(post.type);
  const menuRef = useRef<HTMLDivElement>(null);
  const authorAvatarUrl = useResolvedFileUrl(post.User.avatar_file_id);
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [communityName, setCommunityName] = useState<string>('');
  const [isResolvedState, setIsResolvedState] = useState<boolean | null>(post.is_resolved ?? null);

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
    currentUser.role.toLowerCase() === 'admin' ||
    (currentUser.role.toLowerCase() === 'instructor')
  );
  const canEdit = currentUser && (
    currentUser.id === post.User.id ||
    currentUser.role.toLowerCase() === 'admin'
  );

  const isAuthor = Boolean(currentUser && currentUser.id === post.User.id);

  useEffect(() => {
    setIsResolvedState(post.is_resolved ?? null);
  }, [post.is_resolved]);

  const isPrivilegedViewer = currentUser && (currentUser.role.toLowerCase() === 'admin' || currentUser.role.toLowerCase() === 'instructor');

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
    console.log(post);
    
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

  // Voting controls as an inner component
  interface VoteControlsProps {
    score: number;
    userVote: boolean | null;
    onUp: () => Promise<void> | void;
    onDown: () => Promise<void> | void;
    readOnly?: boolean;
  }

  const VoteControls: FC<VoteControlsProps> = ({ score, userVote, onUp, onDown, readOnly = false }) => (
    <div className="w-12 bg-muted/30 flex flex-col items-center py-3 gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); if (!readOnly) void onUp(); }}
        className={`transition-colors flex items-center justify-center ${userVote === true ? 'bg-turf-green-600 text-white w-8 h-8 rounded-full' : 'text-turf-green-600 hover:text-turf-green-700'} ${readOnly ? 'opacity-60 pointer-events-none' : ''}`}
        aria-pressed={userVote === true}
        aria-disabled={readOnly}
      >
        <ArrowBigUp size={20} />
      </button>
      <span className="text-sm font-bold text-foreground">{score}</span>
      <button
        onClick={(e) => { e.stopPropagation(); if (!readOnly) void onDown(); }}
        className={`transition-colors flex items-center justify-center ${userVote === false ? 'bg-red-600 text-white w-8 h-8 rounded-full' : 'text-red-600 hover:text-red-700'} ${readOnly ? 'opacity-60 pointer-events-none' : ''}`}
        aria-pressed={userVote === false}
        aria-disabled={readOnly}
      >
        <ArrowBigDown size={20} />
      </button>
    </div>
  );

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
      onClick={() => {
        if (!clickable) return;
        if (isEditOpen || showImageModal) return;
        goToPreview();
      }}
      className={`relative ${isResolvedState && typeConfig.showResolved ? 'bg-turf-green-100/50 dark:bg-turf-green-600/70' : typeConfig.cardBg} border rounded-xl overflow-visible ${clickable ? 'hover:border-frosted-blue-500/50 hover:shadow-md cursor-pointer' : ''} transition-all duration-200 ${typeConfig.cardBorder}`}
    >
      <div className="flex">
        <PostTypeSidebar config={typeConfig}>
          {typeConfig.showVoting && (
            <VoteControls
              score={score}
              userVote={userVote}
              onUp={handleUp}
              onDown={handleDown}
              readOnly={isPrivilegedViewer || !currentUser}
            />
          )}
        </PostTypeSidebar>

        <div className="flex-1 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <PostCardHeader
              author={post.User}
              postDate={post.post_date}
              authorAvatarUrl={authorAvatarUrl}
              communityName={communityName}
              tags={post.PostTag}
            />

            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {post.PostTag?.map((tagObj) => (
                  <TagChip key={tagObj.tag} label={tagObj.tag} size="sm" />
                ))}
              </div>

              {typeConfig.showResolved && isResolvedState !== null && (isAuthor || isResolvedState) && (
                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                  <TickButton
                    postId={post.id}
                    isResolved={isResolvedState}
                    isAuthor={isAuthor}
                    onToggled={(val) => { setIsResolvedState(val); (post as any).is_resolved = val; }}
                  />
                </div>
              )}

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
                      {canEdit && (<button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          if (onEdit) {
                            onEdit(post);
                          } else {
                            setIsEditOpen(true);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground transition-colors"
                      >
                        <PenSquare size={14} /> Edit
                      </button>)}
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

          <h3 className={`font-semibold mb-2 text-base ${typeConfig.titleColor}`}>{post.title}</h3>
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
            {typeConfig.showResolved && post.is_resolved !== null && (
              <span className={`px-2 py-0.5 rounded text-xs ${post.is_resolved ? 'bg-turf-green-500/10 text-turf-green-600' : 'bg-royal-gold-500/10 text-royal-gold-600'}`}>{post.is_resolved ? 'Resolved' : 'Open'}</span>
            )}
          </div>

          <PostModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            post={post as any}
            onSuccess={async (updated: PostShape) => {
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

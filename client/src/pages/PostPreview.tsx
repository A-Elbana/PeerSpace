import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/dashboard';
import { useSidebar } from '../contexts/SidebarContext';
import { Loader2, MessageSquare, Home, FileText, ChevronRight } from 'lucide-react';
import PostCard from '../components/posts/PostCard';
import { Button } from '../components/ui/button';
import CommentItem from '../components/common/CommentItem';
import CommunityCard from '../components/common/CommunityCard';
import { toast } from 'sonner';
import api, * as apiServices from '../services/api';
import type { PostResponse, CommunityResponse } from '../services/api';

const { postApi, communityApi, commentApi, fileApi } = apiServices;

type Attachment = { id: number; name: string; url: string };

interface Comment {
  id: number;
  content: string;
  created_at: string;
  User: { id: number; fname: string; lname: string; avatar_file_id?: string | null };
  votes?: number;
  userVote?: number;
  replies?: Comment[];
  hasReplies?: boolean;
  avatarUrl?: string | null;
  attachments?: Attachment[];
}

// Comments are fetched from server; no local dummy seeding.

const PostPreview: React.FC<{}> = () => {
  const { communityId, postId } = useParams<{ communityId: string; postId: string }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  const [post, setPost] = useState<PostResponse | null>(null);
  const [community, setCommunity] = useState<CommunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null);
  const [instructors, setInstructors] = useState<Array<{ id: number }>>([]);

  // Helper to normalize API responses that may be wrapped: { success, data } or { data: { data: ... } }
  const normalizeApi = (res: any) => {
    if (!res) return null;
    // unwrap common axios response shapes
    const step1 = res && (res.data ?? res);
    // if API uses { success, data } or { data: { data: ... } }
    if (step1 && step1.data) return step1.data;
    return step1;
  };

  // Comments UI state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replySubmittingId, setReplySubmittingId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState(''); // kept for backward-compat but replies use local state now
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    // toggle and when expanding, load replies for the comment if needed
    const isCurrentlyExpanded = expandedCommentIds.has(id);
    setExpandedCommentIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
    if (!isCurrentlyExpanded) {
      // we are expanding -> fetch replies if the comment indicates it has children and none loaded
      const find = (nodes: Comment[]): Comment | null => {
        for (const n of nodes) {
          if (n.id === id) return n;
          if (n.replies && n.replies.length) {
            const found = find(n.replies);
            if (found) return found;
          }
        }
        return null;
      };
      const node = find(comments);
      if (node && node.hasReplies && (!node.replies || node.replies.length === 0)) {
        void loadRepliesFor(id);
      }
    }
  };

  // Load first-level replies for a given comment id and insert into tree
  const loadRepliesFor = async (parentId: number) => {
    try {
      const res = await commentApi.getReplies(parentId, { limit: 1000 });
      const raw = normalizeApi(res) ?? (res && (res.data ?? res));
      const arr = raw?.data ?? raw;
      if (!Array.isArray(arr)) return;
      const mapped = (arr as any[]).map(c => ({
        id: c.id,
        content: c.content,
        created_at: new Date(c.comment_date).toISOString(),
        User: c.User || { id: c.commenter_uid ?? 0, fname: 'Unknown', lname: '' },
        votes: c.votes ?? 0,
        replies: [],
        avatarUrl: null,
        hasReplies: Boolean(c.hasReplies),
      } as Comment));

      // fetch avatars for these replies if present
      try {
        const avatarIds = mapped.map(m => (m.User as any)?.avatar_file_id).filter(Boolean);
        const unique = Array.from(new Set(avatarIds));
        if (unique.length > 0) {
          const idToUrl: Record<string, string> = {};
          await Promise.all(unique.map(async (aid) => {
            try {
              const f = await fileApi.getById(String(aid));
              const fileObj = normalizeApi(f) ?? (f && (f.data ?? f));
              const avatarUrl = fileObj?.secure_url ?? fileObj?.secureUrl ?? fileObj?.url ?? null;
              if (avatarUrl) idToUrl[String(aid)] = avatarUrl;
            } catch (e) { /* ignore */ }
          }));
          mapped.forEach(m => {
            const aid = (m.User as any)?.avatar_file_id;
            if (aid && idToUrl[String(aid)]) m.avatarUrl = idToUrl[String(aid)];
          });
        }
      } catch (e) {
        console.debug('reply avatar fetch failed', e);
      }

      setComments(prev => updateCommentInTree(prev, parentId, (c) => ({ ...c, replies: mapped })));
      setExpandedCommentIds(prev => {
        const s = new Set(prev);
        s.add(parentId);
        return s;
      });
    } catch (err) {
      console.error('Failed to load replies for', parentId, err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let pRes: any = null;
      try {
        if (!postId) return;
        // fetch current user (for permission checks)
        try {
          const me = await api.get('/auth/me');
          setCurrentUser(me.data);
        } catch (e) {
          console.log(e);
          
        }
        // load post and community when available (keep errors silent for demo)
        try {
          const p = await postApi.getById(Number(postId));
          pRes = p;
          setPost(p as any);
          console.log('fetched post raw:', p);
        } catch (e) {
          pRes = null;
        }

        // determine community id: prefer route param, otherwise derive from post (cid)
        let cid: string | undefined = communityId ?? undefined;
        if (!cid && pRes) {
          cid = (pRes.cid ?? pRes.community_id ?? pRes.communityId) as string | undefined;
        }

        if (cid) {
          try {
            const c = await communityApi.getById(String(cid));
            const communityObj = normalizeApi(c) ?? (c as any);
            if (communityObj) {
              // normalize banner url field to `bannerUrl`
              const normalized = { ...communityObj, bannerUrl: communityObj.banner_url ?? communityObj.bannerUrl ?? null };
              console.debug('fetched community:', normalized);
              setCommunity(normalized as any);
            }
          } catch (e) {
            // ignore
          }
          // also fetch members to determine instructors for delete permission
          try {
            const membersRes = await communityApi.getMembers(String(cid), { limit: 100 });
            const membersData = normalizeApi(membersRes) ?? (membersRes && (membersRes.data ?? membersRes));
            const instr = membersData?.instructors ?? membersData?.data?.instructors ?? [];
            setInstructors(instr || []);
          } catch (e) {
            // ignore
          }
        }

        // Fetch first-level comments only; replies are loaded on demand
        try {
          const res = await commentApi.getByPost(Number(postId), { includeReplies: false, limit: 1000 });
          const raw = res && (res.data ?? res);
          const arr = raw?.data ?? raw;

          if (Array.isArray(arr)) {
            const mapped = (arr as any[]).map(c => ({
              id: c.id,
              content: c.content,
              created_at: new Date(c.comment_date).toISOString(),
              User: c.User || { id: c.commenter_uid ?? 0, fname: 'Unknown', lname: '' },
              votes: c.votes ?? 0,
              replies: [],
              avatarUrl: null,
              hasReplies: Boolean(c.hasReplies),
            } as Comment));

            // batch-fetch avatar URLs for comments that have avatar_file_id
            try {
              const avatarIds = mapped.map(m => (m.User as any)?.avatar_file_id).filter(Boolean);
              const unique = Array.from(new Set(avatarIds));
              if (unique.length > 0) {
                const idToUrl: Record<string, string> = {};
                await Promise.all(unique.map(async (aid) => {
                  try {
                    const f = await fileApi.getById(String(aid));
                    const fileObj = normalizeApi(f) ?? (f && (f.data ?? f));
                    const avatarUrl = fileObj?.secure_url ?? fileObj?.secureUrl ?? fileObj?.url ?? null;
                    if (avatarUrl) idToUrl[String(aid)] = avatarUrl;
                  } catch (e) { /* ignore individual avatar fetch errors */ }
                }));
                mapped.forEach(m => {
                  const aid = (m.User as any)?.avatar_file_id;
                  if (aid && idToUrl[String(aid)]) m.avatarUrl = idToUrl[String(aid)];
                });
              }
            } catch (e) {
              console.debug('avatar batch fetch failed', e);
            }

            setComments(mapped);
          } else {
            setComments([]);
          }
        } catch (e) {
          console.error('Failed to fetch comments', e);
          setComments([]);
        }
      } finally { setLoading(false); }
    };

    void load();
  }, [postId, communityId]);

  // remove a comment (and any nested replies) from the tree
  const removeCommentFromTree = (nodes: Comment[], id: number): Comment[] => {
    const res: Comment[] = [];
    for (const n of nodes) {
      if (n.id === id) continue;
      if (n.replies && n.replies.length) {
        const newReplies = removeCommentFromTree(n.replies, id);
        res.push({ ...n, replies: newReplies });
      } else {
        res.push(n);
      }
    }
    return res;
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!commentId) return;
    if (!window.confirm('Delete this comment? This action cannot be undone.')) return;
    try {
      await commentApi.delete(commentId);
      setComments(prev => removeCommentFromTree(prev, commentId));
      toast.success('Comment deleted');
    } catch (err) {
      console.error('Failed to delete comment', err);
      toast.error('Failed to delete comment');
    }
  };

  // helpers to insert reply into nested tree
  const addReplyToTree = (nodes: Comment[], parentId: number, reply: Comment): Comment[] => {
    return nodes.map(n => {
      if (n.id === parentId) return { ...n, replies: n.replies ? [...n.replies, reply] : [reply] };
      if (n.replies && n.replies.length) return { ...n, replies: addReplyToTree(n.replies, parentId, reply) };
      return n;
    });
  };

  // helpers to update a comment node in the nested tree
  const updateCommentInTree = (nodes: Comment[], id: number, updater: (c: Comment) => Comment): Comment[] => {
    return nodes.map(n => {
      if (n.id === id) return updater(n);
      if (n.replies && n.replies.length) return { ...n, replies: updateCommentInTree(n.replies, id, updater) };
      return n;
    });
  };

  const handleSaveEdit = async (commentId: number, content: string) => {
    if (!content || !content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      const res = await commentApi.update(commentId, { content: content.trim() });
      const createdRaw = normalizeApi(res) ?? (res && (res.data ?? res));
      const updatedRaw = createdRaw?.data ?? createdRaw;
      if (!updatedRaw) throw new Error('No updated comment returned');

      const map = (c: any): Comment => ({
        id: c.id,
        content: c.content,
        created_at: new Date(c.comment_date).toISOString(),
        User: c.User || { id: c.commenter_uid ?? 0, fname: 'Unknown', lname: '' },
        votes: c.votes ?? 0,
        replies: Array.isArray(c.other_Comment) ? c.other_Comment.map(map) : [],
        hasReplies: Array.isArray(c.other_Comment) ? c.other_Comment.length > 0 : Boolean(c.hasReplies),
        avatarUrl: null,
      });

      const mapped = map(updatedRaw as any);
      // fetch avatar if present
      try {
        const avatarId = (updatedRaw as any)?.User?.avatar_file_id;
        if (avatarId) {
          const f = await fileApi.getById(String(avatarId));
          const fileObj = normalizeApi(f) ?? (f && (f.data ?? f));
          const avatarUrl = fileObj?.secure_url ?? fileObj?.secureUrl ?? fileObj?.url ?? null;
          if (avatarUrl) mapped.avatarUrl = avatarUrl;
        }
      } catch (e) {
        // ignore
      }

      setComments(prev => updateCommentInTree(prev, commentId, () => mapped));
      setEditingCommentId(null);
      toast.success('Comment updated');
    } catch (err) {
      console.error('Failed to update comment', err);
      toast.error('Failed to update comment');
    }
  };

  // create comment (always use backend)
  const createCommentAndInsert = async (content: string, parentId?: number) => {
    if (!content.trim()) return null;

    try {
      const res = await commentApi.create({ pid: Number(postId), content: content.trim(), parentCommentId: parentId });
      // normalize possible response wrappers
      const createdRaw = normalizeApi(res) ?? (res && (res.data ?? res));
      const created = createdRaw?.data ?? createdRaw;
      if (!created) return null;

      // map server shape to local Comment
      const map = (c: any): Comment => ({
        id: c.id,
        content: c.content,
        created_at: new Date(c.comment_date).toISOString(),
        User: c.User || { id: c.commenter_uid ?? 0, fname: 'Unknown', lname: '' },
        votes: c.votes ?? 0,
        replies: Array.isArray(c.other_Comment) ? c.other_Comment.map(map) : [],
        hasReplies: Array.isArray(c.other_Comment) ? c.other_Comment.length > 0 : Boolean(c.hasReplies),
      });

      const mapped = map(created as any);
      // fetch avatar for newly created comment's user if available
      try {
        const avatarId = (created as any)?.User?.avatar_file_id;
        if (avatarId) {
          const f = await fileApi.getById(String(avatarId));
          const fileObj = normalizeApi(f) ?? (f && (f.data ?? f));
          const avatarUrl = fileObj?.secure_url ?? fileObj?.secureUrl ?? fileObj?.url ?? null;
          if (avatarUrl) mapped.avatarUrl = avatarUrl;
        }
      } catch (e) {
        /* ignore avatar fetch errors */
      }
      if (!parentId) setComments(prev => [...prev, mapped]);
      else setComments(prev => addReplyToTree(prev, parentId, mapped));
      return mapped;
    } catch (err) {
      console.error('create comment failed', err);
      return null;
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentSubmitting(true);
    try {
      const created = await createCommentAndInsert(newComment);
      if (created) {
        setNewComment('');
        toast.success('Comment posted');
      } else {
        toast.error('Failed to post comment');
      }
    } catch (err) {
      console.error('Failed to post comment', err);
      toast.error('Failed to post comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: number, content?: string) => {
    const body = content !== undefined ? content : replyText;
    if (!body || !body.trim()) return null;
    setReplySubmittingId(parentId);
    try {
      const created = await createCommentAndInsert(body, parentId);
      if (created) {
        if (content === undefined) setReplyText('');
        setReplyingTo(null);
        toast.success('Reply posted');
      } else {
        toast.error('Failed to post reply');
      }
      return created;
    } catch (err) {
      console.error('Failed to post reply', err);
      toast.error('Failed to post reply');
      return null;
    } finally {
      setReplySubmittingId(null);
    }
  };



  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar onLogout={() => (window.location.href = '/logout')} />
      <main
        className="flex-1 p-6 text-black dark:text-white transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6">
            {/* Breadcrumb: Home / Post */}
            <div className="mb-2">
              <nav className="text-sm text-muted-foreground flex items-center gap-2" aria-label="Breadcrumb">
                <button
                  onClick={() => navigate('/explore')}
                  className="flex items-center gap-1 hover:text-foreground"
                  aria-label="Explore communities"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
                <ChevronRight className="w-3 h-3" />
                <div className="flex items-center gap-1 text-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium truncate max-w-[32ch]">{(post as any)?.title ?? 'Post'}</span>
                </div>
              </nav>
            </div>

            <div className="mb-6">
              {post ? (
                <PostCard
                  key={post.id}
                  post={post as any}
                  clickable={true}
                  currentUser={currentUser}
                />
              ) : (
                <div className="bg-card border rounded-lg p-6">Loading post...</div>
              )}
            </div>

            <div className="bg-card border rounded-lg p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Discussion</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Join the conversation — replies are threaded.</p>
              </div>

              <div className="mb-4">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." className="w-full px-3 py-2 border rounded" rows={3} />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleAddComment} disabled={!newComment.trim() || commentSubmitting}>
                    {commentSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                    {commentSubmitting ? 'Posting...' : 'Comment'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 overflow-x-auto max-w-full">
                {comments.map(c => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    editingCommentId={editingCommentId}
                    setEditingCommentId={setEditingCommentId}
                    handleSaveEdit={handleSaveEdit}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    handleAddReply={handleAddReply}
                    expandedCommentIds={expandedCommentIds}
                    toggleExpand={toggleExpand}
                    currentUser={currentUser}
                    isInstructor={Boolean(currentUser && currentUser.role === 'instructor' && instructors.some(i => i.id === currentUser.id))}
                    handleDelete={handleDeleteComment}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right-side community info widget */}
          <aside className="w-full md:w-80">
            <div className="sticky top-24">
              {community ? (
                <CommunityCard community={community as any} onClick={() => navigate(`/community/${(community as any).id}`)} />
              ) : (
                <div className="bg-card border rounded-lg p-4 mb-4">
                  <div className="w-full mb-3 rounded-md overflow-hidden">
                    <div className="w-full h-28 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm">Community banner</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Community</div>
                      <div className="text-xs text-muted-foreground">Community info</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">No community data available.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PostPreview;

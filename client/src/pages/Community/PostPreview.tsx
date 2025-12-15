import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/dashboard';
import { Loader2, MessageSquare, User, Home, FileText, ChevronRight, ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { MarkdownPreview } from '../../components/MarkdownEditor';
import { Button } from '../../components/ui/button';
import CommentItem from '../../components/common/CommentItem';
import { toast } from 'sonner';
import * as apiServices from '../../services/api';
import type { PostResponse, CommunityResponse } from '../../services/api';

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
  avatarUrl?: string | null;
  attachments?: Attachment[];
}

const formatDate = (dateInput: string | number | Date | undefined | null) => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

// Comments are fetched from server; no local dummy seeding.

const PostPreview: React.FC = () => {
  const { communityId, postId } = useParams<{ communityId: string; postId: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<PostResponse | null>(null);
  const [community, setCommunity] = useState<CommunityResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState(''); // kept for backward-compat but replies use local state now
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedCommentIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!postId) return;
        // load post and community when available (keep errors silent for demo)
        let postData: any = null;
        try {
          const p = await postApi.getById(Number(postId));
          postData = normalizeApi(p) ?? (p as any);
          console.debug('fetched post raw:', p, 'normalized:', postData);
          setPost(postData as any);

          // fetch post owner's avatar if available
          try {
            const avatarId = postData?.User?.avatar_file_id;
            if (avatarId) {
              const f = await fileApi.getById(String(avatarId));
              console.debug('fileApi.getById response:', f);
              const fileObj = normalizeApi(f) ?? (f && (f.data ?? f));
              const avatarUrl = fileObj?.secure_url ?? fileObj?.secureUrl ?? fileObj?.secureUrl ?? fileObj?.url ?? null;
              if (avatarUrl) {
                const normalizedPost = { ...postData, avatarUrl };
                setPost(normalizedPost as any);
              }
            }
          } catch (e) {
            console.debug('avatar fetch failed', e);
          }
        } catch (e) {
          postData = null;
        }

        // determine community id: prefer route param, otherwise derive from post (cid)
        let cid: string | undefined = communityId ?? undefined;
        if (!cid && postData) {
          cid = (postData.cid ?? postData.community_id ?? postData.communityId) as string | undefined;
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
        }

        // Fetch comments from backend and build full nested tree client-side
        try {
          const res = await commentApi.getByPost(Number(postId), { includeReplies: true, limit: 1000 });
          const raw = res && (res.data ?? res);
          const arr = raw?.data ?? raw;

          if (Array.isArray(arr)) {
            // Build map of id -> node and parent map
            const nodesById: Record<number, Comment> = {};
            const parentById: Record<number, number | null> = {};

            const avatarIdByComment: Record<number, string | null> = {};
            for (const c of arr) {
              const node: Comment = {
                id: c.id,
                content: c.content,
                created_at: new Date(c.comment_date).toISOString(),
                User: c.User || { id: c.commenter_uid ?? 0, fname: 'Unknown', lname: '' },
                votes: c.votes ?? 0,
                replies: [],
                avatarUrl: null,
              };
              nodesById[c.id] = node;
              parentById[c.id] = c.parent_comment_id ?? null;
              avatarIdByComment[c.id] = c?.User?.avatar_file_id ?? null;
            }

            // Fetch unique avatar URLs
            const uniqueAvatarIds = Array.from(
              new Set(Object.values(avatarIdByComment).filter(Boolean) as string[])
            );
            const avatarMap: Record<string, string> = {};
            if (uniqueAvatarIds.length) {
              await Promise.all(uniqueAvatarIds.map(async (aid) => {
                try {
                  const f = await fileApi.getById(String(aid));
                  const fileObj = normalizeApi(f) ?? (f && (f.data ?? f));
                  const url = fileObj?.secure_url ?? fileObj?.secureUrl ?? fileObj?.url ?? null;
                  if (url) avatarMap[String(aid)] = url;
                } catch (err) {
                  // ignore per-file failures
                }
              }));
            }

            // Assign avatarUrl to nodes
            for (const idStr of Object.keys(avatarIdByComment)) {
              const id = Number(idStr);
              const aid = avatarIdByComment[id];
              if (aid && avatarMap[aid] && nodesById[id]) nodesById[id].avatarUrl = avatarMap[aid];
            }

            // Assemble tree
            const roots: Comment[] = [];
            for (const idStr of Object.keys(nodesById)) {
              const id = Number(idStr);
              const node = nodesById[id];
              const parentId = parentById[id];
              if (parentId && nodesById[parentId]) {
                nodesById[parentId].replies = nodesById[parentId].replies ?? [];
                nodesById[parentId].replies!.push(node);
              } else {
                roots.push(node);
              }
            }

            setComments(roots);
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
    const created = await createCommentAndInsert(newComment);
    if (created) setNewComment('');
  };

  const handleAddReply = async (parentId: number, content?: string) => {
    const body = content !== undefined ? content : replyText;
    const created = await createCommentAndInsert(body, parentId);
    if (created) {
      if (content === undefined) setReplyText('');
      setReplyingTo(null);
    }
    return created;
  };

  

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar onLogout={() => (window.location.href = '/logout')} />
      <main className="flex-1 p-6 ml-20 text-white">
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

            <div className="bg-card border rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex flex-col items-center mr-4">
                  {(post as any)?.avatarUrl ? (
                    <img
                      src={(post as any).avatarUrl}
                      alt="author avatar"
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        console.error('Failed to load post avatar', e);
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = 'none';
                        const parent = el.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'w-12 h-12 rounded-full bg-muted flex items-center justify-center';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><User className="w-5 h-5" /></div>
                  )}
                  <div className="text-sm mt-2 text-center text-muted-foreground">
                    {(post as any)?.User ? `${(post as any).User.fname} ${(post as any).User.lname}` : 'Unknown Author'}
                  </div>
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-foreground">{(post as any)?.title || 'Post Preview (demo)'}</h1>
                  <div className="mt-4 text-sm text-foreground">{post?.body ? <MarkdownPreview content={post.body} /> : <p className="text-muted-foreground">No content</p>}</div>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-3 text-foreground">Discussion</h3>
              <div className="mb-4">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." className="w-full px-3 py-2 border rounded" rows={3} />
                <div className="flex justify-end mt-2"><Button onClick={handleAddComment} disabled={!newComment.trim()}><MessageSquare className="w-4 h-4 mr-2" />Comment</Button></div>
              </div>

              <div className="space-y-4">
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
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right-side community info widget */}
          <aside className="w-full md:w-80">
            <div className="sticky top-24">
              <div
                className="bg-card border rounded-lg p-4 mb-4 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => (community ? navigate(`/community/${(community as any).id}`) : null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && community) navigate(`/community/${(community as any).id}`);
                }}
              >
                {/* Banner area */}
                <div className="w-full mb-3 rounded-md overflow-hidden">
                  {((community as any)?.bannerUrl || (community as any)?.banner_url) ? (
                    <img
                      src={(community as any).bannerUrl ?? (community as any).banner_url}
                      alt="community banner"
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        // show placeholder and log error
                        console.error('Failed to load community banner', (e as any)?.nativeEvent || e);
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = 'none';
                        const parent = el.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'w-full h-28 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm';
                          fallback.textContent = 'Community banner';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm">Community banner</div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{community?.name ?? 'Community'}</div>
                    <div className="text-xs text-muted-foreground">{community ? `@${(community as any).slug ?? ''}` : 'Community info'}</div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-3">{community?.description ?? 'No description available for this community.'}</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PostPreview;

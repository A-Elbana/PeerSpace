import React, { useEffect, useState } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import ApprovalButton from './ApprovalButton';
import { commentApi } from '../../services/api';

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  User: { id: number; fname: string; lname: string; avatar_file_id?: string | null };
  votes?: number;
  userVote?: number;
  replies?: Comment[];
  hasReplies?: boolean;
  avatarUrl?: string | null;
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

interface Props {
  comment: Comment;
  depth?: number;
  renderChildren?: boolean;
  editingCommentId: number | null;
  setEditingCommentId: (id: number | null) => void;
  handleSaveEdit: (commentId: number, content: string) => Promise<void>;
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  handleAddReply: (parentId: number, content?: string) => Promise<Comment | null>;
  expandedCommentIds: Set<number>;
  toggleExpand: (id: number) => void;
  currentUser?: { id: number; role: string } | null;
  postOwnerId?: number | null;
  handleDelete?: (id: number) => Promise<void> | void;
}

export const CommentItem: React.FC<Props> = ({
  comment,
  depth = 0,
  renderChildren = true,
  editingCommentId,
  setEditingCommentId,
  handleSaveEdit,
  replyingTo,
  setReplyingTo,
  handleAddReply,
  expandedCommentIds,
  toggleExpand,
  currentUser,
  postOwnerId,
  handleDelete,
}) => {
  const [localReply, setLocalReply] = useState('');
  const [editValue, setEditValue] = useState(comment.content);
  const isInstructor = Boolean(currentUser && (currentUser.role || '').toLowerCase() === 'instructor');
  useEffect(() => {
    if (editingCommentId === comment.id) setEditValue(comment.content);
  }, [editingCommentId, comment.id, comment.content]);

  const canEdit = Boolean(currentUser && (currentUser.id === comment.User.id || ((currentUser.role || '').toLowerCase() === 'admin')));

  // approval state (may come from server fields)
  const [approvedByInst, setApprovedByInst] = useState<boolean>(Boolean((comment as any).approved_by_inst));
  const [approvedByOp, setApprovedByOp] = useState<boolean>(Boolean((comment as any).approved_by_op));
  const [approvedAtInst, setApprovedAtInst] = useState<string | null>((comment as any).approved_at_inst ? new Date((comment as any).approved_at_inst).toISOString() : null);
  const [approvedAtOp, setApprovedAtOp] = useState<string | null>((comment as any).approved_at_op ? new Date((comment as any).approved_at_op).toISOString() : null);

  // On mount, ensure we have the latest approval state from server
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await commentApi.getById(comment.id);
        const payload = res;
        const data = payload?.data;
        if (!mounted || !data) return;
        setApprovedByInst(Boolean(data?.approved_by_inst));
        setApprovedByOp(Boolean(data?.approved_by_op));
        setApprovedAtInst(data?.approved_at_inst ? new Date(data.approved_at_inst).toISOString() : null);
        setApprovedAtOp(data?.approved_at_op ? new Date(data.approved_at_op).toISOString() : null);
      } catch (err) {
        // ignore network errors; we keep optimistic local state
      }
    };
    void load();
    return () => { mounted = false; };
  }, [comment.id]);

const urlRegex = /(https?:\/\/[^\s)\]>\]]+|www\.[^\n\s)\]>\]]+)/gi;

  const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = urlRegex.exec(text)) !== null) {
      const idx = match.index;
      if (idx > lastIndex) nodes.push(text.slice(lastIndex, idx));
      const url = match[0];
      const href = url.startsWith('http') ? url : `https://${url}`;
      nodes.push(
        <a key={`${idx}-${url}`} href={href} target="_blank" rel="noopener noreferrer" className="text-frosted-blue-500 hover:underline">
          {url}
        </a>
      );
      lastIndex = idx + url.length;
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
  };

  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          {comment.avatarUrl ? (
            <img src={comment.avatarUrl} alt="avatar" className="w-10 h-10 object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground" /></div>
          )}
        </div>

        <div className="flex-1 max-w-[50ch] min-w-[50ch]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">{comment.User.fname} {comment.User.lname}</span>
            <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
          </div>

          {editingCommentId === comment.id ? (
            <div className="mt-3">
              <textarea autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Edit your comment..." className="w-full px-3 py-2 border rounded" rows={3} />
              <div className="flex justify-end gap-2 mt-2">
                <Button onClick={async () => await handleSaveEdit(comment.id, editValue)} disabled={!editValue.trim()}>Save</Button>
                <Button variant="ghost" onClick={() => { setEditingCommentId(null); setEditValue(comment.content); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{renderContentWithLinks(comment.content)}</p>

                <div className="mt-2 flex items-center gap-3 text-xs">
                <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-muted-foreground hover:text-foreground">Reply</button>
                {/* Approval buttons: original-poster approval (left) and instructor approval (right) */}
                <div className="flex items-center gap-2">
                  {!isInstructor || currentUser?.id != postOwnerId? <ApprovalButton
                    approved={approvedByOp}
                    color="#10B981"
                    tooltip={approvedByOp && approvedAtOp ? `Approved by Original Poster at ${new Date(approvedAtOp).toLocaleString()}` : ''}
                    isIndicator={!(currentUser && postOwnerId && currentUser.id === postOwnerId)}
                    ariaLabel="Original poster approval"
                    onToggle={async () => {
                      try {
                        const res = await commentApi.toggleApproveOriginalPoster(comment.id);
                        const payload = res;
                        const updated = payload?.data;
                        const newVal = Boolean(updated?.approved_by_op);
                        setApprovedByOp(newVal);
                        console.log(postOwnerId);
                        console.log(currentUser?.id);
                        setApprovedAtOp(updated?.approved_at_op ? new Date(updated.approved_at_op).toISOString() : null);
                        return newVal;
                      } catch (err) {
                        console.log(err);
                        return approvedByOp;
                      }
                    }}
                  /> : null}

                  <ApprovalButton
                    approved={approvedByInst}
                    color="#2563EB"
                    tooltip={approvedByInst && approvedAtInst ? `Approved by an Instructor at ${new Date(approvedAtInst).toLocaleString()}` : ''}
                    isIndicator={!isInstructor}
                    ariaLabel="Instructor approval"
                    onToggle={async () => {
                      try {
                        const res = await commentApi.toggleApproveInstructor(comment.id);
                        const payload = res;
                        const updated = payload?.data;
                        const newVal = Boolean(updated?.approved_by_inst);
                        setApprovedByInst(newVal);
                        setApprovedAtInst(updated?.approved_at_inst ? new Date(updated.approved_at_inst).toISOString() : null);
                        return newVal;
                      } catch (err) {
                        console.log(err);
                        return approvedByInst;
                      }
                    }}
                  />
                </div>
                {canEdit && (
                  <button onClick={() => { setEditingCommentId(comment.id); }} className="text-muted-foreground hover:text-foreground">Edit</button>
                )}
                {(() => {
                  const canDelete = currentUser && (currentUser.id === comment.User.id || (currentUser.role || '').toLowerCase() === 'admin' || isInstructor);
                  if (!canDelete) return null;
                  return (
                    <button className="text-destructive" onClick={() => { if (handleDelete) void handleDelete(comment.id); }}>Delete</button>
                  );
                })()}
              </div>
            </>
          )}

          {replyingTo === comment.id && (
            <div className="mt-3">
              <textarea value={localReply} onChange={e => setLocalReply(e.target.value)} placeholder="Write a reply..." className="w-full px-3 py-2 border rounded" rows={2} />
              <div className="flex justify-end mt-2">
                <Button onClick={async () => {
                  const created = await handleAddReply(comment.id, localReply);
                  if (created) setLocalReply('');
                }} disabled={!localReply.trim()}>Reply</Button>
              </div>
            </div>
          )}

          {comment.hasReplies && (!comment.replies || comment.replies.length === 0) && !expandedCommentIds.has(comment.id) && (
            <div style={{ marginLeft: (depth || 0) * 10 }} className="mt-2">
              <div className="flex items-center">
                <div className="flex-1 border-t border-muted-foreground" />
                <div className="px-2 -mt-2">
                  <button className="text-xs text-muted-foreground bg-background px-2 rounded cursor-pointer flex items-center gap-1" onClick={() => toggleExpand(comment.id)}>
                    <ChevronDown className="w-3 h-3" />
                    Show replies
                  </button>
                </div>
                <div className="flex-1 border-t border-muted-foreground" />
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && renderChildren && (
            <div className="mt-4 space-y-3">
              {comment.replies.map(r => (
                <div key={r.id}>
                  <CommentItem
                    comment={r}
                    depth={(depth || 0) + 1}
                    renderChildren={expandedCommentIds.has(r.id)}
                    editingCommentId={editingCommentId}
                    setEditingCommentId={setEditingCommentId}
                    handleSaveEdit={handleSaveEdit}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    handleAddReply={handleAddReply}
                    expandedCommentIds={expandedCommentIds}
                    toggleExpand={toggleExpand}
                    currentUser={currentUser}
                    postOwnerId={postOwnerId}
                    handleDelete={handleDelete}
                  />
                  {r.replies && r.replies.length > 0 && !expandedCommentIds.has(r.id) && (
                    <div style={{ marginLeft: ((depth || 0) + 1) * 10 }} className="mt-2">
                      <div className="flex items-center">
                        <div className="flex-1 border-t border-muted-foreground" />
                        <div className="px-2 -mt-2">
                          <button className="text-xs text-muted-foreground bg-background px-2 rounded flex items-center gap-1" onClick={() => toggleExpand(r.id)}>
                            <ChevronDown className="w-3 h-3" />
                            Show replies
                          </button>
                        </div>
                        <div className="flex-1 border-t border-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;

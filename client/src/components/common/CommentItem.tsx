import React, { useEffect, useState } from 'react';
import { ArrowBigUp, ArrowBigDown, User } from 'lucide-react';
import { Button } from '../ui/button';

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
  currentUser?: { id: number; role?: string } | null;
  isInstructor?: boolean;
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
  currentUser = null,
  isInstructor = false,
  handleDelete,
}) => {
  const [localReply, setLocalReply] = useState('');
  const [editValue, setEditValue] = useState(comment.content);

  useEffect(() => {
    if (editingCommentId === comment.id) setEditValue(comment.content);
  }, [editingCommentId, comment.id, comment.content]);

  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div className="flex gap-3 items-start">
        <div className="flex flex-col items-center mr-2">
          <button className={`p-1 rounded`}><ArrowBigUp className="w-4 h-4" /></button>
          <div className="text-xs font-bold my-1">{comment.votes ?? 0}</div>
          <button className={`p-1 rounded`}><ArrowBigDown className="w-4 h-4" /></button>
        </div>

        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          {comment.avatarUrl ? (
            <img src={comment.avatarUrl} alt="avatar" className="w-10 h-10 object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground" /></div>
          )}
        </div>

        <div className="flex-1">
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
              <p className="text-sm text-foreground">{comment.content}</p>

              <div className="mt-2 flex items-center gap-3 text-xs">
                <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-muted-foreground hover:text-foreground">Reply</button>
                <button onClick={() => { setEditingCommentId(comment.id); }} className="text-muted-foreground hover:text-foreground">Edit</button>
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
                  <button className="text-xs text-muted-foreground bg-background px-2 rounded" onClick={() => toggleExpand(comment.id)}>Show more</button>
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
                    isInstructor={isInstructor}
                    handleDelete={handleDelete}
                  />
                  {r.replies && r.replies.length > 0 && !expandedCommentIds.has(r.id) && (
                    <div style={{ marginLeft: ((depth || 0) + 1) * 10 }} className="mt-2">
                      <div className="flex items-center">
                        <div className="flex-1 border-t border-muted-foreground" />
                        <div className="px-2 -mt-2">
                          <button className="text-xs text-muted-foreground bg-background px-2 rounded" onClick={() => toggleExpand(r.id)}>Show more</button>
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

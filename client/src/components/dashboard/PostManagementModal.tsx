import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  User,
  Building2,
  Tag,
  CheckCircle,
  XCircle,
  Trash2,
  Save,
  X,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { postApi } from '@/services/api';
import { toast } from 'sonner';

interface PostData {
  id: number;
  title: string;
  content: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  User?: {
    id: string;
    fname: string;
    lname: string;
  };
  Community?: {
    id: string;
    name: string;
  };
  _count?: {
    Comment?: number;
    PostVote?: number;
  };
  upvotes?: number;
  downvotes?: number;
}

interface PostManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: number | null;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
}

const PostManagementModal: React.FC<PostManagementModalProps> = ({
  open,
  onOpenChange,
  postId,
  onPostUpdated,
  onPostDeleted,
}) => {
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editedPost, setEditedPost] = useState<Partial<PostData>>({});
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (open && postId) {
      fetchPost();
    } else {
      setPost(null);
      setEditedPost({});
      setNewTag('');
    }
  }, [open, postId]);

  const fetchPost = async () => {
    if (!postId) return;
    
    console.log('[PostManagementModal] Fetching post with ID:', postId, 'type:', typeof postId);
    setLoading(true);
    try {
      const postData = await postApi.getById(postId);
      console.log('[PostManagementModal] Received post data:', postData);
      setPost(postData as any);
      setEditedPost(postData as any);
    } catch (error: any) {
      console.error('[PostManagementModal] Failed to fetch post:', error);
      console.error('[PostManagementModal] Error response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to load post details');
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!postId || !editedPost) return;

    setSaving(true);
    try {
      await postApi.update(postId, {
        title: editedPost.title,
        body: editedPost.content,
        is_resolved: editedPost.resolved,
      });
      
      toast.success('Post updated successfully');
      onPostUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update post:', error);
      toast.error(error.response?.data?.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postId) return;
    
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone and will delete all comments.')) {
      return;
    }

    setDeleting(true);
    try {
      await postApi.delete(postId);
      toast.success('Post deleted successfully');
      onPostDeleted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      toast.error(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const currentTags = editedPost.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      setEditedPost({
        ...editedPost,
        tags: [...currentTags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedPost({
      ...editedPost,
      tags: (editedPost.tags || []).filter(tag => tag !== tagToRemove),
    });
  };

  const toggleResolved = () => {
    setEditedPost({
      ...editedPost,
      resolved: !editedPost.resolved,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Post Management
          </DialogTitle>
          <DialogDescription>
            View and manage post details, status, and content.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-turf-green-500"></div>
          </div>
        ) : post ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Post Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Post ID</p>
                <p className="font-mono text-sm">{post.id}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Comments</p>
                <p className="text-lg font-semibold">{post._count?.Comment || 0}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> Upvotes
                </p>
                <p className="text-lg font-semibold text-green-500">{post.upvotes || 0}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3" /> Downvotes
                </p>
                <p className="text-lg font-semibold text-red-500">{post.downvotes || 0}</p>
              </div>
            </div>

            {/* Author and Community */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <User className="w-3 h-3" /> Author
                </p>
                <p className="font-medium text-sm">
                  {post.User ? `${post.User.fname} ${post.User.lname}` : 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">ID: {post.User?.id}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3" /> Community
                </p>
                <p className="font-medium text-sm">{post.Community?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">ID: {post.Community?.id}</p>
              </div>
            </div>

            {/* Resolved Status */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {editedPost.resolved ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {editedPost.resolved ? 'Resolved' : 'Unresolved'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {editedPost.resolved ? 'This post has been marked as resolved' : 'This post needs attention'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleResolved}
                className={editedPost.resolved ? 'border-green-500 text-green-500' : 'border-amber-500 text-amber-500'}
              >
                {editedPost.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
              </Button>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Title
              </Label>
              <Input
                id="title"
                value={editedPost.title || ''}
                onChange={(e) =>
                  setEditedPost({ ...editedPost, title: e.target.value })
                }
                placeholder="Post title"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                value={editedPost.content || ''}
                onChange={(e) =>
                  setEditedPost({ ...editedPost, content: e.target.value })
                }
                placeholder="Post content"
                className="w-full min-h-[150px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>
              {editedPost.tags && editedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedPost.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm">
                  {new Date(post.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No post selected
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!post || deleting || saving}
            className="gap-2"
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || deleting}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!post || saving || deleting}
            className="gap-2 bg-turf-green-500 hover:bg-turf-green-600"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostManagementModal;

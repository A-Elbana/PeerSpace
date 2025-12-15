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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe, Lock, Trash2, Save, X, Tag, Users } from 'lucide-react';
import { communityApi } from '@/services/api';
import { toast } from 'sonner';

interface CommunityData {
  id: string;
  name: string;
  description: string;
  type: 'PUBLIC' | 'PRIVATE';
  tags?: string[];
  createdAt: string;
  _count?: {
    Enrollment?: number;
    Post?: number;
  };
}

interface CommunityManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string | null;
  onCommunityUpdated?: () => void;
  onCommunityDeleted?: () => void;
}

const CommunityManagementModal: React.FC<CommunityManagementModalProps> = ({
  open,
  onOpenChange,
  communityId,
  onCommunityUpdated,
  onCommunityDeleted,
}) => {
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editedCommunity, setEditedCommunity] = useState<Partial<CommunityData>>({});
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (open && communityId) {
      fetchCommunity();
    } else {
      setCommunity(null);
      setEditedCommunity({});
      setNewTag('');
    }
  }, [open, communityId]);

  const fetchCommunity = async () => {
    if (!communityId) return;
    
    setLoading(true);
    try {
      const response = await communityApi.getById(communityId);
      const communityData = response.data as any;
      setCommunity(communityData);
      setEditedCommunity(communityData);
    } catch (error: any) {
      console.error('Failed to fetch community:', error);
      toast.error(error.response?.data?.message || 'Failed to load community details');
      setCommunity(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!communityId || !editedCommunity) return;

    setSaving(true);
    try {
      await communityApi.update(communityId, {
        name: editedCommunity.name,
        description: editedCommunity.description,
        type: editedCommunity.type,
      });
      
      toast.success('Community updated successfully');
      onCommunityUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update community:', error);
      toast.error(error.response?.data?.message || 'Failed to update community');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!communityId) return;
    
    if (!confirm('Are you sure you want to delete this community? This action cannot be undone and will delete all posts and members.')) {
      return;
    }

    setDeleting(true);
    try {
      await communityApi.delete(communityId);
      toast.success('Community deleted successfully');
      onCommunityDeleted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to delete community:', error);
      toast.error(error.response?.data?.message || 'Failed to delete community');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const currentTags = editedCommunity.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      setEditedCommunity({
        ...editedCommunity,
        tags: [...currentTags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedCommunity({
      ...editedCommunity,
      tags: (editedCommunity.tags || []).filter(tag => tag !== tagToRemove),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Community Management
          </DialogTitle>
          <DialogDescription>
            View and manage community details, visibility, and settings.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-turf-green-500"></div>
          </div>
        ) : community ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Community ID and Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Community ID</p>
                <p className="font-mono text-xs truncate">{community.id}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> Members
                </p>
                <p className="text-lg font-semibold">{community._count?.Enrollment || 0}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Posts</p>
                <p className="text-lg font-semibold">{community._count?.Post || 0}</p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Community Name
              </Label>
              <Input
                id="name"
                value={editedCommunity.name || ''}
                onChange={(e) =>
                  setEditedCommunity({ ...editedCommunity, name: e.target.value })
                }
                placeholder="Community name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={editedCommunity.description || ''}
                onChange={(e) =>
                  setEditedCommunity({ ...editedCommunity, description: e.target.value })
                }
                placeholder="Community description"
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Visibility Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {editedCommunity.type === 'PUBLIC' ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Visibility
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      {editedCommunity.type === 'PUBLIC' ? (
                        <>
                          <Globe className="w-4 h-4" />
                          <span>Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Private</span>
                        </>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem
                    onClick={() => setEditedCommunity({ ...editedCommunity, type: 'PUBLIC' })}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Public - Anyone can join
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setEditedCommunity({ ...editedCommunity, type: 'PRIVATE' })}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Private - Invite only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              {editedCommunity.tags && editedCommunity.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedCommunity.tags.map((tag) => (
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

            {/* Created Date */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm">
                {new Date(community.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No community selected
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!community || deleting || saving}
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
            disabled={!community || saving || deleting}
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

export default CommunityManagementModal;

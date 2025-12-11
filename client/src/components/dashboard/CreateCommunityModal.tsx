import { useState } from 'react';
import { X, Users, Lock, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface CreateCommunityData {
  name: string;
  description: string;
  type: 'PUBLIC' | 'PRIVATE';
  banner_url?: string;
}

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCommunityData) => Promise<void>;
  isLoading?: boolean;
}

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [bannerUrl, setBannerUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Community name is required');
      return;
    }

    if (name.trim().length < 3) {
      setError('Community name must be at least 3 characters');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        type,
        banner_url: bannerUrl.trim() || undefined,
      });
      // Reset form on success
      setName('');
      setDescription('');
      setType('PUBLIC');
      setBannerUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create community');
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-frosted-blue-100">
              <Users className="h-5 w-5 text-frosted-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Create New Community</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Community Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Community Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Introduction to Databases"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
              maxLength={255}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <textarea
              id="description"
              placeholder="Describe what this community is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              maxLength={500}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* Community Type */}
          <div className="space-y-2">
            <Label className="text-foreground">Community Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('PUBLIC')}
                disabled={isLoading}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${type === 'PUBLIC'
                    ? 'border-frosted-blue-500 bg-frosted-blue-50 dark:bg-frosted-blue-500/10'
                    : 'border-border hover:border-muted-foreground/50'
                  }`}
              >
                <Globe
                  size={24}
                  className={type === 'PUBLIC' ? 'text-frosted-blue-500' : 'text-muted-foreground'}
                />
                <div className="text-left">
                  <p className={`font-medium ${type === 'PUBLIC' ? 'text-frosted-blue-500' : 'text-foreground'}`}>
                    Public
                  </p>
                  <p className="text-xs text-muted-foreground">Anyone can join</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType('PRIVATE')}
                disabled={isLoading}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${type === 'PRIVATE'
                    ? 'border-frosted-blue-500 bg-frosted-blue-50 dark:bg-frosted-blue-500/10'
                    : 'border-border hover:border-muted-foreground/50'
                  }`}
              >
                <Lock
                  size={24}
                  className={type === 'PRIVATE' ? 'text-frosted-blue-500' : 'text-muted-foreground'}
                />
                <div className="text-left">
                  <p className={`font-medium ${type === 'PRIVATE' ? 'text-frosted-blue-500' : 'text-foreground'}`}>
                    Private
                  </p>
                  <p className="text-xs text-muted-foreground">Invite only</p>
                </div>
              </button>
            </div>
          </div>

          {/* Banner URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="bannerUrl" className="text-foreground">
              Banner Image URL <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="bannerUrl"
              type="url"
              placeholder="https://example.com/banner.jpg"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Community'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCommunityModal;

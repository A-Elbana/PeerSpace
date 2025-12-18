import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { Button } from '../../components/ui/button';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { communityApi, type CommunityResponse } from '../../services/api';
import { getAccessToken } from '../../utils/auth';

interface User {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: 'student' | 'instructor' | 'admin';
  avatar_file_id?: string;
}

const ManageCommunity: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();

  // User state
  const [user, setUser] = useState<User | null>(null);

  // Community state
  const [community, setCommunity] = useState<CommunityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { sidebarWidth } = useSidebar();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Set page title
  useEffect(() => {
    document.title = community ? `PeerSpace - Manage ${community.name}` : 'PeerSpace - Manage Community';
  }, [community]);

  // Parse user from token
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.id,
          email: payload.email,
          fname: payload.fname,
          lname: payload.lname,
          role: payload.role,
          avatar_file_id: payload.avatar_file_id,
        });
      } catch {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch community data
  useEffect(() => {
    const fetchCommunity = async () => {
      if (!communityId) return;

      try {
        setIsLoading(true);
        const response = await communityApi.getById(communityId);
        setCommunity(response.data);
        setName(response.data.name);
        setDescription(response.data.description || '');
      } catch (error) {
        console.error('Failed to fetch community:', error);
        toast.error('Failed to load community details');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunity();
  }, [communityId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!communityId) return;

    // Validation
    if (!name.trim()) {
      toast.error('Community name is required');
      return;
    }

    if (name.trim().length < 3) {
      toast.error('Community name must be at least 3 characters');
      return;
    }

    try {
      setIsSaving(true);
      await communityApi.update(communityId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Community updated successfully');
      navigate(`/community/${communityId}`);
    } catch (error: unknown) {
      console.error('Failed to update community:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || 'Failed to update community';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!communityId) return;

    try {
      setIsDeleting(true);
      await communityApi.delete(communityId);
      toast.success('Community deleted successfully');
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Failed to delete community:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || 'Failed to delete community';
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = () => {
    navigate('/logout');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-frosted-blue-200 border-t-frosted-blue-600 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading community details...</p>
        </div>
      </div>
    );
  }

  if (!community || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />

      <main
        className="flex-1 p-8 transition-all duration-300 flex flex-col items-center justify-center"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Form Card */}
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Community</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Update your community details
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Community Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Community Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter community name"
                  className="bg-background border-border"
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/255 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter community description"
                  className="w-full min-h-[120px] px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-frosted-blue-500 focus:border-transparent resize-none"
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/255 characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-red-500/20">
              <h3 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete a community, there is no going back. All posts, members, and data will be permanently removed.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 border-red-500 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 size={18} />
                <span>Delete Community</span>
              </Button>
            </div>
          </div>
        </div>

        <DeleteConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title={`Delete ${community.name}`}
          description={`Are you sure you want to delete ${community.name}? This action cannot be undone and all associated data will be permanently removed.`}
          itemType="community"
          isLoading={isDeleting}
        />
      </main>
    </div>
  );
};

export default ManageCommunity;

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
import { User, Mail, Shield, Trash2, Save, X } from 'lucide-react';
import { userApi } from '@/services/api';
import { toast } from 'sonner';

interface UserData {
  id: string;
  email: string;
  fname: string;
  lname: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  avatar_file_id?: string;
  activated: boolean;
}

interface UserManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onUserUpdated?: () => void;
  onUserDeleted?: () => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  open,
  onOpenChange,
  userId,
  onUserUpdated,
  onUserDeleted,
}) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<UserData>>({});

  useEffect(() => {
    if (open && userId) {
      fetchUser();
    } else {
      setUser(null);
      setEditedUser({});
      setLoading(false);
    }
  }, [open, userId]);

  const fetchUser = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log('Fetching user with ID:', userId);
      const userData = await userApi.getById(userId);
      console.log('User data:', userData);
      // Convert numeric id to string and ensure role is uppercase
      const normalizedUser: UserData = {
        ...userData,
        id: String(userData.id),
        role: userData.role.toUpperCase() as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN',
      };
      setUser(normalizedUser);
      setEditedUser(normalizedUser);
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      toast.error(error.response?.data?.message || 'Failed to load user details');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !editedUser) return;

    setSaving(true);
    try {
      await userApi.update(userId, {
        fname: editedUser.fname,
        lname: editedUser.lname,
        email: editedUser.email,
        role: editedUser.role,
      });
      
      toast.success('User updated successfully');
      onUserUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await userApi.delete(userId);
      toast.success('User deleted successfully');
      onUserDeleted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'INSTRUCTOR':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'STUDENT':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Management
          </DialogTitle>
          <DialogDescription>
            View and manage user details, role, and permissions.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-turf-green-500"></div>
          </div>
        ) : user ? (
          <div className="space-y-4">
            {/* User ID and Status */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{user.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Account Status</p>
                <p className="text-sm">
                  {user.activated ? (
                    <span className="text-green-500">Active</span>
                  ) : (
                    <span className="text-amber-500">Inactive</span>
                  )}
                </p>
              </div>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="fname" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                First Name
              </Label>
              <Input
                id="fname"
                value={editedUser.fname || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, fname: e.target.value })
                }
                placeholder="First name"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lname" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Last Name
              </Label>
              <Input
                id="lname"
                value={editedUser.lname || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, lname: e.target.value })
                }
                placeholder="Last name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editedUser.email || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, email: e.target.value })
                }
                placeholder="Email address"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Role
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <Badge className={getRoleBadgeColor(editedUser.role || '')}>
                      {editedUser.role || 'Select Role'}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem
                    onClick={() => setEditedUser({ ...editedUser, role: 'STUDENT' })}
                  >
                    <Badge className={getRoleBadgeColor('STUDENT')}>STUDENT</Badge>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setEditedUser({ ...editedUser, role: 'INSTRUCTOR' })}
                  >
                    <Badge className={getRoleBadgeColor('INSTRUCTOR')}>INSTRUCTOR</Badge>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setEditedUser({ ...editedUser, role: 'ADMIN' })}
                  >
                    <Badge className={getRoleBadgeColor('ADMIN')}>ADMIN</Badge>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No user selected
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!user || deleting || saving}
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
                Delete User
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
            disabled={!user || saving || deleting}
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

export default UserManagementModal;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  User,
  Trash2,
  AlertTriangle,
  Mail,
  ImageIcon,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import api, { userApi, type UserDetail } from '../../services/api';
import { removeTokens } from '../../utils/auth';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useResolvedFileUrl } from '@/hooks/useResolvedFileUrl';

type UserRole = 'student' | 'instructor' | 'admin';


const Settings: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sidebarWidth } = useSidebar();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set page title
  useEffect(() => {
    document.title = 'PeerSpace - Settings';
  }, []);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  

  // Form state
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Instructor-specific fields
  const [title, setTitle] = useState('');
  const [areaOfExpertise, setAreaOfExpertise] = useState('');
  const [googleScholarLink, setGoogleScholarLink] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const resolvedAvatarUrl = useResolvedFileUrl(avatarPreview || avatarUrl || null);

  const fetchUserData = async () => {
    try {
      const { data } = await api.get('/auth/me');
      
      setFname(data.fname || '');
      setLname(data.lname || '');
      setEmail(data.email || '');
      // Backend may return either `avatar_file_id` (file record id) or `avatar_url` (direct URL)
      setAvatarUrl(data.avatar_file_id ?? data.avatar_url ?? '');
      // Instructor fields (if present)
      const instData = await userApi.getById(data.id);
      setUser(instData);
      setTitle(instData.Instructor?.title ?? '');
      setAreaOfExpertise(instData.Instructor?.area_of_expertise ?? '');
      setGoogleScholarLink(instData.Instructor?.google_scholar_link ?? '');
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      removeTokens();
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [navigate]);


  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview locally and store the file; do NOT upload until user saves
    try {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setAvatarFile(file);
    } catch (err) {
      console.error('Failed to preview avatar file', err);
      toast.error('Failed to preview selected image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);

    try {
      const updateData: { fname?: string; lname?: string; avatar_file_id?: string; title?: string; area_of_expertise?: string; google_scholar_link?: string } = {};

      if (fname && fname !== user.fname) updateData.fname = fname;
      if (lname && lname !== user.lname) updateData.lname = lname;

      // Instructor-specific updates
      if ((user as any).role.toLowerCase() === 'instructor') {
        const prevInstr = (user as any).Instructor || {};
        if (title && title !== prevInstr.title) updateData.title = title;
        if (areaOfExpertise && areaOfExpertise !== prevInstr.area_of_expertise) updateData.area_of_expertise = areaOfExpertise;
        if (googleScholarLink && googleScholarLink !== prevInstr.google_scholar_link) updateData.google_scholar_link = googleScholarLink;
      }

      if (Object.keys(updateData).length === 0 && !avatarFile) {
        toast.error('No changes to save');
        setIsSaving(false);
        return;
      }

      // If there's a selected avatar file, upload it first and include in update
      if (avatarFile) {
        setIsUploadingAvatar(true);
        try {
          const signResponse = await api.post('/uploads/sign', {
            context: 'USER_AVATAR',
            context_id: user.id.toString(),
            is_private: false,
            resource_type: 'auto'
          });

          const { timestamp, signature, folder, cloudName, apiKey } = signResponse.data;

          const formData = new FormData();
          formData.append('file', avatarFile);
          formData.append('timestamp', timestamp.toString());
          formData.append('signature', signature);
          formData.append('api_key', apiKey);
          formData.append('folder', folder);

          const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) throw new Error('Cloudinary upload failed');

          const cloudinaryData = await uploadResponse.json();

          const fileResponse = await api.post('/files', {
            public_id: cloudinaryData.public_id,
            secure_url: cloudinaryData.secure_url,
            resource_type: cloudinaryData.resource_type,
            format: cloudinaryData.format,
            context: 'USER_AVATAR',
            context_id: user.id.toString(),
            is_private: false
          });

          const fileRecord = fileResponse.data.data;
          // include avatar_file_id in update
          (updateData as any).avatar_file_id = fileRecord.id;
        } catch (err: any) {
          console.error('Failed to upload avatar during save:', err);
          toast.error(err.response?.data?.message || err.message || 'Failed to upload avatar');
          setIsUploadingAvatar(false);
          setIsSaving(false);
          return;
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      const { data } = await api.put(`/users/${user.id}`, updateData);

      setUser(prev => prev ? { ...prev, ...data.user } : null);
      setFname(data.user.fname || fname);
      setLname(data.user.lname || lname);
      setAvatarUrl(data.user.avatar_file_id || '');
      // If avatar was uploaded, clear pending file and preview
      setAvatarFile(null);
      setAvatarPreview(null);
      // Sync instructor fields after save
      setTitle(data.user.Instructor?.title ?? title);
      setAreaOfExpertise(data.user.Instructor?.area_of_expertise ?? areaOfExpertise);
      setGoogleScholarLink(data.user.Instructor?.google_scholar_link ?? googleScholarLink);
      toast.success('Profile updated successfully!');

      // Show toast for avatar update if avatar_file_id was set
      if ((updateData as any).avatar_file_id) {
        toast.success('Avatar updated successfully');
      }
    } catch (error: unknown) {
      console.error('Failed to update profile:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await api.put(`/users/${user.id}`, {
        currentPassword,
        password: newPassword
      });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully!');
    } catch (error: unknown) {
      console.error('Failed to update password:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);

    try {
      await api.delete(`/users/${user.id}`);
      removeTokens();
      navigate('/login', {
        state: { message: 'Your account has been deleted successfully.' }
      });
    } catch (error: unknown) {
      console.error('Failed to delete account:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const getInitials = () => {
    return `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'destructive';
      case 'instructor': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />

      <main 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header Section */}
        <div className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-8 py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your profile and account preferences</p>
              </div>
              <Badge variant={getRoleBadgeVariant(user?.role || 'student')} className="uppercase tracking-wider text-xs">
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

          {/* Messages shown via toasts */}

          {/* Profile Card */}
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>Update your profile details and avatar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-start gap-6 pb-6 border-b border-border">
                  <div className="relative group">
                    <Avatar className="w-20 h-20 border-2 border-border">
                      <AvatarImage src={avatarPreview || resolvedAvatarUrl || undefined} alt="Profile" />
                      <AvatarFallback className="text-lg font-semibold bg-muted text-muted-foreground">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={isUploadingAvatar}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Profile Photo</h3>
                    <p className="text-sm text-muted-foreground mt-1">Upload a new photo (preview shown). Changes are applied when you click Save.</p>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fname" className="text-foreground">First Name</Label>
                    <Input
                      id="fname"
                      type="text"
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lname" className="text-foreground">Last Name</Label>
                    <Input
                      id="lname"
                      type="text"
                      value={lname}
                      onChange={(e) => setLname(e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      className="pr-32"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                      Read only
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>

                {/* Avatar URL removed: preview only, upload on Save */}

                <Separator />
                  {/* Instructor fields */}
                  {user?.role.toLowerCase() === 'instructor' && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground">Instructor Profile</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-foreground flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Title
                          </Label>
                          <Input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Lecturer, Assistant Professor"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="area" className="text-foreground flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Area of Expertise
                          </Label>
                          <Input
                            id="area"
                            type="text"
                            value={areaOfExpertise}
                            onChange={(e) => setAreaOfExpertise(e.target.value)}
                            placeholder="e.g., Machine Learning, Databases"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="googleScholar" className="text-foreground flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Google Scholar Link
                          </Label>
                          <Input
                            id="googleScholar"
                            type="text"
                            value={googleScholarLink}
                            onChange={(e) => setGoogleScholarLink(e.target.value)}
                            placeholder="https://scholar.google.com/..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving} className="min-w-32">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-foreground">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isUpdatingPassword} className="min-w-32">
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader className="border-b border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                  <CardDescription className="text-destructive/70">Irreversible actions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This will permanently delete your account, including all courses, posts, and data.
                      This action cannot be undone.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="deleteConfirm" className="text-foreground">
                      Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                    </Label>
                    <Input
                      id="deleteConfirm"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      className="font-mono"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      className="flex-1"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete My Account
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;

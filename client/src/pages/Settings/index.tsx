import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  User,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  ImageIcon
} from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import api from '../../services/api';
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

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: UserRole;
  avatar_url?: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const normalizedUser: UserData = {
        ...data,
        role: data.role?.toLowerCase() as UserRole
      };
      setUser(normalizedUser);
      setFname(data.fname || '');
      setLname(data.lname || '');
      setEmail(data.email || '');
      setAvatarUrl(data.avatar_url || '');
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      removeTokens();
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setMessage({
        type: 'error',
        text: 'File upload not supported. Please use the Avatar URL field instead.'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const updateData: { fname?: string; lname?: string; avatar_url?: string } = {};

      if (fname && fname !== user.fname) updateData.fname = fname;
      if (lname && lname !== user.lname) updateData.lname = lname;
      if (avatarUrl && avatarUrl !== user.avatar_url && avatarUrl.startsWith('http')) {
        updateData.avatar_url = avatarUrl;
      }

      if (Object.keys(updateData).length === 0) {
        setMessage({ type: 'error', text: 'No changes to save' });
        setIsSaving(false);
        return;
      }

      const { data } = await api.put(`/users/${user.id}`, updateData);

      setUser(prev => prev ? { ...prev, ...data.user } : null);
      setFname(data.user.fname || fname);
      setLname(data.user.lname || lname);
      setAvatarUrl(data.user.avatar_url || '');
      setAvatarPreview(null);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update profile'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    setMessage(null);

    try {
      await api.delete(`/users/${user.id}`);
      removeTokens();
      navigate('/login', {
        state: { message: 'Your account has been deleted successfully.' }
      });
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to delete account'
      });
      setIsDeleting(false);
    }
  };

  const getInitials = () => {
    return `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'instructor': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium tracking-wide">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar onLogout={handleLogout} />

      <main className="flex-1 ml-64">
        {/* Header Section */}
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-4xl mx-auto px-8 py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mb-4 -ml-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Account Settings</h1>
                <p className="text-slate-500 mt-1">Manage your profile and account preferences</p>
              </div>
              <Badge variant={getRoleBadgeVariant(user?.role || 'student')} className="uppercase tracking-wider text-xs">
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

          {/* Message Alert */}
          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'destructive'}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription className="ml-2">{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Profile Card */}
          <Card>
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100">
                  <User className="w-5 h-5 text-slate-600" />
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
                <div className="flex items-start gap-6 pb-6 border-b border-slate-100">
                  <div className="relative group">
                    <Avatar className="w-20 h-20 border-2 border-slate-200">
                      <AvatarImage src={avatarPreview || avatarUrl} alt="Profile" />
                      <AvatarFallback className="text-lg font-semibold bg-slate-100 text-slate-600">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">Profile Photo</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Upload a new photo or enter a URL below
                    </p>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fname" className="text-slate-700">First Name</Label>
                    <Input
                      id="fname"
                      type="text"
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lname" className="text-slate-700">Last Name</Label>
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
                  <Label htmlFor="email" className="text-slate-700 flex items-center gap-2">
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 border border-slate-200">
                      Read only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Contact support to change your email address
                  </p>
                </div>

                {/* Avatar URL Field */}
                <div className="space-y-2">
                  <Label htmlFor="avatarUrl" className="text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Avatar URL
                  </Label>
                  <Input
                    id="avatarUrl"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarPreview(null);
                    }}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <p className="text-xs text-slate-500">
                    Enter a direct link to your avatar image
                  </p>
                </div>

                <Separator />

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

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader className="border-b border-red-100 bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
                  <CardDescription className="text-red-600/70">Irreversible actions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">Delete Account</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
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
                    <Label htmlFor="deleteConfirm" className="text-slate-700">
                      Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
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

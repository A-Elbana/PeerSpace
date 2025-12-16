import React, { useState } from 'react';
import { X, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';

export interface CreateUserData {
  fname: string;
  lname: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData) => Promise<void>;
  isLoading?: boolean;
}

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

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT'|'INSTRUCTOR'|'ADMIN'>('STUDENT');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fname.trim() || !lname.trim() || !email.trim() || !password) {
      setError('Please fill all required fields');
      return;
    }

    try {
      await onSubmit({ fname: fname.trim(), lname: lname.trim(), email: email.trim(), password, role });
      // reset
      setFname(''); setLname(''); setEmail(''); setPassword(''); setRole('STUDENT');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl shadow-2xl border border-border max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-frosted-blue-100">
              <User className="h-5 w-5 text-frosted-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Create User</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 72px)' }}>
          {error && <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}

          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={fname} onChange={(e) => setFname(e.target.value)} placeholder="First name" />
          </div>

          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={lname} onChange={(e) => setLname(e.target.value)} placeholder="Last name" />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <Badge className={getRoleBadgeColor(role)}>{role}</Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                <DropdownMenuItem onClick={() => setRole('STUDENT')}><Badge className={getRoleBadgeColor('STUDENT')}>STUDENT</Badge></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRole('INSTRUCTOR')}><Badge className={getRoleBadgeColor('INSTRUCTOR')}>INSTRUCTOR</Badge></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRole('ADMIN')}><Badge className={getRoleBadgeColor('ADMIN')}>ADMIN</Badge></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" className="bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white" disabled={isLoading}>
              {isLoading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/>Creating...</>
              ) : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
